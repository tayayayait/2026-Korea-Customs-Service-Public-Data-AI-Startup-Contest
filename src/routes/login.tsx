import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { LogIn, Mail } from "lucide-react";

import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { buildAuthRedirectTo, normalizeAuthUiError } from "@/lib/auth-ui";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "로그인 — 직구 세이프패스 AI" },
      {
        name: "description",
        content: "진단 이력을 저장하고 다시 확인하기 위해 로그인합니다.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setStatus("idle");
    setMessage("");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: buildAuthRedirectTo(window.location.href, "/history"),
        },
      });
      if (error) throw error;
      setStatus("sent");
      setMessage("로그인 링크를 이메일로 보냈습니다.");
    } catch (error) {
      setStatus("error");
      setMessage(normalizeAuthUiError(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-[560px] px-5 py-12 md:px-8">
        <section className="store-card p-6 md:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-weak text-primary">
              <LogIn className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-foreground">이메일 로그인</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">진단 이력 확인용</p>
            </div>
          </div>

          <label className="mt-5 block">
            <span className="mb-1.5 block text-sm font-semibold text-foreground">이메일</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                className="input pl-9"
              />
            </div>
          </label>

          {message && (
            <div
              className={`mt-4 rounded-md border px-3 py-2 text-sm ${
                status === "error"
                  ? "border-danger/30 bg-danger-bg text-danger"
                  : "border-primary/30 bg-primary-weak text-primary"
              }`}
            >
              {message}
            </div>
          )}

          <button
            type="button"
            onClick={() => void submit()}
            disabled={loading || !email.trim()}
            className="apple-button mt-5 w-full disabled:opacity-45"
          >
            {loading ? "요청 중..." : "로그인 링크 받기"}
          </button>

          <Link to="/" className="mt-4 block text-center text-sm font-semibold text-primary">
            간편 진단으로 돌아가기
          </Link>
        </section>
      </main>
    </div>
  );
}
