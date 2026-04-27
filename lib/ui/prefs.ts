import { cookies } from "next/headers";

export const LOCALE_COOKIE = "akwad_locale";
export const THEME_COOKIE = "akwad_theme";

export type UiLocale = "ar" | "en";
export type UiTheme = "tenant" | "platform";

export async function getUiLocale(companyFallback?: UiLocale): Promise<UiLocale> {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (v === "en") return "en";
  if (v === "ar") return "ar";
  if (companyFallback === "en" || companyFallback === "ar") return companyFallback;
  return "ar";
}

/** ثيم شاشة العميل (افتراضي): فاتح مع لمسة تيل. */
export async function getUiThemeForTenant(): Promise<UiTheme> {
  const v = (await cookies()).get(THEME_COOKIE)?.value;
  if (v === "platform" || v === "tenant") return v;
  return "tenant";
}

/** ثيم شاشة أدمن المنصة (افتراضي): داكن. */
export async function getUiThemeForPlatform(): Promise<UiTheme> {
  const v = (await cookies()).get(THEME_COOKIE)?.value;
  if (v === "platform" || v === "tenant") return v;
  return "platform";
}
