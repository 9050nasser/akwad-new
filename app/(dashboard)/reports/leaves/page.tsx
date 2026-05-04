import { PageFrame } from "@/components/page-frame";
import { ReportColumnsToolbar } from "@/components/report-columns-toolbar";
import { ReportEmployeeFilterFields } from "@/components/report-employee-filter-fields";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { monthRangeInputs } from "@/lib/default-range";
import { firstQuery } from "@/lib/flash";
import { formatReportDateTime } from "@/lib/format";
import { LEAVES_COLUMN_GROUPS } from "@/lib/report-column-config";
import { getReportColumnState } from "@/lib/report-column-state";
import { buildEmployeeFiltersFromSearchParams, loadReportFilterDropdowns } from "@/lib/report-employee-filters";
import { employeeReportWhere, parseRangeFromSearch } from "@/lib/reports";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant";

export default async function LeavesReportPage({
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

  const [leaves, dropdowns, colState] = await Promise.all([
    prisma.leave.findMany({
      where: {
        AND: [{ startAt: { lte: to } }, { endAt: { gte: from } }],
        employee: employeeReportWhere(companyId, branchId, employeeFilters),
      },
      orderBy: { startAt: "desc" },
      include: { employee: { include: { branch: true } }, leaveType: true },
    }),
    loadReportFilterDropdowns(companyId),
    getReportColumnState("/reports/leaves", "leaves", sp),
  ]);
  const { visibleIds, returnUrl } = colState;
  const v = (id: string) => visibleIds.includes(id);

  return (
    <PageFrame exportFileSlug="leaves" title="تقرير الإجازات">
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
        <ReportColumnsToolbar slug="leaves" groups={LEAVES_COLUMN_GROUPS} visibleIds={visibleIds} redirectTo={returnUrl} />
      </div>

      <div className="mt-8 table-container rounded-xl border border-slate-200">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {v("name") ? <th className="px-4 py-3">الموظف</th> : null}
              {v("branch") ? <th className="px-4 py-3">الفرع</th> : null}
              {v("type") ? <th className="px-4 py-3">النوع</th> : null}
              {v("start") ? <th className="px-4 py-3">من</th> : null}
              {v("end") ? <th className="px-4 py-3">إلى</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {leaves.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50/80">
                {v("name") ? <td className="px-4 py-3 font-medium text-slate-900">{l.employee.fullName}</td> : null}
                {v("branch") ? <td className="px-4 py-3 text-slate-600">{l.employee.branch.name}</td> : null}
                {v("type") ? <td className="px-4 py-3 text-slate-600">{l.leaveType.name}</td> : null}
                {v("start") ? <td className="px-4 py-3 text-slate-600 tabular-nums">{formatReportDateTime(l.startAt)}</td> : null}
                {v("end") ? <td className="px-4 py-3 text-slate-600 tabular-nums">{formatReportDateTime(l.endAt)}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageFrame>
  );
}
