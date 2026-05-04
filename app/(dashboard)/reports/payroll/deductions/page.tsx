import Link from "next/link";
import { ConfirmServerActionForm } from "@/components/confirm-server-action-form";
import { FlashBanner } from "@/components/flash-banner";
import { GhostButton, Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { PageFrame } from "@/components/page-frame";
import { ReportColumnsToolbar } from "@/components/report-columns-toolbar";
import { createPayrollManualDeduction, deletePayrollManualDeduction } from "@/app/actions/payroll-module";
import { formatFlash } from "@/lib/flash";
import { PAYROLL_MANUAL_ENTRY_COLUMN_GROUPS } from "@/lib/report-column-config";
import { getReportColumnState } from "@/lib/report-column-state";
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

  const [employees, deductions, colState] = await Promise.all([
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
    getReportColumnState("/reports/payroll/deductions", "payroll-deductions", sp),
  ]);
  const { visibleIds, returnUrl } = colState;
  const v = (id: string) => visibleIds.includes(id);
  const emptyColSpan = Math.max(1, visibleIds.length);

  return (
    <PageFrame exportFileSlug="payroll-deductions" title="خصومات يدوية (موديول الرواتب)">
      <FlashBanner notice={flash.notice} error={flash.error} />

      <p className="mb-6 flex flex-wrap gap-3 text-sm print:hidden">
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
        <p className="text-sm text-rose-700 print:hidden">لا يوجد موظفون نشطون.</p>
      ) : (
        <form action={createPayrollManualDeduction} className="mb-10 grid gap-4 rounded-xl border border-slate-200 bg-white p-5 md:grid-cols-2 print:hidden">
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

      <div className="mb-2 flex flex-wrap items-center justify-end print:hidden">
        <ReportColumnsToolbar
          slug="payroll-deductions"
          groups={PAYROLL_MANUAL_ENTRY_COLUMN_GROUPS}
          visibleIds={visibleIds}
          redirectTo={returnUrl}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {v("employee") ? <th className="px-3 py-3">الموظف</th> : null}
              {v("branch") ? <th className="px-3 py-3">الفرع</th> : null}
              {v("month") ? <th className="px-3 py-3">الشهر</th> : null}
              {v("amount") ? <th className="px-3 py-3">المبلغ</th> : null}
              {v("reason") ? <th className="px-3 py-3">السبب</th> : null}
              {v("actions") ? <th className="px-3 py-3 w-24">إجراء</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {deductions.length === 0 ? (
              <tr>
                <td colSpan={emptyColSpan} className="px-3 py-6 text-center text-slate-500">
                  لا توجد خصومات مسجلة.
                </td>
              </tr>
            ) : (
              deductions.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/80">
                  {v("employee") ? <td className="px-3 py-3 font-medium text-slate-900">{d.employee.fullName}</td> : null}
                  {v("branch") ? <td className="px-3 py-3 text-slate-600">{d.employee.branch.name}</td> : null}
                  {v("month") ? <td className="px-3 py-3 tabular-nums text-slate-700">{d.deductionPeriodYm}</td> : null}
                  {v("amount") ? (
                    <td className="px-3 py-3 tabular-nums font-medium text-rose-800">{fmtMoney(Number(d.amount))}</td>
                  ) : null}
                  {v("reason") ? <td className="max-w-xs px-3 py-3 text-slate-600">{d.reason}</td> : null}
                  {v("actions") ? (
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
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </PageFrame>
  );
}
