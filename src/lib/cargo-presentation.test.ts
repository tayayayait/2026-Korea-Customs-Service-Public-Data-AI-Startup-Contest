import { describe, expect, it } from "vitest";

import { buildCargoSummary, formatCargoDateTime } from "./cargo-presentation";

describe("cargo-presentation", () => {
  it("maps UNI-PASS cargo fields to user-facing summary labels", () => {
    const summary = buildCargoSummary({
      cargMtNo: "18XJ0000000002",
      mblNo: "94000499505",
      hblNo: "605118340404",
      blPtNm: "Consol",
      prgsStts: "반출완료",
      csclPrgsStts: "수입신고수리",
      ldprNm: "D****G",
      dsprNm: "인천공항",
      pckGcnt: "6",
      pckUt: "CT",
      ttwg: "1009",
      wghtUt: "KG",
    });

    expect(summary.primaryStatus).toBe("반출완료");
    expect(summary.clearanceStatus).toBe("수입신고수리");
    expect(summary.routeLabel).toBe("적재항 ➔ 양륙항");
    expect(summary.routeValue).toBe("D****G ➔ 인천공항");
    expect(summary.quantityValue).toBe("6 CT");
    expect(summary.weightValue).toBe("1009 KG");
    expect(summary.identifiers).toEqual([
      { label: "화물관리번호", value: "18XJ0000000002" },
      { label: "M B/L", value: "94000499505" },
      { label: "H B/L", value: "605118340404" },
      { label: "B/L 유형", value: "Consol" },
    ]);
  });

  it("formats compact and already separated UNI-PASS timestamps consistently", () => {
    expect(formatCargoDateTime("20260426194700")).toBe("2026.04.26 19:47");
    expect(formatCargoDateTime("202604261947")).toBe("2026.04.26 19:47");
    expect(formatCargoDateTime("2026.04.26 19:47")).toBe("2026.04.26 19:47");
  });
});
