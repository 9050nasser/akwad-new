import { PageFrame } from "@/components/page-frame";
import { firstQuery } from "@/lib/flash";
import { formatDateTime } from "@/lib/format";
import { getMovements, parseRangeFromSearch } from "@/lib/reports";
import { monthRangeInputs } from "@/lib/default-range";
import { prisma } from "@/lib/prisma";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { requireTenantSession } from "@/lib/tenant";

export default async function MovementsPage({
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
  const posted = (firstQuery(sp.posted) as "all" | "yes" | "no" | undefined) ?? "all";

  const { from, to } = parseRangeFromSearch(fromStr, toStr);
  const rows = await getMovements({ companyId, from, to, branchId, posted });
  const branches = await prisma.branch.findMany({ where: { companyId }, orderBy: { name: "asc" } });

  return (
    <PageFrame title="عرض الحركات" subtitle="استعراض وتصفية حركات الحضور والانصراف قبل وبعد الترحيل.">
      <form method="get" className="grid gap-4 md:grid-cols-5">
        <div>
          <Label htmlFor="from">من تاريخ</Label>
          <input id="from" name="from" type="date" className={fieldClass} defaultValue={fromStr} />
        </div>
        <div>
          <Label htmlFor="to">إلى تاريخ</Label>
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
        <div>
          <Label htmlFor="posted">حالة الترحيل</Label>
          <select id="posted" name="posted" className={fieldClass} defaultValue={posted}>
            <option value="all">الكل</option>
            <option value="yes">مرحّل</option>
            <option value="no">غير مرحّل</option>
          </select>
        </div>
        <div className="flex items-end">
          <PrimaryButton type="submit">تطبيق</PrimaryButton>
        </div>
      </form>

      <div className="mt-8 rounded-xl border border-slate-200 table-container">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3">الوقت</th>
              <th className="px-3 py-3">الموظف</th>
              <th className="px-3 py-3">الفرع</th>
              <th className="px-3 py-3">النوع</th>
              <th className="px-3 py-3 hidden md:table-cell">المصدر</th>
              <th className="px-3 py-3 hidden md:table-cell">الجهاز</th>
              <th className="px-3 py-3">مرحّل</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/80">
                <td className="px-3 py-2 text-slate-800">{formatDateTime(r.at)}</td>
                <td className="px-3 py-2 text-slate-800">{r.employee?.fullName ?? "—"}</td>
                <td className="px-3 py-2 text-slate-600">{r.branch.name}</td>
                <td className="px-3 py-2 text-slate-600">{r.kind === "CHECK_IN" ? "دخول" : "خروج"}</td>
                <td className="px-3 py-2 text-slate-600 hidden md:table-cell">{r.source === "MANUAL" ? "يدوي" : "جهاز"}</td>
                <td className="px-3 py-2 text-slate-600 hidden md:table-cell">{r.device?.name ?? "—"}</td>
                <td className="px-3 py-2 text-slate-600">{r.isPosted ? "نعم" : "لا"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageFrame>
  );
}
