import { assertServerConfig, getServerConfig } from "../config.server";
import {
  buildPublicApiUrl,
  readPath,
  requestPublicApiXml,
  toArray,
  type PublicApiFetcher,
} from "./api-helpers.server";

export const UNIPASS_CARGO_PROGRESS_ENDPOINT =
  "https://unipass.customs.go.kr:38010/ext/rest/cargCsclPrgsInfoQry/retrieveCargCsclPrgsInfo";

type UnipassClientOptions = {
  apiKey?: string;
  fetcher?: PublicApiFetcher;
  timeoutMs?: number;
  retryCount?: number;
};

export type CargoClearanceProgressDetail = {
  cargTrcnRelaBsopTpcd?: string;
  prcsDttm?: string;
  dclrNo?: string;
  rlbrDttm?: string;
  shedNm?: string;
  shedSgn?: string;
  rlbrCn?: string;
  rlbrBssNo?: string;
  bfhnGdncCn?: string;
  wght?: string;
  wghtUt?: string;
  pckGcnt?: string;
  pckUt?: string;
};

export type CargoClearanceProgressItem = {
  cargMtNo?: string;
  prgsStts?: string;
  prgsStCd?: string;
  csclPrgsStts?: string;
  prcsDttm?: string;
  shipNat?: string;
  shipNatNm?: string;
  mblNo?: string;
  hblNo?: string;
  agnc?: string;
  shcoFlcoSgn?: string;
  shcoFlco?: string;
  cargTp?: string;
  ldprCd?: string;
  ldprNm?: string;
  lodCntyCd?: string;
  shipNm?: string;
  pckGcnt?: string;
  pckUt?: string;
  blPt?: string;
  blPtNm?: string;
  dsprCd?: string;
  dsprNm?: string;
  etprCstm?: string;
  prnm?: string;
  etprDt?: string;
  msrm?: string;
  ttwg?: string;
  wghtUt?: string;
  cntrGcnt?: string;
  cntrNo?: string;
  frwrSgn?: string;
  frwrEntsConm?: string;
  vydf?: string;
  spcnCargCd?: string;
  mtTrgtCargYnNm?: string;
  rlseDtyPridPassTpcd?: string;
  dclrDelyAdtxYn?: string;
  details?: CargoClearanceProgressDetail[];
};

type CargoProgressOptions = UnipassClientOptions & {
  cargoManagementNumber?: string;
  masterBlNo?: string;
  houseBlNo?: string;
  blYear?: string;
};

const resolveUnipassOptions = (options: UnipassClientOptions) => {
  const config = options.apiKey
    ? getServerConfig()
    : assertServerConfig(["unipassApiKey"], "UNI-PASS cargo progress request");
  const apiKey = options.apiKey ?? config.unipassApiKey;

  if (!apiKey) throw new Error("Missing UNI-PASS API key");

  return {
    apiKey,
    fetcher: options.fetcher,
    timeoutMs: options.timeoutMs ?? config.publicApiTimeoutMs,
    retryCount: options.retryCount ?? config.publicApiRetryCount,
  };
};

export const fetchCargoClearanceProgress = async (
  options: CargoProgressOptions,
): Promise<CargoClearanceProgressItem[]> => {
  // --- 테스트용 목업(Mock) 데이터 추가 ---
  if (options.houseBlNo === "TEST0000" || options.cargoManagementNumber === "TEST0000") {
    return [
      {
        cargMtNo: "23ABCD123456-TEST",
        prgsStts: "반출완료",
        csclPrgsStts: "수입신고수리",
        prcsDttm: "20260609143000",
        cargTp: "수입 일반화물",
        shedNm: "인천특송물류센터(테스트)",
        rlbrDttm: "20260609150000",
        dclrNo: "12345-26-100000U",
        mblNo: "MBL-TEST-999",
        hblNo: "TEST0000",
        prnm: "MAG****LAY (단백질 보충제)",
        etprDt: "20260608",
        shcoFlco: "대한항공",
        ldprNm: "LA",
        dsprNm: "인천공항",
        etprCstm: "인천세관",
        pckGcnt: "1",
        pckUt: "CT",
        blPtNm: "House",
        ttwg: "2.5",
        wghtUt: "KG",
        details: [
          {
            cargTrcnRelaBsopTpcd: "반출신고",
            prcsDttm: "20260609150000",
            dclrNo: "12345-26-100000U",
            rlbrDttm: "20260609150000",
            shedNm: "인천특송물류센터",
            rlbrCn: "수입신고 수리후 반출",
            pckGcnt: "1",
            pckUt: "CT",
            wght: "2.5",
            wghtUt: "KG",
          },
          {
            cargTrcnRelaBsopTpcd: "수입신고수리",
            prcsDttm: "20260609143000",
            shedNm: "인천특송물류센터",
            rlbrCn: "수입신고가 수리되었습니다.",
          },
          {
            cargTrcnRelaBsopTpcd: "반입신고",
            prcsDttm: "20260608100000",
            shedNm: "인천특송물류센터",
            rlbrCn: "보세구역 반입",
          },
        ],
      },
    ];
  }
  // --------------------------------------

  const requestOptions = resolveUnipassOptions(options);
  const url = buildPublicApiUrl(UNIPASS_CARGO_PROGRESS_ENDPOINT, {
    crkyCn: requestOptions.apiKey,
    cargMtNo: options.cargoManagementNumber,
    mblNo: options.masterBlNo,
    hblNo: options.houseBlNo,
    blYy: options.blYear,
  });
  const parsed = await requestPublicApiXml(url, requestOptions);

  const mainItems = toArray(
    readPath(parsed, ["cargCsclPrgsInfoQryRtnVo", "cargCsclPrgsInfoQryVo"]),
  ) as CargoClearanceProgressItem[];

  if (!mainItems || mainItems.length === 0) return [];

  // 단건 결과인 경우 타임라인(디테일) 추출
  if (mainItems.length === 1) {
    const details = toArray(
      readPath(parsed, ["cargCsclPrgsInfoQryRtnVo", "cargCsclPrgsInfoDtlQryVo"]),
    ) as CargoClearanceProgressDetail[];
    if (details && details.length > 0) {
      // API 응답 특성상 최신순, 과거순 정렬이 보장되지 않을 수 있으므로
      // 처리일시(prcsDttm) 기준 내림차순(최신이 위로) 정렬을 권장합니다.
      details.sort((a, b) => {
        const timeA = a.prcsDttm || "";
        const timeB = b.prcsDttm || "";
        return timeB.localeCompare(timeA);
      });
      mainItems[0].details = details;
    }
  }

  return mainItems;
};
