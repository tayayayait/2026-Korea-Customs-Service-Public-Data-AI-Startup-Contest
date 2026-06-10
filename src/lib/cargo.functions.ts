import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getServerConfig } from "./config.server";
import { normalizeServerError } from "./error-handler.server";
import { fetchCargoClearanceProgress } from "./api/unipass-api.server";

const CargoLookupInput = z
  .object({
    cargoManagementNumber: z.string().optional().default(""),
    masterBlNo: z.string().optional().default(""),
    houseBlNo: z.string().optional().default(""),
    blYear: z.string().optional().default(""),
  })
  .refine(
    (value) => {
      const hasCargoNo = !!value.cargoManagementNumber.trim();
      const hasBlYear = !!value.blYear.trim();
      const hasBlNo = !!value.masterBlNo.trim() || !!value.houseBlNo.trim();
      return hasCargoNo || (hasBlYear && hasBlNo);
    },
    "화물관리번호를 입력하거나, B/L 번호(Master 또는 House)와 연도를 함께 입력하세요.",
  );

export const lookupCargoClearanceProgress = createServerFn({ method: "POST" })
  .validator((input: unknown) => CargoLookupInput.parse(input))
  .handler(async ({ data }) => {
    const config = getServerConfig();
    if (!config.unipassApiKey) {
      throw new Error("UNI-PASS API 키가 설정되지 않았습니다.");
    }

    try {
      const items = await fetchCargoClearanceProgress({
        apiKey: config.unipassApiKey,
        cargoManagementNumber: data.cargoManagementNumber.trim() || undefined,
        masterBlNo: data.masterBlNo.trim() || undefined,
        houseBlNo: data.houseBlNo.trim() || undefined,
        blYear: data.blYear.trim() || undefined,
        timeoutMs: config.publicApiTimeoutMs,
        retryCount: config.publicApiRetryCount,
      });
      return { items };
    } catch (error) {
      throw new Error(normalizeServerError(error).message);
    }
  });
