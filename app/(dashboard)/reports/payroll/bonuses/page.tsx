import Link from "next/link";
import { ConfirmServerActionForm } from "@/components/confirm-server-action-form";
import { FlashBanner } from "@/components/flash-banner";
import { GhostButton, Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { PageFrame } from "@/components/page-frame";
import { createPayrollManualBonus, deletePayrollManualBonus } from "@/app/actions/payroll-module";
import { formatFlash } from "@/lib/flash";
import { ymFromDateLocal } from "@/lib/payroll-months";
import { formatCompanyMoney } from "@/lib/company-settings";
import { prisma } from "@/lib/prisma";
import { getUiLocale } from "@/lib/ui/prefs";
import { requireTenantSession } from "@/lib/tenant";
import { redirect } from "next/navigation";

export default async function PayrollBonusesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireTenantSession();
  const companyId = session.companyId;
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company?.enablePayroll) redirect("/reports?err=payroll_disabled");
  const locale = await getUiLocale(company.defaultLocale === "en" ? "en" : "ar");
  const fmtMoney = (n: number) => formatCompanyMoney(company, n, locale);

  const sp = (await searchParams) ?? {};
  const flash = formatFlash(sp);
  const defaultYm = ymFromDateLocal(new Date());

  const [employees, bonuses] = await Promise.all([
    prisma.employee.findMany({
      where: { active: true, branch: { companyId } },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, branch: { select: { name: true } } },
    }),
    prisma.payrollManualBonus.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { employee: { select: { fullName: true, branch: { select: { name: true } } } } },
    }),
  ]);

  return (
    <PageFrame
      exportFileSlug="payroll-bonuses"
      title="إضافات يدوية (موديول الرواتب)"
      subtitle="مكافآت أو بدلات لمرة واحدة تُضاف إلى صافي الراتب عندما يقع شهرها ضمن فترة تقرير الرواتب."
    >
      <FlashBanner notice={flash.notice} error={flash.error} />

      <p className="mb-6 flex flex-wrap gap-3 text-sm">
        <Link href="/reports/payroll" className="font-medium text-teal-700 hover:text-teal-900">
          ← تقرير الرواتب
        </Link>
        <Link href="/reports/payroll/deductions" className="font-medium text-teal-700 hover:text-teal-900">
          الخصومات اليدوية
        </Link>
      </p>

      {employees.length === 0 ? (
        <p className="text-sm text-rose-700">لا يوجد موظفون نشطون.</p>
      ) : (
        <form action={createPayrollManualBonus} className="mb-10 grid gap-4 rounded-xl border border-slate-200 bg-white p-5 md:grid-cols-2">
          <div className="md:col-span-2 text-sm font-semibold text-slate-900">إضافة مكافأة / بدل لمرة</div>
          <div className="md:col-span-2">
            <Label htmlFor="employeeId">الموظف</Label>
            <select id="employeeId" name="employeeId" className={fieldClass} required defaultValue="">
              <option value="" disabled>
                — اختر الموظف —
              </option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName} — {e.branch.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="amount">المبلغ</Label>
            <input id="amount" name="amount" type="number" min={0.01} step="0.01" className={fieldClass} required placeholder="0.00" />
          </div>
          <div>
            <Label htmlFor="bonusPeriodYm">الشهر المحسوب له</Label>
            <input id="bonusPeriodYm" name="bonusPeriodYm" type="month" className={fieldClass} required defaultValue={defaultYm} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="reason">السبب</Label>
            <textarea id="reason" name="reason" className={fieldClass} required rows={2} placeholder="مثال: حافز إنجاز، بدل انتداب" />
          </div>
          <div className="md:col-span-2">
            <PrimaryButton>حفظ الإضافة</PrimaryButton>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3">الموظف</th>
              <th className="px-3 py-3">الفرع</th>
              <th className="px-3 py-3">الشهر</th>
              <th className="px-3 py-3">المبلغ</th>
              <th className="px-3 py-3">السبب</th>
              <th className="px-3 py-3 w-24">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {bonuses.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                  لا توجد إضافات مسجلة.
                </td>
              </tr>
            ) : (
              bonuses.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/80">
                  <td className="px-3 py-3 font-medium text-slate-900">{b.employee.fullName}</td>
                  <td className="px-3 py-3 text-slate-600">{b.employee.branch.name}</td>
                  <td className="px-3 py-3 tabular-nums text-slate-700">{b.bonusPeriodYm}</td>
                  <td className="px-3 py-3 tabular-nums font-medium text-emerald-800">{fmtMoney(Number(b.amount))}</td>
                  <td className="max-w-xs px-3 py-3 text-slate-600">{b.reason}</td>
                  <td className="px-3 py-3">
                    <ConfirmServerActionForm
                      action={deletePayrollManualBonus}
                      confirmMessage="حذف هذه الإضافة؟"
                      className="inline"
                    >
                      <input type="hidden" name="id" value={b.id} />
                      <GhostButton>حذف</GhostButton>
                    </ConfirmServerActionForm>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </PageFrame>
  );
}
