import { CheckCircle2, Circle, Loader2 } from "lucide-react";

const STEPS = [
  { id: "input", label: "입력" },
  { id: "analysis", label: "AI 추출" },
  { id: "review", label: "확인" },
  { id: "lookup", label: "공공데이터" },
  { id: "result", label: "결과" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export function DiagnosisStepper({ current }: { current: StepId }) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);

  return (
    <nav
      aria-label="진단 진행 단계"
      className="scrollbar-none overflow-x-auto rounded-full border border-border bg-white/80 px-3 py-2 shadow-soft backdrop-blur"
    >
      <ol className="flex min-w-max gap-1.5">
        {STEPS.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          const pending = active && (step.id === "analysis" || step.id === "lookup");
          const Icon = done ? CheckCircle2 : pending ? Loader2 : Circle;

          return (
            <li key={step.id} className="w-28 flex-shrink-0">
              <div
                className={`flex items-center justify-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-semibold ${
                  active
                    ? "bg-foreground text-background"
                    : done
                      ? "bg-primary-weak text-primary"
                      : "text-muted-foreground"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${pending ? "animate-spin" : ""}`} />
                <span className="truncate">{step.label}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
