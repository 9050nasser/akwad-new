import Link from "next/link";
import { formatLicenseDate } from "@/lib/format";
import { platformSurface } from "@/lib/platform-surface";
import { prisma } from "@/lib/prisma";
import { getUiLocale, getUiThemeForPlatform } from "@/lib/ui/prefs";
import { requirePlatformSession } from "@/lib/tenant";
import { cn } from "@/lib/cn";

export default async function PlatformDashboardPage() {
  await requirePlatformSession();
  const [theme, locale] = await Promise.all([getUiThemeForPlatform(), getUiLocale()]);
  const s = platformSurface(theme);

  const now = new Date();
  const soon = new Date(now);
  soon.setDate(soon.getDate() + 14);

  const [clientCount, onHoldCount, clients, expiringSoon] = await Promise.all([
    prisma.company.count({ where: { isPlatformTenant: false } }),
    prisma.company.count({ where: { isPlatformTenant: false, onHold: true } }),
    prisma.company.findMany({
      where: { isPlatformTenant: false },
      orderBy: { name: "asc" },
      include: {
        branches: {
          select: {
            id: true,
            _count: { select: { employees: true, devices: true } },
          },
        },
      },
    }),
    prisma.company.findMany({
      where: {
        isPlatformTenant: false,
        licenseExpiresAt: { gte: now, lte: soon },
      },
      orderBy: { licenseExpiresAt: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className={s.pageTitle}>لوحة أدمن المنصة</h1>
        <p className={s.subtitle}>ملخص العملاء والتراخيص القريبة من الانتهاء.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className={s.card}>
          <p className={s.statLabel}>عدد العملاء</p>
          <p className={s.statValue}>{clientCount}</p>
        </div>
        <Link href="/platform/reports/on-hold-clients" className={s.linkHoldCard}>
          <p className={s.holdCardTitle}>عملاء على الهولد</p>
          <p className={s.holdCardValue}>{onHoldCount}</p>
          <p className={s.holdCardHint}>عرض التقرير ←</p>
        </Link>
        <div className={s.cardAmber}>
          <p className={s.amberLabel}>اشتراكات تنتهي خلال ١٤ يوماً</p>
          <p className={s.amberStat}>{expiringSoon.length}</p>
          {expiringSoon.length === 0 ? (
            <p className={s.emptyHint}>لا توجد شركات في هذه الفترة.</p>
          ) : (
            <ul className={s.amberList}>
              {expiringSoon.map((c) => (
                <li key={c.id} className="flex justify-between gap-2">
                  <Link href={`/platform/companies/${c.id}/edit`} className={cn("font-medium hover:underline", s.link)}>
                    {c.name}
                  </Link>
                  <span className={cn("tabular-nums", theme === "tenant" ? "text-amber-800/90" : "text-amber-200/80")}>
                    {formatLicenseDate(c.licenseExpiresAt, locale)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div>
        <h2 className={s.sectionHeading}>نظرة على كل عميل</h2>
        <div className={s.tableWrap}>
          <table className="min-w-full text-right text-sm">
            <thead className={s.tableHead}>
              <tr>
                <th className="px-4 py-3">الشركة</th>
                <th className="px-4 py-3">اسم الشركة (الدخول)</th>
                <th className="px-4 py-3">هولد</th>
                <th className="px-4 py-3">الموظفين</th>
                <th className="px-4 py-3">أجهزة البصمة</th>
                <th className="px-4 py-3">الرواتب</th>
                <th className="px-4 py-3">انتهاء الترخيص</th>
              </tr>
            </thead>
            <tbody className={s.tableBody}>
              {clients.map((c) => {
                const emp = c.branches.reduce((acc, b) => acc + b._count.employees, 0);
                const dev = c.branches.reduce((acc, b) => acc + b._count.devices, 0);
                return (
                  <tr key={c.id} className={s.rowText}>
                    <td className={s.cellStrong}>
                      <Link href={`/platform/companies/${c.id}/edit`} className={cn("hover:underline", s.link)}>
                        {c.name}
                      </Link>
                    </td>
                    <td className={s.cellMono}>{c.slug}</td>
                    <td className="px-4 py-3">
                      {c.onHold ? (
                        <span className={s.holdBadge}>هولد</span>
                      ) : (
                        <span className={s.holdNeutral}>—</span>
                      )}
                    </td>
                    <td className={cn("px-4 py-3 tabular-nums", s.rowText)}>
                      {emp}/{c.maxEmployees}
                    </td>
                    <td className={cn("px-4 py-3 tabular-nums", s.rowText)}>
                      {dev}/{c.maxDevices}
                    </td>
                    <td className={cn("px-4 py-3", s.rowText)}>{c.enablePayroll ? "مفعّل" : "—"}</td>
                    <td className={s.cellMuted}>{formatLicenseDate(c.licenseExpiresAt, locale)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className={s.footerNote}>
        <Link href="/platform/companies" className={s.link}>
          إدارة كاملة للعملاء والتراخيص التجريبية
        </Link>
      </p>
    </div>
  );
}
