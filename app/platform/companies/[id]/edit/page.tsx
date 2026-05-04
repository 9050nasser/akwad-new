import Link from "next/link";
import { notFound } from "next/navigation";
import { FlashBanner } from "@/components/flash-banner";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { updateTenantCompany, updateTenantCompanyUser } from "@/app/actions/platform";
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

  const tenantUsers = await prisma.user.findMany({
    where: { companyId: company.id, isPlatformAdmin: false },
    include: { role: true },
    orderBy: { createdAt: "asc" },
  });
  tenantUsers.sort((a, b) => {
    const aAdmin = a.role.name === "مدير النظام" ? 0 : 1;
    const bAdmin = b.role.name === "مدير النظام" ? 0 : 1;
    if (aAdmin !== bAdmin) return aAdmin - bAdmin;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
  const minPwd = Math.min(128, Math.max(6, Math.floor(company.minPasswordLength ?? 6)));

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

      <hr className={cn("my-8 border-t", s.hr)} />

      <div className="space-y-2">
        <h2 className={cn("text-lg font-semibold", s.pageTitle)}>حسابات الدخول للشركة</h2>
        <p className={s.subtitle}>
          {locale === "en"
            ? "Login name is stored as the user email field (it may be a plain username). Passwords are hashed — leave new password empty to keep the current one."
            : "اسم المستخدم هو نفس قيمة «البريد/المعرّف» في قاعدة البيانات (قد يكون بريداً أو نصاً). كلمة المرور محفوظة مشفّرة؛ اترك الحقول فارغة إن لم ترد تغييرها."}
        </p>
      </div>

      <div className="space-y-8">
        {tenantUsers.length === 0 ? (
          <p className={s.emptyHint}>
            {locale === "en" ? "No tenant users found for this company." : "لا يوجد مستخدمون لهذه الشركة."}
          </p>
        ) : null}
        {tenantUsers.map((u) => (
          <form key={u.id} action={updateTenantCompanyUser} className={s.formCard}>
            <input type="hidden" name="companyId" value={company.id} />
            <input type="hidden" name="userId" value={u.id} />
            <p className="text-sm font-medium text-slate-600">
              {locale === "en" ? "Role" : "الدور"}: {u.role.name}
              {u.role.name === "مدير النظام" ? (
                <span className="ms-2 rounded bg-teal-100 px-2 py-0.5 text-xs text-teal-900">
                  {locale === "en" ? "Company admin" : "مدير الشركة"}
                </span>
              ) : null}
            </p>
            <div>
              <Label htmlFor={`name-${u.id}`}>{locale === "en" ? "Display name" : "الاسم الظاهر"}</Label>
              <input id={`name-${u.id}`} name="name" className={fieldClass} required defaultValue={u.name} />
            </div>
            <div>
              <Label htmlFor={`login-${u.id}`}>{locale === "en" ? "Login (username / email)" : "اسم المستخدم للدخول"}</Label>
              <input
                id={`login-${u.id}`}
                name="loginEmail"
                type="text"
                className={fieldClass}
                required
                autoComplete="username"
                defaultValue={u.email}
              />
            </div>
            <div>
              <Label htmlFor={`np-${u.id}`}>
                {locale === "en" ? "New password (optional)" : "كلمة مرور جديدة (اختياري)"}
              </Label>
              <input
                id={`np-${u.id}`}
                name="newPassword"
                type="password"
                autoComplete="new-password"
                className={fieldClass}
                placeholder={locale === "en" ? `Min ${minPwd} characters if changing` : `اتركه فارغاً للإبقاء على القديم — الحد الأدنى ${minPwd} عند التغيير`}
              />
            </div>
            <div>
              <Label htmlFor={`cp-${u.id}`}>{locale === "en" ? "Confirm new password" : "تأكيد كلمة المرور الجديدة"}</Label>
              <input id={`cp-${u.id}`} name="confirmPassword" type="password" autoComplete="new-password" className={fieldClass} />
            </div>
            <PrimaryButton className="w-full sm:w-auto">
              {locale === "en" ? "Save login account" : "حفظ بيانات الدخول"}
            </PrimaryButton>
          </form>
        ))}
      </div>
    </div>
  );
}
