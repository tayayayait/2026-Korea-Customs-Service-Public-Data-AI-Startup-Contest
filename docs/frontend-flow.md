# Frontend Flow

User-facing scan flow and Phase 3 screen behavior.

## Entry Inputs

The home route `/` supports three input modes:

| Mode  | Client Input                                | Server Field                             |
| ----- | ------------------------------------------- | ---------------------------------------- |
| Text  | Product description textarea                | `inputType=text`, `productText`          |
| URL   | Public product URL                          | `inputType=url`, `productUrl`            |
| Image | JPEG, PNG, or WebP product image up to 10MB | `inputType=image`, `productImageDataUrl` |

Image mode also accepts optional product text. The browser converts the selected file to a base64 data URL and sends it to the server for Gemini multimodal analysis.

## Scan Flow

1. `/` collects product input, purchase country, currency, price, shipping fee, and purchase purpose.
2. `createAndAnalyzeScan` extracts product fields and HS candidates with Gemini.
   - If Gemini quota, billing, or structured-output generation fails, the server records failed Gemini evidence and creates low-confidence local fallback extraction so the user can continue to the review screen.
3. Public API enrichment runs on the server:
   - Korea Customs Service customs requirement lookup
   - Korea Customs Service customs FX rate lookup
   - MFDS imported food product, ingredient code, and raw material lookups
   - MFDS Korean labeling and FoodSafetyKorea I2715 blocked direct-import food lookup when configured
4. The app stores the completed scan case in Supabase.
5. The client navigates to `/scan/:scanId/review`.
6. The user reviews and edits extracted fields, selects an HS candidate, and confirms the review.
7. `confirmScanReview` recalculates public-data enrichment, risk score, checklist, summary, and evidence.
8. The client navigates to `/scan/:scanId/result` for detailed tabs and checklist navigation.

## Stepper States

`DiagnosisStepper` is shared across the home, review, result, and checklist routes.

| Route                     | Current Step |
| ------------------------- | ------------ |
| `/` idle                  | `input`      |
| `/` while submitting      | `analysis`   |
| `/scan/new` idle          | `input`      |
| `/scan/new` submitting    | `analysis`   |
| `/scan/:scanId/review`    | `review`     |
| `/scan/:scanId/result`    | `result`     |
| `/scan/:scanId/checklist` | `result`     |

## Review Confirmation

The review screen is editable. It lets the user correct AI-extracted product fields, choose a specific HS candidate, and submit the reviewed data. The server then reruns public-data assessment and updates the stored scan case before opening the final result screen.

## Result Tabs

The food tab shows findings from Korean MFDS sources, `MFDS` sources, and `FoodSafetyKorea` sources. If extracted ingredients exist but public data returns no matching records, the tab explicitly states that no matching MFDS public-data record was found instead of showing the generic "no signal" state.

## Demo Readiness Screens

`/scan/new` provides a detailed diagnosis entry screen with analysis option toggles. The MVP server still executes the default tax and public-data enrichment path; the toggles make the demo scope explicit for the user.

`/history` lists the latest stored scan cases from Supabase with search and risk-level filters. Each row links back to the stored result screen.

`/compare` compares 2-4 saved scan cases by risk score, estimated tax, and selected HS code. The recommendation is deterministic: lowest risk score first, then lowest estimated tax.

`/cargo` performs a server-side UNI-PASS cargo clearance progress lookup. The API key remains server-only.
The consumer-facing search uses either `H B/L + B/L year` or `cargo management number`.
Result cards show cargo identifiers separately from status so that `cargMtNo` remains visible even when the lookup was performed by `hblNo`.
The route summary uses the OpenAPI guide labels: `ldprNm` is the loading port and `dsprNm` is the discharge port.

`/login` supports Supabase email magic-link login for history-oriented flows.

`/readiness` reports demo/deployment blockers such as missing required keys or unapplied Supabase migrations without exposing secret values.

## Loading and Error UX

Long-running analysis uses `AnalysisProgress`, which shows the current processing stages and switches to a longer-running public-data wait message after eight seconds.

Server-side API failures are normalized by `error-handler.server.ts`. Public API lookup failures are recorded in evidence with `confidence=failed` and `status=failed`, while deterministic fallback logic keeps the scan usable.

Gemini quota or billing failures are classified as `AI_QUOTA_EXHAUSTED`. The scan flow does not treat this as a completed AI extraction; it stores failed Gemini evidence and uses local fallback values with low confidence for user review.
