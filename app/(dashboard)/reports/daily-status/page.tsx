import { PageFrame } from "@/components/page-frame";
import { ReportColumnsToolbar } from "@/components/report-columns-toolbar";
import { DailyStatusTable } from "@/components/reports/daily-status-table";
import { ReportEmployeeFilterFields } from "@/components/report-employee-filter-fields";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { parseDateOnly } from "@/lib/day-range";
import { firstQuery } from "@/lib/flash";
import { DAILY_STATUS_COLUMN_GROUPS } from "@/lib/report-column-config";
import { getReportColumnState } from "@/lib/report-column-state";
import { buildEmployeeFiltersFromSearchParams, loadReportFilterDropdowns } from "@/lib/report-employee-filters";
import { getDailyStatus } from "@/lib/reports";
import { localDayKey } from "@/lib/shift-metrics";
import { requireTenantSession } from "@/lib/tenant";

export default async function DailyStatusReportPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireTenantSession();
  const companyId = session.companyId;
  const sp = (await searchParams) ?? {};
  const dateStr = firstQuery(sp.date) ?? localDayKey(new Date());
  const branchId = firstQuery(sp.branchId) || undefined;
  const employeeFilters = buildEmployeeFiltersFromSearchParams(sp);

  const date = parseDateOnly(dateStr);
  const [{ rows }, dropdowns, colState] = await Promise.all([
    getDailyStatus({ companyId, date, branchId, ...employeeFilters }),
    loadReportFilterDropdowns(companyId),
    getReportColumnState("/reports/daily-status", "daily-status", sp),
  ]);
  const { visibleIds: dailyStatusVisible, returnUrl } = colState;

  return (
    <PageFrame exportFileSlug="daily-status" title="تقرير حالة اليوم">
      <form method="get" className="space-y-4">
        <ReportEmployeeFilterFields
          dropdowns={dropdowns}
          defaults={{ branchId: branchId ?? "", ...employeeFilters }}
          leadingSlot={
            <div>
              <Label htmlFor="date">اليوم</Label>
              <input id="date" name="date" type="date" className={fieldClass} defaultValue={dateStr} />
            </div>
          }
        />
        <div className="flex flex-wrap items-end gap-3 print:hidden">
          <PrimaryButton type="submit">عرض</PrimaryButton>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2 print:hidden">
        <ReportColumnsToolbar
          slug="daily-status"
          groups={DAILY_STATUS_COLUMN_GROUPS}
          visibleIds={dailyStatusVisible}
          redirectTo={returnUrl}
        />
      </div>

      <DailyStatusTable rows={rows} visibleGroupIds={dailyStatusVisible} />
    </PageFrame>
  );
}
