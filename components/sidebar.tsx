"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { NavSection } from "@/lib/nav";
import { getNavIcon } from "@/lib/nav-icon-registry";
import { BrandWithPro } from "@/components/brand-with-pro";
import { cn } from "@/lib/cn";
import type { UiLocale, UiTheme } from "@/lib/ui/prefs";

function filterNavForPayroll(sections: NavSection[], showPayroll: boolean): NavSection[] {
  if (showPayroll) return sections;
  return sections.filter((section) => section.id !== "payroll");
}

function isActive(pathname: string, href: string) {
  if (href === "/reports") return pathname === "/reports";
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function sectionContainsActivePath(section: NavSection, pathname: string) {
  return section.items.some((item) => isActive(pathname, item.href));
}

type SidebarProps = {
  sections: NavSection[];
  showPayroll?: boolean;
  theme: UiTheme;
  locale: UiLocale;
  brandTitle: string;
  brandSubtitle: string;
  brandProMark?: string;
  className?: string;
  isMobileOpen?: boolean;
  onClose?: () => void;
};

export function Sidebar({
  sections,
  showPayroll = true,
  theme,
  locale,
  brandTitle,
  brandSubtitle,
  brandProMark,
  className,
  isMobileOpen = false,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const nav = useMemo(() => filterNavForPayroll(sections, showPayroll), [sections, showPayroll]);
  const light = theme === "tenant";

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const s of filterNavForPayroll(sections, showPayroll)) {
      initial[s.id] = sectionContainsActivePath(s, pathname);
    }
    return initial;
  });

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setOpenSections((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const s of nav) {
          if (sectionContainsActivePath(s, pathname) && !next[s.id]) {
            next[s.id] = true;
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    });
    return () => cancelAnimationFrame(id);
  }, [pathname, nav]);

  const toggleSection = useCallback((id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 start-0 z-50 flex h-full w-72 flex-col border-e backdrop-blur transition-transform duration-300 lg:static lg:translate-x-0 print:hidden",
          light ? "border-slate-200/80 bg-white/95" : "border-slate-800 bg-slate-900/98",
          !isMobileOpen && (locale === "ar" ? "translate-x-full" : "-translate-x-full"),
          className,
        )}
      >
        <div className={cn("border-b px-5 py-6", light ? "border-slate-200/80" : "border-slate-800")}>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-lg font-bold text-white shadow-md shadow-teal-500/25">
              AP
            </div>
            <div className="flex-1">
              <p className={cn("text-sm font-bold leading-snug", light ? "text-slate-900" : "text-white")}>
                <BrandWithPro
                  name={brandTitle}
                  proMark={brandProMark}
                  nameClassName={cn(light ? "text-slate-900" : "text-white")}
                  proClassName={cn(
                    locale === "ar"
                      ? "text-[0.58rem] leading-tight sm:text-[0.62rem]"
                      : "text-[0.6rem] uppercase tracking-[0.12em]",
                    light ? "text-slate-900" : "text-white",
                  )}
                />
              </p>
              <p className={cn("text-xs", light ? "text-slate-500" : "text-slate-400")}>{brandSubtitle}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
          {nav.map((section) => {
            const expanded = openSections[section.id] ?? false;
            const panelId = `nav-section-${section.id}`;
            return (
              <div key={section.id} className="rounded-xl">
                <button
                  type="button"
                  id={`${panelId}-trigger`}
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  onClick={() => toggleSection(section.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-start text-xs font-semibold uppercase tracking-wide transition-colors",
                    light
                      ? "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                      : "text-slate-500 hover:bg-slate-800/60 hover:text-slate-300",
                  )}
                >
                  <span className="min-w-0 leading-snug">{section.title}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 opacity-70 transition-transform duration-200",
                      expanded && "rotate-180",
                    )}
                    aria-hidden
                  />
                </button>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={`${panelId}-trigger`}
                  className={cn("space-y-1 pt-1", !expanded && "hidden")}
                >
                  {section.items.map((item) => {
                    const active = isActive(pathname, item.href);
                    const Icon = getNavIcon(item.iconKey);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => onClose?.()}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                          light
                            ? active
                              ? "bg-teal-50 text-teal-900 ring-1 ring-teal-100"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            : active
                              ? "bg-slate-800 text-white ring-1 ring-slate-600"
                              : "text-slate-400 hover:bg-slate-800/80 hover:text-white",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0 opacity-80" />
                        <span className="leading-snug">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
