import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState, memo } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  CircleAlert,
  ShieldAlert,
  ArrowRight,
  Calculator,
  FileSearch,
  FlaskConical,
  Database,
  ListChecks,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { DiagnosisStepper } from "@/components/DiagnosisStepper";
import { RiskBadge } from "@/components/RiskBadge";
import { ScanRoutePending } from "@/components/ScanRoutePending";
import { getScan } from "@/lib/get-scan.functions";
import type {
  ChecklistItem,
  ExtractedProduct,
  Finding,
  HsCandidate,
  RiskLevel,
  TaxEstimate,
} from "@/lib/scan-logic";

const TABS = [
  { id: "summary", label: "요약", Icon: CheckCircle2 },
  { id: "compliance", label: "통관요건", Icon: ShieldAlert },
  { id: "tax", label: "예상세액", Icon: Calculator },
  { id: "food", label: "식품·성분", Icon: FlaskConical },
  { id: "evidence", label: "근거", Icon: Database },
  { id: "next", label: "다음 단계", Icon: ListChecks },
] as const;

type TabId = (typeof TABS)[number]["id"];

export const Route = createFileRoute("/scan/$scanId/result")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      tab: (search.tab as string) || "summary",
    };
  },
  loader: async ({ params }) => {
    try {
      return await getScan({ data: { scanId: params.scanId } });
    } catch {
      throw notFound();
    }
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: `진단 결과 — ${loaderData?.extracted ? (loaderData.extracted as unknown as ExtractedProduct).translatedTitleKo : "직구 세이프패스 AI"}`,
      },
      {
        name: "description",
        content: "해외직구 상품의 통관 위험, 예상 세액, 권고 행동을 확인합니다.",
      },
    ],
  }),
  component: ResultPage,
  pendingComponent: () => <ScanRoutePending current="result" />,
  notFoundComponent: () => (
    <div className="min-h-screen">
      <AppHeader />
      <div className="app-container py-16 text-center">
        <h1 className="text-xl font-bold">진단 결과를 찾을 수 없습니다</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          비로그인 케이스는 24시간 후 만료됩니다.
        </p>
        <Link to="/" className="mt-4 inline-block text-sm font-semibold text-primary">
          새 진단 시작 →
        </Link>
      </div>
    </div>
  ),
});

function ResultPage() {
  const row = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const tab = search.tab as TabId;

  const setTab = (newTab: TabId) => {
    navigate({ search: { tab: newTab }, replace: true });
  };

  const extracted = row.extracted as unknown as ExtractedProduct;
  const hsCandidates = (row.hs_candidates as unknown as HsCandidate[]) ?? [];
  const findings = (row.findings as unknown as Finding[]) ?? [];
  const tax = row.tax_estimate as unknown as TaxEstimate;
  const checklist = (row.checklist as unknown as ChecklistItem[]) ?? [];
  const evidence =
    (row.evidence as unknown as {
      source: string;
      purpose: string;
      timestamp: string;
      confidence: string;
    }[]) ?? [];
  const level = (row.risk_level ?? "safe") as RiskLevel;
  const selectedHs = hsCandidates.find((c) => c.hsCode === row.selected_hs_code) ?? hsCandidates[0];

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="app-container py-8 md:py-10">
        <Link to="/" className="text-xs font-semibold text-muted-foreground hover:text-foreground">
          ← 새 진단
        </Link>
        <div className="mt-3">
          <DiagnosisStepper current="result" />
        </div>

        {/* Summary card */}
        <section className="store-card mt-5 p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-medium text-muted-foreground">진단 결과</div>
              <h1 className="mt-1 text-xl font-bold text-foreground md:text-2xl">
                {extracted.translatedTitleKo || extracted.rawTitle}
              </h1>
              <div className="mt-1 text-xs text-muted-foreground">
                {extracted.brand ? <span>{extracted.brand} · </span> : null}
                <span>카테고리: {extracted.category}</span>
                {extracted.originCountry ? <span> · 원산지: {extracted.originCountry}</span> : null}
              </div>
            </div>
            <RiskBadge level={level} size="lg" />
          </div>

          <p className="mt-4 text-[15px] leading-relaxed text-foreground">{row.summary_ko}</p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Metric
              label="위험 점수"
              value={`${Math.min(100, Number(row.risk_score))} / 100`}
              hint="HS 신뢰도·요건·세액 종합"
            />
            <Metric
              label="예상 세액 (참고)"
              value={`${tax.totalTaxKrw.toLocaleString()} 원`}
              hint={`관세 ${tax.tariffRate}% + 부가세 10%`}
            />
            <Metric
              label="권고 행동"
              value={row.action_recommendation ?? "체크리스트 확인"}
              hint="구매 의사결정 가이드"
            />
          </div>

          <Link
            to="/scan/$scanId/checklist"
            params={{ scanId: row.id }}
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            구매 전 체크리스트 보기 <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        {/* Tabs */}
        <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-border" role="tablist">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={`flex h-11 flex-shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm font-semibold transition ${
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-5">
          {tab === "summary" ? (
            <SummaryTab
              extracted={extracted}
              hsCandidates={hsCandidates}
              selectedHs={selectedHs}
              findings={findings}
            />
          ) : null}
          {tab === "compliance" ? (
            <ComplianceTab findings={findings} selectedHs={selectedHs} />
          ) : null}
          {tab === "tax" ? (
            <TaxTab tax={tax} currency={row.currency} itemPrice={Number(row.item_price)} />
          ) : null}
          {tab === "food" ? <FoodTab findings={findings} extracted={extracted} /> : null}
          {tab === "evidence" ? <EvidenceTab evidence={evidence} /> : null}
          {tab === "next" ? <NextTab checklist={checklist} scanId={row.id} /> : null}
        </div>
      </main>
    </div>
  );
}

const Metric = memo(function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-4">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-[18px] font-bold text-foreground">{value}</div>
      {hint ? <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div> : null}
    </div>
  );
});

const SectionCard = memo(function SectionCard({
  title,
  children,
  sub,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="store-card p-5 md:p-6">
      <h2 className="text-[16px] font-bold text-foreground">{title}</h2>
      {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
});

const SeverityIcon = memo(function SeverityIcon({ severity }: { severity: Finding["severity"] }) {
  if (severity === "high")
    return <ShieldAlert className="h-4 w-4 text-danger" aria-label="고위험" />;
  if (severity === "medium") return <CircleAlert className="h-4 w-4 text-risk" aria-label="주의" />;
  if (severity === "low") return <CheckCircle2 className="h-4 w-4 text-safe" aria-label="낮음" />;
  return <AlertTriangle className="h-4 w-4 text-caution" aria-label="정보" />;
});

const SummaryTab = memo(function SummaryTab({
  extracted,
  hsCandidates,
  selectedHs,
  findings,
}: {
  extracted: ExtractedProduct;
  hsCandidates: HsCandidate[];
  selectedHs?: HsCandidate;
  findings: Finding[];
}) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <SectionCard
        title="AI 추출 상품 정보"
        sub={`신뢰도 ${(extracted.confidence * 100).toFixed(0)}%`}
      >
        <dl className="grid gap-2 text-sm">
          <Row k="원문 제목" v={extracted.rawTitle} />
          <Row k="번역 제목" v={extracted.translatedTitleKo} />
          {extracted.brand ? <Row k="브랜드" v={extracted.brand} /> : null}
          <Row k="카테고리" v={extracted.category} />
          {extracted.intendedUse ? <Row k="용도" v={extracted.intendedUse} /> : null}
          {extracted.materials.length > 0 ? (
            <Row k="재질" v={extracted.materials.join(", ")} />
          ) : null}
          {extracted.ingredients.length > 0 ? (
            <Row k="성분" v={extracted.ingredients.join(", ")} />
          ) : null}
          {extracted.originCountry ? <Row k="원산지" v={extracted.originCountry} /> : null}
        </dl>
      </SectionCard>

      <SectionCard title="HS 후보" sub="AI 추정 결과로, 품목분류 확정이 아닙니다.">
        <ul className="space-y-2">
          {hsCandidates.map((c) => {
            const isSel = c.hsCode === selectedHs?.hsCode;
            return (
              <li
                key={c.hsCode}
                className={`rounded-md border p-3 ${
                  isSel ? "border-primary bg-primary-weak" : "border-border"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[13px] font-semibold text-foreground">
                    {c.hsCode}
                  </span>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    신뢰도 {c.confidence.toFixed(2)}
                  </span>
                </div>
                <div className="mt-1 text-sm font-semibold text-foreground">{c.hsNameKo}</div>
                <div className="text-[11px] text-muted-foreground">{c.hsNameEn}</div>
                <div className="mt-1 text-[12px] text-muted-foreground line-clamp-2">
                  {c.matchReason}
                </div>
              </li>
            );
          })}
        </ul>
      </SectionCard>

      <div className="md:col-span-2">
        <SectionCard title="핵심 위험 사유">
          {findings.length === 0 ? (
            <p className="text-sm text-muted-foreground">조회된 위험 사유가 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {findings.map((f, i) => (
                <li
                  key={i}
                  className={`flex gap-3 rounded-md border-l-4 bg-background p-3 ${
                    f.severity === "high"
                      ? "border-danger"
                      : f.severity === "medium"
                        ? "border-risk"
                        : f.severity === "low"
                          ? "border-safe"
                          : "border-caution"
                  }`}
                >
                  <SeverityIcon severity={f.severity} />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-foreground">{f.summary}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      출처: {f.source}
                      {f.agency ? ` · 기관: ${f.agency}` : null}
                      {f.law ? ` · 법령: ${f.law}` : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
});

const Row = memo(function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3 border-b border-border py-1.5 last:border-b-0">
      <dt className="w-20 flex-shrink-0 text-xs text-muted-foreground">{k}</dt>
      <dd className="flex-1 text-sm text-foreground">{v}</dd>
    </div>
  );
});

const ComplianceTab = memo(function ComplianceTab({
  findings,
  selectedHs,
}: {
  findings: Finding[];
  selectedHs?: HsCandidate;
}) {
  const compliance = findings.filter((f) => f.source.includes("세관장확인"));
  return (
    <SectionCard
      title="세관장확인대상 조회 결과"
      sub={selectedHs ? `HS ${selectedHs.hsCode} · ${selectedHs.hsNameKo}` : ""}
    >
      {compliance.length === 0 ? (
        <p className="text-sm text-muted-foreground">조회된 결과가 없습니다.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs">
            <tr>
              <th className="px-3 py-2 font-semibold">위험도</th>
              <th className="px-3 py-2 font-semibold">법령</th>
              <th className="px-3 py-2 font-semibold">기관</th>
              <th className="px-3 py-2 font-semibold">요약</th>
            </tr>
          </thead>
          <tbody>
            {compliance.map((f, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="px-3 py-3">
                  <SeverityIcon severity={f.severity} />
                </td>
                <td className="px-3 py-3">{f.law ?? "—"}</td>
                <td className="px-3 py-3">{f.agency ?? "—"}</td>
                <td className="px-3 py-3 text-foreground">{f.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SectionCard>
  );
});

const TaxTab = memo(function TaxTab({
  tax,
  currency,
  itemPrice,
}: {
  tax: TaxEstimate;
  currency: string;
  itemPrice: number;
}) {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      <div className="md:col-span-2">
        <SectionCard title="예상 세액 계산 (참고용)" sub={tax.disclaimer}>
          <table className="w-full text-sm">
            <tbody>
              <CalcRow k={`상품가격 (${currency})`} v={`${itemPrice} ${currency}`} />
              <CalcRow
                k={`관세환율 (${tax.fxSource})`}
                v={`1 ${currency} = ${tax.fxRate.toLocaleString()} 원`}
              />
              <CalcRow
                k="과세가격"
                v={`${tax.taxBaseKrw.toLocaleString()} 원`}
                hint="상품가격 + 배송비"
              />
              <CalcRow k={`관세 (${tax.tariffRate}%)`} v={`${tax.tariffKrw.toLocaleString()} 원`} />
              <CalcRow
                k="부가세 (10%)"
                v={`${tax.vatKrw.toLocaleString()} 원`}
                hint="(과세가격 + 관세) × 10%"
              />
              <tr className="border-t-2 border-border">
                <td className="px-3 py-3 font-bold text-foreground">총 예상 세액</td>
                <td className="px-3 py-3 text-right font-mono text-[16px] font-bold text-foreground">
                  {tax.totalTaxKrw.toLocaleString()} 원
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </SectionCard>
      </div>
      <SectionCard title="면세 기준 검토">
        <div className="text-sm">
          <div className="mb-2">
            <span className="text-muted-foreground">기준 (자가사용): </span>
            <span className="font-semibold">${tax.exemptionThresholdUsd}</span>
          </div>
          <div
            className={`rounded-md p-3 text-sm ${
              tax.exemptionExceeded ? "bg-caution-bg text-caution" : "bg-safe-bg text-safe"
            }`}
          >
            {tax.exemptionExceeded
              ? "면세 기준 초과 가능성 — 일반수입신고 대상이 될 수 있습니다."
              : "면세 기준 이하 — 단, 목록통관 배제 품목이면 적용되지 않습니다."}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            * 기준은 관세청 고시·안내에 따라 변경될 수 있습니다.
          </p>
        </div>
      </SectionCard>
    </div>
  );
});

const CalcRow = memo(function CalcRow({ k, v, hint }: { k: string; v: string; hint?: string }) {
  return (
    <tr className="border-b border-border">
      <td className="px-3 py-2.5 text-foreground">{k}</td>
      <td className="px-3 py-2.5 text-right font-mono text-foreground">{v}</td>
      <td className="px-3 py-2.5 text-[11px] text-muted-foreground">{hint ?? ""}</td>
    </tr>
  );
});

type RawMaterialEvidenceItem = {
  name: string;
  englishName?: string;
  code?: string;
  importYn?: string;
  originCountryCode?: string;
  gmoYn?: string;
  useFlag?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readString = (record: Record<string, unknown>, key: string) => {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
};

const rawMaterialEvidence = (finding: Finding): RawMaterialEvidenceItem[] => {
  const evidence = finding.evidence;
  if (!isRecord(evidence) || !Array.isArray(evidence.rawMaterials)) return [];

  return evidence.rawMaterials.filter(isRecord).flatMap((item) => {
    const name = readString(item, "name");
    if (!name) return [];
    return [
      {
        name,
        englishName: readString(item, "englishName"),
        code: readString(item, "code"),
        importYn: readString(item, "importYn"),
        originCountryCode: readString(item, "originCountryCode"),
        gmoYn: readString(item, "gmoYn"),
        useFlag: readString(item, "useFlag"),
      },
    ];
  });
};

const rawMaterialMeta = (item: RawMaterialEvidenceItem) =>
  [
    item.code ? `코드 ${item.code}` : undefined,
    item.importYn ? `수입 ${item.importYn}` : undefined,
    item.originCountryCode ? `원산지 ${item.originCountryCode}` : undefined,
    item.gmoYn ? `GMO ${item.gmoYn}` : undefined,
    item.useFlag ? `사용 ${item.useFlag}` : undefined,
  ].filter(Boolean);

const isFoodRelatedFinding = (finding: Finding) => {
  const source = finding.source.toLowerCase();

  return (
    finding.source.includes("식약처") ||
    finding.source.includes("식품의약품안전처") ||
    finding.source.includes("성분") ||
    finding.source.includes("수입식품") ||
    finding.source.includes("식품 원재료") ||
    source.includes("mfds") ||
    source.includes("foodsafetykorea")
  );
};

const FoodTab = memo(function FoodTab({
  findings,
  extracted,
}: {
  findings: Finding[];
  extracted: ExtractedProduct;
}) {
  const food = findings.filter(isFoodRelatedFinding);
  const hasExtractedFoodSignals =
    extracted.ingredients.length > 0 || extracted.materials.length > 0;
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <SectionCard title="식약처 데이터 조회 결과">
        {food.length === 0 ? (
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              {hasExtractedFoodSignals
                ? "식약처 공공데이터에서 추출 성분과 일치하는 항목은 확인되지 않았습니다."
                : "식품·건기식·성분 관련 신호가 감지되지 않았습니다."}
            </p>
            {hasExtractedFoodSignals ? (
              <p className="text-[12px]">
                추출 성분은 우측 목록을 기준으로 판매자 성분표와 관계기관 안내를 별도 확인해야
                합니다.
              </p>
            ) : null}
          </div>
        ) : (
          <ul className="space-y-2">
            {food.map((f, i) => {
              const rawMaterials = rawMaterialEvidence(f);

              return (
                <li key={i} className="rounded-md border border-border bg-background p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <SeverityIcon severity={f.severity} />
                    {f.summary}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{f.source}</div>
                  {rawMaterials.length > 0 ? (
                    <div className="mt-3">
                      <div className="text-[11px] font-semibold text-muted-foreground">
                        확인된 원재료
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {rawMaterials.map((item) => {
                          const meta = rawMaterialMeta(item);

                          return (
                            <span
                              key={`${item.name}:${item.code ?? ""}`}
                              className="rounded-md border border-border bg-muted px-2 py-1 text-xs text-foreground"
                            >
                              <span className="font-semibold">{item.name}</span>
                              {item.englishName ? (
                                <span className="ml-1 text-muted-foreground">
                                  ({item.englishName})
                                </span>
                              ) : null}
                              {meta.length > 0 ? (
                                <span className="ml-1 text-[10px] text-muted-foreground">
                                  {meta.join(" · ")}
                                </span>
                              ) : null}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
      <SectionCard title="추출된 성분·재질">
        {extracted.ingredients.length === 0 && extracted.materials.length === 0 ? (
          <p className="text-sm text-muted-foreground">추출된 성분 정보가 없습니다.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {extracted.ingredients.length > 0 ? (
              <div>
                <div className="text-xs font-semibold text-muted-foreground">성분</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {extracted.ingredients.map((ing) => (
                    <span key={ing} className="rounded-md bg-muted px-2 py-0.5 text-xs">
                      {ing}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {extracted.materials.length > 0 ? (
              <div>
                <div className="text-xs font-semibold text-muted-foreground">재질</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {extracted.materials.map((m) => (
                    <span key={m} className="rounded-md bg-muted px-2 py-0.5 text-xs">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </SectionCard>
    </div>
  );
});

const EvidenceTab = memo(function EvidenceTab({
  evidence,
}: {
  evidence: { source: string; purpose: string; timestamp: string; confidence: string }[];
}) {
  return (
    <SectionCard title="사용한 데이터·API 근거" sub="결과 생성에 활용된 출처와 조회 시각">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left text-xs">
          <tr>
            <th className="px-3 py-2 font-semibold">출처</th>
            <th className="px-3 py-2 font-semibold">용도</th>
            <th className="px-3 py-2 font-semibold">신뢰도</th>
            <th className="px-3 py-2 font-semibold">조회 시각</th>
          </tr>
        </thead>
        <tbody>
          {evidence.map((e, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              <td className="px-3 py-3 font-semibold text-foreground">{e.source}</td>
              <td className="px-3 py-3 text-muted-foreground">{e.purpose}</td>
              <td className="px-3 py-3">
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs">{e.confidence}</span>
              </td>
              <td className="px-3 py-3 font-mono text-[12px] text-muted-foreground">
                {new Date(e.timestamp).toLocaleString("ko-KR")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-[11px] text-muted-foreground">
        * 공공 API 실패 또는 무응답 시 결과에는 fallback 근거가 함께 기록됩니다.
      </p>
    </SectionCard>
  );
});

const NextTab = memo(function NextTab({
  checklist,
  scanId,
}: {
  checklist: ChecklistItem[];
  scanId: string;
}) {
  return (
    <SectionCard title="다음 단계" sub="구매 전 직접 확인하거나 판매자에게 요청해야 할 항목">
      <ul className="space-y-2">
        {checklist.slice(0, 3).map((c) => (
          <li
            key={c.id}
            className="flex items-start gap-3 rounded-md border border-border bg-background p-3"
          >
            <FileSearch className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
            <div>
              <div className="text-sm font-semibold text-foreground">{c.title}</div>
              <div className="text-[12px] text-muted-foreground">{c.reason}</div>
            </div>
          </li>
        ))}
      </ul>
      <Link to="/scan/$scanId/checklist" params={{ scanId }} className="apple-button mt-4">
        전체 체크리스트 보기
        <ArrowRight className="h-4 w-4" />
      </Link>
    </SectionCard>
  );
});
