import { PageFrame } from "@/components/page-frame";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { monthRangeInputs } from "@/lib/default-range";
import { firstQuery } from "@/lib/flash";
import { getEmployeeCheckInSummary, parseRangeFromSearch } from "@/lib/reports";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant";

export default async function EmployeesSummaryReportPage({
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
  const departmentGroupId = firstQuery(sp.departmentGroupId) || undefined;
  const { from, to } = parseRangeFromSearch(fromStr, toStr);
  const [rows, branches, departments] = await Promise.all([
    getEmployeeCheckInSummary({ companyId, from, to, branchId, departmentGroupId }),
    prisma.branch.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
    prisma.employeeGroup.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
  ]);

  const totalCheckIns = rows.reduce((s, r) => s + r.postedCheckIns, 0);

  return (
    <PageFrame
      exportFileSlug="employees-summary"
      title="الإجمالي للموظفين"
      subtitle="ملخص سريع بعدد بصمات الدخول المرحّلة لكل موظف ضمن الفترة — اختيار قسم يحدّ النتائج لموظفي ذلك القسم فقط."
    >
      <form method="get" className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
        <div>
          <Label htmlFor="departmentGroupId">القسم</Label>
          <select
            id="departmentGroupId"
            name="departmentGroupId"
            className={fieldClass}
            defaultValue={departmentGroupId ?? ""}
          >
            <option value="">كل الأقسام</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <PrimaryButton type="submit">عرض</PrimaryButton>
        </div>
      </form>

      <p className="mt-4 text-sm text-slate-700">
        إجمالي بصمات الدخول المرحّلة: <span className="font-semibold">{totalCheckIns}</span>
      </p>

      <div className="mt-6 table-container rounded-xl border border-slate-200">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">الموظف</th>
              <th className="px-4 py-3">الفرع</th>
              <th className="px-4 py-3">القسم</th>
              <th className="px-4 py-3">دخول مرحّل</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((r) => (
              <tr key={r.employeeId} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 font-medium text-slate-900">{r.fullName}</td>
                <td className="px-4 py-3 text-slate-600">{r.branch}</td>
                <td className="px-4 py-3 text-slate-600">{r.department}</td>
                <td className="px-4 py-3 text-slate-600">{r.postedCheckIns}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageFrame>
  );
}
