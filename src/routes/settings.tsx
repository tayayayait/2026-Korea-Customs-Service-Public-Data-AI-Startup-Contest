import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { Database, Settings, Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  component: SettingsRoute,
});

function SettingsRoute() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [saveHistory, setSaveHistory] = useState(true);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="app-container py-8 md:py-10">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Settings className="h-6 w-6" />
          설정
        </h1>

        <div className="mt-6 grid gap-6 md:grid-cols-12">
          <div className="md:col-span-3">
            <nav className="flex flex-col gap-1">
              <button className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm font-semibold text-foreground">
                <Shield className="h-4 w-4" /> 일반
              </button>
              <Link
                to="/admin/api-health"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Database className="h-4 w-4" /> 시스템 상태 (관리자)
              </Link>
            </nav>
          </div>

          <div className="space-y-6 md:col-span-9">
            <section className="store-card p-5">
              <h2 className="text-lg font-bold text-foreground">일반 설정</h2>
              <div className="mt-4 space-y-4">
                <label className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-foreground">진단 이력 저장</div>
                    <div className="text-sm text-muted-foreground">
                      진단한 내용을 서버에 보관하여 이력 탭에서 볼 수 있게 합니다.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={saveHistory}
                    onChange={(e) => setSaveHistory(e.target.checked)}
                    className="h-5 w-5 accent-primary"
                  />
                </label>
                <label className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-foreground">위험 알림 수신</div>
                    <div className="text-sm text-muted-foreground">
                      위험 등급이 '고위험'인 상품 진단 완료 시 푸시 알림을 받습니다.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationsEnabled}
                    onChange={(e) => setNotificationsEnabled(e.target.checked)}
                    className="h-5 w-5 accent-primary"
                  />
                </label>
              </div>
            </section>

            <section className="store-card p-5">
              <h2 className="text-lg font-bold text-danger">위험 구역</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                계정과 관련된 모든 정보 및 진단 기록을 영구적으로 삭제합니다.
              </p>
              <button
                className="mt-4 rounded-md bg-danger px-4 py-2 text-sm font-semibold text-white hover:brightness-95"
                onClick={() => toast.success("기능 준비 중입니다.")}
              >
                모든 이력 및 계정 삭제
              </button>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
