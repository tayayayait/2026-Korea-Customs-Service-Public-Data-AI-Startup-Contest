import { config } from "dotenv";
import { generateObject } from "ai";
import { createAiGateway } from "./lib/ai-gateway.server";
import { getServerConfig } from "./lib/config.server";
import { buildProductAnalysisMessages } from "./lib/scan-input.server";
import { z } from "zod";

// Load .env explicitly for the test
config();

const ExtractionSchema = z.object({
  rawTitle: z.string(),
  translatedTitleKo: z.string(),
  brand: z.string(),
  category: z.string(),
  intendedUse: z.string(),
  materials: z.array(z.string()),
  ingredients: z.array(z.string()),
  originCountry: z.string(),
  riskKeywords: z.array(z.string()),
  confidence: z.number(),
  hsCandidates: z
    .array(
      z.object({
        hsCode: z.string(),
        hsNameKo: z.string(),
        hsNameEn: z.string(),
        matchReason: z.string(),
        confidence: z.number(),
      }),
    )
    .min(1),
});

async function runTest() {
  console.log("Starting Amazon URL AI Extraction Test...");
  const serverConfig = getServerConfig();
  const gateway = createAiGateway({
    provider: serverConfig.geminiProvider as "google" | "vertex",
    geminiApiKey: serverConfig.geminiApiKey,
    vertexProject: serverConfig.googleVertexProject,
    vertexLocation: serverConfig.googleVertexLocation,
    vertexAuthMode: serverConfig.googleVertexAuthMode,
  });

  const url =
    "https://www.amazon.com/-/ko/dp/B0GYCQNYQ6/ref=sr_1_4?dib=eyJ2IjoiMSJ9.Eaarr6SGo7IKAtPul5jl0kQWGtGTSoVnjpZ1ui029EUuRbUUKTfHBH6ieY9cCC9eiFHM4pcYOAiQQxkJ7dG2wAOFoEFrY46yPXGTAt6H0LKZgpo8xAA-Ktfq3fcAfXAepct7tLICiZG9Cuj7b94XeuGa9bKW_ypKxeZCYVohJ_0EwqaBAPHC2zG7Au75sx0MQtfT9__PoXlJcETay4V6dtnatZqzTbkpyQtlO5iqUdcBNo8vKkwqzJIZJ_G1LhWMa3F4EZgvs5I2xyx2GwKLDxzAr5eMO1rEh8BBMtgqMbs.Y8iC-_svu4t1bEIsOLaT26thmXNoBFE53B2iVtf5WYs&dib_tag=se&qid=1780988370&s=computers-intl-ship&sr=1-4";

  const sourceText = `상품 URL: ${url}`;
  const messages = buildProductAnalysisMessages({ sourceText });

  try {
    const { object: extraction } = await generateObject({
      model: gateway.model(serverConfig.geminiModel),
      schema: ExtractionSchema,
      messages: messages,
      temperature: 0.1,
    });

    console.log("\n=== AI 추출 결과 ===");
    console.log(JSON.stringify(extraction, null, 2));
  } catch (error) {
    console.error("Extraction failed:", error);
  }
}

runTest();
