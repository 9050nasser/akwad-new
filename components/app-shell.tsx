"use client";
import { Sidebar } from "@/components/sidebar";
import { UiPreferencesToolbar } from "@/components/ui-preferences-toolbar";
import { logout } from "@/app/actions/auth";
import { formatLicenseDate } from "@/lib/format";
import type { SessionUser } from "@/lib/auth/session";
import type { UiMessages } from "@/lib/i18n/messages";
import type { NavSection } from "@/lib/nav";
import type { UiLocale, UiTheme } from "@/lib/ui/prefs";
import { cn } from "@/lib/cn";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type AppShellProps = {
  companyName: string;
  licenseExpiresAt: Date | null;
  licensedMaxEmployees: number;
  licensedMaxDevices: number;
  employeeCount: number;
  deviceCount: number;
  enablePayroll?: boolean;
  currentUser: SessionUser | null;
  children: React.ReactNode;
  locale: UiLocale;
  theme: UiTheme;
  navSections: NavSection[];
  messages: UiMessages;
};

export function AppShell({
  companyName,
  licenseExpiresAt,
  licensedMaxEmployees,
  licensedMaxDevices,
  employeeCount,
  deviceCount,
  enablePayroll = true,
  currentUser,
  children,
  locale,
  theme,
  navSections,
  messages,
}: AppShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const light = theme === "tenant";
  const licenseLabel = licenseExpiresAt ? formatLicenseDate(licenseExpiresAt, locale) : messages.shell.undated;

  return (
    <div
      className={cn(
        "flex min-h-screen",
        light
          ? "bg-gradient-to-br from-slate-50 via-white to-teal-50/40"
          : "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950",
      )}
    >
      <Sidebar
        className="print:hidden"
        sections={navSections}
        showPayroll={enablePayroll}
        theme={theme}
        locale={locale}
        brandTitle={messages.brand.name}
        brandSubtitle={messages.brand.tagline}
        brandProMark={messages.brand.proMark}
        isMobileOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header
          className={cn(
            "sticky top-0 z-10 border-b backdrop-blur print:hidden",
            light ? "border-slate-200/80 bg-white/80" : "border-slate-800 bg-slate-900/90",
          )}
        >
          <div className="flex flex-col gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center justify-between gap-4 lg:justify-start">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className={cn(
                    "inline-flex items-center justify-center rounded-xl p-2.5 transition-colors lg:hidden",
                    light ? "bg-slate-100 text-slate-700 hover:bg-slate-200" : "bg-slate-800 text-slate-200 hover:bg-slate-700",
                  )}
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  aria-label="Toggle menu"
                >
                  {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
                <div className="flex flex-col">
                  <p className={cn("text-sm font-semibold tracking-tight", light ? "text-slate-900" : "text-white")}>
                    {companyName}
                  </p>
                  <p className={cn("text-[10px] sm:text-xs", light ? "text-slate-500" : "text-slate-400")}>
                    {messages.shell.licensedFor}
                  </p>
                </div>
              </div>
              <UiPreferencesToolbar locale={locale} theme={theme} toolbar={messages.toolbar} variant={light ? "tenant" : "platform"} />
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm">
              {currentUser ? (
                <form
                  action={logout}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3 py-1.5 shadow-sm",
                    light ? "bg-slate-900 text-white" : "bg-slate-800 text-white ring-1 ring-slate-600",
                  )}
                >
                  <span className="max-w-[100px] truncate text-[10px] font-medium text-slate-200 sm:max-w-[140px] sm:text-xs">
                    {currentUser.name}
                  </span>
                  <button
                    type="submit"
                    className="rounded-lg bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-white/20 sm:text-xs"
                  >
                    {messages.shell.logout}
                  </button>
                </form>
              ) : null}
              <div className="hidden items-center gap-2 sm:flex md:gap-3">
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3 py-1.5 shadow-sm ring-1",
                    light ? "bg-white text-slate-700 ring-slate-200/80" : "bg-slate-800 text-slate-200 ring-slate-600",
                  )}
                >
                  <span className={light ? "text-slate-500" : "text-slate-400"}>{messages.shell.employees}</span>
                  <span className={cn("font-semibold", light ? "text-slate-900" : "text-white")}>
                    {employeeCount}/{licensedMaxEmployees}
                  </span>
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3 py-1.5 shadow-sm ring-1",
                    light ? "bg-white text-slate-700 ring-slate-200/80" : "bg-slate-800 text-slate-200 ring-slate-600",
                  )}
                >
                  <span className={light ? "text-slate-500" : "text-slate-400"}>{messages.shell.devices}</span>
                  <span className={cn("font-semibold", light ? "text-slate-900" : "text-white")}>
                    {deviceCount}/{licensedMaxDevices}
                  </span>
                </span>
                <span
                  className={cn(
                    "inline-flex hidden items-center gap-2 rounded-full px-3 py-1.5 shadow-sm ring-1 md:inline-flex",
                    light ? "bg-amber-50 text-amber-900 ring-amber-100" : "bg-amber-950/50 text-amber-100 ring-amber-900/60",
                  )}
                >
                  <span className={light ? "text-amber-800/80" : "text-amber-200/80"}>{messages.shell.licenseEnd}</span>
                  <span className="font-semibold">{licenseLabel}</span>
                </span>
              </div>
            </div>
          </div>
        </header>
        <main className={cn("flex-1 px-4 py-6 sm:px-6 sm:py-8 print:px-4 print:py-4", !light && "text-slate-100")}>
          {children}
        </main>
      </div>
    </div>
  );
}
