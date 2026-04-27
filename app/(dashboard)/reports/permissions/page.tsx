import { PageFrame } from "@/components/page-frame";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { monthRangeInputs } from "@/lib/default-range";
import { firstQuery } from "@/lib/flash";
import { formatDateTime } from "@/lib/format";
import { parseRangeFromSearch } from "@/lib/reports";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant";

export default async function PermissionsReportPage({
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

  const perms = await prisma.permissionSlot.findMany({
    where: {
      date: { gte: from, lte: to },
      employee: { branch: { companyId, ...(branchId ? { id: branchId } : {}) } },
    },
    orderBy: { date: "desc" },
    include: { employee: { include: { branch: true } } },
  });

  const branches = await prisma.branch.findMany({ where: { companyId }, orderBy: { name: "asc" } });

  return (
    <PageFrame exportFileSlug="permissions" title="تقرير الأذونات" subtitle="أذون الخروج والعودة ضمن الفترة.">
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
              <th className="px-4 py-3">اليوم</th>
              <th className="px-4 py-3">من</th>
              <th className="px-4 py-3">إلى</th>
              <th className="px-4 py-3">السبب</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {perms.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 font-medium text-slate-900">{p.employee.fullName}</td>
                <td className="px-4 py-3 text-slate-600">{p.employee.branch.name}</td>
                <td className="px-4 py-3 text-slate-600">{formatDateTime(p.date)}</td>
                <td className="px-4 py-3 text-slate-600">{p.startTime}</td>
                <td className="px-4 py-3 text-slate-600">{p.endTime}</td>
                <td className="px-4 py-3 text-slate-600">{p.reason ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageFrame>
  );
}
