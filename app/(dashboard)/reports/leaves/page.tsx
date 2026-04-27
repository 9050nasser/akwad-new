import { PageFrame } from "@/components/page-frame";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { monthRangeInputs } from "@/lib/default-range";
import { firstQuery } from "@/lib/flash";
import { formatDateTime } from "@/lib/format";
import { parseRangeFromSearch } from "@/lib/reports";
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
  const { from, to } = parseRangeFromSearch(fromStr, toStr);

  const leaves = await prisma.leave.findMany({
    where: {
      AND: [{ startAt: { lte: to } }, { endAt: { gte: from } }],
      employee: { branch: { companyId, ...(branchId ? { id: branchId } : {}) } },
    },
    orderBy: { startAt: "desc" },
    include: { employee: { include: { branch: true } }, leaveType: true },
  });

  const branches = await prisma.branch.findMany({ where: { companyId }, orderBy: { name: "asc" } });

  return (
    <PageFrame exportFileSlug="leaves" title="تقرير الإجازات" subtitle="الإجازات المسجلة التي تتقاطع مع الفترة المحددة.">
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
              <th className="px-4 py-3">الموظف</th>
              <th className="px-4 py-3">الفرع</th>
              <th className="px-4 py-3">النوع</th>
              <th className="px-4 py-3">من</th>
              <th className="px-4 py-3">إلى</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {leaves.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 font-medium text-slate-900">{l.employee.fullName}</td>
                <td className="px-4 py-3 text-slate-600">{l.employee.branch.name}</td>
                <td className="px-4 py-3 text-slate-600">{l.leaveType.name}</td>
                <td className="px-4 py-3 text-slate-600">{formatDateTime(l.startAt)}</td>
                <td className="px-4 py-3 text-slate-600">{formatDateTime(l.endAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageFrame>
  );
}
