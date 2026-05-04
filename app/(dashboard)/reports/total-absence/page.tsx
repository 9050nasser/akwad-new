import { PageFrame } from "@/components/page-frame";
import { ReportColumnsToolbar } from "@/components/report-columns-toolbar";
import { ReportEmployeeFilterFields } from "@/components/report-employee-filter-fields";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { monthRangeInputs } from "@/lib/default-range";
import { firstQuery } from "@/lib/flash";
import { ABSENCE_SUMMARY_COLUMN_GROUPS } from "@/lib/report-column-config";
import { getReportColumnState } from "@/lib/report-column-state";
import { buildEmployeeFiltersFromSearchParams, loadReportFilterDropdowns } from "@/lib/report-employee-filters";
import { getAbsenceSummary, parseRangeFromSearch } from "@/lib/reports";
import { requireTenantSession } from "@/lib/tenant";

export default async function TotalAbsenceReportPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireTenantSession();
  const companyId = session.companyId;
  const sp = (await searchParams) ?? {};
  const defaults = monthRangeInputs();
  const fromStr = firstQuery(sp.from) ?? defaults.from;
  const toStr = firstQuery(sp.to) ?? defaults.to;
  const branchId = firstQuery(sp.branchId) || undefined;
  const employeeFilters = buildEmployeeFiltersFromSearchParams(sp);
  const { from, to } = parseRangeFromSearch(fromStr, toStr);
  const [{ rows, days }, dropdowns, colState] = await Promise.all([
    getAbsenceSummary({ companyId, from, to, branchId, employeeFilters }),
    loadReportFilterDropdowns(companyId),
    getReportColumnState("/reports/total-absence", "total-absence", sp),
  ]);
  const { visibleIds, returnUrl } = colState;
  const v = (id: string) => visibleIds.includes(id);

  const totalAbsentDays = rows.reduce((s, r) => s + r.absentDays, 0);

  return (
    <PageFrame exportFileSlug="total-absence" title="تقرير إجمالي الغياب">
      <form method="get" className="space-y-4">
        <ReportEmployeeFilterFields
          dropdowns={dropdowns}
          defaults={{ branchId: branchId ?? "", ...employeeFilters }}
          leadingSlot={
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label htmlFor="from">من</Label>
                <input id="from" name="from" type="date" className={fieldClass} defaultValue={fromStr} />
              </div>
              <div>
                <Label htmlFor="to">إلى</Label>
                <input id="to" name="to" type="date" className={fieldClass} defaultValue={toStr} />
              </div>
            </div>
          }
        />
        <div className="flex flex-wrap items-end gap-3 print:hidden">
          <PrimaryButton type="submit">عرض</PrimaryButton>
        </div>
      </form>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">أيام الفترة لكل موظف</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{days}</p>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4 shadow-sm">
          <p className="text-xs text-rose-800/80">إجمالي أيام الغياب (جميع الموظفين)</p>
          <p className="mt-1 text-2xl font-semibold text-rose-900">{totalAbsentDays}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2 print:hidden">
        <ReportColumnsToolbar
          slug="total-absence"
          groups={ABSENCE_SUMMARY_COLUMN_GROUPS}
          visibleIds={visibleIds}
          redirectTo={returnUrl}
        />
      </div>

      <div className="mt-8 table-container rounded-xl border border-slate-200">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {v("name") ? <th className="px-4 py-3">الموظف</th> : null}
              {v("branch") ? <th className="px-4 py-3">الفرع</th> : null}
              {v("absentDays") ? <th className="px-4 py-3">إجمالي أيام الغياب</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((r) => (
              <tr key={r.employeeId} className="hover:bg-slate-50/80">
                {v("name") ? <td className="px-4 py-3 font-medium text-slate-900">{r.fullName}</td> : null}
                {v("branch") ? <td className="px-4 py-3 text-slate-600">{r.branch}</td> : null}
                {v("absentDays") ? <td className="px-4 py-3 text-slate-600">{r.absentDays}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageFrame>
  );
}
