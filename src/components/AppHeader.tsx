import { Link } from "@tanstack/react-router";
import { Search, ShieldCheck, UserCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import type { Session } from "@supabase/supabase-js";

export function AppHeader() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("로그아웃 되었습니다.");
  };

  return (
    <header className="nav-glass sticky top-0 z-30">
      <div className="app-container flex h-14 items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2 text-[12px] font-semibold text-foreground"
          aria-label="직구 세이프패스 AI 홈"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background">
            <ShieldCheck className="h-3.5 w-3.5" />
          </span>
          <span className="hidden sm:inline">직구 세이프패스 AI</span>
        </Link>
        <nav className="flex items-center gap-5 text-[12px] text-foreground/80">
          <Link
            to="/scan/new"
            className="hidden hover:text-foreground md:inline relative"
            activeProps={{ className: "text-foreground font-semibold after:absolute after:-bottom-[19px] after:left-0 after:w-full after:h-[2px] after:bg-foreground after:rounded-full" }}
          >
            상세 진단
          </Link>
          <Link
            to="/history"
            className="hidden hover:text-foreground md:inline relative"
            activeProps={{ className: "text-foreground font-semibold after:absolute after:-bottom-[19px] after:left-0 after:w-full after:h-[2px] after:bg-foreground after:rounded-full" }}
          >
            이력
          </Link>
          <Link
            to="/compare"
            className="hidden hover:text-foreground md:inline relative"
            activeProps={{ className: "text-foreground font-semibold after:absolute after:-bottom-[19px] after:left-0 after:w-full after:h-[2px] after:bg-foreground after:rounded-full" }}
          >
            비교
          </Link>
          <Link
            to="/cargo"
            className="hidden hover:text-foreground md:inline relative"
            activeProps={{ className: "text-foreground font-semibold after:absolute after:-bottom-[19px] after:left-0 after:w-full after:h-[2px] after:bg-foreground after:rounded-full" }}
          >
            화물
          </Link>
          {session ? (
            <>
              <Link
                to="/settings"
                className="hidden hover:text-foreground md:inline relative"
                activeProps={{ className: "text-foreground font-semibold after:absolute after:-bottom-[19px] after:left-0 after:w-full after:h-[2px] after:bg-foreground after:rounded-full" }}
              >
                설정
              </Link>
              <button onClick={handleLogout} className="hidden hover:text-foreground md:inline">
                로그아웃
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="hidden hover:text-foreground md:inline relative"
              activeProps={{ className: "text-foreground font-semibold after:absolute after:-bottom-[19px] after:left-0 after:w-full after:h-[2px] after:bg-foreground after:rounded-full" }}
            >
              로그인
            </Link>
          )}
          <Link
            to="/readiness"
            className="hidden hover:text-foreground lg:inline relative"
            activeProps={{ className: "text-foreground font-semibold after:absolute after:-bottom-[19px] after:left-0 after:w-full after:h-[2px] after:bg-foreground after:rounded-full" }}
          >
            점검
          </Link>
          <span className="hidden rounded-full bg-foreground px-2.5 py-1 text-[11px] font-semibold text-background lg:inline">
            MVP 데모
          </span>
          <Search className="h-4 w-4" aria-hidden="true" />
          <UserCircle className="h-4 w-4" aria-hidden="true" />
        </nav>
      </div>
    </header>
  );
}
