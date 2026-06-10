export type NormalizedServerErrorCode =
  | "CONFIG_MISSING"
  | "PUBLIC_API_AUTH_FAILED"
  | "PUBLIC_API_TIMEOUT"
  | "PUBLIC_API_UNAVAILABLE"
  | "AI_QUOTA_EXHAUSTED"
  | "AI_ANALYSIS_FAILED"
  | "UNKNOWN";

export type NormalizedServerError = {
  code: NormalizedServerErrorCode;
  message: string;
  retryable: boolean;
};

export type FailureEvidence = {
  source: string;
  purpose: string;
  timestamp: string;
  confidence: "failed";
  status: "failed";
  errorCode: NormalizedServerErrorCode;
  message: string;
};

const messageOf = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "";
};

export const normalizeServerError = (error: unknown): NormalizedServerError => {
  const message = messageOf(error).toLowerCase();
  const isAiProviderMessage =
    message.includes("gemini") ||
    message.includes("generative ai") ||
    message.includes("ai studio") ||
    message.includes("google ai");

  if (message.includes("missing gemini_api_key") || message.includes("gemini_api_key")) {
    return {
      code: "CONFIG_MISSING",
      message: "Gemini API 키가 설정되지 않았습니다. 관리자에게 환경변수 설정을 요청하세요.",
      retryable: false,
    };
  }

  if (
    message.includes("401") ||
    message.includes("403") ||
    message.includes("unauthorized") ||
    message.includes("forbidden") ||
    message.includes("servicekey")
  ) {
    return {
      code: "PUBLIC_API_AUTH_FAILED",
      message: "공공데이터 API 인증에 실패했습니다. 서비스 활용신청 승인 상태를 확인하세요.",
      retryable: false,
    };
  }

  if (message.includes("timeout") || message.includes("abort")) {
    return {
      code: "PUBLIC_API_TIMEOUT",
      message: "공공데이터 API 응답 시간이 초과되었습니다. 잠시 후 다시 시도하세요.",
      retryable: true,
    };
  }

  if (
    message.includes("prepayment credits") ||
    (isAiProviderMessage &&
      (message.includes("credit") ||
        message.includes("quota") ||
        message.includes("billing") ||
        message.includes("resource exhausted") ||
        message.includes("rate limit") ||
        message.includes("429")))
  ) {
    return {
      code: "AI_QUOTA_EXHAUSTED",
      message:
        "Gemini API 크레딧 또는 할당량이 소진되었습니다. AI Studio 결제/쿼터 상태를 확인하세요.",
      retryable: false,
    };
  }

  if (message.includes("gemini") || message.includes("ai")) {
    return {
      code: "AI_ANALYSIS_FAILED",
      message: "AI 분석 결과를 정리하지 못했습니다. 입력 정보를 줄여 다시 시도하세요.",
      retryable: true,
    };
  }

  if (message.includes("network") || message.includes("fetch")) {
    return {
      code: "PUBLIC_API_UNAVAILABLE",
      message: "공공데이터 API 조회에 실패했습니다. fallback 결과로 계속 진행합니다.",
      retryable: true,
    };
  }

  return {
    code: "UNKNOWN",
    message: "처리 중 오류가 발생했습니다. 다시 시도하세요.",
    retryable: true,
  };
};

export const buildFailureEvidence = ({
  source,
  purpose,
  timestamp,
  error,
}: {
  source: string;
  purpose: string;
  timestamp: string;
  error: unknown;
}): FailureEvidence => {
  const normalized = normalizeServerError(error);
  return {
    source,
    purpose,
    timestamp,
    confidence: "failed",
    status: "failed",
    errorCode: normalized.code,
    message: normalized.message,
  };
};
