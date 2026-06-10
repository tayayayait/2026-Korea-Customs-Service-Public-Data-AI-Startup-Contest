import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, CircleDashed } from "lucide-react";

import { AppHeader } from "@/components/AppHeader";
import { getDeploymentReadiness } from "@/lib/deployment-readiness.functions";

export const Route = createFileRoute("/readiness")({
  loader: async () => getDeploymentReadiness(),
  head: () => ({
    meta: [
      { title: "배포 점검 — 직구 세이프패스 AI" },
      {
        name: "description",
        content: "데모와 배포 전에 필요한 환경변수와 Supabase 적용 상태를 확인합니다.",
      },
    ],
  }),
  component: ReadinessPage,
});

function ReadinessPage() {
  const checks = Route.useLoaderData();
  const blocked = checks.filter((item) => item.blocking).length;

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-[980px] px-5 py-8 md:px-8 md:py-10">
        <section className="store-card p-5">
          <div className="text-xs font-medium text-muted-foreground">Phase 4</div>
          <h1 className="mt-1 text-xl font-bold text-foreground md:text-2xl">배포 전 점검</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            차단 항목 {blocked}개. 민감한 키 값은 화면에 표시하지 않습니다.
          </p>
        </section>

        <section className="store-card mt-5 overflow-hidden">
          <ul className="divide-y divide-border">
            {checks.map((item) => (
              <li key={item.id} className="flex items-start gap-3 p-4">
                {item.status === "pass" ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-safe" />
                ) : item.status === "warning" ? (
                  <CircleDashed className="mt-0.5 h-5 w-5 text-caution" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-danger" />
                )}
                <div>
                  <div className="text-sm font-bold text-foreground">{item.label}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{item.detail}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
