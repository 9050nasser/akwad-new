"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { safeAnyInternalPath } from "@/lib/auth/redirect";
import { LOCALE_COOKIE, THEME_COOKIE } from "@/lib/ui/prefs";

const COOKIE_OPTS = {
  path: "/",
  maxAge: 60 * 60 * 24 * 400,
  sameSite: "lax" as const,
  httpOnly: false,
};

export async function setUiPreferences(formData: FormData) {
  const redirectTo = safeAnyInternalPath(String(formData.get("redirect") ?? "/dashboard"));
  const jar = await cookies();

  const nextLocale = String(formData.get("locale") ?? "");
  if (nextLocale === "ar" || nextLocale === "en") {
    jar.set(LOCALE_COOKIE, nextLocale, COOKIE_OPTS);
  }

  const nextTheme = String(formData.get("theme") ?? "");
  if (nextTheme === "tenant" || nextTheme === "platform") {
    jar.set(THEME_COOKIE, nextTheme, COOKIE_OPTS);
  }

  redirect(redirectTo);
}
