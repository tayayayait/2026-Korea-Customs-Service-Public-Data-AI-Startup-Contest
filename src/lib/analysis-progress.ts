const LONG_RUNNING_THRESHOLD_MS = 8_000;

export const getAnalysisProgressState = (
  elapsedMs: number,
): { message: string; longRunning: boolean } => {
  if (elapsedMs >= LONG_RUNNING_THRESHOLD_MS) {
    return {
      message: "조금 더 걸리고 있습니다. 공공데이터 응답을 기다리는 중입니다.",
      longRunning: true,
    };
  }

  return {
    message: "AI가 상품 정보를 추출하고 공공데이터 조회를 준비하고 있습니다.",
    longRunning: false,
  };
};
