import { AppHeader } from "./AppHeader";
import { AnalysisProgress } from "./AnalysisProgress";
import { DiagnosisStepper } from "./DiagnosisStepper";

export function ScanRoutePending({ current }: { current: "review" | "result" }) {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="app-container py-8 md:py-10">
        <DiagnosisStepper current={current} />
        <div className="mt-5">
          <AnalysisProgress />
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="h-28 animate-pulse rounded-[28px] bg-muted" />
          <div className="h-28 animate-pulse rounded-[28px] bg-muted" />
          <div className="h-28 animate-pulse rounded-[28px] bg-muted" />
        </div>
      </main>
    </div>
  );
}
