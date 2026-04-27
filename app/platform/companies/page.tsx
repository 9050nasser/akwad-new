import Link from "next/link";
import { FlashBanner } from "@/components/flash-banner";
import { formatFlash, firstQuery } from "@/lib/flash";
import { formatLicenseDate } from "@/lib/format";
import { platformSurface } from "@/lib/platform-surface";
import { prisma } from "@/lib/prisma";
import { getUiLocale, getUiThemeForPlatform } from "@/lib/ui/prefs";
import { requirePlatformSession } from "@/lib/tenant";
import { cn } from "@/lib/cn";

export default async function PlatformCompaniesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePlatformSession();
  const [theme, locale] = await Promise.all([getUiThemeForPlatform(), getUiLocale()]);
  const s = platformSurface(theme);
  const extraAr: Record<string, string> = {
    slug: "اسم الشركة (معرّف الدخول) مستخدم بالفعل.",
    slug_reserved: "لا يمكن استخدام الاسم المحجوز «default».",
    admin: "أدخل بريد مدير صالح وكلمة مرور لا تقل عن ٦ أحرف.",
    not_found: "الشركة غير موجودة.",
    required: "بيانات ناقصة.",
  };
  const extraEn: Record<string, string> = {
    slug: "This company login name is already in use.",
    slug_reserved: 'The reserved name "default" cannot be used.',
    admin: "Enter a valid manager email and a password of at least 6 characters.",
    not_found: "Company not found.",
    required: "Missing required fields.",
  };
  const extra = locale === "en" ? extraEn : extraAr;

  const sp = (await searchParams) ?? {};
  const base = formatFlash(sp);
  const errKey = firstQuery(sp.err);
  const platformErr = errKey && extra[errKey] ? extra[errKey] : undefined;
  const bannerError = platformErr ?? base.error;

  const rows = await prisma.company.findMany({
    where: { isPlatformTenant: false },
    orderBy: { licenseExpiresAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className={s.pageTitle}>العملاء المسجّلون</h1>
          <p className={s.subtitle}>
            تاريخ انتهاء الترخيص، هاتف العميل، بيانات الوسيط — كما تُسجَّل عند إضافة الشركة.
          </p>
        </div>
        <Link href="/platform/companies/new" className={s.addButton}>
          + إضافة عميل
        </Link>
      </div>

      <FlashBanner notice={base.notice} error={bannerError} />

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
              <th className="px-4 py-3">رواتب</th>
              <th className="px-4 py-3">هولد</th>
              <th className="px-4 py-3">إجراءات</th>
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
                <td className={cn("px-4 py-3", s.rowText)}>{c.enablePayroll ? "نعم" : "لا"}</td>
                <td className="px-4 py-3">
                  {c.onHold ? (
                    <span className={s.holdBadge}>هولد</span>
                  ) : (
                    <span className={s.holdNeutral}>—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/platform/companies/${c.id}/edit`} className={s.link}>
                    تعديل
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
