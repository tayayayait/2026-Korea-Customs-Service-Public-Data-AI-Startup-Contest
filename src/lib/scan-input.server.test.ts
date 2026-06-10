import { describe, expect, it } from "vitest";

import { buildProductAnalysisMessages, parseProductImageDataUrl } from "./scan-input.server";

describe("scan-input.server", () => {
  it("parses supported image data URLs", () => {
    const parsed = parseProductImageDataUrl("data:image/png;base64,aGVsbG8=");

    expect(parsed).toEqual({
      mediaType: "image/png",
      base64: "aGVsbG8=",
      byteLength: 5,
    });
  });

  it("rejects unsupported image data URL media types", () => {
    expect(() => parseProductImageDataUrl("data:image/svg+xml;base64,aGVsbG8=")).toThrow(
      "지원하지 않는 이미지 형식입니다.",
    );
  });

  it("builds multimodal Gemini messages when an image is present", () => {
    const messages = buildProductAnalysisMessages({
      sourceText: "상품 설명: 비타민",
      imageDataUrl: "data:image/jpeg;base64,aGVsbG8=",
    });

    expect(messages).toEqual([
      {
        role: "user",
        content: [
          expect.objectContaining({
            type: "text",
            text: expect.stringContaining("상품 설명: 비타민"),
          }),
          {
            type: "file",
            mediaType: "image/jpeg",
            data: "aGVsbG8=",
          },
        ],
      },
    ]);
  });
});
