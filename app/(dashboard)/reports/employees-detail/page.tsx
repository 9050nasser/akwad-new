import { PageFrame } from "@/components/page-frame";
import { ReportColumnsToolbar } from "@/components/report-columns-toolbar";
import { EmployeesDetailTable } from "@/components/reports/employees-detail-table";
import { ReportEmployeeFilterFields } from "@/components/report-employee-filter-fields";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { monthRangeInputs } from "@/lib/default-range";
import { firstQuery } from "@/lib/flash";
import { EMPLOYEES_DETAIL_COLUMN_GROUPS } from "@/lib/report-column-config";
import { getReportColumnState } from "@/lib/report-column-state";
import { buildEmployeeFiltersFromSearchParams, loadReportFilterDropdowns } from "@/lib/report-employee-filters";
import { getEmployeesAttendanceDetailReport, parseRangeFromSearch } from "@/lib/reports";
import { requireTenantSession } from "@/lib/tenant";

export default async function EmployeesDetailReportPage({
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
  const [{ rows, capped }, dropdowns, colState] = await Promise.all([
    getEmployeesAttendanceDetailReport({ companyId, from, to, branchId, employeeFilters }),
    loadReportFilterDropdowns(companyId),
    getReportColumnState("/reports/employees-detail", "employees-detail", sp),
  ]);
  const { visibleIds: detailVisible, returnUrl } = colState;

  const totals = rows.reduce(
    (acc, r) => ({
      overtimeMinutes: acc.overtimeMinutes + r.overtimeMinutes,
      lateMinutes: acc.lateMinutes + r.lateMinutes,
      expectedWorkMinutes: acc.expectedWorkMinutes + r.expectedWorkMinutes,
      actualWorkMinutes: acc.actualWorkMinutes + r.actualWorkMinutes,
      differenceMinutes: acc.differenceMinutes + r.differenceMinutes,
    }),
    {
      overtimeMinutes: 0,
      lateMinutes: 0,
      expectedWorkMinutes: 0,
      actualWorkMinutes: 0,
      differenceMinutes: 0,
    },
  );

  return (
    <PageFrame exportFileSlug="employees-detail" title="تقرير الحضور والانصراف تفصيلي">
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

      {capped ? (
        <p className="mt-4 text-sm text-amber-800">
          تم اقتصار النتائج على أول {rows.length} صفًا. ضيّق الفترة أو التصفية لعرض الباقي.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2 print:hidden">
        <ReportColumnsToolbar
          slug="employees-detail"
          groups={EMPLOYEES_DETAIL_COLUMN_GROUPS}
          visibleIds={detailVisible}
          redirectTo={returnUrl}
        />
      </div>

      <EmployeesDetailTable rows={rows} visibleGroupIds={detailVisible} totals={totals} />
    </PageFrame>
  );
}
