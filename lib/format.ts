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
