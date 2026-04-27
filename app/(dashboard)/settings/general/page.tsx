import { FlashBanner } from "@/components/flash-banner";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { PageFrame } from "@/components/page-frame";
import { updateGeneralSettings } from "@/app/actions/company";
import { formatFlash } from "@/lib/flash";
import { prisma } from "@/lib/prisma";
import { getUiLocale } from "@/lib/ui/prefs";
import { requireTenantSession } from "@/lib/tenant";

const ZONES = [
  "Africa/Cairo",
  "Asia/Riyadh",
  "Asia/Dubai",
  "Asia/Kuwait",
  "Asia/Baghdad",
  "Asia/Qatar",
  "UTC",
];

const WEEK_START_OPTS = [
  { v: 0, l: "الأحد" },
  { v: 1, l: "الإثنين" },
  { v: 2, l: "الثلاثاء" },
  { v: 3, l: "الأربعاء" },
  { v: 4, l: "الخميس" },
  { v: 5, l: "الجمعة" },
  { v: 6, l: "السبت" },
];

function sectionTitle(text: string) {
  return <h2 className="col-span-full border-b border-slate-200 pb-2 text-sm font-bold text-slate-800">{text}</h2>;
}

export default async function GeneralSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireTenantSession();
  const sp = (await searchParams) ?? {};
  const flash = formatFlash(sp);
  const company = await prisma.company.findUnique({
    where: { id: session.companyId },
    include: { branches: { orderBy: { name: "asc" } } },
  });
  const locale = await getUiLocale(company?.defaultLocale === "en" ? "en" : "ar");

  return (
    <PageFrame
      title="الإعدادات العامة"
      subtitle="سياسات العرض، الحضور، الرواتب، العملة، الجلسة، والبريد — تُطبَّق تدريجياً على الشاشات ذات الصلة."
    >
      <FlashBanner notice={flash.notice} error={flash.error} />

      {!company ? (
        <p className="text-sm text-slate-600">لم يتم إنشاء شركة بعد.</p>
      ) : (
        <form action={updateGeneralSettings} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sectionTitle("المنطقة واللغة")}
          <div>
            <Label htmlFor="timezone">المنطقة الزمنية</Label>
            <select id="timezone" name="timezone" className={fieldClass} defaultValue={company.timezone ?? "Africa/Cairo"}>
              {ZONES.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="defaultLocale">اللغة الافتراضية (بدون تفضيل مستخدم)</Label>
            <select id="defaultLocale" name="defaultLocale" className={fieldClass} defaultValue={company.defaultLocale}>
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </div>
          <div>
            <Label htmlFor="weekStartsOn">بداية الأسبوع في التقارير (0–6)</Label>
            <select id="weekStartsOn" name="weekStartsOn" className={fieldClass} defaultValue={company.weekStartsOn}>
              {WEEK_START_OPTS.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.l}
                </option>
              ))}
            </select>
          </div>

          {sectionTitle("سياسات الحضور (مرجعية — للتوسع لاحقاً)")}
          <div>
            <Label htmlFor="lateGraceMinutes">هامش التأخير (دقائق)</Label>
            <input
              id="lateGraceMinutes"
              name="lateGraceMinutes"
              type="number"
              min={0}
              max={240}
              className={fieldClass}
              defaultValue={company.lateGraceMinutes}
            />
          </div>
          <div>
            <Label htmlFor="punchDedupeMinutes">دمج البصمات المتكررة خلال (دقائق)</Label>
            <input
              id="punchDedupeMinutes"
              name="punchDedupeMinutes"
              type="number"
              min={0}
              max={120}
              className={fieldClass}
              defaultValue={company.punchDedupeMinutes}
            />
          </div>
          <div className="flex items-center gap-2 pb-2 pt-6">
            <input
              id="fridayIsWorkday"
              name="fridayIsWorkday"
              type="checkbox"
              defaultChecked={company.fridayIsWorkday}
              className="h-4 w-4 rounded border-slate-300"
            />
            <label htmlFor="fridayIsWorkday" className="text-xs font-semibold text-slate-600">
              الجمعة يوم عمل في التقويم
            </label>
          </div>
          <div>
            <Label htmlFor="overtimeAfterMinutes">احتساب إضافي بعد (دقائق عمل يومية)</Label>
            <input
              id="overtimeAfterMinutes"
              name="overtimeAfterMinutes"
              type="number"
              min={0}
              max={1440}
              className={fieldClass}
              defaultValue={company.overtimeAfterMinutes}
            />
          </div>
          <div>
            <Label htmlFor="overtimeRoundMinutes">تقريب الإضافي (دقائق)</Label>
            <input
              id="overtimeRoundMinutes"
              name="overtimeRoundMinutes"
              type="number"
              min={1}
              max={120}
              className={fieldClass}
              defaultValue={company.overtimeRoundMinutes}
            />
          </div>

          {sectionTitle("الرواتب والعرض")}
          <div>
            <Label htmlFor="currency">رمز العملة (افتراضي SAR — يمكن تغييره)</Label>
            <input id="currency" name="currency" type="text" className={fieldClass} defaultValue={company.currency} maxLength={8} />
          </div>
          <div>
            <Label htmlFor="currencyDecimals">المنازل العشرية في المبالغ</Label>
            <input
              id="currencyDecimals"
              name="currencyDecimals"
              type="number"
              min={0}
              max={6}
              className={fieldClass}
              defaultValue={company.currencyDecimals}
            />
          </div>
          <div>
            <Label htmlFor="payrollPeriod">دورة الرواتب (مرجعية)</Label>
            <select id="payrollPeriod" name="payrollPeriod" className={fieldClass} defaultValue={company.payrollPeriod}>
              <option value="monthly">شهري</option>
              <option value="biweekly">نصف شهري (أسبوعين)</option>
            </select>
          </div>
          <div>
            <Label htmlFor="payrollClosingDay">يوم إغلاق الشهر (1–28)</Label>
            <input
              id="payrollClosingDay"
              name="payrollClosingDay"
              type="number"
              min={1}
              max={28}
              className={fieldClass}
              defaultValue={company.payrollClosingDay}
            />
          </div>
          <div className="lg:col-span-2">
            <Label htmlFor="defaultReportBranchId">فرع افتراضي لتقرير الرواتب (عند فتح التقرير بدون اختيار)</Label>
            <select id="defaultReportBranchId" name="defaultReportBranchId" className={fieldClass} defaultValue={company.defaultReportBranchId ?? ""}>
              <option value="">— لا يوجد — (كل الفروع)</option>
              {company.branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {sectionTitle("الواجهة والتقارير")}
          <div className="lg:col-span-2">
            <Label htmlFor="shellShortName">اسم مختصر في شريط النظام (اختياري)</Label>
            <input
              id="shellShortName"
              name="shellShortName"
              type="text"
              className={fieldClass}
              defaultValue={company.shellShortName ?? ""}
              placeholder={company.name}
            />
          </div>
          <div className="lg:col-span-3">
            <Label htmlFor="reportHeaderLine">سطر ترويسة تقارير القسيمة (اختياري)</Label>
            <input
              id="reportHeaderLine"
              name="reportHeaderLine"
              type="text"
              className={fieldClass}
              defaultValue={company.reportHeaderLine ?? ""}
            />
          </div>
          <div className="lg:col-span-3">
            <Label htmlFor="reportFooterLine">سطر تذييل تقارير القسيمة (اختياري)</Label>
            <input
              id="reportFooterLine"
              name="reportFooterLine"
              type="text"
              className={fieldClass}
              defaultValue={company.reportFooterLine ?? ""}
            />
          </div>

          {sectionTitle("الأمان والجلسة")}
          <div>
            <Label htmlFor="minPasswordLength">الحد الأدنى لطول كلمة مرور المستخدمين (6–128)</Label>
            <input
              id="minPasswordLength"
              name="minPasswordLength"
              type="number"
              min={6}
              max={128}
              className={fieldClass}
              defaultValue={company.minPasswordLength}
            />
          </div>
          <div>
            <Label htmlFor="sessionDays">مدة جلسة تسجيل الدخول (أيام، 1–30)</Label>
            <input
              id="sessionDays"
              name="sessionDays"
              type="number"
              min={1}
              max={30}
              className={fieldClass}
              defaultValue={company.sessionDays}
            />
          </div>

          {sectionTitle("البريد الصادر (SMTP — مرجعي؛ الإرسال الفعلي من الخادم)")}
          <div className="lg:col-span-2">
            <Label htmlFor="smtpHost">المضيف</Label>
            <input id="smtpHost" name="smtpHost" type="text" className={fieldClass} defaultValue={company.smtpHost ?? ""} placeholder="smtp.example.com" />
          </div>
          <div>
            <Label htmlFor="smtpPort">المنفذ</Label>
            <input id="smtpPort" name="smtpPort" type="number" className={fieldClass} defaultValue={company.smtpPort ?? ""} placeholder="587" />
          </div>
          <div>
            <Label htmlFor="smtpUser">اسم المستخدم</Label>
            <input id="smtpUser" name="smtpUser" type="text" className={fieldClass} defaultValue={company.smtpUser ?? ""} autoComplete="off" />
          </div>
          <div className="lg:col-span-2">
            <Label htmlFor="smtpFromEmail">عنوان المرسل (From)</Label>
            <input id="smtpFromEmail" name="smtpFromEmail" type="email" className={fieldClass} defaultValue={company.smtpFromEmail ?? ""} />
          </div>
          <p className="col-span-full text-xs text-slate-500">
            كلمة مرور SMTP لا تُخزَّن هنا لأسباب أمنية؛ اضبط الإرسال من متغيرات بيئة الخادم عند التفعيل. لغة الواجهة الحالية للمعاينة:{" "}
            {locale === "en" ? "English" : "العربية"}.
          </p>

          <div className="col-span-full flex items-end border-t border-slate-100 pt-4">
            <PrimaryButton>حفظ الإعدادات</PrimaryButton>
          </div>
        </form>
      )}
    </PageFrame>
  );
}
