import { describe, expect, it } from "vitest";

import { buildAuthRedirectTo, normalizeAuthUiError } from "./auth-ui";

describe("auth-ui", () => {
  it("builds a same-origin magic-link redirect target", () => {
    expect(buildAuthRedirectTo("https://example.com/login", "/history")).toBe(
      "https://example.com/auth/callback?next=%2Fhistory",
    );
  });

  it("maps Supabase email auth errors to Korean UI copy", () => {
    expect(normalizeAuthUiError(new Error("Invalid email"))).toBe(
      "이메일 주소 형식이 올바르지 않습니다.",
    );
    expect(normalizeAuthUiError(new Error("rate limit exceeded"))).toBe(
      "요청이 너무 많습니다. 잠시 후 다시 시도하세요.",
    );
  });
});
