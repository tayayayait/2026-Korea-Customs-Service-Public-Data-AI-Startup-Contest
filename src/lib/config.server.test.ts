import process from "node:process";
import { afterEach, describe, expect, it } from "vitest";

import { getServerConfig } from "./config.server";

const originalEnv = { ...process.env };

describe("config.server", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("uses the Vertex-compatible Gemini model by default in Vertex mode", () => {
    delete process.env.GEMINI_MODEL;
    process.env.GEMINI_PROVIDER = "vertex";

    expect(getServerConfig().geminiModel).toBe("gemini-2.5-flash");
  });

  it("keeps the Developer API Gemini model by default in direct mode", () => {
    delete process.env.GEMINI_MODEL;
    process.env.GEMINI_PROVIDER = "developer";

    expect(getServerConfig().geminiModel).toBe("gemini-3-flash-preview");
  });
});
