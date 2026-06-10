import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { DiagnosisStepper } from "@/components/DiagnosisStepper";
import { RiskBadge } from "@/components/RiskBadge";
import { ScanRoutePending } from "@/components/ScanRoutePending";
import { getScan } from "@/lib/get-scan.functions";
import type { ChecklistItem, ExtractedProduct, RiskLevel } from "@/lib/scan-logic";

export const Route = createFileRoute("/scan/$scanId/checklist")({
  loader: async ({ params }) => {
    try {
      return await getScan({ data: { scanId: params.scanId } });
    } catch {
      throw notFound();
    }
  },
  head: () => ({
    meta: [
      { title: "구매 전 체크리스트 — 직구 세이프패스 AI" },
      {
        name: "description",
        content: "구매 전에 판매자에게 확인하거나 준비해야 할 항목을 단계별로 안내합니다.",
      },
    ],
  }),
  component: ChecklistPage,
  pendingComponent: () => <ScanRoutePending current="result" />,
});

function ChecklistPage() {
  const row = Route.useLoaderData();
  const checklist = (row.checklist as unknown as ChecklistItem[]) ?? [];
  const extracted = row.extracted as unknown as ExtractedProduct;
  const level = (row.risk_level ?? "safe") as RiskLevel;
  const [done, setDone] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function toggle(id: string) {
    setDone((d) => {
      const next = new Set(d);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function copySellerMessage(c: ChecklistItem) {
    const msg = `안녕하세요. 한국에서 직구로 구매를 검토 중입니다.\n\n[${c.title}] 관련 자료(${c.materials.join(", ")})를 보내주실 수 있을까요?\n\n이유: ${c.reason}`;
    navigator.clipboard.writeText(msg);
    setCopiedId(c.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const completed = done.size;
  const total = checklist.length;

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-[900px] px-5 py-8 md:px-8 md:py-10">
        <Link
          to="/scan/$scanId/result"
          params={{ scanId: row.id }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> 진단 결과로 돌아가기
        </Link>
        <div className="mt-3">
          <DiagnosisStepper current="result" />
        </div>

        <header className="store-card mt-5 p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-medium text-muted-foreground">구매 전 체크리스트</div>
              <h1 className="mt-1 text-xl font-bold text-foreground md:text-2xl">
                {extracted?.translatedTitleKo ?? "구매 전 체크리스트"}
              </h1>
            </div>
            <RiskBadge level={level} />
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${total ? (completed / total) * 100 : 0}%` }}
              />
            </div>
            <div className="text-xs font-semibold text-muted-foreground">
              {completed} / {total} 완료
            </div>
          </div>
        </header>

        <ol className="mt-5 space-y-3">
          {checklist.map((c, idx) => {
            const isDone = done.has(c.id);
            return (
              <li
                key={c.id}
                className={`rounded-[24px] border bg-surface p-4 shadow-soft transition ${
                  isDone ? "border-safe bg-safe-bg/30 opacity-70" : "border-border"
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    aria-label={isDone ? "완료 취소" : "완료 표시"}
                    onClick={() => toggle(c.id)}
                    className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border-2 transition ${
                      isDone
                        ? "border-safe bg-safe text-white"
                        : "border-border bg-surface hover:border-primary"
                    }`}
                  >
                    {isDone && <Check className="h-3.5 w-3.5" />}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h2
                        className={`text-[15px] font-bold text-foreground ${isDone ? "line-through" : ""}`}
                      >
                        {idx + 1}. {c.title}
                      </h2>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{c.reason}</p>

                    {c.materials.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          필요 자료:
                        </span>
                        {c.materials.map((m) => (
                          <span key={m} className="rounded-md bg-muted px-2 py-0.5 text-xs">
                            {m}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-2 text-[12px] text-muted-foreground">
                      <span className="font-semibold text-foreground">완료 조건:</span>{" "}
                      {c.doneCondition}
                    </div>

                    <button
                      onClick={() => copySellerMessage(c)}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted"
                    >
                      {copiedId === c.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-safe" /> 복사됨
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" /> 판매자 문의 문구 복사
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="store-card-compact mt-6 p-4 text-[12px] leading-relaxed text-muted-foreground">
          체크리스트 완료는 본 브라우저에만 표시되며 저장되지 않습니다. 결과는 모두 참고용이며 통관
          가능 여부·반입 금지·세액을 확정하지 않습니다.
        </div>
      </main>
    </div>
  );
}
