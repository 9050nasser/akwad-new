import { PageFrame } from "@/components/page-frame";
import { ReportEmployeeFilterFields } from "@/components/report-employee-filter-fields";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { monthRangeInputs } from "@/lib/default-range";
import { firstQuery } from "@/lib/flash";
import { buildEmployeeFiltersFromSearchParams, loadReportFilterDropdowns } from "@/lib/report-employee-filters";
import { getEmployeeCheckInSummary, parseRangeFromSearch } from "@/lib/reports";
import { requireTenantSession } from "@/lib/tenant";

export default async function AttendanceSummaryReportPage({
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
  const [rows, dropdowns] = await Promise.all([
    getEmployeeCheckInSummary({ companyId, from, to, branchId, employeeFilters }),
    loadReportFilterDropdowns(companyId),
  ]);

  const activeEmployees = rows.length;
  const withMovement = rows.filter((r) => r.postedCheckIns > 0).length;
  const total = rows.reduce((s, r) => s + r.postedCheckIns, 0);

  return (
    <PageFrame exportFileSlug="attendance-summary" title="ملخص تقرير الحضور">
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

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">موظفون نشطون</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{activeEmployees}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">لديهم دخول مرحّل</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{withMovement}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">إجمالي بصمات الدخول المرحّلة</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{total}</p>
        </div>
      </div>
    </PageFrame>
  );
}
