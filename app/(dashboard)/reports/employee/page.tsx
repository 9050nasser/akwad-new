import { PageFrame } from "@/components/page-frame";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { monthRangeInputs } from "@/lib/default-range";
import { firstQuery } from "@/lib/flash";
import { formatDateTime } from "@/lib/format";
import { getEmployeeReport, parseRangeFromSearch } from "@/lib/reports";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant";

export default async function SingleEmployeeReportPage({
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
  const employeeId = firstQuery(sp.employeeId) ?? "";
  const { from, to } = parseRangeFromSearch(fromStr, toStr);

  const employees = await prisma.employee.findMany({
    where: { active: true, branch: { companyId } },
    orderBy: { fullName: "asc" },
    include: { branch: true },
  });

  const resolvedEmployeeId =
    employeeId || (employees.length > 0 ? employees[0].id : "");

  const data = resolvedEmployeeId
    ? await getEmployeeReport({ companyId, employeeId: resolvedEmployeeId, from, to })
    : null;

  return (
    <PageFrame
      exportFileSlug="employee"
      title="تقرير موظف"
      subtitle="حركات وإجازات وأذونات لموظف واحد خلال فترة محددة."
    >
      <form method="get" className="grid gap-4 md:grid-cols-4">
        <div className="md:col-span-2">
          <Label htmlFor="employeeId">الموظف</Label>
          <select id="employeeId" name="employeeId" className={fieldClass} defaultValue={resolvedEmployeeId}>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.fullName} — {e.branch.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="from">من</Label>
          <input id="from" name="from" type="date" className={fieldClass} defaultValue={fromStr} />
        </div>
        <div>
          <Label htmlFor="to">إلى</Label>
          <input id="to" name="to" type="date" className={fieldClass} defaultValue={toStr} />
        </div>
        <div className="md:col-span-4">
          <PrimaryButton type="submit">عرض</PrimaryButton>
        </div>
      </form>

      {employees.length === 0 ? (
        <p className="mt-6 text-sm text-rose-700">لا يوجد موظفون نشطون لعرض التقرير.</p>
      ) : !data ? (
        <p className="mt-6 text-sm text-slate-600">تعذر تحميل بيانات الموظف.</p>
      ) : (
        <div className="mt-8 space-y-8">
          <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 text-sm text-slate-800">
            <p className="font-semibold">{data.employee.fullName}</p>
            <p className="text-xs text-slate-600">
              الفرع: {data.employee.branch.name} — الوظيفة: {data.employee.jobTitle?.name ?? "—"}
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-slate-900">الحركات</h2>
            <div className="table-container rounded-xl border border-slate-200">
              <table className="min-w-full text-right text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">الوقت</th>
                    <th className="px-3 py-2">النوع</th>
                    <th className="px-3 py-2">مرحّل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {data.events.map((e) => (
                    <tr key={e.id}>
                      <td className="px-3 py-2">{formatDateTime(e.at)}</td>
                      <td className="px-3 py-2">{e.kind === "CHECK_IN" ? "دخول" : "خروج"}</td>
                      <td className="px-3 py-2">{e.isPosted ? "نعم" : "لا"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-slate-900">الإجازات</h2>
            <div className="table-container rounded-xl border border-slate-200">
              <table className="min-w-full text-right text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">النوع</th>
                    <th className="px-3 py-2">من</th>
                    <th className="px-3 py-2">إلى</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {data.leaves.map((l) => (
                    <tr key={l.id}>
                      <td className="px-3 py-2">{l.leaveType.name}</td>
                      <td className="px-3 py-2">{formatDateTime(l.startAt)}</td>
                      <td className="px-3 py-2">{formatDateTime(l.endAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-slate-900">الأذونات</h2>
            <div className="table-container rounded-xl border border-slate-200">
              <table className="min-w-full text-right text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">اليوم</th>
                    <th className="px-3 py-2">من</th>
                    <th className="px-3 py-2">إلى</th>
                    <th className="px-3 py-2">السبب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {data.perms.map((p) => (
                    <tr key={p.id}>
                      <td className="px-3 py-2">{formatDateTime(p.date)}</td>
                      <td className="px-3 py-2">{p.startTime}</td>
                      <td className="px-3 py-2">{p.endTime}</td>
                      <td className="px-3 py-2">{p.reason ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </PageFrame>
  );
}
