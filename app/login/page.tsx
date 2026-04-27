import { redirect } from "next/navigation";
import { FlashBanner } from "@/components/flash-banner";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { UiPreferencesToolbar } from "@/components/ui-preferences-toolbar";
import { login } from "@/app/actions/auth";
import { getSession } from "@/lib/auth/session";
import { firstQuery, formatFlash } from "@/lib/flash";
import { safeInternalPath } from "@/lib/auth/redirect";
import { uiMessages } from "@/lib/i18n/messages";
import { getUiLocale, getUiThemeForTenant } from "@/lib/ui/prefs";
import { BrandWithPro } from "@/components/brand-with-pro";
import { cn } from "@/lib/cn";
import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const from = safeInternalPath(firstQuery(sp.from));

  const session = await getSession();
  if (session) {
    redirect(session.isPlatformAdmin ? "/platform/dashboard" : from || "/dashboard");
  }

  const [locale, theme] = await Promise.all([getUiLocale(), getUiThemeForTenant()]);
  const m = uiMessages(locale);
  const base = formatFlash(sp);
  const extraKey = firstQuery(sp.err);
  const loginErr = extraKey && m.loginErrors[extraKey] ? m.loginErrors[extraKey] : undefined;
  const bannerError = loginErr ?? base.error;

  const light = theme === "tenant";

  return (
    <div
      className={cn(
        "flex min-h-screen items-center justify-center px-4 py-14 sm:py-16",
        light
          ? "bg-gradient-to-br from-slate-100 via-white to-teal-50/60"
          : "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950",
      )}
    >
      <div
        className={cn(
          "w-full max-w-[420px] space-y-8 rounded-2xl border p-8 sm:p-10 shadow-xl",
          light
            ? "border-slate-200/90 bg-white/95 shadow-slate-300/40 ring-1 ring-slate-100"
            : "border-slate-600/50 bg-slate-900/95 shadow-black/50 ring-1 ring-slate-700/50",
        )}
      >
        <div className="flex flex-col items-stretch gap-6">
          <div className="flex justify-end">
            <UiPreferencesToolbar locale={locale} theme={theme} toolbar={m.toolbar} variant={light ? "tenant" : "platform"} />
          </div>

          <div className="space-y-2 overflow-visible text-center">
            <h1 className="flex flex-wrap items-baseline justify-center gap-x-1 font-bold py-0.5 sm:gap-x-1.5">
              <BrandWithPro
                name={m.brand.name}
                proMark={m.brand.proMark}
                nameClassName={cn(
                  locale === "ar"
                    ? "text-[1.75rem] leading-[1.55] sm:text-4xl sm:leading-[1.5] tracking-normal"
                    : "text-3xl uppercase tracking-[0.16em] sm:text-4xl",
                  light ? "text-teal-800" : "text-teal-100",
                )}
                proClassName={cn(
                  locale === "ar"
                    ? "text-[0.78rem] leading-none sm:text-[0.85rem]"
                    : "text-[0.65rem] uppercase tracking-[0.2em] sm:text-xs",
                  light ? "text-teal-800" : "text-teal-100",
                )}
              />
            </h1>
            <p
              className={cn(
                "text-base font-medium",
                light ? "text-slate-600" : "text-slate-400",
              )}
            >
              {m.login.subtitle}
            </p>
            <div
              className={cn(
                "mx-auto mt-4 h-1 w-20 rounded-full",
                light ? "bg-gradient-to-r from-teal-500 to-cyan-500" : "bg-gradient-to-r from-teal-400 to-cyan-400",
              )}
              aria-hidden
            />
          </div>
        </div>

        <FlashBanner notice={base.notice} error={bannerError} />

        <form action={login} className="space-y-5">
          <input type="hidden" name="from" value={from} />
          <div>
            <Label htmlFor="companySlug">{m.login.company}</Label>
            <input id="companySlug" name="companySlug" type="text" autoComplete="off" className={fieldClass} required />
          </div>
          <div>
            <Label htmlFor="username">{m.login.username}</Label>
            <input id="username" name="username" type="text" autoComplete="username" className={fieldClass} required />
          </div>
          <div>
            <Label htmlFor="password">{m.login.password}</Label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className={fieldClass}
              required
            />
          </div>
          <div className="pt-1">
            <PrimaryButton className="w-full py-2.5 text-base font-semibold">{m.login.submit}</PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}
