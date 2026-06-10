import { useEffect, useState } from "react";
import { CheckCircle2, Database, FileSearch, Loader2 } from "lucide-react";

import { getAnalysisProgressState } from "@/lib/analysis-progress";

const STEPS = [
  { label: "AI 추출", description: "상품명, 성분, 용도, HS 후보 분석", Icon: FileSearch },
  { label: "공공데이터", description: "관세청·식약처 API 조회", Icon: Database },
  { label: "결과 저장", description: "위험도, 세액, 체크리스트 정리", Icon: CheckCircle2 },
];

export function AnalysisProgress({ startedAt = Date.now() }: { startedAt?: number }) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const progress = getAnalysisProgressState(elapsedMs);

  useEffect(() => {
    const tick = () => setElapsedMs(Date.now() - startedAt);
    tick();
    const timer = window.setInterval(tick, 500);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  return (
    <div className="store-card p-5 md:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary-weak text-primary">
          <Loader2 className="h-5 w-5 animate-spin" />
        </span>
        <div>
          <div className="text-[17px] font-bold text-foreground">진단을 실행 중입니다</div>
          <p className="mt-0.5 text-xs text-muted-foreground">{progress.message}</p>
        </div>
      </div>
      <ol className="mt-4 grid gap-2 md:grid-cols-3">
        {STEPS.map((step) => (
          <li key={step.label} className="rounded-2xl border border-border bg-background p-3.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <step.Icon className="h-4 w-4 text-primary" />
              {step.label}
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full bg-primary transition-all ${
                  progress.longRunning ? "w-full" : "w-2/3"
                }`}
              />
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              {step.description}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
