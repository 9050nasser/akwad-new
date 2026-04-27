import { FlashBanner } from "@/components/flash-banner";

import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";

import { PageFrame } from "@/components/page-frame";

import { removeCompanyLogo, updateCompany, uploadCompanyLogo } from "@/app/actions/company";
import { ConfirmServerActionForm } from "@/components/confirm-server-action-form";

import { formatFlash } from "@/lib/flash";

import { formatLicenseDate } from "@/lib/format";

import { prisma } from "@/lib/prisma";
import { getUiLocale } from "@/lib/ui/prefs";
import { requireTenantSession } from "@/lib/tenant";



export default async function CompanySettingsPage({

  searchParams,

}: {

  searchParams?: Promise<Record<string, string | string[] | undefined>>;

}) {

  const session = await requireTenantSession();

  const sp = (await searchParams) ?? {};

  const flash = formatFlash(sp);

  const company = await prisma.company.findUnique({ where: { id: session.companyId } });
  const locale = await getUiLocale(company?.defaultLocale === "en" ? "en" : "ar");



  return (

    <PageFrame
      title="بيانات الشركة"
      subtitle="تظهر هنا بيانات الترخيص كما سجّلتها المنصة؛ يمكنك تعديل بيانات الاتصال والعنوان. حدود الترخيص تُدار من إدارة المنصة فقط."
    >

      <FlashBanner notice={flash.notice} error={flash.error} />

      {!company ? (

        <p className="text-sm text-slate-600">لم يتم العثور على بيانات الشركة.</p>

      ) : (
        <>
          <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-sm font-bold text-slate-900">شعار الشركة</h2>
            <p className="mb-4 text-sm text-slate-600">
              يظهر في أعلى صفحات التقارير وعند الطباعة. صيغ مسموحة: PNG أو JPEG أو WebP — حتى ٢ ميجابايت.
            </p>
            <div className="flex flex-wrap items-end gap-4">
              {company.logoPath ? (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-slate-500">المعاينة</span>
                  <img
                    src={company.logoPath}
                    alt=""
                    className="h-16 max-w-[200px] rounded-lg border border-slate-200 object-contain bg-white p-1"
                  />
                </div>
              ) : null}
              <form action={uploadCompanyLogo} className="flex flex-wrap items-end gap-3">
                <div>
                  <Label htmlFor="logo">رفع شعار</Label>
                  <input
                    id="logo"
                    name="logo"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className={fieldClass}
                  />
                </div>
                <PrimaryButton>حفظ الشعار</PrimaryButton>
              </form>
              {company.logoPath ? (
                <ConfirmServerActionForm
                  action={removeCompanyLogo}
                  confirmMessage="إزالة الشعار من التقارير؟"
                  className="inline"
                >
                  <button
                    type="submit"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    إزالة الشعار
                  </button>
                </ConfirmServerActionForm>
              ) : null}
            </div>
          </div>

        <form action={updateCompany} className="grid gap-4 md:grid-cols-2">

          <div className="md:col-span-2">

            <Label htmlFor="slugDisplay">اسم الشركة في شاشة الدخول</Label>

            <input

              id="slugDisplay"

              type="text"

              className={`${fieldClass} bg-slate-50`}

              readOnly

              value={company.slug}

            />

          </div>

          <div className="md:col-span-2">

            <Label htmlFor="name">اسم الشركة</Label>

            <input id="name" name="name" className={fieldClass} required defaultValue={company.name} />

          </div>

          <div>

            <Label htmlFor="clientPhone">هاتف العميل</Label>

            <input

              id="clientPhone"

              name="clientPhone"

              type="tel"

              className={fieldClass}

              defaultValue={company.clientPhone ?? ""}

            />

          </div>

          <div>

            <Label htmlFor="brokerName">اسم الوسيط</Label>

            <input id="brokerName" name="brokerName" className={fieldClass} defaultValue={company.brokerName ?? ""} />

          </div>

          <div>

            <Label htmlFor="brokerPhone">هاتف الوسيط</Label>

            <input

              id="brokerPhone"

              name="brokerPhone"

              type="tel"

              className={fieldClass}

              defaultValue={company.brokerPhone ?? ""}

            />

          </div>

          <div>

            <Label htmlFor="phone">هاتف الشركة</Label>

            <input id="phone" name="phone" className={fieldClass} defaultValue={company.phone ?? ""} />

          </div>

          <div>

            <Label htmlFor="email">البريد الإلكتروني</Label>

            <input id="email" name="email" type="email" className={fieldClass} defaultValue={company.email ?? ""} />

          </div>

          <div className="md:col-span-2">

            <Label htmlFor="address">العنوان</Label>

            <input id="address" name="address" className={fieldClass} defaultValue={company.address ?? ""} />

          </div>

          <div>

            <Label htmlFor="taxNumber">الرقم الضريبي</Label>

            <input id="taxNumber" name="taxNumber" className={fieldClass} defaultValue={company.taxNumber ?? ""} />

          </div>

          <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700">

            <p className="font-medium text-slate-900">حدود الترخيص (للعرض)</p>

            <ul className="mt-2 grid gap-2 sm:grid-cols-3">

              <li>

                <span className="text-slate-500">انتهاء الترخيص</span>

                <br />

                <span className="font-semibold text-slate-900">{formatLicenseDate(company.licenseExpiresAt, locale)}</span>

              </li>

              <li>

                <span className="text-slate-500">حد الموظفين</span>

                <br />

                <span className="font-semibold text-slate-900">{company.maxEmployees}</span>

              </li>

              <li>

                <span className="text-slate-500">حد أجهزة البصمة</span>

                <br />

                <span className="font-semibold text-slate-900">{company.maxDevices}</span>

              </li>

            </ul>

            <p className="mt-2 text-xs text-slate-500">

              موديول الرواتب من البصمة: {company.enablePayroll ? "مفعّل" : "غير مفعّل"} — يُحدَّث من المنصة فقط.

            </p>

          </div>

          <div className="md:col-span-2">

            <PrimaryButton>حفظ</PrimaryButton>

          </div>

        </form>
        </>
      )}

    </PageFrame>

  );

}


