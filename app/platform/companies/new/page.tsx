import Link from "next/link";
import { FlashBanner } from "@/components/flash-banner";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { createTenantCompany } from "@/app/actions/platform";
import { firstQuery, formatFlash } from "@/lib/flash";
import { platformSurface } from "@/lib/platform-surface";
import { getUiLocale, getUiThemeForPlatform } from "@/lib/ui/prefs";
import { requirePlatformSession } from "@/lib/tenant";
import { cn } from "@/lib/cn";

export default async function NewPlatformCompanyPage({
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
    admin: "أدخل اسم مستخدم للمدير صالحاً وكلمة مرور لا تقل عن الحد الأدنى الذي اخترته (٦–١٢٨).",
  };
  const extraEn: Record<string, string> = {
    slug: "This company login name is already in use.",
    slug_reserved: 'The reserved name "default" cannot be used.',
    admin: "Enter a valid admin username and a password at least as long as the minimum you set (6–128).",
  };
  const EXTRA = locale === "en" ? extraEn : extraAr;

  const sp = (await searchParams) ?? {};
  const base = formatFlash(sp);
  const errKey = firstQuery(sp.err);
  const platformErr = errKey && EXTRA[errKey] ? EXTRA[errKey] : undefined;
  const bannerError = platformErr ?? base.error;

  const defaultLicense = new Date();
  defaultLicense.setMonth(defaultLicense.getMonth() + 1);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/platform/companies" className={cn("text-sm", s.link)}>
          ← العملاء
        </Link>
        <h1 className={cn("mt-3", s.pageTitle)}>إضافة عميل</h1>
        <p className={s.subtitle}>
          يُنشئ شركة جديدة، فرعاً رئيسياً، وأول مستخدم مدير. حدّد تاريخ نهاية الترخيص (تجريبي أو مدفوع).
        </p>
      </div>

      <FlashBanner notice={base.notice} error={bannerError} />

      <form action={createTenantCompany} className={s.formCard}>
        <div>
          <Label htmlFor="name">اسم الشركة</Label>
          <input id="name" name="name" className={fieldClass} required />
        </div>
        <div>
          <Label htmlFor="slug">اسم الشركة في شاشة الدخول</Label>
          <input id="slug" name="slug" className={fieldClass} required />
        </div>
        <div>
          <Label htmlFor="licenseExpiresAt">تاريخ انتهاء الترخيص</Label>
          <input
            id="licenseExpiresAt"
            name="licenseExpiresAt"
            type="date"
            className={fieldClass}
            required
            defaultValue={defaultLicense.toISOString().slice(0, 10)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="maxEmployees">حد الموظفين</Label>
            <input id="maxEmployees" name="maxEmployees" type="number" min={1} className={fieldClass} defaultValue={100} />
          </div>
          <div>
            <Label htmlFor="maxDevices">حد أجهزة البصمة</Label>
            <input id="maxDevices" name="maxDevices" type="number" min={1} className={fieldClass} defaultValue={10} />
          </div>
        </div>
        <div>
          <Label htmlFor="clientPhone">هاتف العميل</Label>
          <input id="clientPhone" name="clientPhone" type="tel" className={fieldClass} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="brokerName">اسم الوسيط / المبيعات</Label>
            <input id="brokerName" name="brokerName" className={fieldClass} />
          </div>
          <div>
            <Label htmlFor="brokerPhone">هاتف الوسيط</Label>
            <input id="brokerPhone" name="brokerPhone" type="tel" className={fieldClass} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            id="enablePayroll"
            name="enablePayroll"
            type="checkbox"
            className={cn("h-4 w-4 rounded", theme === "tenant" ? "border-slate-300" : "border-slate-600")}
          />
          <label htmlFor="enablePayroll" className={s.labelOnForm}>
            تفعيل موديول الرواتب من البصمة
          </label>
        </div>
        <hr className={s.hr} />
        <p className={s.noticeMuted}>أول مستخدم للعميل</p>
        <div>
          <Label htmlFor="adminName">اسم المدير</Label>
          <input id="adminName" name="adminName" className={fieldClass} defaultValue="مدير النظام" />
        </div>
        <div>
          <Label htmlFor="adminEmail">اسم المستخدم</Label>
          <input id="adminEmail" name="adminEmail" type="text" className={fieldClass} required autoComplete="username" />
        </div>
        <div>
          <Label htmlFor="minPasswordLength">الحد الأدنى لكلمة مرور مستخدمي الشركة (يشمل مدير الشركة)</Label>
          <input
            id="minPasswordLength"
            name="minPasswordLength"
            type="number"
            min={6}
            max={128}
            className={fieldClass}
            defaultValue={8}
          />
        </div>
        <div>
          <Label htmlFor="adminPassword">كلمة مرور المدير</Label>
          <input id="adminPassword" name="adminPassword" type="password" className={fieldClass} required />
        </div>
        <PrimaryButton className="w-full sm:w-auto">حفظ الشركة</PrimaryButton>
      </form>
    </div>
  );
}
