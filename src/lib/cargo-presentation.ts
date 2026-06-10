import type { CargoClearanceProgressItem } from "./api/unipass-api.server";

type CargoIdentifier = {
  label: string;
  value: string;
};

export type CargoSummary = {
  productName: string;
  carrierName: string;
  cargoType: string;
  primaryStatus: string;
  clearanceStatus?: string;
  routeLabel: string;
  routeValue: string;
  arrivalCustoms: string;
  packageValue: string;
  quantityValue: string;
  weightValue: string;
  identifiers: CargoIdentifier[];
};

const present = (value?: string, fallback = "-") => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
};

const measure = (value?: string, unit?: string) => {
  const normalizedValue = value?.trim();
  if (!normalizedValue) return "-";

  const normalizedUnit = unit?.trim();
  return normalizedUnit ? `${normalizedValue} ${normalizedUnit}` : normalizedValue;
};

export const formatCargoDate = (value?: string) => {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (digits.length < 8) return value || "-";

  return `${digits.substring(0, 4)}.${digits.substring(4, 6)}.${digits.substring(6, 8)}`;
};

export const formatCargoDateTime = (value?: string) => {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (digits.length < 12) return value || "-";

  return `${digits.substring(0, 4)}.${digits.substring(4, 6)}.${digits.substring(
    6,
    8,
  )} ${digits.substring(8, 10)}:${digits.substring(10, 12)}`;
};

export const buildCargoSummary = (item: CargoClearanceProgressItem): CargoSummary => {
  const primaryStatus = present(item.prgsStts || item.csclPrgsStts, "상태 알 수 없음");
  const clearanceStatus =
    item.csclPrgsStts && item.csclPrgsStts !== primaryStatus ? item.csclPrgsStts : undefined;

  const identifiers = [
    { label: "화물관리번호", value: item.cargMtNo },
    { label: "M B/L", value: item.mblNo },
    { label: "H B/L", value: item.hblNo },
    { label: "B/L 유형", value: item.blPtNm },
  ].flatMap(({ label, value }) => {
    const normalizedValue = value?.trim();
    return normalizedValue ? [{ label, value: normalizedValue }] : [];
  });

  return {
    productName: present(item.prnm, "품명 정보 없음"),
    carrierName: present(item.shcoFlco, "항공/선사 미상"),
    cargoType: present(item.cargTp),
    primaryStatus,
    clearanceStatus,
    routeLabel: "적재항 ➔ 양륙항",
    routeValue: `${present(item.ldprNm)} ➔ ${present(item.dsprNm)}`,
    arrivalCustoms: present(item.etprCstm),
    packageValue: measure(item.pckGcnt, item.pckUt),
    quantityValue: measure(item.pckGcnt, item.pckUt),
    weightValue: measure(item.ttwg, item.wghtUt),
    identifiers,
  };
};
