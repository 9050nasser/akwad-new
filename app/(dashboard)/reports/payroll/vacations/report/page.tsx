import Link from "next/link";
import { PageFrame } from "@/components/page-frame";
import { ReportColumnsToolbar } from "@/components/report-columns-toolbar";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { monthRangeInputs } from "@/lib/default-range";
import { formatDateOnly } from "@/lib/format";
import { firstQuery } from "@/lib/flash";
import { PAYROLL_VACATIONS_REPORT_COLUMN_GROUPS } from "@/lib/report-column-config";
import { getReportColumnState } from "@/lib/report-column-state";
import { prisma } from "@/lib/prisma";
import { parseRangeFromSearch } from "@/lib/reports";
import { requireTenantSession } from "@/lib/tenant";
import { redirect } from "next/navigation";

export default async function PayrollVacationsReportPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireTenantSession();
  const companyId = session.companyId;
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company?.enablePayroll) redirect("/reports?err=payroll_disabled");

  const sp = (await searchParams) ?? {};
  const defaults = monthRangeInputs();
  const fromStr = firstQuery(sp.from) ?? defaults.from;
  const toStr = firstQuery(sp.to) ?? defaults.to;
  const { from, to } = parseRangeFromSearch(fromStr, toStr);

  const [rows, colState] = await Promise.all([
    prisma.payrollVacation.findMany({
      where: {
        companyId,
        startDate: { lte: to },
        endDate: { gte: from },
      },
      include: { employee: { select: { fullName: true, branch: { select: { name: true } } } } },
      orderBy: { startDate: "asc" },
    }),
    getReportColumnState("/reports/payroll/vacations/report", "payroll-vacations-report", sp),
  ]);
  const { visibleIds, returnUrl } = colState;
  const v = (id: string) => visibleIds.includes(id);
  const emptyColSpan = Math.max(1, visibleIds.length);

  return (
    <PageFrame exportFileSlug="payroll-vacations-report" title="تقرير إجازات الموظفين (الرواتب)">
      <p className="mb-6 flex flex-wrap gap-3 text-sm print:hidden">
        <Link href="/reports/payroll/vacations" className="font-medium text-teal-700 hover:text-teal-900">
          ← تسجيل الإجازات
        </Link>
        <Link href="/reports/payroll" className="font-medium text-teal-700 hover:text-teal-900">
          تقرير الرواتب
        </Link>
      </p>

      <form method="get" className="mb-6 grid gap-4 md:grid-cols-4 print:hidden">
        <div>
          <Label htmlFor="from">من</Label>
          <input id="from" name="from" type="date" className={fieldClass} defaultValue={fromStr} />
        </div>
        <div>
          <Label htmlFor="to">إلى</Label>
          <input id="to" name="to" type="date" className={fieldClass} defaultValue={toStr} />
        </div>
        <div className="flex items-end">
          <PrimaryButton type="submit">عرض</PrimaryButton>
        </div>
      </form>

      <div className="mb-2 flex flex-wrap items-center justify-end print:hidden">
        <ReportColumnsToolbar
          slug="payroll-vacations-report"
          groups={PAYROLL_VACATIONS_REPORT_COLUMN_GROUPS}
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
              {v("start") ? <th className="px-3 py-3">بداية الإجازة</th> : null}
              {v("end") ? <th className="px-3 py-3">نهاية الإجازة</th> : null}
              {v("note") ? <th className="px-3 py-3">ملاحظة</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={emptyColSpan} className="px-3 py-8 text-center text-slate-500">
                  لا توجد إجازات في هذه الفترة.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80">
                  {v("employee") ? <td className="px-3 py-3 font-medium text-slate-900">{row.employee.fullName}</td> : null}
                  {v("branch") ? <td className="px-3 py-3 text-slate-600">{row.employee.branch.name}</td> : null}
                  {v("start") ? <td className="px-3 py-3 tabular-nums text-slate-700">{formatDateOnly(row.startDate)}</td> : null}
                  {v("end") ? <td className="px-3 py-3 tabular-nums text-slate-700">{formatDateOnly(row.endDate)}</td> : null}
                  {v("note") ? <td className="px-3 py-3 text-slate-600">{row.note ?? "—"}</td> : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-slate-500">عدد السجلات: {rows.length}</p>
    </PageFrame>
  );
}
