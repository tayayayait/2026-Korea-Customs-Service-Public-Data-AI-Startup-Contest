import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AlertTriangle, ArrowRight, Loader2, Settings2, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";

import { AnalysisProgress } from "@/components/AnalysisProgress";
import { AppHeader } from "@/components/AppHeader";
import { DiagnosisStepper } from "@/components/DiagnosisStepper";
import { createAndAnalyzeScan } from "@/lib/scans.functions";

export const Route = createFileRoute("/scan/new")({
  head: () => ({
    meta: [
      { title: "상세 진단 시작 — 직구 세이프패스 AI" },
      {
        name: "description",
        content: "분석 옵션을 선택해 해외직구 통관 위험 진단을 시작합니다.",
      },
    ],
  }),
  component: ScanNewPage,
});

const COUNTRIES = [
  { code: "US", label: "미국" },
  { code: "CN", label: "중국" },
  { code: "JP", label: "일본" },
  { code: "EU", label: "EU" },
  { code: "UNKNOWN", label: "확인 불가" },
];
const CURRENCIES = ["USD", "JPY", "CNY", "EUR", "KRW"];

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  US: "USD",
  CN: "CNY",
  JP: "JPY",
  EU: "EUR",
  UNKNOWN: "USD",
};

const CURRENCY_SYMBOL: Record<string, string> = {
  USD: "$",
  JPY: "¥",
  CNY: "¥",
  EUR: "€",
  KRW: "₩",
};

const ESTIMATED_EXCHANGE_RATE: Record<string, number> = {
  USD: 1400,
  JPY: 9.2,
  CNY: 195,
  EUR: 1520,
  KRW: 1,
};

function ScanNewPage() {
  const navigate = useNavigate();
  const analyze = useServerFn(createAndAnalyzeScan);
  const [inputType, setInputType] = useState<"text" | "url" | "image">("text");
  const [productText, setProductText] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [productImages, setProductImages] = useState<{ dataUrl: string; name: string }[]>([]);
  const [purchaseCountry, setPurchaseCountry] = useState("US");
  const [currency, setCurrency] = useState("USD");
  const [itemPrice, setItemPrice] = useState<number | "">("");
  const [shippingFee, setShippingFee] = useState<number | "">(0);
  const [purchasePurpose, setPurchasePurpose] = useState<"personal" | "resale">("personal");

  const [loading, setLoading] = useState(false);
  const [loadingStartedAt, setLoadingStartedAt] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);

  async function handleImageFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const newImages: { dataUrl: string; name: string }[] = [];
    const remainingSlots = 5 - productImages.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    for (const file of filesToProcess) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        toast.error(`${file.name}: 지원하지 않는 이미지 형식입니다.`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name}: 이미지는 10MB 이하만 업로드할 수 있습니다.`);
        continue;
      }

      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement("canvas");
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext("2d");
              if (!ctx) return resolve(String(reader.result)); // fallback
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL(file.type));
            };
            img.onerror = () => reject(new Error("이미지를 처리하지 못했습니다."));
            img.src = String(reader.result);
          };
          reader.onerror = () => reject(new Error("파일을 읽지 못했습니다."));
          reader.readAsDataURL(file);
        });
        newImages.push({ dataUrl, name: file.name });
      } catch (err) {
        toast.error(`${file.name}: 이미지 처리 중 오류가 발생했습니다.`);
      }
    }

    if (newImages.length > 0) {
      setProductImages((prev) => [...prev, ...newImages]);
      setError(null);
    }
  }

  async function submit() {
    setError(null);
    if (inputType === "text" && productText.trim().length < 5) {
      setError("상품 설명을 5자 이상 입력하세요.");
      return;
    }
    if (inputType === "url" && !productUrl.startsWith("http")) {
      setError("공개 접근 가능한 상품 URL을 입력하세요.");
      return;
    }
    if (inputType === "image" && productImages.length === 0) {
      setError("분석할 상품 이미지를 업로드하세요.");
      return;
    }
    if (typeof itemPrice !== "number" || itemPrice <= 0) {
      setError("상품 가격을 입력하세요.");
      return;
    }

    setLoadingStartedAt(Date.now());
    setLoading(true);
    try {
      const { scanId } = await analyze({
        data: {
          inputType,
          productUrl: inputType === "url" ? productUrl : "",
          productText: inputType === "url" ? "" : productText,
          productImageDataUrls:
            inputType === "image" ? productImages.map((img) => img.dataUrl) : [],
          purchaseCountry,
          currency,
          itemPrice: Number(itemPrice),
          shippingFee: typeof shippingFee === "number" ? shippingFee : 0,
          purchasePurpose,
        },
      });
      toast.success("상세 진단을 시작했습니다.");
      navigate({ to: "/scan/$scanId/review", params: { scanId } });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "진단 실행에 실패했습니다.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="app-container py-8 md:py-10">
        <div className="mt-3">
          <DiagnosisStepper current={loading ? "analysis" : "input"} />
        </div>

        <section className="store-card mt-5 p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-medium text-muted-foreground">상세 진단</div>
              <h1 className="mt-1 text-xl font-bold text-foreground md:text-2xl">
                분석 옵션을 선택하고 진단을 시작하세요
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                옵션은 현재 MVP에서 화면 흐름과 evidence 확인 범위를 명확히 하기 위한 설정입니다.
              </p>
            </div>
            <Settings2 className="h-6 w-6 text-primary" />
          </div>
        </section>

        {loading ? (
          <div className="mt-8 max-w-2xl mx-auto">
            <AnalysisProgress startedAt={loadingStartedAt} />
          </div>
        ) : (
          <div className="mt-5 max-w-2xl mx-auto">
            <section>
              <div className="store-card p-5">
                <div className="mb-4 grid grid-cols-3 gap-1 rounded-md bg-muted p-1">
                  <button
                    type="button"
                    onClick={() => setInputType("text")}
                    className={`rounded-md px-3 py-2 text-sm font-semibold ${
                      inputType === "text"
                        ? "bg-surface text-foreground shadow-card"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    텍스트
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputType("url")}
                    className={`rounded-md px-3 py-2 text-sm font-semibold ${
                      inputType === "url"
                        ? "bg-surface text-foreground shadow-card"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputType("image")}
                    className={`rounded-md px-3 py-2 text-sm font-semibold ${
                      inputType === "image"
                        ? "bg-surface text-foreground shadow-card"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    이미지
                  </button>
                </div>

                {inputType === "text" ? (
                  <Field label="상품 설명">
                    <textarea
                      rows={6}
                      value={productText}
                      onChange={(event) => setProductText(event.target.value)}
                      placeholder="상품명, 브랜드, 성분, 재질, 판매 페이지 문구를 입력하세요."
                      className="min-h-[144px] w-full rounded-md border border-border bg-background px-3 py-3 text-sm text-foreground"
                    />
                  </Field>
                ) : inputType === "url" ? (
                  <Field label="상품 URL">
                    <input
                      type="url"
                      value={productUrl}
                      onChange={(event) => setProductUrl(event.target.value)}
                      placeholder="https://..."
                      className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
                    />
                  </Field>
                ) : (
                  <Field label={`상품 이미지 (${productImages.length}/5)`}>
                    <div className="rounded-md border border-dashed border-border bg-background p-4">
                      {productImages.length > 0 ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                            {productImages.map((img, idx) => (
                              <div
                                key={idx}
                                className="relative group rounded-md border border-border bg-surface p-2"
                              >
                                <img
                                  src={img.dataUrl}
                                  alt={`업로드 이미지 ${idx + 1}`}
                                  className="h-24 w-full rounded-sm object-cover"
                                />
                                <div className="mt-2 truncate text-[11px] text-muted-foreground">
                                  {img.name}
                                </div>
                                <button
                                  type="button"
                                  aria-label={`이미지 ${idx + 1} 제거`}
                                  onClick={() =>
                                    setProductImages((prev) => prev.filter((_, i) => i !== idx))
                                  }
                                  className="absolute -right-2 -top-2 rounded-full border border-border bg-background p-1 text-muted-foreground hover:text-danger shadow-sm"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                          {productImages.length < 5 && (
                            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted">
                              <ImagePlus className="h-4 w-4" />
                              이미지 추가
                              <input
                                type="file"
                                multiple
                                accept="image/jpeg,image/png,image/webp"
                                className="sr-only"
                                onChange={(e) => void handleImageFiles(e.target.files)}
                              />
                            </label>
                          )}
                          <p className="text-xs text-muted-foreground">
                            이미지의 상품명, 성분표, 원산지, 포장 문구를 함께 분석합니다. (최초
                            1장만 AI 분석에 사용됩니다)
                          </p>
                        </div>
                      ) : (
                        <label className="flex cursor-pointer flex-col items-center justify-center rounded-md bg-surface px-4 py-8 text-center hover:bg-muted">
                          <ImagePlus className="h-7 w-7 text-primary" />
                          <span className="mt-2 text-sm font-semibold text-foreground">
                            이미지 선택 (최대 5장)
                          </span>
                          <span className="mt-1 text-xs text-muted-foreground">
                            JPEG, PNG, WebP · 각 10MB 이하
                          </span>
                          <input
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            onChange={(e) => void handleImageFiles(e.target.files)}
                          />
                        </label>
                      )}
                    </div>
                    <textarea
                      rows={3}
                      placeholder="이미지에 보이지 않는 판매 페이지 설명이나 성분 정보를 추가로 입력하세요."
                      value={productText}
                      onChange={(event) => setProductText(event.target.value)}
                      className="mt-3 min-h-[88px] w-full rounded-md border border-border bg-background px-3 py-3 text-sm text-foreground"
                    />
                  </Field>
                )}

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="구매 국가">
                    <select
                      value={purchaseCountry}
                      onChange={(event) => {
                        const newCountry = event.target.value;
                        setPurchaseCountry(newCountry);
                        const mappedCurrency = COUNTRY_CURRENCY_MAP[newCountry];
                        if (mappedCurrency) {
                          setCurrency(mappedCurrency);
                        }
                      }}
                      className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
                    >
                      {COUNTRIES.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="통화">
                    <select
                      value={currency}
                      onChange={(event) => setCurrency(event.target.value)}
                      className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
                    >
                      {CURRENCIES.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="상품 가격">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        {CURRENCY_SYMBOL[currency] || "$"}
                      </span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={itemPrice}
                        onChange={(event) =>
                          setItemPrice(event.target.value === "" ? "" : Number(event.target.value))
                        }
                        className="h-11 w-full rounded-md border border-border bg-background pl-8 pr-3 text-sm text-foreground"
                      />
                    </div>
                    {currency !== "KRW" && typeof itemPrice === "number" && itemPrice > 0 && (
                      <div className="mt-1.5 text-[13px] font-medium text-muted-foreground">
                        약{" "}
                        {(itemPrice * (ESTIMATED_EXCHANGE_RATE[currency] || 1)).toLocaleString(
                          "ko-KR",
                          { maximumFractionDigits: 0 },
                        )}
                        원
                      </div>
                    )}
                  </Field>
                  <Field label="배송비">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        {CURRENCY_SYMBOL[currency] || "$"}
                      </span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={shippingFee}
                        onChange={(event) =>
                          setShippingFee(
                            event.target.value === "" ? "" : Number(event.target.value),
                          )
                        }
                        className="h-11 w-full rounded-md border border-border bg-background pl-8 pr-3 text-sm text-foreground"
                      />
                    </div>
                    {currency !== "KRW" && typeof shippingFee === "number" && shippingFee > 0 && (
                      <div className="mt-1.5 text-[13px] font-medium text-muted-foreground">
                        약{" "}
                        {(shippingFee * (ESTIMATED_EXCHANGE_RATE[currency] || 1)).toLocaleString(
                          "ko-KR",
                          { maximumFractionDigits: 0 },
                        )}
                        원
                      </div>
                    )}
                  </Field>
                </div>

                <Field label="구매 목적" className="mt-4">
                  <div className="grid grid-cols-2 gap-1 rounded-md border border-border bg-background p-1">
                    <button
                      type="button"
                      onClick={() => setPurchasePurpose("personal")}
                      className={`rounded px-3 py-2 text-sm font-semibold ${
                        purchasePurpose === "personal"
                          ? "bg-primary-weak text-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      개인 자가사용
                    </button>
                    <button
                      type="button"
                      onClick={() => setPurchasePurpose("resale")}
                      className={`rounded px-3 py-2 text-sm font-semibold ${
                        purchasePurpose === "resale"
                          ? "bg-primary-weak text-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      재판매
                    </button>
                  </div>
                </Field>

                {error && (
                  <div className="mt-4 flex gap-2 rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {loading && (
                  <div className="mt-4">
                    <AnalysisProgress startedAt={loadingStartedAt} />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={loading}
                  className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:brightness-95 disabled:opacity-45"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  상세 진단 시작
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[13px] font-semibold text-foreground">{label}</span>
      {children}
    </label>
  );
}

