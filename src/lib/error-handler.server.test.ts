import { describe, expect, it } from "vitest";

import { buildFailureEvidence, normalizeServerError } from "./error-handler.server";

describe("error-handler.server", () => {
  it("maps known server failures to stable user-facing messages", () => {
    expect(normalizeServerError(new Error("Missing GEMINI_API_KEY"))).toEqual(
      expect.objectContaining({
        code: "CONFIG_MISSING",
        message: "Gemini API 키가 설정되지 않았습니다. 관리자에게 환경변수 설정을 요청하세요.",
        retryable: false,
      }),
    );

    expect(normalizeServerError(new Error("401 unauthorized"))).toEqual(
      expect.objectContaining({
        code: "PUBLIC_API_AUTH_FAILED",
        message: "공공데이터 API 인증에 실패했습니다. 서비스 활용신청 승인 상태를 확인하세요.",
        retryable: false,
      }),
    );

    expect(
      normalizeServerError(new Error("Your prepayment credits are depleted. Check billing.")),
    ).toEqual(
      expect.objectContaining({
        code: "AI_QUOTA_EXHAUSTED",
        message:
          "Gemini API 크레딧 또는 할당량이 소진되었습니다. AI Studio 결제/쿼터 상태를 확인하세요.",
        retryable: false,
      }),
    );
  });

  it("builds failed evidence without exposing raw secrets", () => {
    const evidence = buildFailureEvidence({
      source: "관세청_관세환율정보",
      purpose: "USD 수입 환율 조회",
      timestamp: "2026-06-08T07:00:00.000Z",
      error: new Error("serviceKey=secret-value 401 unauthorized"),
    });

    expect(evidence).toEqual({
      source: "관세청_관세환율정보",
      purpose: "USD 수입 환율 조회",
      timestamp: "2026-06-08T07:00:00.000Z",
      confidence: "failed",
      status: "failed",
      errorCode: "PUBLIC_API_AUTH_FAILED",
      message: "공공데이터 API 인증에 실패했습니다. 서비스 활용신청 승인 상태를 확인하세요.",
    });
    expect(JSON.stringify(evidence)).not.toContain("secret-value");
  });
});
