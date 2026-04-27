import { PageFrame } from "@/components/page-frame";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { monthRangeInputs } from "@/lib/default-range";
import { firstQuery } from "@/lib/flash";
import { getEmployeeCheckInSummary, parseRangeFromSearch } from "@/lib/reports";
import { requireTenantSession } from "@/lib/tenant";

export default async function AttendanceAllBranchesReportPage({
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
  const { from, to } = parseRangeFromSearch(fromStr, toStr);
  const rows = await getEmployeeCheckInSummary({ companyId, from, to });

  const byBranch = new Map<string, number>();
  for (const r of rows) {
    byBranch.set(r.branch, (byBranch.get(r.branch) ?? 0) + r.postedCheckIns);
  }

  const agg = Array.from(byBranch.entries())
    .map(([branch, postedCheckIns]) => ({ branch, postedCheckIns }))
    .sort((a, b) => b.postedCheckIns - a.postedCheckIns);

  return (
    <PageFrame
      exportFileSlug="attendance-all-branches"
      title="تقرير الحضور الكلي لكل الفروع"
      subtitle="تجميع بصمات الدخول المرحّلة حسب الفرع."
    >
      <form method="get" className="grid gap-4 md:grid-cols-3">
        <div>
          <Label htmlFor="from">من</Label>
          <input id="from" name="from" type="date" className={fieldClass} defaultValue={fromStr} />
        </div>
        <div>
          <Label htmlFor="to">إلى</Label>
          <input id="to" name="to" type="date" className={fieldClass} defaultValue={toStr} />
        </div>
        <div className="flex items-end">
          <PrimaryButton type="submit">عرض</PrimaryButton>
        </div>
      </form>

      <div className="mt-8 table-container rounded-xl border border-slate-200">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">الفرع</th>
              <th className="px-4 py-3">دخول مرحّل</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {agg.map((r) => (
              <tr key={r.branch} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 font-medium text-slate-900">{r.branch}</td>
                <td className="px-4 py-3 text-slate-600">{r.postedCheckIns}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageFrame>
  );
}
