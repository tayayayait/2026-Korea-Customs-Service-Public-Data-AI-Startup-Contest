import { describe, expect, it } from "vitest";

import { buildDeploymentReadiness } from "./deployment-readiness";

describe("deployment-readiness", () => {
  it("marks required environment variables and migrations as blocking checks", () => {
    const checks = buildDeploymentReadiness({
      env: {
        GEMINI_API_KEY: "set",
        DATA_GO_KR_API_KEY: "",
        SUPABASE_URL: "set",
        SUPABASE_PUBLISHABLE_KEY: "set",
      },
      migrationsApplied: false,
    });

    expect(checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "data-go-kr-api-key",
          status: "blocked",
          blocking: true,
        }),
        expect.objectContaining({
          id: "supabase-migrations",
          status: "blocked",
          blocking: true,
        }),
      ]),
    );
  });

  it("keeps optional service keys non-blocking", () => {
    const checks = buildDeploymentReadiness({
      env: {
        GEMINI_API_KEY: "set",
        DATA_GO_KR_API_KEY: "set",
        SUPABASE_URL: "set",
        SUPABASE_PUBLISHABLE_KEY: "set",
        UNIPASS_API_KEY: "",
      },
      migrationsApplied: true,
    });

    expect(checks.find((item) => item.id === "unipass-api-key")).toEqual(
      expect.objectContaining({
        status: "warning",
        blocking: false,
      }),
    );
  });

  it("accepts Vertex AI as the Gemini gateway when a Google Cloud project is configured", () => {
    const checks = buildDeploymentReadiness({
      env: {
        GEMINI_PROVIDER: "vertex",
        GEMINI_API_KEY: "",
        GOOGLE_VERTEX_PROJECT: "gen-lang-client-0294938306",
        GOOGLE_VERTEX_LOCATION: "us-central1",
        DATA_GO_KR_API_KEY: "set",
        SUPABASE_URL: "set",
        SUPABASE_PUBLISHABLE_KEY: "set",
      },
      migrationsApplied: true,
    });

    expect(checks.find((item) => item.id === "gemini-gateway")).toEqual(
      expect.objectContaining({
        status: "pass",
        blocking: false,
      }),
    );
  });

  it("blocks Vertex AI mode when the Google Cloud project is missing", () => {
    const checks = buildDeploymentReadiness({
      env: {
        GEMINI_PROVIDER: "vertex",
        GEMINI_API_KEY: "set",
        GOOGLE_VERTEX_PROJECT: "",
        DATA_GO_KR_API_KEY: "set",
        SUPABASE_URL: "set",
        SUPABASE_PUBLISHABLE_KEY: "set",
      },
      migrationsApplied: true,
    });

    expect(checks.find((item) => item.id === "gemini-gateway")).toEqual(
      expect.objectContaining({
        status: "blocked",
        blocking: true,
      }),
    );
  });
});
