import { PageFrame } from "@/components/page-frame";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { monthRangeInputs } from "@/lib/default-range";
import { firstQuery } from "@/lib/flash";
import { getAbsenceSummary, parseRangeFromSearch } from "@/lib/reports";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant";

export default async function TotalAbsenceReportPage({
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
  const { from, to } = parseRangeFromSearch(fromStr, toStr);
  const { rows, days } = await getAbsenceSummary({ companyId, from, to, branchId });
  const branches = await prisma.branch.findMany({ where: { companyId }, orderBy: { name: "asc" } });

  const totalAbsentDays = rows.reduce((s, r) => s + r.absentDays, 0);

  return (
    <PageFrame
      exportFileSlug="total-absence"
      title="تقرير إجمالي الغياب"
      subtitle="مجموع أيام «بلا دخول مرحّل» لكل موظف خلال الفترة، مع إجمالي عام."
    >
      <form method="get" className="grid gap-4 md:grid-cols-4">
        <div>
          <Label htmlFor="from">من</Label>
          <input id="from" name="from" type="date" className={fieldClass} defaultValue={fromStr} />
        </div>
        <div>
          <Label htmlFor="to">إلى</Label>
          <input id="to" name="to" type="date" className={fieldClass} defaultValue={toStr} />
        </div>
        <div>
          <Label htmlFor="branchId">الفرع</Label>
          <select id="branchId" name="branchId" className={fieldClass} defaultValue={branchId ?? ""}>
            <option value="">كل الفروع</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <PrimaryButton type="submit">عرض</PrimaryButton>
        </div>
      </form>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">أيام الفترة لكل موظف</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{days}</p>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4 shadow-sm">
          <p className="text-xs text-rose-800/80">إجمالي أيام الغياب (جميع الموظفين)</p>
          <p className="mt-1 text-2xl font-semibold text-rose-900">{totalAbsentDays}</p>
        </div>
      </div>

      <div className="mt-8 table-container rounded-xl border border-slate-200">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">الموظف</th>
              <th className="px-4 py-3">الفرع</th>
              <th className="px-4 py-3">أيام بلا دخول مرحّل</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((r) => (
              <tr key={r.employeeId} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 font-medium text-slate-900">{r.fullName}</td>
                <td className="px-4 py-3 text-slate-600">{r.branch}</td>
                <td className="px-4 py-3 text-slate-600">{r.absentDays}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageFrame>
  );
}
