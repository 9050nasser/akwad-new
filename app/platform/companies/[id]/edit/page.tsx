import Link from "next/link";
import { notFound } from "next/navigation";
import { FlashBanner } from "@/components/flash-banner";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { updateTenantCompany } from "@/app/actions/platform";
import { firstQuery, formatFlash } from "@/lib/flash";
import { platformSurface } from "@/lib/platform-surface";
import { prisma } from "@/lib/prisma";
import { getUiLocale, getUiThemeForPlatform } from "@/lib/ui/prefs";
import { requirePlatformSession } from "@/lib/tenant";
import { cn } from "@/lib/cn";

export default async function EditPlatformCompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePlatformSession();
  const [theme, locale] = await Promise.all([getUiThemeForPlatform(), getUiLocale()]);
  const s = platformSurface(theme);
  const extraAr: Record<string, string> = {
    slug: "اسم الشركة (معرّف الدخول) مستخدم بالفعل.",
    slug_reserved: "لا يمكن استخدام الاسم المحجوز «default».",
  };
  const extraEn: Record<string, string> = {
    slug: "This company login name is already in use.",
    slug_reserved: 'The reserved name "default" cannot be used.',
  };
  const EXTRA = locale === "en" ? extraEn : extraAr;

  const { id } = await params;
  const company = await prisma.company.findFirst({
    where: { id, isPlatformTenant: false },
  });
  if (!company) notFound();

  const sp = (await searchParams) ?? {};
  const base = formatFlash(sp);
  const errKey = firstQuery(sp.err);
  const platformErr = errKey && EXTRA[errKey] ? EXTRA[errKey] : undefined;
  const bannerError = platformErr ?? base.error;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/platform/companies" className={cn("text-sm", s.link)}>
          ← العملاء
        </Link>
        <h1 className={cn("mt-3", s.pageTitle)}>تعديل عميل</h1>
        <p className={s.subtitle}>{company.name}</p>
      </div>

      <FlashBanner notice={base.notice} error={bannerError} />

      <form action={updateTenantCompany} className={s.formCard}>
        <input type="hidden" name="id" value={company.id} />
        <div>
          <Label htmlFor="name">اسم الشركة</Label>
          <input id="name" name="name" className={fieldClass} required defaultValue={company.name} />
        </div>
        <div>
          <Label htmlFor="slug">اسم الشركة في شاشة الدخول</Label>
          <input id="slug" name="slug" className={fieldClass} required defaultValue={company.slug} />
        </div>
        <div>
          <Label htmlFor="licenseExpiresAt">تاريخ انتهاء الترخيص (تجريبي أو نهائي)</Label>
          <input
            id="licenseExpiresAt"
            name="licenseExpiresAt"
            type="date"
            className={fieldClass}
            required
            defaultValue={company.licenseExpiresAt.toISOString().slice(0, 10)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="maxEmployees">حد الموظفين</Label>
            <input
              id="maxEmployees"
              name="maxEmployees"
              type="number"
              min={1}
              className={fieldClass}
              defaultValue={company.maxEmployees}
            />
          </div>
          <div>
            <Label htmlFor="maxDevices">حد أجهزة البصمة</Label>
            <input
              id="maxDevices"
              name="maxDevices"
              type="number"
              min={1}
              className={fieldClass}
              defaultValue={company.maxDevices}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="clientPhone">هاتف العميل</Label>
          <input id="clientPhone" name="clientPhone" type="tel" className={fieldClass} defaultValue={company.clientPhone ?? ""} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="brokerName">اسم الوسيط</Label>
            <input id="brokerName" name="brokerName" className={fieldClass} defaultValue={company.brokerName ?? ""} />
          </div>
          <div>
            <Label htmlFor="brokerPhone">هاتف الوسيط</Label>
            <input id="brokerPhone" name="brokerPhone" type="tel" className={fieldClass} defaultValue={company.brokerPhone ?? ""} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            id="enablePayroll"
            name="enablePayroll"
            type="checkbox"
            className={cn("h-4 w-4 rounded", theme === "tenant" ? "border-slate-300" : "border-slate-600")}
            defaultChecked={company.enablePayroll}
          />
          <label htmlFor="enablePayroll" className={s.labelOnForm}>
            تفعيل موديول الرواتب من البصمة
          </label>
        </div>
        <div className={s.cardRose}>
          <div className="flex items-center gap-2">
            <input
              id="onHold"
              name="onHold"
              type="checkbox"
              className={cn("h-4 w-4 rounded", theme === "tenant" ? "border-slate-300" : "border-slate-600")}
              defaultChecked={company.onHold}
            />
            <label htmlFor="onHold" className="text-sm">
              هولد — إيقاف دخول العميل للبرنامج (مثلاً عدم السداد). لا يُحذف أي بيان.
            </label>
          </div>
        </div>
        <PrimaryButton className="w-full sm:w-auto">حفظ التعديلات</PrimaryButton>
      </form>
    </div>
  );
}
