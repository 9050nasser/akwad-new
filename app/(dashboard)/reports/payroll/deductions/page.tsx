import Link from "next/link";
import { ConfirmServerActionForm } from "@/components/confirm-server-action-form";
import { FlashBanner } from "@/components/flash-banner";
import { GhostButton, Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { PageFrame } from "@/components/page-frame";
import { createPayrollManualDeduction, deletePayrollManualDeduction } from "@/app/actions/payroll-module";
import { formatFlash } from "@/lib/flash";
import { ymFromDateLocal } from "@/lib/payroll-months";
import { formatCompanyMoney } from "@/lib/company-settings";
import { prisma } from "@/lib/prisma";
import { getUiLocale } from "@/lib/ui/prefs";
import { requireTenantSession } from "@/lib/tenant";
import { redirect } from "next/navigation";

export default async function PayrollDeductionsPage({
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

  const [employees, deductions] = await Promise.all([
    prisma.employee.findMany({
      where: { active: true, branch: { companyId } },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, branch: { select: { name: true } } },
    }),
    prisma.payrollManualDeduction.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { employee: { select: { fullName: true, branch: { select: { name: true } } } } },
    }),
  ]);

  return (
    <PageFrame
      exportFileSlug="payroll-deductions"
      title="خصومات يدوية (موديول الرواتب)"
      subtitle="خصومات تُطرح من صافي الراتب في تقرير الفترة التي يقع فيها شهر الخصم (YYYY-MM)."
    >
      <FlashBanner notice={flash.notice} error={flash.error} />

      <p className="mb-6 flex flex-wrap gap-3 text-sm">
        <Link href="/reports/payroll" className="font-medium text-teal-700 hover:text-teal-900">
          ← تقرير الرواتب
        </Link>
        <Link href="/reports/payroll/vacations" className="font-medium text-teal-700 hover:text-teal-900">
          تسجيل الإجازات
        </Link>
        <Link href="/reports/payroll/bonuses" className="font-medium text-teal-700 hover:text-teal-900">
          إضافات يدوية
        </Link>
      </p>

      {employees.length === 0 ? (
        <p className="text-sm text-rose-700">لا يوجد موظفون نشطون.</p>
      ) : (
        <form action={createPayrollManualDeduction} className="mb-10 grid gap-4 rounded-xl border border-slate-200 bg-white p-5 md:grid-cols-2">
          <div className="md:col-span-2 text-sm font-semibold text-slate-900">إضافة خصم</div>
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
            <Label htmlFor="amount">مبلغ الخصم</Label>
            <input id="amount" name="amount" type="number" min={0.01} step="0.01" className={fieldClass} required placeholder="0.00" />
          </div>
          <div>
            <Label htmlFor="deductionPeriodYm">شهر الخصم</Label>
            <input id="deductionPeriodYm" name="deductionPeriodYm" type="month" className={fieldClass} required defaultValue={defaultYm} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="reason">السبب</Label>
            <textarea id="reason" name="reason" className={fieldClass} required rows={2} placeholder="مثال: غرامة تأخير إداري" />
          </div>
          <div className="md:col-span-2">
            <PrimaryButton>حفظ الخصم</PrimaryButton>
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
            {deductions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                  لا توجد خصومات مسجلة.
                </td>
              </tr>
            ) : (
              deductions.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/80">
                  <td className="px-3 py-3 font-medium text-slate-900">{d.employee.fullName}</td>
                  <td className="px-3 py-3 text-slate-600">{d.employee.branch.name}</td>
                  <td className="px-3 py-3 tabular-nums text-slate-700">{d.deductionPeriodYm}</td>
                  <td className="px-3 py-3 tabular-nums font-medium text-rose-800">{fmtMoney(Number(d.amount))}</td>
                  <td className="max-w-xs px-3 py-3 text-slate-600">{d.reason}</td>
                  <td className="px-3 py-3">
                    <ConfirmServerActionForm
                      action={deletePayrollManualDeduction}
                      confirmMessage="حذف هذا الخصم؟"
                      className="inline"
                    >
                      <input type="hidden" name="id" value={d.id} />
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
