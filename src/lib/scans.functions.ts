import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { DEFAULT_GEMINI_MODEL, createAiGateway } from "./ai-gateway.server";
import { supabase } from "@/integrations/supabase/client";
import { supabasePublicDataCache } from "./api/public-api-cache.server";
import { getServerConfig } from "./config.server";
import { buildFallbackExtraction } from "./scan-extraction-fallback.server";
import { buildProductAnalysisMessages } from "./scan-input.server";
import { buildPublicDataAssessment } from "./scan-public-data.server";
import { normalizeReviewExtractedProduct } from "./scan-review.server";
import { normalizeServerError } from "./error-handler.server";
import {
  calculateRiskScore,
  generateChecklist,
  riskLevelFromScore,
  type ExtractedProduct,
  type HsCandidate,
} from "./scan-logic";

const CreateScanInput = z.object({
  inputType: z.enum(["url", "text", "image"]),
  productUrl: z.string().optional().default(""),
  productText: z.string().optional().default(""),
  productImageDataUrls: z.array(z.string()).optional().default([]),
  purchaseCountry: z.string().min(1),
  currency: z.string().min(1),
  itemPrice: z.number().min(0),
  shippingFee: z.number().min(0).default(0),
  purchasePurpose: z.enum(["personal", "resale"]),
});

const ReviewScanInput = z.object({
  scanId: z.string().uuid(),
  selectedHsCode: z.string().min(4),
  extracted: z.object({
    rawTitle: z.string().min(1),
    translatedTitleKo: z.string().min(1),
    brand: z.string().default(""),
    category: z.string().min(1),
    intendedUse: z.string().default(""),
    originCountry: z.string().default(""),
    materialsText: z.string().default(""),
    ingredientsText: z.string().default(""),
    riskKeywordsText: z.string().default(""),
    confidence: z.number().min(0).max(1),
  }),
});

const ExtractionSchema = z.object({
  rawTitle: z.string(),
  translatedTitleKo: z.string(),
  brand: z.string(),
  category: z.string(),
  intendedUse: z.string(),
  materials: z.array(z.string()),
  ingredients: z.array(z.string()),
  originCountry: z.string(),
  riskKeywords: z.array(z.string()),
  confidence: z.number(),
  hsCandidates: z
    .array(
      z.object({
        hsCode: z.string(),
        hsNameKo: z.string(),
        hsNameEn: z.string(),
        matchReason: z.string(),
        confidence: z.number(),
      }),
    )
    .min(1),
});

type ExtractionEvidenceItem = {
  source: string;
  purpose: string;
  timestamp: string;
  confidence: string;
  status?: string;
  errorCode?: string;
  message?: string;
};

export const createAndAnalyzeScan = createServerFn({ method: "POST" })
  .validator((input: unknown) => CreateScanInput.parse(input))
  .handler(async ({ data }) => {
    const config = getServerConfig();
    const gateway = createAiGateway({
      provider: config.geminiProvider,
      geminiApiKey: config.geminiApiKey,
      vertexProject: config.googleVertexProject,
      vertexLocation: config.googleVertexLocation,
      vertexAuthMode: config.googleVertexAuthMode,
    });
    const aiEvidenceSource =
      gateway.provider === "vertex" ? "Gemini API (Vertex AI)" : "Gemini API";

    let scrapedContent = "";
    if (data.productUrl && data.productUrl.startsWith("http")) {
      try {
        const { fetchJinaReader } = await import("./api/scraper.server");
        scrapedContent = await fetchJinaReader(data.productUrl);
      } catch (err) {
        console.warn("URL 스크래핑 실패 (Jina Reader API):", err);
      }
    }

    const sourceText = [
      data.productUrl ? `상품 URL: ${data.productUrl}` : "",
      scrapedContent ? `스크래핑된 웹페이지 내용:\n${scrapedContent.substring(0, 15000)}` : "",
      data.productText ? `상품 설명: ${data.productText}` : "",
      data.productImageDataUrls.length > 0 ? "상품 이미지: 첨부됨" : "",
      `구매 국가: ${data.purchaseCountry}, 통화: ${data.currency}, 가격: ${data.itemPrice}`,
      `구매 목적: ${data.purchasePurpose === "personal" ? "개인 자가사용" : "재판매"}`,
    ]
      .filter(Boolean)
      .join("\n");

    const systemPrompt = `너는 해외직구 사전 통관 위험 진단 보조 시스템이다.
- 통관 가능 여부, 반입 금지 여부, 세액을 확정하지 않는다.
- 공공데이터 응답에 없는 법령명, 기관명, 세율을 생성하지 않는다.
- 불확실한 경우 "확인 필요"로 표시한다.
- 결과는 반드시 한국어로 출력한다.
- HS 후보는 10자리 또는 6자리 코드 후보 3개를 제시한다.
- category 값은 다음 중 하나: food, health_supplement, cosmetic, electronics, apparel, kitchenware, toy, medical, other`;

    let extracted: ExtractedProduct & { hsCandidates: HsCandidate[] };
    let extractionEvidence: ExtractionEvidenceItem[] = [
      {
        source: aiEvidenceSource,
        purpose: "상품 정보 구조화 및 HS 후보 추천",
        timestamp: new Date().toISOString(),
        confidence: "AI 추정",
      },
    ];
    try {
      const { output } = await generateText({
        model: gateway.model(config.geminiModel ?? DEFAULT_GEMINI_MODEL),
        system: systemPrompt,
        messages: buildProductAnalysisMessages({
          sourceText: `다음 해외직구 상품을 분석해 구조화된 JSON으로 반환하라.\n\n${sourceText}`,
          imageDataUrl:
            data.productImageDataUrls.length > 0 ? data.productImageDataUrls[0] : undefined,
        }),
        output: Output.object({ schema: ExtractionSchema }),
      });
      extracted = output;
    } catch (err: unknown) {
      console.error("Gemini 분석 실패:", err);
      const normalized = normalizeServerError(err);
      extracted = buildFallbackExtraction(data);
      extractionEvidence = [
        {
          source: aiEvidenceSource,
          purpose: "상품 정보 구조화 및 HS 후보 추천",
          timestamp: new Date().toISOString(),
          confidence: "failed",
          status: "failed",
          errorCode: normalized.code,
          message: normalized.message,
        },
        {
          source: "로컬 규칙 기반 fallback",
          purpose: "Gemini 실패 시 리뷰 가능한 초깃값 생성",
          timestamp: new Date().toISOString(),
          confidence: "fallback",
        },
      ];
    }

    // HS 부호 테이블 검증 로직 추가 (B-1)
    try {
      const codes = extracted.hsCandidates.map((c) => c.hsCode.replace(/\D/g, ""));
      if (codes.length > 0) {
        const { data: validHsCodes, error } = await supabase
          .from("hs_codes")
          .select("hs_code, name_ko")
          .in("hs_code", codes);

        if (!error && validHsCodes) {
          extracted.hsCandidates = extracted.hsCandidates.map((candidate) => {
            const cleanCode = candidate.hsCode.replace(/\D/g, "");
            const matched = validHsCodes.find(
              (row) => row.hs_code.startsWith(cleanCode) || cleanCode.startsWith(row.hs_code),
            );
            if (matched) {
              return {
                ...candidate,
                name: matched.name_ko,
                confidence: "high" as const,
              };
            }
            return candidate;
          });
        }
      }
    } catch (err) {
      console.warn("HS 부호 테이블 조회 실패 (마이그레이션 필요할 수 있음):", err);
    }

    const selectedHs = extracted.hsCandidates[0];
    const publicData = await buildPublicDataAssessment(
      {
        product: extracted,
        selectedHs,
        itemPrice: data.itemPrice,
        shippingFee: data.shippingFee,
        currency: data.currency,
      },
      {
        dataGoKrApiKey: config.dataGoKrApiKey,
        foodSafetyKoreaApiKey: config.foodSafetyKoreaApiKey,
        publicApiTimeoutMs: config.publicApiTimeoutMs,
        publicApiRetryCount: config.publicApiRetryCount,
        cache: supabasePublicDataCache,
      },
    );
    const findings = publicData.findings;
    const tax = publicData.tax;
    const riskScore = calculateRiskScore({
      findings,
      hsConfidence: selectedHs.confidence,
      hsCandidates: extracted.hsCandidates,
      category: extracted.category,
      purpose: data.purchasePurpose,
      taxKrw: tax.totalTaxKrw,
      itemPriceUsdEquivalent: tax.itemPriceKrw / (data.currency === "USD" ? tax.fxRate : 1385),
    });
    const riskLevel = riskLevelFromScore(riskScore);
    const checklist = generateChecklist(extracted, findings);

    const summary = buildSummary(extracted, findings, riskLevel);

    const evidence = [...extractionEvidence, ...publicData.evidence];

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("scan_cases")
      .insert({
        status: "completed",
        risk_level: riskLevel,
        risk_score: riskScore,
        input_type: data.inputType,
        product_url: data.productUrl || null,
        product_text: data.productText || null,
        purchase_country: data.purchaseCountry,
        currency: data.currency,
        item_price: data.itemPrice,
        shipping_fee: data.shippingFee,
        purchase_purpose: data.purchasePurpose,
        extracted: extracted as unknown as never,
        hs_candidates: extracted.hsCandidates as unknown as never,
        selected_hs_code: selectedHs.hsCode,
        findings: findings as unknown as never,
        tax_estimate: tax as unknown as never,
        checklist: checklist as unknown as never,
        evidence: evidence as unknown as never,
        summary_ko: summary.summary,
        action_recommendation: summary.action,
      })
      .select("id")
      .single();

    if (error) {
      console.error("DB 저장 실패:", error);
      throw new Error(`진단 결과 저장에 실패했습니다: ${error.message} - ${error.details || ""}`);
    }

    return { scanId: row.id };
  });

export const confirmScanReview = createServerFn({ method: "POST" })
  .validator((input: unknown) => ReviewScanInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error: readError } = await supabaseAdmin
      .from("scan_cases")
      .select("*")
      .eq("id", data.scanId)
      .maybeSingle();

    if (readError) throw new Error(normalizeServerError(readError).message);
    if (!row) throw new Error("진단 케이스를 찾을 수 없습니다.");

    const hsCandidates = (row.hs_candidates as unknown as HsCandidate[]) ?? [];
    const selectedHs =
      hsCandidates.find((candidate) => candidate.hsCode === data.selectedHsCode) ?? hsCandidates[0];
    if (!selectedHs) throw new Error("선택 가능한 HS 후보가 없습니다.");

    const extracted = {
      ...normalizeReviewExtractedProduct(data.extracted),
      hsCandidates,
    };
    const config = getServerConfig();
    const publicData = await buildPublicDataAssessment(
      {
        product: extracted,
        selectedHs,
        itemPrice: Number(row.item_price),
        shippingFee: Number(row.shipping_fee),
        currency: row.currency,
      },
      {
        dataGoKrApiKey: config.dataGoKrApiKey,
        foodSafetyKoreaApiKey: config.foodSafetyKoreaApiKey,
        publicApiTimeoutMs: config.publicApiTimeoutMs,
        publicApiRetryCount: config.publicApiRetryCount,
        cache: supabasePublicDataCache,
      },
    );
    const riskScore = calculateRiskScore({
      findings: publicData.findings,
      hsConfidence: selectedHs.confidence,
      hsCandidates,
      category: extracted.category,
      purpose: row.purchase_purpose === "resale" ? "resale" : "personal",
      taxKrw: publicData.tax.totalTaxKrw,
      itemPriceUsdEquivalent:
        publicData.tax.itemPriceKrw / (row.currency === "USD" ? publicData.tax.fxRate : 1385),
    });
    const riskLevel = riskLevelFromScore(riskScore);
    const checklist = generateChecklist(extracted, publicData.findings);
    const summary = buildSummary(extracted, publicData.findings, riskLevel);
    const priorEvidence = (
      (row.evidence as unknown as Array<Record<string, unknown>>) ?? []
    ).filter((item) => item.source === "Gemini API");
    const evidence = [
      ...priorEvidence,
      {
        source: "사용자 Review",
        purpose: "AI 추출값 및 HS 후보 확인",
        timestamp: new Date().toISOString(),
        confidence: "user_confirmed",
      },
      ...publicData.evidence,
    ];

    const { error: updateError } = await supabaseAdmin
      .from("scan_cases")
      .update({
        risk_level: riskLevel,
        risk_score: riskScore,
        extracted: extracted as unknown as never,
        selected_hs_code: selectedHs.hsCode,
        findings: publicData.findings as unknown as never,
        tax_estimate: publicData.tax as unknown as never,
        checklist: checklist as unknown as never,
        evidence: evidence as unknown as never,
        summary_ko: summary.summary,
        action_recommendation: summary.action,
      })
      .eq("id", data.scanId);

    if (updateError) throw new Error(normalizeServerError(updateError).message);

    return { scanId: data.scanId };
  });

function buildSummary(
  extracted: ExtractedProduct,
  findings: { severity: string; summary: string }[],
  riskLevel: string,
): { summary: string; action: string } {
  const high = findings.find((f) => f.severity === "high");
  if (riskLevel === "banned") {
    return {
      summary: `식약처 해외직구 반입차단 성분이 검출되어 국내 통관 및 반입이 절대 불가합니다.`,
      action: "구매 불가 (폐기 대상)",
    };
  }
  if (riskLevel === "blocked_unknown") {
    return {
      summary: `${extracted.translatedTitleKo} 은(는) 관계기관 확인 없이는 구매 판단이 어렵습니다. ${high?.summary ?? ""}`,
      action: "관세사·관계기관 상담 후 구매",
    };
  }
  if (riskLevel === "high_risk") {
    return {
      summary: `${high?.summary ?? "세관장확인대상 가능성"} 으로 통관 리스크가 높습니다.`,
      action: "구매 보류 또는 판매자에 인증서 요청",
    };
  }
  if (riskLevel === "caution") {
    return {
      summary: `${extracted.translatedTitleKo} 은(는) 세액 발생 또는 성분 확인 가능성이 있어 주의가 필요합니다.`,
      action: "구매 전 체크리스트 확인",
    };
  }
  return {
    summary: `${extracted.translatedTitleKo} 의 통관 위험 신호가 낮습니다. 단, 공공데이터 응답은 참고용입니다.`,
    action: "체크리스트 확인 후 구매",
  };
}
