import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { Database, Shield, Activity, Clock, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createServerFn } from "@tanstack/react-start";

// Server function to get cache stats
const getApiHealth = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabase
    .from("api_cache")
    .select("endpoint, created_at, status_code")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data) {
    return { error: error?.message || "Failed to fetch api health" };
  }

  // Aggregate by endpoint
  const stats: Record<string, { lastAccess: string; successCount: number; failCount: number }> = {};
  for (const row of data) {
    const ep = row.endpoint.split("?")[0]; // ignore query params
    if (!stats[ep]) {
      stats[ep] = { lastAccess: row.created_at, successCount: 0, failCount: 0 };
    }
    // Update last access if more recent
    if (new Date(row.created_at) > new Date(stats[ep].lastAccess)) {
      stats[ep].lastAccess = row.created_at;
    }
    if (row.status_code === 200) {
      stats[ep].successCount++;
    } else {
      stats[ep].failCount++;
    }
  }

  return { stats };
});

export const Route = createFileRoute("/admin/api-health")({
  component: AdminApiHealthRoute,
  loader: async () => {
    return await getApiHealth();
  },
});

function AdminApiHealthRoute() {
  const data = Route.useLoaderData();

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="app-container py-8 md:py-10">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Database className="h-6 w-6" />
          시스템 상태 (관리자)
        </h1>

        <div className="mt-6 grid gap-6 md:grid-cols-12">
          <div className="md:col-span-3">
            <nav className="flex flex-col gap-1">
              <Link
                to="/settings"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Shield className="h-4 w-4" /> 일반
              </Link>
              <button className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm font-semibold text-foreground">
                <Activity className="h-4 w-4" /> API 상태
              </button>
            </nav>
          </div>

          <div className="space-y-6 md:col-span-9">
            <section className="store-card p-5">
              <h2 className="text-lg font-bold text-foreground">공공데이터 API 헬스 체크</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                api_cache 테이블을 기반으로 한 최근 100건의 API 호출 상태 요약입니다.
              </p>

              {data.error ? (
                <div className="mt-4 rounded-md border border-danger-bg bg-danger-bg p-4 text-sm text-danger">
                  {data.error}
                </div>
              ) : (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 font-semibold">엔드포인트</th>
                        <th className="px-4 py-2 font-semibold">최근 호출 시간</th>
                        <th className="px-4 py-2 font-semibold">성공</th>
                        <th className="px-4 py-2 font-semibold">실패</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {Object.entries(data.stats || {}).map(([ep, stat]) => (
                        <tr key={ep} className="hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">{ep}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              {new Date(stat.lastAccess).toLocaleString()}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-semibold text-safe">
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 className="h-4 w-4" />
                              {stat.successCount}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-semibold text-danger">
                            <div className="flex items-center gap-1.5">
                              {stat.failCount > 0 ? <XCircle className="h-4 w-4" /> : null}
                              {stat.failCount}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {Object.keys(data.stats || {}).length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                            캐시된 API 호출 기록이 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
