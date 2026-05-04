import { PageFrame } from "@/components/page-frame";
import { ReportColumnsToolbar } from "@/components/report-columns-toolbar";
import { EmployeesSummaryTable } from "@/components/reports/employees-summary-table";
import { ReportEmployeeFilterFields } from "@/components/report-employee-filter-fields";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { monthRangeInputs } from "@/lib/default-range";
import { firstQuery } from "@/lib/flash";
import { EMPLOYEES_SUMMARY_COLUMN_GROUPS } from "@/lib/report-column-config";
import { getReportColumnState } from "@/lib/report-column-state";
import { buildEmployeeFiltersFromSearchParams, loadReportFilterDropdowns } from "@/lib/report-employee-filters";
import { getEmployeesAttendanceSummaryRollup, parseRangeFromSearch } from "@/lib/reports";
import { requireTenantSession } from "@/lib/tenant";

export default async function EmployeesSummaryReportPage({
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
  const [rows, dropdowns, colState] = await Promise.all([
    getEmployeesAttendanceSummaryRollup({ companyId, from, to, branchId, employeeFilters }),
    loadReportFilterDropdowns(companyId),
    getReportColumnState("/reports/employees-summary", "employees-summary", sp),
  ]);

  const { visibleIds: summaryVisible, returnUrl } = colState;

  const totals = rows.reduce(
    (acc, r) => ({
      scheduleMinutesTotal: acc.scheduleMinutesTotal + r.scheduleMinutesTotal,
      lateMinutesTotal: acc.lateMinutesTotal + r.lateMinutesTotal,
      absenceDays: acc.absenceDays + r.absenceDays,
      leaveDays: acc.leaveDays + r.leaveDays,
      overtimeMinutesTotal: acc.overtimeMinutesTotal + r.overtimeMinutesTotal,
      actualWorkMinutesTotal: acc.actualWorkMinutesTotal + r.actualWorkMinutesTotal,
    }),
    {
      scheduleMinutesTotal: 0,
      lateMinutesTotal: 0,
      absenceDays: 0,
      leaveDays: 0,
      overtimeMinutesTotal: 0,
      actualWorkMinutesTotal: 0,
    },
  );

  return (
    <PageFrame exportFileSlug="employees-summary" title="الإجمالي للموظفين">
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
          slug="employees-summary"
          groups={EMPLOYEES_SUMMARY_COLUMN_GROUPS}
          visibleIds={summaryVisible}
          redirectTo={returnUrl}
        />
      </div>

      <EmployeesSummaryTable rows={rows} visibleGroupIds={summaryVisible} totals={totals} />
    </PageFrame>
  );
}
