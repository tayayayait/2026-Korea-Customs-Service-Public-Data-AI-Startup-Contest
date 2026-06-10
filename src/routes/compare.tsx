import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BarChart3, CheckCircle2, Scale } from "lucide-react";

import { AppHeader } from "@/components/AppHeader";
import { RiskBadge } from "@/components/RiskBadge";
import {
  buildComparisonRows,
  pickRecommendedComparison,
  type ComparisonInput,
} from "@/lib/scan-compare";
import { listScanHistory, type ScanHistoryItem } from "@/lib/scan-history.server";

export const Route = createFileRoute("/compare")({
  loader: async () => listScanHistory(),
  head: () => ({
    meta: [
      { title: "상품 비교 — 직구 세이프패스 AI" },
      {
        name: "description",
        content: "최근 진단한 상품 2~4개를 위험 점수와 예상 세액 기준으로 비교합니다.",
      },
    ],
  }),
  component: ComparePage,
});

function ComparePage() {
  const history = Route.useLoaderData() as ScanHistoryItem[];
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    history.slice(0, 4).map((item) => item.id),
  );

  const candidates = useMemo<ComparisonInput[]>(
    () =>
      history
        .filter((item) => selectedIds.includes(item.id))
        .map((item) => ({
          id: item.id,
          title: item.title,
          riskLevel: item.riskLevel,
          riskScore: item.riskScore,
          totalTaxKrw: item.totalTaxKrw,
          selectedHsCode: item.selectedHsCode,
          priceFormatted: item.priceFormatted,
          origin: item.origin,
        })),
    [history, selectedIds],
  );
  const rows = useMemo(() => buildComparisonRows(candidates), [candidates]);
  const recommended = pickRecommendedComparison(rows);

  const toggle = (id: string) => {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 4) return current;
      return [...current, id];
    });
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="app-container py-8 md:py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-muted-foreground">상품 비교</div>
            <h1 className="mt-1 text-xl font-bold text-foreground md:text-2xl">
              위험도와 예상 세액을 나란히 비교하세요
            </h1>
          </div>
          <Scale className="h-6 w-6 text-primary" />
        </div>

        <section className="store-card mt-5 p-5">
          <h2 className="text-[16px] font-bold text-foreground">비교 대상 선택</h2>
          {history.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              저장된 진단 이력이 없습니다. 먼저 진단을 실행하세요.
            </p>
          ) : (
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {history.map((item) => {
                const checked = selectedIds.includes(item.id);
                const disabled = !checked && selectedIds.length >= 4;
                return (
                  <label
                    key={item.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${
                      checked ? "border-primary bg-primary-weak" : "border-border bg-background"
                    } ${disabled ? "opacity-45" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggle(item.id)}
                      className="mt-1 h-4 w-4 accent-[var(--primary)]"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {item.title}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        HS {item.selectedHsCode} · {item.riskScore}점 ·{" "}
                        {item.totalTaxKrw.toLocaleString()}원
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </section>

        {recommended && rows.length >= 2 && (
          <section className="mt-5 rounded-[24px] border border-primary/30 bg-primary-weak p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <div className="text-sm font-bold text-foreground">
                  추천 후보: {recommended.title}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{recommended.reason}</p>
              </div>
            </div>
          </section>
        )}

        <section className="store-card mt-5 overflow-hidden">
          {rows.length < 2 ? (
            <div className="p-8 text-center">
              <BarChart3 className="mx-auto h-8 w-8 text-muted-foreground" />
              <h2 className="mt-3 text-[16px] font-bold text-foreground">2개 이상 선택하세요</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                비교는 최근 진단 결과 2~4개를 기준으로 실행됩니다.
              </p>
              <Link to="/history" className="mt-4 inline-block text-sm font-semibold text-primary">
                이력 보기 →
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs">
                <tr>
                  <th className="px-3 py-2 font-semibold">상품</th>
                  <th className="px-3 py-2 font-semibold">가격</th>
                  <th className="px-3 py-2 font-semibold">원산지</th>
                  <th className="px-3 py-2 font-semibold">위험</th>
                  <th className="px-3 py-2 font-semibold">점수</th>
                  <th className="px-3 py-2 font-semibold">예상 세액</th>
                  <th className="px-3 py-2 font-semibold">HS</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-3 py-3 font-semibold text-foreground">{row.title}</td>
                    <td className="px-3 py-3 font-mono text-xs text-foreground">
                      {row.priceFormatted}
                    </td>
                    <td className="px-3 py-3 text-xs text-foreground">{row.origin}</td>
                    <td className="px-3 py-3">
                      <RiskBadge level={row.riskLevel} />
                    </td>
                    <td className="px-3 py-3 font-mono">{row.riskScore}</td>
                    <td className="px-3 py-3 font-mono">
                      {row.totalTaxKrw.toLocaleString()}원
                      <span className="ml-1 text-xs text-muted-foreground">
                        #{row.totalCostRank}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs">{row.selectedHsCode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}
