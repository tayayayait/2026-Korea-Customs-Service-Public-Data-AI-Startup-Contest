export const buildAuthRedirectTo = (currentUrl: string, nextPath = "/history"): string => {
  const url = new URL(currentUrl);
  const callback = new URL("/auth/callback", url.origin);
  callback.searchParams.set("next", nextPath.startsWith("/") ? nextPath : `/${nextPath}`);
  return callback.toString();
};

export const normalizeAuthUiError = (error: unknown): string => {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (message.includes("invalid email")) {
    return "이메일 주소 형식이 올바르지 않습니다.";
  }

  if (message.includes("rate") || message.includes("too many")) {
    return "요청이 너무 많습니다. 잠시 후 다시 시도하세요.";
  }

  return "로그인 요청을 처리하지 못했습니다. 다시 시도하세요.";
};
