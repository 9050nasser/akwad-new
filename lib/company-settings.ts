import type { UiLocale } from "@/lib/ui/prefs";

export type MoneyFormatInput = {
  currency: string;
  currencyDecimals: number;
};

export function effectiveMinPasswordLength(
  company: { minPasswordLength?: number | null } | null | undefined,
): number {
  const raw = company?.minPasswordLength ?? 6;
  return Math.min(128, Math.max(6, Math.floor(raw)));
}

export function formatCompanyMoney(
  company: MoneyFormatInput | null | undefined,
  amount: number,
  locale: UiLocale,
): string {
  const code = (company?.currency ?? "SAR").trim().toUpperCase() || "SAR";
  const dec = Math.min(6, Math.max(0, Math.floor(company?.currencyDecimals ?? 2)));
  const tag = locale === "en" ? "en-GB" : "ar-EG";
  const n = Number(amount);
  if (/^[A-Z]{3}$/.test(code)) {
    try {
      return n.toLocaleString(tag, {
        style: "currency",
        currency: code,
        minimumFractionDigits: dec,
        maximumFractionDigits: dec,
      });
    } catch {
      /* ignore */
    }
  }
  return `${n.toLocaleString(tag, { minimumFractionDigits: dec, maximumFractionDigits: dec })} ${code}`;
}
