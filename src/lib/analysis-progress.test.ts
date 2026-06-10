import { describe, expect, it } from "vitest";

import { getAnalysisProgressState } from "./analysis-progress";

describe("analysis-progress", () => {
  it("shows a standard progress message before the long-running threshold", () => {
    expect(getAnalysisProgressState(7_999)).toEqual({
      message: "AI가 상품 정보를 추출하고 공공데이터 조회를 준비하고 있습니다.",
      longRunning: false,
    });
  });

  it("shows a long-running message after eight seconds", () => {
    expect(getAnalysisProgressState(8_000)).toEqual({
      message: "조금 더 걸리고 있습니다. 공공데이터 응답을 기다리는 중입니다.",
      longRunning: true,
    });
  });
});
