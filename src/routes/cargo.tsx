import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { PackageSearch, Search, Plane, Clock, CheckCircle2, MapPin } from "lucide-react";

import { AppHeader } from "@/components/AppHeader";
import { lookupCargoClearanceProgress } from "@/lib/cargo.functions";
import { buildCargoSummary, formatCargoDate, formatCargoDateTime } from "@/lib/cargo-presentation";
import type { CargoClearanceProgressItem } from "@/lib/api/unipass-api.server";

export const Route = createFileRoute("/cargo")({
  head: () => ({
    meta: [
      { title: "화물 통관 진행 조회 — 직구 세이프패스 AI" },
      {
        name: "description",
        content: "UNI-PASS 화물통관진행정보를 조회합니다.",
      },
    ],
  }),
  component: CargoPage,
});

function CargoPage() {
  const lookup = useServerFn(lookupCargoClearanceProgress);
  const [searchType, setSearchType] = useState<"HBL" | "MGT">("HBL");

  const [cargoManagementNumber, setCargoManagementNumber] = useState("");
  const [houseBlNo, setHouseBlNo] = useState("");
  const [blYear, setBlYear] = useState(String(new Date().getFullYear()));

  const [items, setItems] = useState<CargoClearanceProgressItem[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setMessage("");
    setItems([]);
    try {
      const result = await lookup({
        data: {
          cargoManagementNumber: searchType === "MGT" ? cargoManagementNumber : "",
          houseBlNo: searchType === "HBL" ? houseBlNo : "",
          masterBlNo: "", // 일반 유저 대상이므로 생략
          blYear: searchType === "HBL" ? blYear : "",
        },
      });
      setItems(result.items);
      if (result.items.length === 0) setMessage("조회 결과가 없습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "화물 조회에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const activeItem = items[0]; // 우선 첫 번째 결과만 노출 (대부분 HBL 1건 매칭)
  const activeSummary = activeItem ? buildCargoSummary(activeItem) : undefined;

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="app-container py-8 md:py-10 max-w-4xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-muted-foreground">UNI-PASS</div>
            <h1 className="mt-1 text-xl font-bold text-foreground md:text-2xl">
              화물 통관 진행 상태를 조회하세요
            </h1>
          </div>
          <PackageSearch className="h-6 w-6 text-primary" />
        </div>

        <section className="store-card mt-6 p-1">
          <div className="flex bg-muted/50 p-1 rounded-t-[20px]">
            <button
              onClick={() => setSearchType("HBL")}
              className={`flex-1 py-2.5 text-[13px] font-semibold transition-colors rounded-[16px] ${searchType === "HBL" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              운송장 번호 (H B/L)
            </button>
            <button
              onClick={() => setSearchType("MGT")}
              className={`flex-1 py-2.5 text-[13px] font-semibold transition-colors rounded-[16px] ${searchType === "MGT" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              화물관리번호
            </button>
          </div>

          <div className="p-5">
            {searchType === "HBL" ? (
              <div className="grid gap-4 md:grid-cols-[100px_1fr]">
                <Field label="B/L 연도">
                  <input
                    value={blYear}
                    onChange={(event) => setBlYear(event.target.value)}
                    className="input tabular"
                    maxLength={4}
                  />
                </Field>
                <Field label="운송장 번호 (House B/L)">
                  <input
                    value={houseBlNo}
                    onChange={(event) => setHouseBlNo(event.target.value)}
                    className="input"
                    placeholder="예: 6078123456789"
                  />
                </Field>
              </div>
            ) : (
              <Field label="화물관리번호">
                <input
                  value={cargoManagementNumber}
                  onChange={(event) => setCargoManagementNumber(event.target.value)}
                  className="input"
                  placeholder="예: 26KE..."
                />
              </Field>
            )}

            <button
              type="button"
              onClick={() => void submit()}
              disabled={loading}
              className="apple-button mt-5 disabled:opacity-45 w-full md:w-auto"
            >
              <Search className="h-4 w-4" />
              {loading ? "조회 중..." : "조회하기"}
            </button>

            {message && <div className="mt-4 text-sm font-medium text-destructive">{message}</div>}
          </div>
        </section>

        {activeItem && activeSummary && (
          <section className="mt-8 space-y-6">
            {/* 요약 정보 카드 */}
            <div className="store-card p-6 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-5 mb-5">
                <div>
                  <h3 className="font-bold text-lg text-foreground truncate max-w-full">
                    {activeSummary.productName}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Plane className="w-3.5 h-3.5" />
                      {activeSummary.carrierName}
                    </span>
                    {activeSummary.cargoType !== "-" && (
                      <>
                        <span>•</span>
                        <span>{activeSummary.cargoType}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="shrink-0 self-start rounded-full bg-primary/10 px-3 py-1.5 text-sm font-bold text-primary md:self-auto">
                  <div>{activeSummary.primaryStatus}</div>
                  {activeSummary.clearanceStatus && (
                    <div className="mt-0.5 text-[11px] font-semibold text-primary/75">
                      통관: {activeSummary.clearanceStatus}
                    </div>
                  )}
                </div>
              </div>

              {activeSummary.identifiers.length > 0 && (
                <div className="mb-5 grid gap-3 border-b border-border/50 pb-5 text-[13px] sm:grid-cols-2 md:grid-cols-4">
                  {activeSummary.identifiers.map((identifier) => (
                    <div key={identifier.label}>
                      <div className="mb-1 text-muted-foreground">{identifier.label}</div>
                      <div className="break-all font-semibold text-foreground">
                        {identifier.value}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-[13px] md:grid-cols-3">
                <div>
                  <div className="text-muted-foreground mb-1">{activeSummary.routeLabel}</div>
                  <div className="font-semibold text-foreground">{activeSummary.routeValue}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">입항일자</div>
                  <div className="font-semibold text-foreground tabular-nums">
                    {formatCargoDate(activeItem.etprDt)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">입항세관</div>
                  <div className="font-semibold text-foreground">
                    {activeSummary.arrivalCustoms}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">포장개수</div>
                  <div className="font-semibold text-foreground">{activeSummary.quantityValue}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">총중량</div>
                  <div className="font-semibold text-foreground">{activeSummary.weightValue}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">통관 처리일시</div>
                  <div className="font-semibold text-foreground tabular-nums">
                    {formatCargoDateTime(activeItem.prcsDttm)}
                  </div>
                </div>
              </div>
            </div>

            {/* 타임라인 */}
            {activeItem.details && activeItem.details.length > 0 && (
              <div className="store-card p-6">
                <h3 className="font-bold text-foreground mb-6 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  통관 진행 상세 내역
                </h3>
                <div className="relative border-l-2 border-muted ml-3 space-y-6">
                  {activeItem.details.map((detail, idx) => {
                    const isLatest = idx === 0;
                    return (
                      <div key={idx} className="relative pl-6">
                        <div
                          className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 bg-background ${isLatest ? "border-primary shadow-[0_0_0_3px_rgba(59,130,246,0.2)]" : "border-muted-foreground"}`}
                        ></div>
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4 mb-1">
                          <h4
                            className={`font-bold ${isLatest ? "text-primary" : "text-foreground"}`}
                          >
                            {detail.cargTrcnRelaBsopTpcd || "상태 업데이트"}
                          </h4>
                          <span className="text-xs text-muted-foreground tabular-nums sm:text-right shrink-0">
                            {formatCargoDateTime(detail.prcsDttm)}
                          </span>
                        </div>
                        <div className="text-[13px] text-muted-foreground mt-1 space-y-1">
                          {detail.shedNm && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3 h-3" />
                              장치장: {detail.shedNm}
                            </div>
                          )}
                          {detail.rlbrCn && (
                            <div className="flex items-start gap-1.5">
                              <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />
                              <span className="leading-snug">{detail.rlbrCn}</span>
                            </div>
                          )}
                          {detail.dclrNo && <div>신고번호: {detail.dclrNo}</div>}
                          {detail.rlbrDttm && (
                            <div>반출입일시: {formatCargoDateTime(detail.rlbrDttm)}</div>
                          )}
                          {(detail.pckGcnt || detail.wght) && (
                            <div>
                              화물수량: {detail.pckGcnt || "-"} {detail.pckUt || ""}
                              {detail.wght ? ` / ${detail.wght} ${detail.wghtUt || ""}` : ""}
                            </div>
                          )}
                          {detail.bfhnGdncCn && <div>사전안내: {detail.bfhnGdncCn}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-foreground">{label}</span>
      {children}
    </label>
  );
}
