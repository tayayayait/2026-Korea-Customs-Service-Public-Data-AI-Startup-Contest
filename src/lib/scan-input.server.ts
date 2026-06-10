import type { ModelMessage } from "ai";

const SUPPORTED_IMAGE_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export type ParsedProductImage = {
  mediaType: string;
  base64: string;
  byteLength: number;
};

export const parseProductImageDataUrl = (dataUrl: string): ParsedProductImage => {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl.trim());

  if (!match) {
    throw new Error("이미지 데이터 형식이 올바르지 않습니다.");
  }

  const [, mediaType, base64] = match;
  if (!SUPPORTED_IMAGE_MEDIA_TYPES.has(mediaType)) {
    throw new Error("지원하지 않는 이미지 형식입니다.");
  }

  const byteLength = Buffer.byteLength(Buffer.from(base64, "base64"));
  if (byteLength > MAX_IMAGE_BYTES) {
    throw new Error("이미지는 10MB 이하만 업로드할 수 있습니다.");
  }

  return { mediaType, base64, byteLength };
};

export const buildProductAnalysisMessages = ({
  sourceText,
  imageDataUrl,
}: {
  sourceText: string;
  imageDataUrl?: string;
}): ModelMessage[] => {
  if (!imageDataUrl) {
    return [{ role: "user", content: sourceText }];
  }

  const image = parseProductImageDataUrl(imageDataUrl);

  return [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `${sourceText}\n\n첨부 이미지를 함께 분석하세요. 이미지에서 보이는 상품명, 브랜드, 성분표, 원산지, 포장 문구를 반영하세요.`,
        },
        {
          type: "file",
          mediaType: image.mediaType,
          data: image.base64,
        },
      ],
    },
  ];
};
