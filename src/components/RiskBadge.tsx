import { CheckCircle2, AlertTriangle, CircleAlert, ShieldAlert } from "lucide-react";
import type { RiskLevel } from "@/lib/scan-logic";

const CONFIG: Record<
  RiskLevel,
  { label: string; bg: string; fg: string; Icon: typeof CheckCircle2 }
> = {
  safe: {
    label: "위험도 낮음",
    bg: "bg-safe-bg",
    fg: "text-safe",
    Icon: CheckCircle2,
  },
  caution: {
    label: "요건 확인 요망",
    bg: "bg-caution-bg",
    fg: "text-caution",
    Icon: AlertTriangle,
  },
  high_risk: {
    label: "통관 주의 필요",
    bg: "bg-risk-bg",
    fg: "text-risk",
    Icon: CircleAlert,
  },
  blocked_unknown: {
    label: "구매 전 기관 확인 필요",
    bg: "bg-danger-bg",
    fg: "text-danger",
    Icon: ShieldAlert,
  },
  banned: {
    label: "🚫 통관 불가",
    bg: "bg-danger",
    fg: "text-white",
    Icon: ShieldAlert,
  },
};

export function RiskBadge({ level, size = "md" }: { level: RiskLevel; size?: "sm" | "md" | "lg" }) {
  const cfg = CONFIG[level];
  const sizing =
    size === "lg"
      ? "text-base px-4 py-2 gap-2"
      : size === "sm"
        ? "text-xs px-2.5 py-1 gap-1"
        : "text-sm px-3.5 py-1.5 gap-1.5";
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ring-1 ring-current/10 ${cfg.bg} ${cfg.fg} ${sizing}`}
    >
      <cfg.Icon className={size === "lg" ? "h-5 w-5" : size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
      {cfg.label}
    </span>
  );
}
