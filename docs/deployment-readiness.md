# Deployment Readiness

Phase 4 hardening checklist for demo and deployment.

## Required Before Live Demo

1. Apply Supabase migrations in the project SQL editor:
   - `supabase/migrations/20260606082535_d130f7ae-c736-4a4a-b3d8-b5035f4c1c6d.sql`
   - `supabase/migrations/20260608061038_add_api_cache.sql`
2. Confirm `.env` has the selected Gemini gateway configuration:
   - Developer API mode: `GEMINI_PROVIDER=developer` and `GEMINI_API_KEY`
   - Vertex AI mode: `GEMINI_PROVIDER=vertex`, `GOOGLE_VERTEX_PROJECT`, `GOOGLE_VERTEX_LOCATION`, and either ADC/service account credentials or local `GOOGLE_VERTEX_AUTH_MODE=gcloud`
   - `DATA_GO_KR_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
3. Confirm the selected Gemini gateway billing/credits and quota are active. Developer API mode uses AI Studio prepaid credits; Vertex AI mode uses Google Cloud billing/credits.
4. Optional but recommended:
   - `UNIPASS_API_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` for server-only `api_cache` reads/writes

## Runtime Check

Open `/readiness` in the local app. It reports pass, warning, or blocked status without exposing secret values.

## Known Non-Blocking Warnings

- UI library files still emit `react-refresh/only-export-components` warnings.
- The main client chunk is larger than Vite's default 500KB warning threshold.

## API Notes

- Scan case insert/select/update uses anon RLS for MVP demo flow.
- `api_cache` still expects server-side access. Without `SUPABASE_SERVICE_ROLE_KEY`, scan flows continue but cache operations may fall back to best-effort behavior.
- Public API and UNI-PASS credentials must never use `VITE_` prefixes.
- Gemini quota or billing failures are non-retryable until the selected gateway credits/quota are restored. The MVP flow records failed Gemini evidence and continues with low-confidence local fallback extraction for review.
- If AI Studio reports depleted prepaid credits while Google Cloud Developer Program credits remain, use `GEMINI_PROVIDER=vertex` with a Vertex-enabled Google Cloud project. Locally verified values are `GOOGLE_VERTEX_PROJECT=gen-lang-client-0563653718`, `GOOGLE_VERTEX_LOCATION=us-central1`, `GOOGLE_VERTEX_AUTH_MODE=gcloud`, and `GEMINI_MODEL=gemini-2.5-flash`.
