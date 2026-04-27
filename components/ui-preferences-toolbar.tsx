"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { setUiPreferences } from "@/app/actions/ui-prefs";
import type { UiMessages } from "@/lib/i18n/messages";
import type { UiLocale, UiTheme } from "@/lib/ui/prefs";
import { cn } from "@/lib/cn";

function ToolbarInner({
  locale,
  theme,
  toolbar,
  variant,
}: {
  locale: UiLocale;
  theme: UiTheme;
  toolbar: UiMessages["toolbar"];
  variant: "tenant" | "platform";
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  const redirect = `${pathname}${qs ? `?${qs}` : ""}`;

  const light = variant === "tenant";
  const btn = cn(
    "rounded-lg px-2.5 py-1 text-xs font-semibold transition ring-1",
    light
      ? "bg-white/90 text-slate-800 ring-slate-200 hover:bg-slate-50"
      : "bg-slate-800/90 text-slate-100 ring-slate-600 hover:bg-slate-700",
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={cn("text-[10px] font-medium uppercase tracking-wide", light ? "text-slate-500" : "text-slate-500")}>
        {toolbar.language}
      </span>
      <form action={setUiPreferences} className="inline">
        <input type="hidden" name="redirect" value={redirect} />
        <input type="hidden" name="theme" value={theme} />
        <input type="hidden" name="locale" value={locale === "ar" ? "en" : "ar"} />
        <button type="submit" className={btn}>
          {locale === "ar" ? toolbar.langEn : toolbar.langAr}
        </button>
      </form>
      <span
        className={cn(
          "ms-1 text-[10px] font-medium uppercase tracking-wide",
          light ? "text-slate-500" : "text-slate-500",
        )}
      >
        {toolbar.theme}
      </span>
      <form action={setUiPreferences} className="inline">
        <input type="hidden" name="redirect" value={redirect} />
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="theme" value={theme === "tenant" ? "platform" : "tenant"} />
        <button type="submit" className={btn}>
          {theme === "tenant" ? toolbar.themePlatform : toolbar.themeTenant}
        </button>
      </form>
    </div>
  );
}

export function UiPreferencesToolbar(props: {
  locale: UiLocale;
  theme: UiTheme;
  toolbar: UiMessages["toolbar"];
  variant: "tenant" | "platform";
}) {
  return (
    <Suspense fallback={null}>
      <ToolbarInner {...props} />
    </Suspense>
  );
}
