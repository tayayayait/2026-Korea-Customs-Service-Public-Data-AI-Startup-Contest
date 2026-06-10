import process from "node:process";

// Server-only config. The .server.ts suffix prevents Vite from bundling
// this file into the client — values here never reach the browser.
//
// On Cloudflare Workers, env binds at REQUEST time. Module-scope reads
// (e.g. `const x = process.env.X`) resolve to undefined — always read
// process.env INSIDE a function or handler.
//
// When to use which env-access pattern:
//   - .server.ts module (this file): server-only helpers reused across
//     handlers. Wrap reads in a function so they run per-request.
//   - inline process.env inside a createServerFn handler: one-off reads
//     not reused elsewhere.
//   - import.meta.env.VITE_FOO: PUBLIC config readable from both client
//     and server (analytics IDs, public URLs). Define in .env with the
//     VITE_ prefix. Never put secrets here — they ship to the browser.

const readEnv = (name: string): string | undefined => {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
};

const readNumberEnv = (name: string, fallback: number): number => {
  const raw = readEnv(name);
  if (!raw) return fallback;

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const readGeminiProvider = (): "developer" | "vertex" => {
  return readEnv("GEMINI_PROVIDER")?.toLowerCase() === "vertex" ? "vertex" : "developer";
};

export const getServerConfig = () => {
  const geminiProvider = readGeminiProvider();
  const defaultGeminiModel =
    geminiProvider === "vertex" ? "gemini-2.5-flash" : "gemini-3-flash-preview";

  return {
    nodeEnv: process.env.NODE_ENV,

    supabaseUrl: readEnv("SUPABASE_URL"),
    supabasePublishableKey: readEnv("SUPABASE_PUBLISHABLE_KEY"),
    supabaseServiceRoleKey: readEnv("SUPABASE_SERVICE_ROLE_KEY"),

    geminiApiKey: readEnv("GEMINI_API_KEY"),
    geminiModel: readEnv("GEMINI_MODEL") ?? defaultGeminiModel,
    geminiProvider,
    googleVertexProject: readEnv("GOOGLE_VERTEX_PROJECT"),
    googleVertexLocation: readEnv("GOOGLE_VERTEX_LOCATION") ?? "us-central1",
    googleVertexAuthMode: readEnv("GOOGLE_VERTEX_AUTH_MODE") ?? "adc",
    dataGoKrApiKey: readEnv("DATA_GO_KR_API_KEY"),
    foodSafetyKoreaApiKey: readEnv("FOODSAFETY_KOREA_API_KEY"),
    unipassApiKey: readEnv("UNIPASS_API_KEY"),
    unipassServiceId: readEnv("UNIPASS_SERVICE_ID") ?? "API001",

    publicApiTimeoutMs: readNumberEnv("PUBLIC_API_TIMEOUT_MS", 10_000),
    publicApiRetryCount: readNumberEnv("PUBLIC_API_RETRY_COUNT", 1),
  };
};

export type ServerConfig = ReturnType<typeof getServerConfig>;
export type ServerConfigKey = Exclude<keyof ServerConfig, "nodeEnv">;

export const getMissingServerConfig = (requiredKeys: ServerConfigKey[]): ServerConfigKey[] => {
  const config = getServerConfig();
  return requiredKeys.filter((key) => !config[key]);
};

export const assertServerConfig = (
  requiredKeys: ServerConfigKey[],
  context = "server operation",
): ServerConfig => {
  const missing = getMissingServerConfig(requiredKeys);
  if (missing.length > 0) {
    throw new Error(`Missing server environment variable(s) for ${context}: ${missing.join(", ")}`);
  }

  return getServerConfig();
};
