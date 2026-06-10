import { createServerFn } from "@tanstack/react-start";

import { buildDeploymentReadiness } from "./deployment-readiness";

export const getDeploymentReadiness = createServerFn({ method: "GET" }).handler(async () => {
  return buildDeploymentReadiness({
    env: {
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      GEMINI_PROVIDER: process.env.GEMINI_PROVIDER,
      GOOGLE_VERTEX_PROJECT: process.env.GOOGLE_VERTEX_PROJECT,
      GOOGLE_VERTEX_LOCATION: process.env.GOOGLE_VERTEX_LOCATION,
      GOOGLE_VERTEX_AUTH_MODE: process.env.GOOGLE_VERTEX_AUTH_MODE,
      DATA_GO_KR_API_KEY: process.env.DATA_GO_KR_API_KEY,
      FOODSAFETY_KOREA_API_KEY: process.env.FOODSAFETY_KOREA_API_KEY,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
      UNIPASS_API_KEY: process.env.UNIPASS_API_KEY,
    },
    migrationsApplied: true,
  });
});
