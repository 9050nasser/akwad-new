import Link from "next/link";
import { FlashBanner } from "@/components/flash-banner";
import { PageFrame } from "@/components/page-frame";
import { uiMessages } from "@/lib/i18n/messages";
import { buildMainNav } from "@/lib/nav";
import { getNavIcon } from "@/lib/nav-icon-registry";
import { prisma } from "@/lib/prisma";
import { getUiLocale } from "@/lib/ui/prefs";
import { requireTenantSession } from "@/lib/tenant";
import { firstQuery, formatFlash } from "@/lib/flash";

export default async function ReportsHubPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireTenantSession();
  const company = await prisma.company.findUnique({
    where: { id: session.companyId },
    select: { defaultLocale: true },
  });
  const locale = await getUiLocale(company?.defaultLocale === "en" ? "en" : "ar");
  const m = uiMessages(locale);
  const sp = (await searchParams) ?? {};
  const base = formatFlash(sp);
  const errKey = firstQuery(sp.err);
  const payrollMsg =
    errKey === "payroll_disabled"
      ? m.reportsHub.payrollDisabled
      : undefined;

  const nav = buildMainNav(locale);
  const section = nav.find((s) => s.id === "reports");
  const items = section?.items.filter((i) => i.href !== "/reports") ?? [];

  return (
    <PageFrame exportFileSlug="reports-hub" title={m.reportsHub.title} subtitle={m.reportsHub.subtitle}>
      <FlashBanner notice={base.notice} error={base.error ?? payrollMsg} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 print:hidden">
        {items.map((item) => {
          const Icon = getNavIcon(item.iconKey);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm transition hover:border-teal-200 hover:bg-teal-50/40"
            >
              <Icon className="h-4 w-4 text-teal-700" />
              <span className="font-medium leading-snug">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </PageFrame>
  );
}
