import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Clock3, FileSearch, Search, Trash2, AlertTriangle } from "lucide-react";

import { AppHeader } from "@/components/AppHeader";
import { RiskBadge } from "@/components/RiskBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { listScanHistory, deleteScanHistory, type ScanHistoryItem } from "@/lib/scan-history.server";
import type { RiskLevel } from "@/lib/scan-logic";

export const Route = createFileRoute("/history")({
  loader: async () => listScanHistory(),
  head: () => ({
    meta: [
      { title: "진단 이력 — 직구 세이프패스 AI" },
      {
        name: "description",
        content: "최근 해외직구 통관 위험 진단 이력을 확인합니다.",
      },
    ],
  }),
  component: HistoryPage,
});

const RISK_FILTERS = [
  { value: "all", label: "전체" },
  { value: "safe", label: "안전" },
  { value: "caution", label: "주의" },
  { value: "high_risk", label: "고위험" },
  { value: "blocked_unknown", label: "확인 필요" },
] as const;

const PERIOD_FILTERS = [
  { value: "all", label: "전체 기간" },
  { value: "7", label: "최근 7일" },
  { value: "30", label: "최근 30일" },
  { value: "90", label: "최근 90일" },
] as const;

function HistoryPage() {
  const router = useRouter();
  const rows = Route.useLoaderData() as ScanHistoryItem[];
  const [query, setQuery] = useState("");
  const [risk, setRisk] = useState<(typeof RISK_FILTERS)[number]["value"]>("all");
  const [period, setPeriod] = useState<(typeof PERIOD_FILTERS)[number]["value"]>("all");

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedDeleteId, setSelectedDeleteId] = useState<string | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedDeleteId(id);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedDeleteId) return;
    try {
      await deleteScanHistory({ data: { id: selectedDeleteId } });
      router.invalidate();
      setDeleteModalOpen(false);
      setSelectedDeleteId(null);
    } catch (err) {
      console.error(err);
      alert("삭제에 실패했습니다.");
    }
  };

  const filtered = useMemo(() => {
    const lower = query.trim().toLowerCase();
    const now = Date.now();
    return rows.filter((item) => {
      const matchesRisk = risk === "all" || item.riskLevel === risk;
      const matchesQuery =
        !lower ||
        item.title.toLowerCase().includes(lower) ||
        item.brand.toLowerCase().includes(lower) ||
        item.selectedHsCode.toLowerCase().includes(lower);

      let matchesPeriod = true;
      if (period !== "all") {
        const days = parseInt(period, 10);
        const itemDate = new Date(item.createdAt).getTime();
        matchesPeriod = now - itemDate <= days * 24 * 60 * 60 * 1000;
      }

      return matchesRisk && matchesQuery && matchesPeriod;
    });
  }, [query, risk, period, rows]);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="app-container py-8 md:py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-muted-foreground">진단 이력</div>
            <h1 className="mt-1 text-xl font-bold text-foreground md:text-2xl">
              최근 진단 결과를 다시 확인하세요
            </h1>
          </div>
          <Link to="/scan/new" className="apple-button min-h-10 px-4">
            <FileSearch className="h-4 w-4" />
            상세 진단
          </Link>
        </div>

        <section className="store-card mt-5 p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                aria-label="검색어"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="상품명, 브랜드, HS 코드 검색"
                className="input pl-9"
              />
            </label>
            <select
              aria-label="기간 필터"
              value={period}
              onChange={(event) => setPeriod(event.target.value as typeof period)}
              className="input md:w-[150px]"
            >
              {PERIOD_FILTERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <select
              aria-label="위험도 필터"
              value={risk}
              onChange={(event) => setRisk(event.target.value as typeof risk)}
              className="input md:w-[150px]"
            >
              {RISK_FILTERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="mt-5">
          {filtered.length === 0 ? (
            <div className="store-card p-8 text-center">
              <Clock3 className="mx-auto h-8 w-8 text-muted-foreground" />
              <h2 className="mt-3 text-[16px] font-bold text-foreground">표시할 이력이 없습니다</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                검색 조건을 바꾸거나 새 진단을 실행하세요.
              </p>
            </div>
          ) : (
            <ul className="grid gap-3">
              {filtered.map((item) => (
                <li key={item.id} className="relative">
                  <Link
                    to="/scan/$scanId/result"
                    params={{ scanId: item.id }}
                    className="grid gap-3 rounded-[24px] border border-border bg-surface p-4 shadow-soft transition hover:border-primary hover:bg-white md:grid-cols-[1fr_150px]"
                  >
                    <div className="min-w-0 pr-8">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-[16px] font-bold text-foreground">
                          {item.title}
                        </h2>
                        {item.brand && (
                          <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                            {item.brand}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString("ko-KR")} · {item.purchase} · HS{" "}
                        {item.selectedHsCode}
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-foreground">{item.summary}</p>
                      <div className="mt-2 text-xs font-semibold text-primary">{item.action}</div>
                    </div>
                    <div className="flex items-center justify-between gap-3 md:flex-col md:items-end md:justify-center">
                      <RiskBadge level={item.riskLevel as RiskLevel} />
                      <span className="text-sm font-bold text-foreground">
                        {item.riskScore} / 100
                      </span>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteClick(e, item.id)}
                    className="absolute right-3 top-3 rounded-full p-2 text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors z-10"
                    aria-label="삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <AlertDialogContent className="sm:max-w-[400px] overflow-hidden border-none rounded-[32px] p-0 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] gap-0">
          <div className="p-8 pb-6 flex flex-col items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500 mb-5 ring-8 ring-red-50/50">
              <Trash2 className="h-7 w-7" strokeWidth={2} />
            </div>
            <AlertDialogHeader className="w-full flex flex-col items-center space-y-3">
              <AlertDialogTitle className="text-center text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                이력을 삭제할까요?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center text-[15px] leading-relaxed text-slate-500">
                이 작업은 되돌릴 수 없습니다. 삭제된 진단 결과는 영구적으로 지워집니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <div className="bg-slate-50/80 px-8 py-5 flex flex-col-reverse sm:flex-row gap-3 justify-center w-full border-t border-slate-100">
            <AlertDialogCancel 
              className="mt-0 sm:mt-0 flex-1 rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 h-12 sm:h-14 text-[15px] font-semibold transition-colors shadow-sm"
              onClick={() => setSelectedDeleteId(null)}
            >
              취소
            </AlertDialogCancel>
            <AlertDialogAction 
              className="flex-1 rounded-2xl bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-200 h-12 sm:h-14 text-[15px] font-bold transition-all focus:ring-4 focus:ring-red-100"
              onClick={handleConfirmDelete}
            >
              삭제하기
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
