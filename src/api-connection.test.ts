import { describe, it, expect } from "vitest";
import { config } from "dotenv";
import { generateObject } from "ai";
import { z } from "zod";
import { fetchCustomsRequirementItems } from "./lib/api/customs-api.server";
import { fetchImportedFoodProducts } from "./lib/api/mfds-api.server";
import { fetchBlockedDirectImportFoods } from "./lib/api/foodsafety-api.server";

import { createAiGateway } from "./lib/ai-gateway.server";
import { getServerConfig } from "./lib/config.server";

// Load .env explicitly for the test
config();

describe("Real API Connection Tests", () => {
  // Increase timeout because real APIs might be slow
  const TIMEOUT = 30000;

  it(
    "should connect to Gemini API via App Gateway",
    async () => {
      const serverConfig = getServerConfig();
      const gateway = createAiGateway({
        provider: serverConfig.geminiProvider as "google" | "vertex",
        geminiApiKey: serverConfig.geminiApiKey,
        vertexProject: serverConfig.googleVertexProject,
        vertexLocation: serverConfig.googleVertexLocation,
        vertexAuthMode: serverConfig.googleVertexAuthMode,
      });

      // Test generation
      const result = await generateObject({
        model: gateway.model(serverConfig.geminiModel),
        schema: z.object({
          testMessage: z.string(),
        }),
        prompt: "Say 'Hello, AI Gateway works!'",
      });

      console.log("Gemini Response:", result.object);
      expect(result.object.testMessage).toBeTruthy();
    },
    TIMEOUT,
  );

  it(
    "should connect to Customs API (DATA_GO_KR_API_KEY)",
    async () => {
      const apiKey = process.env.DATA_GO_KR_API_KEY;
      if (!apiKey) throw new Error("DATA_GO_KR_API_KEY is not set in .env");

      // "3304991000" is cosmetics (기초화장용 제품류)
      const result = await fetchCustomsRequirementItems({
        serviceKey: apiKey,
        hsCode: "3304991000",
      });

      console.log("Customs API (세관장확인) Response Count:", result.length);
      if (result.length > 0) {
        console.log("First item:", result[0]);
      }
      expect(Array.isArray(result)).toBe(true);
    },
    TIMEOUT,
  );

  it(
    "should connect to MFDS API (DATA_GO_KR_API_KEY)",
    async () => {
      const apiKey = process.env.DATA_GO_KR_API_KEY;
      if (!apiKey) throw new Error("DATA_GO_KR_API_KEY is not set in .env");

      const result = await fetchImportedFoodProducts({
        serviceKey: apiKey,
        productName: "비타민",
        numOfRows: 2,
      });

      console.log("MFDS API (수입식품 제품DB) Response Count:", result.length);
      if (result.length > 0) {
        console.log("First item:", result[0]);
      }
      expect(Array.isArray(result)).toBe(true);
    },
    TIMEOUT,
  );

  it(
    "should connect to FoodSafetyKorea API (Optional)",
    async () => {
      const apiKey = process.env.FOODSAFETY_KOREA_API_KEY;
      if (!apiKey) {
        console.log("Skipping FoodSafetyKorea test because FOODSAFETY_KOREA_API_KEY is not set.");
        return;
      }

      const result = await fetchBlockedDirectImportFoods({
        apiKey,
        productName: "구미",
      });

      console.log("FoodSafetyKorea API Response Count:", result.length);
      if (result.length > 0) {
        console.log("First item:", result[0]);
      }
      expect(Array.isArray(result)).toBe(true);
    },
    TIMEOUT,
  );
});
