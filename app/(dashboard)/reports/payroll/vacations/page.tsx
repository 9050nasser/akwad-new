import Link from "next/link";
import { ConfirmServerActionForm } from "@/components/confirm-server-action-form";
import { FlashBanner } from "@/components/flash-banner";
import { GhostButton, Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { PageFrame } from "@/components/page-frame";
import { ReportColumnsToolbar } from "@/components/report-columns-toolbar";
import { createPayrollVacation, deletePayrollVacation } from "@/app/actions/payroll-module";
import { formatDateOnly } from "@/lib/format";
import { formatFlash } from "@/lib/flash";
import { PAYROLL_VACATIONS_REGISTER_COLUMN_GROUPS } from "@/lib/report-column-config";
import { getReportColumnState } from "@/lib/report-column-state";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant";
import { redirect } from "next/navigation";

export default async function PayrollVacationsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireTenantSession();
  const companyId = session.companyId;
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company?.enablePayroll) redirect("/reports?err=payroll_disabled");

  const sp = (await searchParams) ?? {};
  const flash = formatFlash(sp);

  const [employees, vacations, colState] = await Promise.all([
    prisma.employee.findMany({
      where: { active: true, branch: { companyId } },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, branch: { select: { name: true } } },
    }),
    prisma.payrollVacation.findMany({
      where: { companyId },
      orderBy: { startDate: "desc" },
      include: { employee: { select: { fullName: true, branch: { select: { name: true } } } } },
      take: 200,
    }),
    getReportColumnState("/reports/payroll/vacations", "payroll-vacations-register", sp),
  ]);
  const { visibleIds, returnUrl } = colState;
  const v = (id: string) => visibleIds.includes(id);
  const emptyColSpan = Math.max(1, visibleIds.length);

  return (
    <PageFrame exportFileSlug="payroll-vacations-register" title="تسجيل إجازات (موديول الرواتب)">
      <FlashBanner notice={flash.notice} error={flash.error} />

      <p className="mb-6 flex flex-wrap gap-3 text-sm print:hidden">
        <Link href="/reports/payroll" className="font-medium text-teal-700 hover:text-teal-900">
          ← تقرير الرواتب
        </Link>
        <Link href="/reports/payroll/vacations/report" className="font-medium text-teal-700 hover:text-teal-900">
          تقرير إجازات الموظفين
        </Link>
        <Link href="/reports/payroll/deductions" className="font-medium text-teal-700 hover:text-teal-900">
          الخصومات اليدوية
        </Link>
      </p>

      {employees.length === 0 ? (
        <p className="text-sm text-rose-700 print:hidden">لا يوجد موظفون نشطون لإضافة إجازة.</p>
      ) : (
        <form action={createPayrollVacation} className="mb-10 grid gap-4 rounded-xl border border-slate-200 bg-white p-5 md:grid-cols-2 print:hidden">
          <div className="md:col-span-2 text-sm font-semibold text-slate-900">إضافة إجازة</div>
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
            <Label htmlFor="startDate">بداية الإجازة</Label>
            <input id="startDate" name="startDate" type="date" className={fieldClass} required />
          </div>
          <div>
            <Label htmlFor="endDate">نهاية الإجازة</Label>
            <input id="endDate" name="endDate" type="date" className={fieldClass} required />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="note">ملاحظة (اختياري)</Label>
            <input id="note" name="note" className={fieldClass} placeholder="مثال: إجازة سنوية" />
          </div>
          <div className="md:col-span-2">
            <PrimaryButton>حفظ الإجازة</PrimaryButton>
          </div>
        </form>
      )}

      <div className="mb-2 flex flex-wrap items-center justify-end print:hidden">
        <ReportColumnsToolbar
          slug="payroll-vacations-register"
          groups={PAYROLL_VACATIONS_REGISTER_COLUMN_GROUPS}
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
              {v("start") ? <th className="px-3 py-3">من</th> : null}
              {v("end") ? <th className="px-3 py-3">إلى</th> : null}
              {v("note") ? <th className="px-3 py-3">ملاحظة</th> : null}
              {v("actions") ? <th className="px-3 py-3 w-28">إجراء</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {vacations.length === 0 ? (
              <tr>
                <td colSpan={emptyColSpan} className="px-3 py-6 text-center text-slate-500">
                  لا توجد إجازات مسجلة بعد.
                </td>
              </tr>
            ) : (
              vacations.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80">
                  {v("employee") ? <td className="px-3 py-3 font-medium text-slate-900">{row.employee.fullName}</td> : null}
                  {v("branch") ? <td className="px-3 py-3 text-slate-600">{row.employee.branch.name}</td> : null}
                  {v("start") ? <td className="px-3 py-3 tabular-nums text-slate-700">{formatDateOnly(row.startDate)}</td> : null}
                  {v("end") ? <td className="px-3 py-3 tabular-nums text-slate-700">{formatDateOnly(row.endDate)}</td> : null}
                  {v("note") ? <td className="px-3 py-3 text-slate-600">{row.note ?? "—"}</td> : null}
                  {v("actions") ? (
                    <td className="px-3 py-3">
                      <ConfirmServerActionForm
                        action={deletePayrollVacation}
                        confirmMessage="حذف هذه الإجازة من سجل الرواتب؟"
                        className="inline"
                      >
                        <input type="hidden" name="id" value={row.id} />
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
