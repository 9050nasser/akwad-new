import { PageFrame } from "@/components/page-frame";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { monthRangeInputs } from "@/lib/default-range";
import { firstQuery } from "@/lib/flash";
import { getDelaySummary, parseRangeFromSearch } from "@/lib/reports";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant";

export default async function DelaysReportPage({
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
  const data = await getDelaySummary({ companyId, from, to, branchId });
  const branches = await prisma.branch.findMany({ where: { companyId }, orderBy: { name: "asc" } });

  return (
    <PageFrame
      exportFileSlug="delays"
      title="تقرير التأخير"
      subtitle="دوام ثابت: كل شفت له سماح دخول (والصفر يعني سماح الجدول العام)؛ تُحسب شفتات التأخير ودقائقها لكل الشفتات. دوام مفتوح: نقص الساعات عن الهدف اليومي."
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

      <p className="mt-4 text-xs text-slate-500">
        شفتات متأخرة (عدد مرات): {data.delayEvents} — إجمالي دقائق التأخير:{" "}
        {data.rows.reduce((s, r) => s + r.delayMinutes, 0)}
      </p>

      <div className="mt-6 table-container rounded-xl border border-slate-200">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">الموظف</th>
              <th className="px-4 py-3">الفرع</th>
              <th className="px-4 py-3">شفتات متأخرة</th>
              <th className="px-4 py-3">دقائق تأخير</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {data.rows.map((r) => (
              <tr key={`${r.employeeId}-${r.name}`} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td>
                <td className="px-4 py-3 text-slate-600">{r.branch}</td>
                <td className="px-4 py-3 text-slate-600 tabular-nums">{r.delays}</td>
                <td className="px-4 py-3 text-slate-600 tabular-nums">{r.delayMinutes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageFrame>
  );
}
