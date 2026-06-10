# External API Configuration

Reference for server-side API credentials and public data endpoints.

## Environment Variables

Set secrets in `.env`. Do not expose these values through `VITE_` variables.

| Variable                    |    Required | Purpose                                                                                                                                            |
| --------------------------- | ----------: | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GEMINI_PROVIDER`           |          No | `developer` for Gemini Developer API or `vertex` for Vertex AI. Default is `developer`                                                             |
| `GEMINI_API_KEY`            | Conditional | Required only when `GEMINI_PROVIDER=developer` for extraction, image understanding, and HS recommendations                                         |
| `GEMINI_MODEL`              |          No | Gemini model id. Default is `gemini-3-flash-preview` in Developer API mode and `gemini-2.5-flash` in Vertex AI mode                                |
| `GOOGLE_VERTEX_PROJECT`     | Conditional | Required only when `GEMINI_PROVIDER=vertex`; Google Cloud project id used for Vertex AI billing and quota                                          |
| `GOOGLE_VERTEX_LOCATION`    |          No | Vertex AI region. Default is `us-central1`                                                                                                         |
| `GOOGLE_VERTEX_AUTH_MODE`   |          No | Vertex AI auth mode. `adc` uses Application Default Credentials; `gcloud` uses the active `gcloud auth print-access-token` account for local demos |
| `GOOGLE_CLIENT_EMAIL`       | Conditional | Required on Vercel when `GEMINI_PROVIDER=vertex`; service account client email for the Vertex AI edge provider                                     |
| `GOOGLE_PRIVATE_KEY`        | Conditional | Required on Vercel when `GEMINI_PROVIDER=vertex`; service account private key for the Vertex AI edge provider                                      |
| `GOOGLE_PRIVATE_KEY_ID`     |          No | Optional service account private key id for the Vertex AI edge provider                                                                            |
| `DATA_GO_KR_API_KEY`        |         Yes | Data.go.kr service key for Korea Customs Service and MFDS APIs                                                                                     |
| `FOODSAFETY_KOREA_API_KEY`  |          No | FoodSafetyKorea OpenAPI key for I2715 blocked overseas direct purchase food lookup                                                                 |
| `UNIPASS_API_KEY`           |          No | UNI-PASS cargo clearance progress lookup key                                                                                                       |
| `UNIPASS_SERVICE_ID`        |          No | UNI-PASS service identifier. Default is `API001`                                                                                                   |
| `SUPABASE_URL`              |         Yes | Server-side Supabase URL                                                                                                                           |
| `SUPABASE_PUBLISHABLE_KEY`  |         Yes | Supabase publishable key                                                                                                                           |
| `SUPABASE_SERVICE_ROLE_KEY` |          No | Server-only Supabase service role key for cache/admin operations. Scan cases use anon RLS in the MVP                                               |
| `PUBLIC_API_TIMEOUT_MS`     |          No | Public API timeout. Default is `10000`                                                                                                             |
| `PUBLIC_API_RETRY_COUNT`    |          No | Public API retry count. Default is `1`                                                                                                             |

## MVP Endpoints

| API                                             | Method | Endpoint                                                                                          | Auth Parameter | Main Parameters                                                                            |
| ----------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------ |
| Korea Customs Service customs requirement items | `GET`  | `http://apis.data.go.kr/1220000/retrieveCcctLworCd/getRetrieveCcctLworCd`                         | `serviceKey`   | `hsSgn`, `imexTpcd=2`                                                                      |
| Korea Customs Service customs FX rate           | `GET`  | `http://apis.data.go.kr/1220000/retrieveTrifFxrtInfo/getRetrieveTrifFxrtInfo`                     | `serviceKey`   | `aplyBgnDt`, `weekFxrtTpcd=2`                                                              |
| MFDS imported food product DB                   | `GET`  | `http://apis.data.go.kr/1471000/IprtFoodPrdtDBService02/getIprtFoodPrdtDBInq02`                   | `serviceKey`   | `DCLR_PRDT_DIVS_NM`, `MNFT_NATN_NM`, `PRDT_NM`, `PRDLST_NM`, `pageNo`, `numOfRows`, `type` |
| MFDS imported food ingredient code              | `GET`  | `http://apis.data.go.kr/1471000/IprtFoodCpntCdInfoFoodService/getIprtFoodCpntCdInfoFoodInq`       | `serviceKey`   | `CPNT_CD`, `KOR_NM`, `ENG_NM`, `CPNT_LCLS_CD_NM`, `pageNo`, `numOfRows`, `type`            |
| MFDS food raw material info                     | `GET`  | `http://apis.data.go.kr/1471000/FoodRwmtInfo/getFoodRwmtInfo`                                     | `serviceKey`   | `ORM_STD_NM`, `ORM_STD_CD`, `IMPORT_YN`, `PRV_NATN_CD`, `pageNo`, `numOfRows`, `type`      |
| MFDS imported food Korean labeling              | `GET`  | `http://apis.data.go.kr/1471000/IprtFoodPrdtKoreanLabelingItem/getIprtFoodPrdtKoreanLabelingItem` | `serviceKey`   | `prductNm`, `prductKoreanNm`, `mnfNtncdNm`, `irdntNm`, `pageNo`, `numOfRows`, `type`       |
| FoodSafetyKorea blocked direct-import foods     | `GET`  | `http://openapi.foodsafetykorea.go.kr/api/{key}/I2715/json/{startIdx}/{endIdx}`                   | path key       | `PRDT_NM`, `MUFC_NM`, `MUFC_CNTRY_NM`, `INGR_NM_LST` as optional path parameters           |

## File Data

| File                                                   | Use                                                                 |
| ------------------------------------------------------ | ------------------------------------------------------------------- |
| `api가이드파일/관세청_HS부호_20260101.xlsx`            | Load searchable HS code records                                     |
| `api가이드파일/관세청_국가별 관세율표_20251231/*.xlsx` | Reference tariff rates only. These are not legal tax determinations |

## UNI-PASS

UNI-PASS cargo lookup is approved for service `API001`, but it is not MVP-critical.

| API                      | Method | Endpoint                                                                                    | Auth Parameter | Main Parameters                           |
| ------------------------ | ------ | ------------------------------------------------------------------------------------------- | -------------- | ----------------------------------------- |
| Cargo clearance progress | `GET`  | `https://unipass.customs.go.kr:38010/ext/rest/cargCsclPrgsInfoQry/retrieveCargCsclPrgsInfo` | `crkyCn`       | `cargMtNo` or `mblNo`/`hblNo` with `blYy` |

The cargo screen keeps the UNI-PASS field names aligned with the local OpenAPI guide:

| UI Area     | UNI-PASS Fields                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------- |
| Search      | `cargMtNo` or `hblNo` with `blYy`; `mblNo` is supported server-side but not exposed in the consumer MVP |
| Status      | `prgsStts` as the primary progress status, `csclPrgsStts` as the customs clearance status               |
| Identifiers | `cargMtNo`, `mblNo`, `hblNo`, `blPtNm`                                                                  |
| Route       | `ldprNm` as loading port and `dsprNm` as discharge port; do not label `ldprNm` as origin country        |
| Arrival     | `etprDt`, `etprCstm`                                                                                    |
| Quantity    | `pckGcnt`, `pckUt`, `ttwg`, `wghtUt`                                                                    |
| Detail rows | `cargTrcnRelaBsopTpcd`, `prcsDttm`, `shedNm`, `rlbrCn`, `dclrNo`, `rlbrDttm`, `pckGcnt`, `wght`         |

## Phase 3 Endpoints

| API                                      | Method | Endpoint                                                                                    | Auth Parameter | Main Parameters                           |
| ---------------------------------------- | ------ | ------------------------------------------------------------------------------------------- | -------------- | ----------------------------------------- |
| Item-country trade stats                 | `GET`  | `http://apis.data.go.kr/1220000/nitemtrade/getNitemtradeList`                               | `serviceKey`   | `strtYymm`, `endYymm`, `hsSgn`, `cntyCd`  |
| UNI-PASS cargo clearance progress lookup | `GET`  | `https://unipass.customs.go.kr:38010/ext/rest/cargCsclPrgsInfoQry/retrieveCargCsclPrgsInfo` | `crkyCn`       | `cargMtNo` or `mblNo`/`hblNo` with `blYy` |

## Implementation Notes

- Keep API keys in server-only environment variables.
- Never send `DATA_GO_KR_API_KEY`, `FOODSAFETY_KOREA_API_KEY`, `GEMINI_API_KEY`, `UNIPASS_API_KEY`, or `SUPABASE_SERVICE_ROLE_KEY` to the browser.
- Use `GEMINI_PROVIDER=vertex` when Gemini Developer API prepaid credits are depleted but Google Cloud billing credits are available. Vertex AI requires Application Default Credentials, service account credentials, or local `GOOGLE_VERTEX_AUTH_MODE=gcloud`.
- On Vercel, do not use `GOOGLE_VERTEX_AUTH_MODE=gcloud`. Use service account environment variables (`GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, optional `GOOGLE_PRIVATE_KEY_ID`) or switch to `GEMINI_PROVIDER=developer` with `GEMINI_API_KEY`.
- The local verified Vertex AI configuration is `GOOGLE_VERTEX_PROJECT=gen-lang-client-0563653718`, `GOOGLE_VERTEX_LOCATION=us-central1`, `GOOGLE_VERTEX_AUTH_MODE=gcloud`, and `GEMINI_MODEL=gemini-2.5-flash`.
- Treat all tariff calculations as reference estimates.
- Use `imexTpcd=2` and `weekFxrtTpcd=2` for import flows.
- Cache customs requirement and MFDS results for 24 hours, and customs FX rate results for 7 days.
- Data.go.kr XML client helpers live in `src/lib/api/api-helpers.server.ts`.
- Korea Customs Service clients live in `src/lib/api/customs-api.server.ts`.
- MFDS clients, including imported food Korean labeling, live in `src/lib/api/mfds-api.server.ts`.
- FoodSafetyKorea I2715 client lives in `src/lib/api/foodsafety-api.server.ts`.
- Gemini Developer API and Vertex AI provider setup lives in `src/lib/ai-gateway.server.ts`.
- Scan-time public API enrichment lives in `src/lib/scan-public-data.server.ts`.
- Supabase-backed public API cache adapter lives in `src/lib/api/public-api-cache.server.ts`.
- `fetchFoodRawMaterials` uses `ORM_STD_NM` for raw-material name searches. The MFDS raw-material response exposes displayable details including `ORM_STD_NM` (raw material name), `ORM_STD_NM_ENG`, `ORM_STD_CD`, `IMPORT_YN`, `PRV_NATN_CD`, `GMO_YN`, and `USE_FLAG`; scan findings surface these values instead of only showing a count.
- `scan_cases` uses anon RLS for MVP insert/select/update. `public.api_cache` is server-only cache storage for normalized public API responses; use `service_role` for reads and writes when available.
