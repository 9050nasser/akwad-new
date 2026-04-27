import { PageFrame } from "@/components/page-frame";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { firstQuery } from "@/lib/flash";
import { parseDateOnly } from "@/lib/day-range";
import { getDailyStatus } from "@/lib/reports";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant";

export default async function DailyStatusReportPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireTenantSession();
  const companyId = session.companyId;
  const sp = (await searchParams) ?? {};
  const dateStr = firstQuery(sp.date) ?? new Date().toISOString().slice(0, 10);
  const branchId = firstQuery(sp.branchId) || undefined;
  const date = parseDateOnly(dateStr);
  const { rows } = await getDailyStatus({ companyId, date, branchId });
  const branches = await prisma.branch.findMany({ where: { companyId }, orderBy: { name: "asc" } });

  return (
    <PageFrame
      exportFileSlug="daily-status"
      title="تقرير حالة اليوم"
      subtitle="حضور اليوم للموظفين النشطين وفق الحركات المرحّلة فقط."
    >
      <form method="get" className="grid gap-4 md:grid-cols-4">
        <div>
          <Label htmlFor="date">اليوم</Label>
          <input id="date" name="date" type="date" className={fieldClass} defaultValue={dateStr} />
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
              <th className="px-4 py-3">دخول مرحّل</th>
              <th className="px-4 py-3">خروج مرحّل</th>
              <th className="px-4 py-3">أول حركة</th>
              <th className="px-4 py-3">آخر حركة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((r) => (
              <tr key={r.employeeId} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 font-medium text-slate-900">{r.fullName}</td>
                <td className="px-4 py-3 text-slate-600">{r.branch}</td>
                <td className="px-4 py-3 text-slate-600">{r.hasPostedIn ? "نعم" : "لا"}</td>
                <td className="px-4 py-3 text-slate-600">{r.hasPostedOut ? "نعم" : "لا"}</td>
                <td className="px-4 py-3 text-slate-600">{r.firstAt ? formatDateTime(r.firstAt) : "—"}</td>
                <td className="px-4 py-3 text-slate-600">{r.lastAt ? formatDateTime(r.lastAt) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageFrame>
  );
}
