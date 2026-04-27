import { PageFrame } from "@/components/page-frame";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { monthRangeInputs } from "@/lib/default-range";
import { firstQuery } from "@/lib/flash";
import { formatDateTime } from "@/lib/format";
import { getMovements, getOpenScheduleBalanceSummary, parseRangeFromSearch } from "@/lib/reports";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant";

export default async function OvertimeReportPage({
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

  const rows = await getMovements({ companyId, from, to, branchId, posted: "yes" });
  const outs = rows.filter((r) => r.kind === "CHECK_OUT" && r.employeeId);
  const openBalance = await getOpenScheduleBalanceSummary({ companyId, from, to, branchId });

  const branches = await prisma.branch.findMany({ where: { companyId }, orderBy: { name: "asc" } });

  return (
    <PageFrame
      exportFileSlug="overtime"
      title="تقرير الإضافي"
      subtitle="بصمات خروج مرحّلة، وملخص إضافي/نقص ساعات للموظفين على «دوام مفتوح» مع هدف يومي محدد في الجدول."
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

      {openBalance.rows.length > 0 ? (
        <div className="mt-8">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">دوام مفتوح — نقص وإضافي (دقائق)</h2>
          <p className="mb-3 text-xs text-slate-500">
            يُحسب من أول بصمة إلى آخر بصمة في اليوم مقابل الهدف اليومي، مع احترام خيارات السماح وخصم التأخير من
            الإضافي إن وُجدت في جدول الدوام.
          </p>
          <div className="table-container rounded-xl border border-slate-200">
            <table className="min-w-full text-right text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">الموظف</th>
                  <th className="px-4 py-3">الفرع</th>
                  <th className="px-4 py-3">دقائق نقص</th>
                  <th className="px-4 py-3">دقائق إضافي صافي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {openBalance.rows.map((r) => (
                  <tr key={r.employeeId} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-slate-900">{r.fullName}</td>
                    <td className="px-4 py-3 text-slate-600">{r.branch}</td>
                    <td className="px-4 py-3 text-slate-600 tabular-nums">{r.shortageMinutes}</td>
                    <td className="px-4 py-3 text-slate-600 tabular-nums">{r.netOvertimeMinutes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="mt-8 table-container rounded-xl border border-slate-200">
        <h2 className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-900">
          بصمات خروج مرحّلة
        </h2>
        <table className="min-w-full text-right text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">الوقت</th>
              <th className="px-4 py-3">الموظف</th>
              <th className="px-4 py-3">الفرع</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {outs.slice(0, 300).map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 text-slate-800">{formatDateTime(r.at)}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{r.employee?.fullName ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{r.branch.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageFrame>
  );
}
