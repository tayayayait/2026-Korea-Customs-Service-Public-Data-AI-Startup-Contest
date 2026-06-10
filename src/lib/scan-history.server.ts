import { createServerFn } from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { RiskLevel } from "./scan-logic";

type ScanHistoryRow = {
  id: string;
  created_at: string;
  input_type: string;
  risk_level: string | null;
  risk_score: number | null;
  selected_hs_code: string | null;
  summary_ko: string | null;
  action_recommendation: string | null;
  currency: string;
  item_price: number;
  purchase_country: string;
  tax_estimate: Json | null;
  extracted: Json | null;
};

export type ScanHistoryItem = {
  id: string;
  createdAt: string;
  inputType: string;
  title: string;
  brand: string;
  riskLevel: RiskLevel;
  riskScore: number;
  selectedHsCode: string;
  summary: string;
  action: string;
  purchase: string;
  totalTaxKrw: number;
  priceFormatted: string;
  origin: string;
};

const extractedText = (extracted: Json | null, key: string): string => {
  if (!extracted || typeof extracted !== "object" || Array.isArray(extracted)) return "";
  const value = extracted[key];
  return typeof value === "string" ? value : "";
};

const jsonNumber = (value: Json | null, key: string): number => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return 0;
  const target = value[key];
  return typeof target === "number" ? target : 0;
};

export const toScanHistoryItem = (row: ScanHistoryRow): ScanHistoryItem => {
  const title =
    extractedText(row.extracted, "translatedTitleKo") ||
    extractedText(row.extracted, "rawTitle") ||
    "상품명 확인 필요";

  return {
    id: row.id,
    createdAt: row.created_at,
    inputType: row.input_type,
    title,
    brand: extractedText(row.extracted, "brand"),
    riskLevel: (row.risk_level ?? "safe") as RiskLevel,
    riskScore: row.risk_score ?? 0,
    selectedHsCode: row.selected_hs_code ?? "확인 필요",
    summary: row.summary_ko ?? "요약 없음",
    action: row.action_recommendation ?? "체크리스트 확인",
    purchase: `${row.purchase_country} · ${row.item_price} ${row.currency}`,
    totalTaxKrw: jsonNumber(row.tax_estimate, "totalTaxKrw"),
    priceFormatted: `${row.item_price} ${row.currency}`,
    origin: extractedText(row.extracted, "originCountry") || row.purchase_country,
  };
};

export const toScanHistoryItems = (
  rows: ScanHistoryRow[] | null,
  error?: unknown,
): ScanHistoryItem[] => {
  if (error) {
    console.warn("[scan-history] Falling back to empty history list:", error);
    return [];
  }
  return (rows ?? []).map((row) => toScanHistoryItem(row));
};

export const listScanHistory = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabase
    .from("scan_cases")
    .select(
      "id, created_at, input_type, risk_level, risk_score, selected_hs_code, summary_ko, action_recommendation, currency, item_price, purchase_country, tax_estimate, extracted",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  return toScanHistoryItems(data, error);
});

export const deleteScanHistory = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { error } = await supabase.from("scan_cases").delete().eq("id", data.id);
    if (error) {
      throw new Error(error.message);
    }
    return { success: true };
  });
