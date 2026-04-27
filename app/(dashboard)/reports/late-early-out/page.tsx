import { PageFrame } from "@/components/page-frame";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { monthRangeInputs } from "@/lib/default-range";
import { firstQuery } from "@/lib/flash";
import { getFixedScheduleShiftRollup, parseRangeFromSearch } from "@/lib/reports";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant";

export default async function LateEarlyOutReportPage({
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
  const roll = await getFixedScheduleShiftRollup({ companyId, from, to, branchId });
  const branches = await prisma.branch.findMany({ where: { companyId }, orderBy: { name: "asc" } });

  return (
    <PageFrame
      exportFileSlug="late-early-out"
      title="التقرير: التأخير والانصراف المبكر"
      subtitle="دوام ثابت: لكل شفت سماح دخول/خروج خاص؛ تُقارن أزواج الدخول/الخروج بالشفت بالترتيب (شفت ١ ثم ٢…)."
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

      <div className="mt-8 table-container rounded-xl border border-slate-200">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3">الموظف</th>
              <th className="px-3 py-3">الفرع</th>
              <th className="px-3 py-3">شفتات متأخرة</th>
              <th className="px-3 py-3">دقائق تأخير</th>
              <th className="px-3 py-3">شفتات تبكير دخول</th>
              <th className="px-3 py-3">دقائق تبكير</th>
              <th className="px-3 py-3">شفتات خروج مبكر</th>
              <th className="px-3 py-3">دقائق خروج مبكر</th>
              <th className="px-3 py-3">إجمالي دقائق عمل (شفتات)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {roll.rows.map((r) => (
              <tr key={r.employeeId} className="hover:bg-slate-50/80">
                <td className="px-3 py-3 font-medium text-slate-900">{r.name}</td>
                <td className="px-3 py-3 text-slate-600">{r.branch}</td>
                <td className="px-3 py-3 text-slate-600 tabular-nums">{r.lateShifts}</td>
                <td className="px-3 py-3 text-slate-600 tabular-nums">{r.lateMinutes}</td>
                <td className="px-3 py-3 text-slate-600 tabular-nums">{r.earlyArrivalShifts}</td>
                <td className="px-3 py-3 text-slate-600 tabular-nums">{r.earlyArrivalMinutes}</td>
                <td className="px-3 py-3 text-slate-600 tabular-nums">{r.earlyLeaveShifts}</td>
                <td className="px-3 py-3 text-slate-600 tabular-nums">{r.earlyLeaveMinutes}</td>
                <td className="px-3 py-3 text-slate-600 tabular-nums">{r.workedMinutes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageFrame>
  );
}
