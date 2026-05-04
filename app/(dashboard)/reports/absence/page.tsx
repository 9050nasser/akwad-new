import { PageFrame } from "@/components/page-frame";
import { ReportColumnsToolbar } from "@/components/report-columns-toolbar";
import { ReportEmployeeFilterFields } from "@/components/report-employee-filter-fields";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { monthRangeInputs } from "@/lib/default-range";
import { firstQuery } from "@/lib/flash";
import { ABSENCE_DETAIL_COLUMN_GROUPS } from "@/lib/report-column-config";
import { getReportColumnState } from "@/lib/report-column-state";
import { buildEmployeeFiltersFromSearchParams, loadReportFilterDropdowns } from "@/lib/report-employee-filters";
import { getAbsenceDailyDetail, parseRangeFromSearch } from "@/lib/reports";
import { localDayKey } from "@/lib/shift-metrics";
import { requireTenantSession } from "@/lib/tenant";

export default async function AbsenceReportPage({
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
  const [{ dailyRows, periodDayCount }, dropdowns, colState] = await Promise.all([
    getAbsenceDailyDetail({ companyId, from, to, branchId, employeeFilters }),
    loadReportFilterDropdowns(companyId),
    getReportColumnState("/reports/absence", "absence", sp),
  ]);
  const { visibleIds, returnUrl } = colState;
  const v = (id: string) => visibleIds.includes(id);

  return (
    <PageFrame exportFileSlug="absence" title="الغياب التفصيلي للموظفين">
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

      <p className="mt-4 text-xs text-slate-500">عدد أيام الفترة: {periodDayCount}</p>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2 print:hidden">
        <ReportColumnsToolbar
          slug="absence"
          groups={ABSENCE_DETAIL_COLUMN_GROUPS}
          visibleIds={visibleIds}
          redirectTo={returnUrl}
        />
      </div>

      <div className="mt-6 space-y-8 print:space-y-6">
        {dailyRows.map((r) => (
          <section
            key={localDayKey(r.date)}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:break-inside-avoid print:rounded-none print:border-0 print:shadow-none"
          >
            <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-5 text-center print:border-slate-200 print:bg-transparent print:py-4">
              {v("date") ? (
                <div className="text-lg font-bold tabular-nums tracking-tight text-slate-900 print:text-xl">{r.dateLabel}</div>
              ) : null}
              {v("weekday") ? (
                <div className={`text-sm font-semibold text-slate-600 print:text-base ${v("date") ? "mt-1.5" : ""}`}>
                  {r.weekdayLabel}
                </div>
              ) : null}
              {!v("weekday") && !v("date") ? (
                <div className="text-sm font-semibold text-slate-800 tabular-nums">{r.dateLabel}</div>
              ) : null}
              {v("absentPanel") ? (
                <p className="mt-2 text-xs font-medium text-slate-500 print:text-sm">عدد الغائبين: {r.absentees.length}</p>
              ) : null}
            </div>

            {v("absentPanel") ? (
              <div className="overflow-x-auto px-2 pb-4 pt-3 sm:px-4 sm:pb-5 sm:pt-4 print:px-0 print:pb-3 print:pt-3">
                {r.absentees.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-500">لا يوجد غائبون في هذا اليوم.</p>
                ) : (
                  <table className="w-full min-w-[520px] border-collapse text-right text-sm print:min-w-0 print:w-full print:text-[13px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600 print:bg-transparent">
                        <th className="w-12 px-3 py-2.5 text-center">م</th>
                        <th className="px-3 py-2.5">كود الموظف</th>
                        <th className="px-3 py-2.5">اسم الموظف</th>
                        <th className="px-3 py-2.5">الوظيفة</th>
                        <th className="px-3 py-2.5">الدوام</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {r.absentees.map((a, idx) => (
                        <tr key={a.employeeId} className="hover:bg-slate-50/60 print:hover:bg-transparent">
                          <td className="px-3 py-2.5 text-center tabular-nums text-slate-600">{idx + 1}</td>
                          <td className="px-3 py-2.5 font-mono text-xs text-slate-900">{a.employeeCode}</td>
                          <td className="px-3 py-2.5 font-medium text-slate-900">{a.fullName}</td>
                          <td className="px-3 py-2.5 text-slate-700">{a.jobTitleName}</td>
                          <td className="px-3 py-2.5 text-slate-700">{a.scheduleName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ) : null}
          </section>
        ))}
      </div>
    </PageFrame>
  );
}
