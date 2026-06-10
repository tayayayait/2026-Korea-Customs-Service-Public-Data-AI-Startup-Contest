import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";

import { AppHeader } from "@/components/AppHeader";
import { AnalysisProgress } from "@/components/AnalysisProgress";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === "string" ? search.code : "",
    next: typeof search.next === "string" ? search.next : "/history",
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth/callback" });

  useEffect(() => {
    let mounted = true;
    async function finish() {
      if (search.code) {
        await supabase.auth.exchangeCodeForSession(search.code);
      }
      if (mounted) {
        navigate({ to: search.next || "/history" });
      }
    }
    void finish();
    return () => {
      mounted = false;
    };
  }, [navigate, search.code, search.next]);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-[720px] px-5 py-10 md:px-8">
        <AnalysisProgress />
      </main>
    </div>
  );
}
