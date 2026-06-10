import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createVertex as createEdgeVertex } from "@ai-sdk/google-vertex/edge";

export const DEFAULT_GEMINI_MODEL = "gemini-3-flash-preview";
export const DEFAULT_VERTEX_LOCATION = "us-central1";

export type GeminiGatewayProvider = "developer" | "vertex";

export type AiGatewayConfig = {
  provider?: string;
  geminiApiKey?: string;
  vertexProject?: string;
  vertexLocation?: string;
  vertexAuthMode?: string;
};

const require = createRequire(import.meta.url);

const createNodeVertex = (): typeof import("@ai-sdk/google-vertex")["createVertex"] => {
  return (require("@ai-sdk/google-vertex") as typeof import("@ai-sdk/google-vertex")).createVertex;
};

export function createGeminiProvider(geminiApiKey: string) {
  return createGoogleGenerativeAI({
    apiKey: geminiApiKey,
  });
}

const normalizeProvider = (provider: string | undefined): GeminiGatewayProvider => {
  return provider?.toLowerCase() === "vertex" ? "vertex" : "developer";
};

export const getGcloudAccessTokenCommand = (platform = process.platform) => {
  if (platform === "win32") {
    return {
      command: "cmd.exe",
      args: ["/d", "/s", "/c", "gcloud auth print-access-token"],
    };
  }

  return {
    command: "gcloud",
    args: ["auth", "print-access-token"],
  };
};

const readActiveGcloudAccessToken = (): string => {
  const { command, args } = getGcloudAccessTokenCommand();
  return execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
};

export const createGcloudVertexHeaders = (readToken = readActiveGcloudAccessToken) => {
  return async () => ({
    Authorization: `Bearer ${readToken()}`,
  });
};

export function createAiGateway(config: AiGatewayConfig) {
  const provider = normalizeProvider(config.provider);

  if (provider === "vertex") {
    if (!config.vertexProject) {
      throw new Error("Missing GOOGLE_VERTEX_PROJECT");
    }

    const useGcloudAuth = config.vertexAuthMode?.toLowerCase() === "gcloud";
    const createVertex = useGcloudAuth ? createNodeVertex() : createEdgeVertex;

    return {
      provider,
      model: createVertex({
        project: config.vertexProject,
        location: config.vertexLocation ?? DEFAULT_VERTEX_LOCATION,
        headers: useGcloudAuth ? createGcloudVertexHeaders() : undefined,
      }),
    };
  }

  if (!config.geminiApiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  return {
    provider,
    model: createGeminiProvider(config.geminiApiKey),
  };
}
