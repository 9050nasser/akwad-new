import { PageFrame } from "@/components/page-frame";
import { ReportColumnsToolbar } from "@/components/report-columns-toolbar";
import { ReportEmployeeFilterFields } from "@/components/report-employee-filter-fields";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { monthRangeInputs } from "@/lib/default-range";
import { firstQuery } from "@/lib/flash";
import { formatReportDateTime } from "@/lib/format";
import { OVERTIME_OPEN_COLUMN_GROUPS, OVERTIME_OUTS_COLUMN_GROUPS } from "@/lib/report-column-config";
import { getReportColumnState } from "@/lib/report-column-state";
import { buildEmployeeFiltersFromSearchParams, loadReportFilterDropdowns } from "@/lib/report-employee-filters";
import { getMovements, getOpenScheduleBalanceSummary, parseRangeFromSearch } from "@/lib/reports";
import { requireTenantSession } from "@/lib/tenant";

export default async function OvertimeReportPage({
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

  const [rows, openBalance, dropdowns, colOpen, colOuts] = await Promise.all([
    getMovements({ companyId, from, to, branchId, posted: "yes", employeeFilters }),
    getOpenScheduleBalanceSummary({ companyId, from, to, branchId, employeeFilters }),
    loadReportFilterDropdowns(companyId),
    getReportColumnState("/reports/overtime", "overtime-open", sp),
    getReportColumnState("/reports/overtime", "overtime-outs", sp),
  ]);
  const outs = rows.filter((r) => r.kind === "CHECK_OUT" && r.employeeId);
  const vOpen = (id: string) => colOpen.visibleIds.includes(id);
  const vOut = (id: string) => colOuts.visibleIds.includes(id);

  return (
    <PageFrame exportFileSlug="overtime" title="تقرير الإضافي">
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

      {openBalance.rows.length > 0 ? (
        <div className="mt-8">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">دوام مفتوح — نقص وإضافي (دقائق)</h2>
          <p className="mb-3 text-xs text-slate-500">
            يُحسب من أول بصمة إلى آخر بصمة في اليوم مقابل الهدف اليومي، مع احترام خيارات السماح وخصم التأخير من
            الإضافي إن وُجدت في جدول الدوام.
          </p>
          <div className="mb-2 flex flex-wrap items-center justify-end gap-2 print:hidden">
            <ReportColumnsToolbar
              slug="overtime-open"
              groups={OVERTIME_OPEN_COLUMN_GROUPS}
              visibleIds={colOpen.visibleIds}
              redirectTo={colOpen.returnUrl}
            />
          </div>
          <div className="table-container rounded-xl border border-slate-200">
            <table className="min-w-full text-right text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {vOpen("name") ? <th className="px-4 py-3">الموظف</th> : null}
                  {vOpen("branch") ? <th className="px-4 py-3">الفرع</th> : null}
                  {vOpen("shortage") ? <th className="px-4 py-3">دقائق نقص</th> : null}
                  {vOpen("netOvertime") ? <th className="px-4 py-3">دقائق إضافي صافي</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {openBalance.rows.map((r) => (
                  <tr key={r.employeeId} className="hover:bg-slate-50/80">
                    {vOpen("name") ? <td className="px-4 py-3 font-medium text-slate-900">{r.fullName}</td> : null}
                    {vOpen("branch") ? <td className="px-4 py-3 text-slate-600">{r.branch}</td> : null}
                    {vOpen("shortage") ? (
                      <td className="px-4 py-3 text-slate-600 tabular-nums">{r.shortageMinutes}</td>
                    ) : null}
                    {vOpen("netOvertime") ? (
                      <td className="px-4 py-3 text-slate-600 tabular-nums">{r.netOvertimeMinutes}</td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="mt-8 table-container rounded-xl border border-slate-200">
        <h2 className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-900">
          بصمات خروج مرحّلة
        </h2>
        <div className="flex flex-wrap items-center justify-end gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2 print:hidden">
          <ReportColumnsToolbar
            slug="overtime-outs"
            groups={OVERTIME_OUTS_COLUMN_GROUPS}
            visibleIds={colOuts.visibleIds}
            redirectTo={colOuts.returnUrl}
          />
        </div>
        <table className="min-w-full text-right text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {vOut("at") ? <th className="px-4 py-3">الوقت</th> : null}
              {vOut("name") ? <th className="px-4 py-3">الموظف</th> : null}
              {vOut("branch") ? <th className="px-4 py-3">الفرع</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {outs.slice(0, 300).map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/80">
                {vOut("at") ? <td className="px-4 py-3 text-slate-800 tabular-nums">{formatReportDateTime(r.at)}</td> : null}
                {vOut("name") ? <td className="px-4 py-3 font-medium text-slate-900">{r.employee?.fullName ?? "—"}</td> : null}
                {vOut("branch") ? <td className="px-4 py-3 text-slate-600">{r.branch.name}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageFrame>
  );
}
