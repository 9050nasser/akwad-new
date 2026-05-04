import { PageFrame } from "@/components/page-frame";
import { ReportColumnsToolbar } from "@/components/report-columns-toolbar";
import { ReportEmployeeFilterFields } from "@/components/report-employee-filter-fields";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { monthRangeInputs } from "@/lib/default-range";
import { firstQuery } from "@/lib/flash";
import { INCOMPLETE_COLUMN_GROUPS } from "@/lib/report-column-config";
import { getReportColumnState } from "@/lib/report-column-state";
import { buildEmployeeFiltersFromSearchParams, loadReportFilterDropdowns } from "@/lib/report-employee-filters";
import { getIncompleteRows, parseRangeFromSearch } from "@/lib/reports";
import { requireTenantSession } from "@/lib/tenant";

export default async function IncompleteMovementsReportPage({
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
    getIncompleteRows({ companyId, from, to, branchId, employeeFilters }),
    loadReportFilterDropdowns(companyId),
    getReportColumnState("/reports/incomplete", "incomplete", sp),
  ]);
  const { visibleIds, returnUrl } = colState;
  const v = (id: string) => visibleIds.includes(id);

  return (
    <PageFrame exportFileSlug="incomplete-movements" title="الحركات غير المكتملة">
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
          slug="incomplete"
          groups={INCOMPLETE_COLUMN_GROUPS}
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
              {v("day") ? <th className="px-4 py-3">التاريخ</th> : null}
              {v("issue") ? <th className="px-4 py-3">نوع النقص</th> : null}
              {v("checkIn") ? <th className="px-4 py-3">عدد الدخول</th> : null}
              {v("checkOut") ? <th className="px-4 py-3">عدد الخروج</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((r) => (
              <tr key={`${r.employee}-${r.branch}-${r.day}`} className="hover:bg-slate-50/80">
                {v("name") ? <td className="px-4 py-3 font-medium text-slate-900">{r.employee}</td> : null}
                {v("branch") ? <td className="px-4 py-3 text-slate-600">{r.branch}</td> : null}
                {v("day") ? <td className="px-4 py-3 text-slate-600">{r.day}</td> : null}
                {v("issue") ? (
                  <td className="px-4 py-3 font-medium text-slate-800">{r.issueAr}</td>
                ) : null}
                {v("checkIn") ? <td className="px-4 py-3 text-slate-600">{r.ins}</td> : null}
                {v("checkOut") ? <td className="px-4 py-3 text-slate-600">{r.outs}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageFrame>
  );
}
