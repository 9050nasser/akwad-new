import Link from "next/link";
import { Suspense } from "react";
import { logout } from "@/app/actions/auth";
import { UiPreferencesToolbar } from "@/components/ui-preferences-toolbar";
import { uiMessages } from "@/lib/i18n/messages";
import { getUiLocale, getUiThemeForPlatform } from "@/lib/ui/prefs";
import { requirePlatformSession } from "@/lib/tenant";
import { BrandWithPro } from "@/components/brand-with-pro";
import { cn } from "@/lib/cn";

const PLATFORM_LINKS = [
  { href: "/platform/dashboard", labelKey: "dashboard" as const },
  { href: "/platform/companies", labelKey: "companies" as const },
  { href: "/platform/companies/new", labelKey: "addCompany" as const },
  { href: "/platform/reports/on-hold-clients", labelKey: "onHoldReport" as const },
  { href: "/platform/settings/password", labelKey: "password" as const },
];

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformSession();
  const [locale, theme] = await Promise.all([getUiLocale(), getUiThemeForPlatform()]);
  const m = uiMessages(locale);
  const p = m.platform;
  const light = theme === "tenant";
  const brandUpper = light ? "text-teal-700" : "text-amber-400/90";

  return (
    <div
      className={cn(
        "flex min-h-screen",
        light ? "bg-slate-100 text-slate-900" : "bg-slate-950 text-slate-100",
      )}
    >
      <aside
        className={cn(
          "flex w-64 shrink-0 flex-col border-e",
          light ? "border-slate-200 bg-white" : "border-slate-800 bg-slate-900/80",
        )}
      >
        <div className={cn("border-b px-4 py-5", light ? "border-slate-200" : "border-slate-800")}>
          <p
            className={cn(
              "flex flex-wrap items-baseline gap-x-1 text-xs font-medium tracking-wide",
              locale === "en" && "uppercase",
              brandUpper,
            )}
          >
            <BrandWithPro
              name={m.brand.name}
              proMark={m.brand.proMark}
              nameClassName={cn("font-bold", locale === "en" ? "tracking-[0.14em]" : "tracking-normal", brandUpper)}
              proClassName={cn(
                locale === "ar"
                  ? "text-[0.5rem] leading-none sm:text-[0.52rem]"
                  : "text-[0.58rem] tracking-[0.16em] normal-case",
                brandUpper,
              )}
            />
          </p>
          <p className={cn("mt-1 text-lg font-semibold", light ? "text-slate-900" : "text-white")}>{p.title}</p>
          <div className="mt-3">
            <Suspense fallback={null}>
              <UiPreferencesToolbar locale={locale} theme={theme} toolbar={m.toolbar} variant={light ? "tenant" : "platform"} />
            </Suspense>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-2 py-4">
          {PLATFORM_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm transition",
                light
                  ? "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white",
              )}
            >
              {p.nav[item.labelKey]}
            </Link>
          ))}
        </nav>
        <div className={cn("border-t p-3", light ? "border-slate-200" : "border-slate-800")}>
          <form action={logout}>
            <button
              type="submit"
              className={cn(
                "w-full rounded-lg border px-3 py-2 text-sm font-medium transition",
                light
                  ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                  : "border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-800",
              )}
            >
              {p.logout}
            </button>
          </form>
        </div>
      </aside>
      <main
        className={cn(
          "min-w-0 flex-1 overflow-auto px-6 py-8",
          light ? "bg-slate-50 text-slate-900" : "bg-slate-950 text-slate-100",
        )}
      >
        {children}
      </main>
    </div>
  );
}
