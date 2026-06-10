import { describe, expect, it } from "vitest";

import {
  DEFAULT_GEMINI_MODEL,
  createAiGateway,
  createGcloudVertexHeaders,
  getGcloudAccessTokenCommand,
  createGeminiProvider,
} from "./ai-gateway.server";

describe("ai-gateway.server", () => {
  it("creates a Gemini provider from a Gemini API key", () => {
    const provider = createGeminiProvider("gemini-key");

    expect(DEFAULT_GEMINI_MODEL).toBe("gemini-3-flash-preview");
    expect(typeof provider).toBe("function");
  });

  it("creates the direct Gemini Developer API gateway when selected", () => {
    const gateway = createAiGateway({
      provider: "developer",
      geminiApiKey: "gemini-key",
      vertexProject: undefined,
      vertexLocation: undefined,
    });

    expect(gateway.provider).toBe("developer");
    expect(typeof gateway.model).toBe("function");
  });

  it("creates the Vertex AI gateway without a Gemini API key", () => {
    const gateway = createAiGateway({
      provider: "vertex",
      geminiApiKey: undefined,
      vertexProject: "gen-lang-client-0294938306",
      vertexLocation: "us-central1",
    });

    expect(gateway.provider).toBe("vertex");
    expect(typeof gateway.model).toBe("function");
  });

  it("requires a Gemini API key for the direct Developer API gateway", () => {
    expect(() =>
      createAiGateway({
        provider: "developer",
        geminiApiKey: undefined,
        vertexProject: "gen-lang-client-0294938306",
        vertexLocation: "us-central1",
      }),
    ).toThrow("Missing GEMINI_API_KEY");
  });

  it("requires a Google Cloud project for the Vertex AI gateway", () => {
    expect(() =>
      createAiGateway({
        provider: "vertex",
        geminiApiKey: "gemini-key",
        vertexProject: undefined,
        vertexLocation: "us-central1",
      }),
    ).toThrow("Missing GOOGLE_VERTEX_PROJECT");
  });

  it("builds Vertex AI authorization headers from the active gcloud token", async () => {
    const headers = await createGcloudVertexHeaders(() => "test-token")();

    expect(headers).toEqual({
      Authorization: "Bearer test-token",
    });
  });

  it("runs gcloud through cmd.exe on Windows", () => {
    expect(getGcloudAccessTokenCommand("win32")).toEqual({
      command: "cmd.exe",
      args: ["/d", "/s", "/c", "gcloud auth print-access-token"],
    });
  });

  it("creates a Vertex AI gateway that can use active gcloud credentials", () => {
    const gateway = createAiGateway({
      provider: "vertex",
      vertexProject: "gen-lang-client-0563653718",
      vertexLocation: "us-central1",
      vertexAuthMode: "gcloud",
    });

    expect(gateway.provider).toBe("vertex");
    expect(typeof gateway.model).toBe("function");
  });
});
