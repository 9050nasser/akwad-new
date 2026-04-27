import { PageFrame } from "@/components/page-frame";
import { StatTiles } from "@/components/stat-tiles";
import { getDashboardStats } from "@/lib/dashboard-stats";
import { formatFlash } from "@/lib/flash";
import { formatDateTime, formatLicenseDate } from "@/lib/format";
import { requireTenantSession } from "@/lib/tenant";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireTenantSession();
  const sp = (await searchParams) ?? {};
  const { error, notice } = formatFlash(sp);
  const stats = await getDashboardStats(session.companyId);
  const c = stats.company;

  const licenseValue =
    stats.daysLeftLicense < 0
      ? "منتهٍ"
      : stats.daysLeftLicense === 0
        ? "ينتهي اليوم"
        : `${stats.daysLeftLicense} يوم`;

  const licenseHint =
    stats.daysLeftLicense < 0
      ? "تواصل لتجديد الترخيص لتفادي انقطاع الخدمة."
      : stats.daysLeftLicense <= 30
        ? `ينتهي بتاريخ ${formatLicenseDate(c.licenseExpiresAt)} — راقب التجديد.`
        : `تاريخ الانتهاء: ${formatLicenseDate(c.licenseExpiresAt)}`;

  const tiles = [
    {
      label: "حالة الترخيص",
      value: licenseValue,
      hint: licenseHint,
    },
    {
      label: "الموظفون النشطون",
      value: stats.employees,
      hint: `الحد الأقصى في الترخيص: ${c.maxEmployees} موظفاً`,
    },
    {
      label: "أجهزة البصمة",
      value: stats.devicesTotal,
      hint: `${stats.devicesEnabled} جهاز مفعّل — الحد في الترخيص: ${c.maxDevices}`,
    },
    {
      label: "عدد الفروع",
      value: stats.branches,
      hint: "كل فرع له موظفون وأجهزة مستقلة في التقارير",
    },
    {
      label: "حركات مرحّلة اليوم",
      value: stats.postedToday,
      hint: "ظهرت في التقارير الرسمية بعد الترحيل",
    },
    {
      label: "حركات بانتظار الترحيل (اليوم)",
      value: stats.unpostedToday,
      hint: "راجع شاشة ترحيل الحركات قبل إغلاق اليوم",
    },
    {
      label: "بصمات غير مربوطة بموظف",
      value: stats.unknownDeviceUsers,
      hint:
        stats.unknownDeviceUsers > 0
          ? "راجع «بصمات غير مسجّلة» لربطها بموظفين"
          : "لا توجد بصمات معلّقة حالياً",
    },
    {
      label: "إجازات مسجّلة هذا الشهر",
      value: stats.leavesThisMonth,
      hint: "عدد سجلات الإجازات التي تتقاطع مع الشهر الحالي",
    },
    {
      label: "مستخدمو النظام النشطون",
      value: stats.activeUsers,
      hint: "حسابات يمكنها الدخول (غير أدمن المنصة)",
    },
    {
      label: "آخر مزامنة لجهاز بصمة",
      value: stats.lastDeviceSyncAt ? formatDateTime(stats.lastDeviceSyncAt) : "—",
      hint: "أقرب وقت استُقبلت فيه حركات من أحد الأجهزة",
    },
  ];

  return (
    <PageFrame
      title="لوحة الملخصات"
      subtitle="مؤشرات تشغيلية وترخيص تساعدك على متابعة الحضور والموارد دون الدخول في تفاصيل تقنية."
    >
      {error ? (
        <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</p>
      ) : null}
      {notice && !error ? (
        <p className="mb-4 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">{notice}</p>
      ) : null}
      <StatTiles tiles={tiles} />
    </PageFrame>
  );
}
