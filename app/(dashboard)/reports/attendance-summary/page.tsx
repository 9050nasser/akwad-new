import { PageFrame } from "@/components/page-frame";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { monthRangeInputs } from "@/lib/default-range";
import { firstQuery } from "@/lib/flash";
import { getEmployeeCheckInSummary, parseRangeFromSearch } from "@/lib/reports";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant";

export default async function AttendanceSummaryReportPage({
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

  const activeEmployees = rows.length;
  const withMovement = rows.filter((r) => r.postedCheckIns > 0).length;
  const total = rows.reduce((s, r) => s + r.postedCheckIns, 0);

  return (
    <PageFrame
      exportFileSlug="attendance-summary"
      title="ملخص تقرير الحضور"
      subtitle="أرقام إجمالية سريعة عن الحركات المرحّلة ضمن الفترة — يمكن تقييدها بفرع أو بقسم."
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

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">موظفون نشطون</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{activeEmployees}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">لديهم دخول مرحّل</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{withMovement}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">إجمالي بصمات الدخول المرحّلة</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{total}</p>
        </div>
      </div>
    </PageFrame>
  );
}
