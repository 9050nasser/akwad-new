import type { UiLocale } from "@/lib/ui/prefs";

function dateLocaleTag(locale: UiLocale) {
  return locale === "en" ? "en-GB" : "ar-EG";
}

export function formatLicenseDate(d: Date, locale: UiLocale = "ar") {
  return new Intl.DateTimeFormat(dateLocaleTag(locale), {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

export function formatDateTime(d: Date, locale: UiLocale = "ar") {
  return new Intl.DateTimeFormat(dateLocaleTag(locale), {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

export function formatDateOnly(d: Date, locale: UiLocale = "ar") {
  return new Intl.DateTimeFormat(dateLocaleTag(locale), { dateStyle: "medium" }).format(d);
}

/** وقت فقط (بدون تاريخ) — مناسب لأعمدة الدخول/الخروج في التقارير اليومية. */
export function formatTimeOnly(d: Date, locale: UiLocale = "ar") {
  return new Intl.DateTimeFormat(dateLocaleTag(locale), {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

const reportLocale = "en-GB";

/** تاريخ للتقارير: أرقام لاتينية (٠١٢ → 012) وتنسيق واضح. */
export function formatReportDateOnly(d: Date) {
  return new Intl.DateTimeFormat(reportLocale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** وقت دخول/خروج في التقارير — أرقام لاتينية، ٢٤ ساعة. */
export function formatReportTimeOnly(d: Date) {
  return new Intl.DateTimeFormat(reportLocale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/** تاريخ ووقت في التقارير — أرقام لاتينية. */
export function formatReportDateTime(d: Date) {
  return new Intl.DateTimeFormat(reportLocale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/** عرض الدقائق كساعات:دقائق (مثلاً ٨:٣٠). */
export function formatDurationMinutes(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0) return "0:00";
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}

/** مثل `formatDurationMinutes` مع دعم القيم السالبة (لعمود «الفرق» في التقارير). */
export function formatSignedDurationMinutes(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes)) return "0:00";
  const sign = totalMinutes < 0 ? "-" : "";
  return sign + formatDurationMinutes(Math.abs(totalMinutes));
}
