export type DeploymentReadinessStatus = "pass" | "warning" | "blocked";

export type DeploymentReadinessCheck = {
  id: string;
  label: string;
  status: DeploymentReadinessStatus;
  blocking: boolean;
  detail: string;
};

type ReadinessInput = {
  env: Record<string, string | undefined>;
  migrationsApplied: boolean;
};

const hasValue = (value: string | undefined): boolean => Boolean(value?.trim());

const requiredEnvCheck = (
  env: Record<string, string | undefined>,
  id: string,
  key: string,
  label: string,
): DeploymentReadinessCheck => {
  const ok = hasValue(env[key]);
  return {
    id,
    label,
    status: ok ? "pass" : "blocked",
    blocking: !ok,
    detail: ok ? `${key} 설정됨` : `${key} 미설정`,
  };
};

const geminiGatewayCheck = (env: Record<string, string | undefined>): DeploymentReadinessCheck => {
  const provider = env.GEMINI_PROVIDER?.trim().toLowerCase() === "vertex" ? "vertex" : "developer";
  const requiredKey = provider === "vertex" ? "GOOGLE_VERTEX_PROJECT" : "GEMINI_API_KEY";
  const ok = hasValue(env[requiredKey]);

  return {
    id: "gemini-gateway",
    label: provider === "vertex" ? "Vertex AI Gemini gateway" : "Gemini Developer API gateway",
    status: ok ? "pass" : "blocked",
    blocking: !ok,
    detail: ok ? `${requiredKey} configured` : `${requiredKey} missing`,
  };
};

export const buildDeploymentReadiness = ({
  env,
  migrationsApplied,
}: ReadinessInput): DeploymentReadinessCheck[] => {
  return [
    geminiGatewayCheck(env),
    requiredEnvCheck(env, "data-go-kr-api-key", "DATA_GO_KR_API_KEY", "공공데이터포털 API 키"),
    requiredEnvCheck(env, "supabase-url", "SUPABASE_URL", "Supabase URL"),
    requiredEnvCheck(
      env,
      "supabase-publishable-key",
      "SUPABASE_PUBLISHABLE_KEY",
      "Supabase publishable key",
    ),
    {
      id: "supabase-migrations",
      label: "Supabase migrations",
      status: migrationsApplied ? "pass" : "blocked",
      blocking: !migrationsApplied,
      detail: migrationsApplied
        ? "scan_cases/api_cache 스키마 적용 확인"
        : "Supabase SQL editor에서 supabase/migrations 적용 필요",
    },
    {
      id: "foodsafety-korea-api-key",
      label: "FoodSafetyKorea I2715 API key",
      status: hasValue(env.FOODSAFETY_KOREA_API_KEY) ? "pass" : "warning",
      blocking: false,
      detail: hasValue(env.FOODSAFETY_KOREA_API_KEY)
        ? "FOODSAFETY_KOREA_API_KEY configured"
        : "FOODSAFETY_KOREA_API_KEY missing; blocked direct-import food lookup unavailable",
    },
    {
      id: "unipass-api-key",
      label: "UNI-PASS API 키",
      status: hasValue(env.UNIPASS_API_KEY) ? "pass" : "warning",
      blocking: false,
      detail: hasValue(env.UNIPASS_API_KEY)
        ? "화물 통관 진행 조회 사용 가능"
        : "화물 조회 화면은 표시되지만 실제 조회는 제한됨",
    },
  ];
};
