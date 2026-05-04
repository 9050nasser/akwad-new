import { PageFrame } from "@/components/page-frame";
import { ReportColumnsToolbar } from "@/components/report-columns-toolbar";
import { ReportEmployeeFilterFields } from "@/components/report-employee-filter-fields";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { monthRangeInputs } from "@/lib/default-range";
import { firstQuery } from "@/lib/flash";
import { LATE_EARLY_OUT_COLUMN_GROUPS } from "@/lib/report-column-config";
import { getReportColumnState } from "@/lib/report-column-state";
import { buildEmployeeFiltersFromSearchParams, loadReportFilterDropdowns } from "@/lib/report-employee-filters";
import { getFixedScheduleShiftRollup, parseRangeFromSearch } from "@/lib/reports";
import { requireTenantSession } from "@/lib/tenant";

export default async function LateEarlyOutReportPage({
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
  const [roll, dropdowns, colState] = await Promise.all([
    getFixedScheduleShiftRollup({ companyId, from, to, branchId, employeeFilters }),
    loadReportFilterDropdowns(companyId),
    getReportColumnState("/reports/late-early-out", "late-early-out", sp),
  ]);
  const { visibleIds, returnUrl } = colState;
  const v = (id: string) => visibleIds.includes(id);

  return (
    <PageFrame exportFileSlug="late-early-out" title="تفصيل التأخير والانصراف المبكر (الشفتات)">
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

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2 print:hidden">
        <ReportColumnsToolbar
          slug="late-early-out"
          groups={LATE_EARLY_OUT_COLUMN_GROUPS}
          visibleIds={visibleIds}
          redirectTo={returnUrl}
        />
      </div>

      <div className="mt-8 table-container rounded-xl border border-slate-200">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {v("name") ? <th className="px-3 py-3">الموظف</th> : null}
              {v("branch") ? <th className="px-3 py-3">الفرع</th> : null}
              {v("lateShifts") ? <th className="px-3 py-3">شفتات متأخرة</th> : null}
              {v("lateMinutes") ? <th className="px-3 py-3">دقائق تأخير</th> : null}
              {v("earlyArrivalShifts") ? <th className="px-3 py-3">شفتات تبكير دخول</th> : null}
              {v("earlyArrivalMinutes") ? <th className="px-3 py-3">دقائق تبكير</th> : null}
              {v("earlyLeaveShifts") ? <th className="px-3 py-3">شفتات خروج مبكر</th> : null}
              {v("earlyLeaveMinutes") ? <th className="px-3 py-3">دقائق خروج مبكر</th> : null}
              {v("workedMinutes") ? <th className="px-3 py-3">إجمالي دقائق عمل (شفتات)</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {roll.rows.map((r) => (
              <tr key={r.employeeId} className="hover:bg-slate-50/80">
                {v("name") ? <td className="px-3 py-3 font-medium text-slate-900">{r.name}</td> : null}
                {v("branch") ? <td className="px-3 py-3 text-slate-600">{r.branch}</td> : null}
                {v("lateShifts") ? <td className="px-3 py-3 text-slate-600 tabular-nums">{r.lateShifts}</td> : null}
                {v("lateMinutes") ? <td className="px-3 py-3 text-slate-600 tabular-nums">{r.lateMinutes}</td> : null}
                {v("earlyArrivalShifts") ? (
                  <td className="px-3 py-3 text-slate-600 tabular-nums">{r.earlyArrivalShifts}</td>
                ) : null}
                {v("earlyArrivalMinutes") ? (
                  <td className="px-3 py-3 text-slate-600 tabular-nums">{r.earlyArrivalMinutes}</td>
                ) : null}
                {v("earlyLeaveShifts") ? (
                  <td className="px-3 py-3 text-slate-600 tabular-nums">{r.earlyLeaveShifts}</td>
                ) : null}
                {v("earlyLeaveMinutes") ? (
                  <td className="px-3 py-3 text-slate-600 tabular-nums">{r.earlyLeaveMinutes}</td>
                ) : null}
                {v("workedMinutes") ? <td className="px-3 py-3 text-slate-600 tabular-nums">{r.workedMinutes}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageFrame>
  );
}
