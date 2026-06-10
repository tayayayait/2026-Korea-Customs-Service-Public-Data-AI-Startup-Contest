import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, Database, FileSearch, Loader2, ShieldAlert } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { DiagnosisStepper } from "@/components/DiagnosisStepper";
import { RiskBadge } from "@/components/RiskBadge";
import { ScanRoutePending } from "@/components/ScanRoutePending";
import { getScan } from "@/lib/get-scan.functions";
import { confirmScanReview } from "@/lib/scans.functions";
import type { ExtractedProduct, Finding, HsCandidate, RiskLevel } from "@/lib/scan-logic";

export const Route = createFileRoute("/scan/$scanId/review")({
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
        title: `AI 추출 확인 · ${
          loaderData?.extracted
            ? (loaderData.extracted as unknown as ExtractedProduct).translatedTitleKo
            : "직구 세이프패스 AI"
        }`,
      },
    ],
  }),
  component: ReviewPage,
  pendingComponent: () => <ScanRoutePending current="review" />,
});

function ReviewPage() {
  const navigate = useNavigate();
  const confirmReview = useServerFn(confirmScanReview);
  const row = Route.useLoaderData();
  const extracted = row.extracted as unknown as ExtractedProduct;
  const hsCandidates = (row.hs_candidates as unknown as HsCandidate[]) ?? [];
  const findings = (row.findings as unknown as Finding[]) ?? [];
  const level = (row.risk_level ?? "safe") as RiskLevel;
  const initialSelectedHs =
    hsCandidates.find((candidate) => candidate.hsCode === row.selected_hs_code) ?? hsCandidates[0];
  const [selectedHsCode, setSelectedHsCode] = useState(initialSelectedHs?.hsCode ?? "");
  const selectedHs =
    hsCandidates.find((candidate) => candidate.hsCode === selectedHsCode) ?? initialSelectedHs;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    rawTitle: extracted.rawTitle,
    translatedTitleKo: extracted.translatedTitleKo,
    brand: extracted.brand,
    category: extracted.category,
    intendedUse: extracted.intendedUse,
    originCountry: extracted.originCountry,
    ingredientsText: extracted.ingredients.join(", "),
    materialsText: extracted.materials.join(", "),
    riskKeywordsText: extracted.riskKeywords.join(", "),
  });

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  async function submitReview() {
    if (!selectedHsCode) {
      toast.error("HS 후보를 선택하세요.");
      return;
    }

    setSaving(true);
    try {
      const result = await confirmReview({
        data: {
          scanId: row.id,
          selectedHsCode,
          extracted: {
            ...form,
            confidence: extracted.confidence,
          },
        },
      });
      toast.success("검토 내용을 반영했습니다.");
      navigate({ to: "/scan/$scanId/result", params: { scanId: result.scanId } });
    } catch (error) {
      const message = error instanceof Error ? error.message : "검토 내용을 저장하지 못했습니다.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="app-container py-8 md:py-10">
        <Link to="/" className="text-xs font-semibold text-muted-foreground hover:text-foreground">
          새 진단
        </Link>
        <div className="mt-3">
          <DiagnosisStepper current="review" />
        </div>

        <section className="store-card mt-5 p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-medium text-muted-foreground">AI 추출 확인</div>
              <h1 className="mt-1 text-xl font-bold text-foreground md:text-2xl">
                {form.translatedTitleKo || form.rawTitle}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                추출값을 수정하고 HS 후보를 선택한 뒤 결과를 다시 계산하세요.
              </p>
            </div>
            <RiskBadge level={level} size="lg" />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Metric label="AI 신뢰도" value={`${Math.round(extracted.confidence * 100)}%`} />
            <Metric label="HS 후보" value={`${hsCandidates.length}건`} />
            <Metric label="공공데이터 신호" value={`${findings.length}건`} />
          </div>
        </section>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <ReviewCard title="추출된 상품 정보" icon={<FileSearch className="h-4 w-4" />}>
            <div className="grid gap-3">
              <EditableField
                label="원문명"
                value={form.rawTitle}
                onChange={(value) => updateField("rawTitle", value)}
              />
              <EditableField
                label="한국어명"
                value={form.translatedTitleKo}
                onChange={(value) => updateField("translatedTitleKo", value)}
              />
              <EditableField
                label="브랜드"
                value={form.brand}
                onChange={(value) => updateField("brand", value)}
              />
              <EditableField
                label="카테고리"
                value={form.category}
                onChange={(value) => updateField("category", value)}
              />
              <EditableField
                label="용도"
                value={form.intendedUse}
                onChange={(value) => updateField("intendedUse", value)}
              />
              <EditableField
                label="원산지"
                value={form.originCountry}
                onChange={(value) => updateField("originCountry", value)}
              />
              <EditableField
                label="성분"
                value={form.ingredientsText}
                onChange={(value) => updateField("ingredientsText", value)}
              />
              <EditableField
                label="재질"
                value={form.materialsText}
                onChange={(value) => updateField("materialsText", value)}
              />
              <EditableField
                label="위험 키워드"
                value={form.riskKeywordsText}
                onChange={(value) => updateField("riskKeywordsText", value)}
              />
            </div>
          </ReviewCard>

          <ReviewCard title="HS 후보 선택" icon={<ShieldAlert className="h-4 w-4" />}>
            {hsCandidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">HS 후보가 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {hsCandidates.map((candidate) => {
                  const active = candidate.hsCode === selectedHs?.hsCode;
                  return (
                    <button
                      key={candidate.hsCode}
                      type="button"
                      onClick={() => setSelectedHsCode(candidate.hsCode)}
                      className={`w-full rounded-md border p-3 text-left transition ${
                        active
                          ? "border-primary bg-primary-weak"
                          : "border-border bg-background hover:border-primary"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-mono text-sm font-bold text-foreground">
                          {candidate.hsCode}
                        </div>
                        <div className="text-xs font-semibold text-muted-foreground">
                          {Math.round(candidate.confidence * 100)}%
                        </div>
                      </div>
                      <div className="mt-1 text-sm font-semibold text-foreground">
                        {candidate.hsNameKo}
                      </div>
                      <div className="text-xs text-muted-foreground">{candidate.hsNameEn}</div>
                      <p className="mt-2 text-xs text-muted-foreground">{candidate.matchReason}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </ReviewCard>

          <div className="md:col-span-2">
            <ReviewCard title="공공데이터 조회 요약" icon={<Database className="h-4 w-4" />}>
              {findings.length === 0 ? (
                <p className="text-sm text-muted-foreground">조회된 공공데이터 신호가 없습니다.</p>
              ) : (
                <ul className="grid gap-2 md:grid-cols-2">
                  {findings.slice(0, 4).map((finding, index) => (
                    <li key={index} className="rounded-md border border-border bg-background p-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        {finding.source}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{finding.summary}</p>
                    </li>
                  ))}
                </ul>
              )}
            </ReviewCard>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Link to="/" className="quiet-button">
            다시 입력
          </Link>
          <button
            type="button"
            disabled={saving}
            onClick={() => void submitReview()}
            className="apple-button disabled:opacity-45"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            결과 다시 계산
          </button>
        </div>
      </main>
    </div>
  );
}

function ReviewCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="store-card p-5">
      <h2 className="flex items-center gap-2 text-[16px] font-bold text-foreground">
        {icon}
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-4">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-[18px] font-bold text-foreground">{value}</div>
    </div>
  );
}

function EditableField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
      />
    </label>
  );
}
