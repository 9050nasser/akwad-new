import { PageFrame } from "@/components/page-frame";
import { ReportColumnsToolbar } from "@/components/report-columns-toolbar";
import { ReportEmployeeFilterFields } from "@/components/report-employee-filter-fields";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { monthRangeInputs } from "@/lib/default-range";
import { formatDateOnly, formatDurationMinutes } from "@/lib/format";
import { firstQuery } from "@/lib/flash";
import { DELAYS_COLUMN_GROUPS } from "@/lib/report-column-config";
import { getReportColumnState } from "@/lib/report-column-state";
import { buildEmployeeFiltersFromSearchParams, loadReportFilterDropdowns } from "@/lib/report-employee-filters";
import { getDelaySummary, parseRangeFromSearch } from "@/lib/reports";
import { requireTenantSession } from "@/lib/tenant";

export default async function TotalDelaysReportPage({
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
  const [data, dropdowns, colState] = await Promise.all([
    getDelaySummary({ companyId, from, to, branchId, employeeFilters }),
    loadReportFilterDropdowns(companyId),
    getReportColumnState("/reports/total-delays", "total-delays", sp),
  ]);
  const { visibleIds, returnUrl } = colState;
  const v = (id: string) => visibleIds.includes(id);

  const totalShifts = data.rows.reduce((s, r) => s + r.delays, 0);
  const totalMinutes = data.rows.reduce((s, r) => s + r.delayMinutes, 0);
  const totalEarlyLeave = data.rows.reduce((s, r) => s + r.earlyLeaveMinutes, 0);
  const periodLabel = `${formatDateOnly(from)} — ${formatDateOnly(to)}`;

  return (
    <PageFrame exportFileSlug="total-delays" title="تقرير إجمالي التأخير">
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

      <p className="mt-4 text-sm text-slate-700">
        إجمالي شفتات متأخرة: <span className="font-semibold">{totalShifts}</span> — إجمالي التأخير:{" "}
        <span className="font-semibold">{formatDurationMinutes(totalMinutes)}</span> — إجمالي الانصراف المبكر:{" "}
        <span className="font-semibold">{formatDurationMinutes(totalEarlyLeave)}</span>
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2 print:hidden">
        <ReportColumnsToolbar
          slug="total-delays"
          groups={DELAYS_COLUMN_GROUPS}
          visibleIds={visibleIds}
          redirectTo={returnUrl}
        />
      </div>

      <div className="mt-6 table-container rounded-xl border border-slate-200">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {v("period") ? <th className="px-4 py-3">التاريخ</th> : null}
              {v("code") ? <th className="px-4 py-3">كود الموظف</th> : null}
              {v("name") ? <th className="px-4 py-3">الموظف</th> : null}
              {v("branch") ? <th className="px-4 py-3">الفرع</th> : null}
              {v("lateShifts") ? <th className="px-4 py-3">شفتات متأخرة</th> : null}
              {v("delayMinutes") ? <th className="px-4 py-3">إجمالي التأخير</th> : null}
              {v("earlyLeaveMinutes") ? <th className="px-4 py-3">إجمالي الانصراف المبكر</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {data.rows.map((r) => (
              <tr key={`${r.employeeId}-${r.name}`} className="hover:bg-slate-50/80">
                {v("period") ? <td className="px-4 py-3 text-slate-600 tabular-nums whitespace-nowrap">{periodLabel}</td> : null}
                {v("code") ? (
                  <td className="px-4 py-3 font-mono text-xs text-slate-700 whitespace-nowrap">{r.employeeCode || "—"}</td>
                ) : null}
                {v("name") ? <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td> : null}
                {v("branch") ? <td className="px-4 py-3 text-slate-600">{r.branch}</td> : null}
                {v("lateShifts") ? <td className="px-4 py-3 text-slate-600 tabular-nums">{r.delays}</td> : null}
                {v("delayMinutes") ? (
                  <td className="px-4 py-3 text-slate-600 tabular-nums whitespace-nowrap">
                    {formatDurationMinutes(r.delayMinutes)}
                  </td>
                ) : null}
                {v("earlyLeaveMinutes") ? (
                  <td className="px-4 py-3 text-slate-600 tabular-nums whitespace-nowrap">
                    {formatDurationMinutes(r.earlyLeaveMinutes)}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageFrame>
  );
}
