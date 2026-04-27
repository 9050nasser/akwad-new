import Link from "next/link";
import { formatLicenseDate } from "@/lib/format";
import { platformSurface } from "@/lib/platform-surface";
import { prisma } from "@/lib/prisma";
import { getUiLocale, getUiThemeForPlatform } from "@/lib/ui/prefs";
import { requirePlatformSession } from "@/lib/tenant";
import { cn } from "@/lib/cn";

export default async function OnHoldClientsReportPage() {
  await requirePlatformSession();
  const [theme, locale] = await Promise.all([getUiThemeForPlatform(), getUiLocale()]);
  const s = platformSurface(theme);

  const rows = await prisma.company.findMany({
    where: { isPlatformTenant: false, onHold: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className={s.pageTitle}>تقرير عملاء الهولد</h1>
          <p className={s.subtitle}>
            الشركات الموقوف دخولها مؤقتاً — لا يمكن لمستخدميها تسجيل الدخول حتى تُلغى علامة الهولد من تعديل العميل.
          </p>
        </div>
        <Link href="/platform/companies" className={cn("text-sm", s.link)}>
          ← كل العملاء
        </Link>
      </div>

      <div className={s.cardRose}>
        العدد الحالي: <span className="font-bold">{rows.length}</span> شركة على الهولد
      </div>

      {rows.length === 0 ? (
        <p className={s.emptyBox}>لا يوجد أي عميل على الهولد حالياً.</p>
      ) : (
        <div className={s.tableWrap}>
          <table className="min-w-full text-right text-sm">
            <thead className={s.tableHead}>
              <tr>
                <th className="px-4 py-3">الشركة</th>
                <th className="px-4 py-3">اسم الشركة (الدخول)</th>
                <th className="px-4 py-3">انتهاء الترخيص</th>
                <th className="px-4 py-3">هاتف العميل</th>
                <th className="px-4 py-3">الوسيط</th>
                <th className="px-4 py-3">هاتف الوسيط</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className={s.tableBody}>
              {rows.map((c) => (
                <tr key={c.id} className={s.rowText}>
                  <td className={s.cellStrong}>{c.name}</td>
                  <td className={s.cellMono}>{c.slug}</td>
                  <td className={cn("px-4 py-3", theme === "tenant" ? "text-slate-700" : "text-slate-300")}>
                    {formatLicenseDate(c.licenseExpiresAt, locale)}
                  </td>
                  <td className={s.cellMuted}>{c.clientPhone ?? "—"}</td>
                  <td className={s.cellMuted}>{c.brokerName ?? "—"}</td>
                  <td className={s.cellMuted}>{c.brokerPhone ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Link href={`/platform/companies/${c.id}/edit`} className={s.link}>
                      تعديل / إلغاء الهولد
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}