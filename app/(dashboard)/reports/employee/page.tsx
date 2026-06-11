import { PageFrame } from "@/components/page-frame";
import { ReportColumnsToolbar } from "@/components/report-columns-toolbar";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { monthRangeInputs } from "@/lib/default-range";
import { parseDateOnly } from "@/lib/day-range";
import { firstQuery } from "@/lib/flash";
import { formatReportDateOnly, formatReportDateTime, formatReportTimeOnly } from "@/lib/format";
import {
  EMPLOYEE_LEAVES_COLUMN_GROUPS,
  EMPLOYEE_MOVEMENTS_COLUMN_GROUPS,
  EMPLOYEE_PERMISSIONS_COLUMN_GROUPS,
} from "@/lib/report-column-config";
import { getReportColumnState } from "@/lib/report-column-state";
import { getEmployeeReport, parseRangeFromSearch, type EmployeeDayStatusKind } from "@/lib/reports";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant";

/** خلفية خفيفة لصف اليوم حسب الحالة. */
function dayRowClass(kind: EmployeeDayStatusKind): string {
  switch (kind) {
    case "absent":
      return "bg-rose-50/40";
    case "leave":
      return "bg-amber-50/40";
    case "holiday":
      return "bg-sky-50/40";
    case "rest":
      return "bg-slate-50/60";
    default:
      return "";
  }
}

/** لون نص خلية الحالة. */
function dayStatusClass(kind: EmployeeDayStatusKind): string {
  switch (kind) {
    case "present":
      return "text-emerald-700";
    case "absent":
      return "text-rose-700";
    case "leave":
      return "text-amber-700";
    case "holiday":
      return "text-sky-700";
    case "rest":
      return "text-slate-500";
    default:
      return "text-slate-500";
  }
}

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

  const [employees, colMovements, colLeaves, colPerms] = await Promise.all([
    prisma.employee.findMany({
      where: { active: true, branch: { companyId } },
      orderBy: { fullName: "asc" },
      include: { branch: true },
    }),
    getReportColumnState("/reports/employee", "employee-movements", sp),
    getReportColumnState("/reports/employee", "employee-leaves", sp),
    getReportColumnState("/reports/employee", "employee-permissions", sp),
  ]);

  const resolvedEmployeeId =
    employeeId || (employees.length > 0 ? employees[0].id : "");

  const data = resolvedEmployeeId
    ? await getEmployeeReport({ companyId, employeeId: resolvedEmployeeId, from, to })
    : null;

  const vm = (id: string) => colMovements.visibleIds.includes(id);
  const vl = (id: string) => colLeaves.visibleIds.includes(id);
  const vp = (id: string) => colPerms.visibleIds.includes(id);
  const emptyM = Math.max(1, colMovements.visibleIds.length);
  const emptyL = Math.max(1, colLeaves.visibleIds.length);
  const emptyP = Math.max(1, colPerms.visibleIds.length);

  return (
    <PageFrame exportFileSlug="employee" title="تقرير موظف">
      <form method="get" className="grid gap-4 md:grid-cols-4 print:hidden">
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
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">الحركات (ملخص يومي)</h2>
              <div className="print:hidden">
                <ReportColumnsToolbar
                  slug="employee-movements"
                  groups={EMPLOYEE_MOVEMENTS_COLUMN_GROUPS}
                  visibleIds={colMovements.visibleIds}
                  redirectTo={colMovements.returnUrl}
                />
              </div>
            </div>
            <div className="mb-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
                حضور: {data.daySummary.presentDays}
              </span>
              <span className="rounded-full bg-rose-50 px-3 py-1 font-medium text-rose-700">
                غياب: {data.daySummary.absentDays}
              </span>
              <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700">
                إجازة: {data.daySummary.leaveDays}
              </span>
              <span className="rounded-full bg-sky-50 px-3 py-1 font-medium text-sky-700">
                عطلة رسمية: {data.daySummary.holidayDays}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                راحة أسبوعية: {data.daySummary.restDays}
              </span>
            </div>
            <div className="table-container rounded-xl border border-slate-200">
              <table className="min-w-full text-right text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    {vm("date") ? <th className="px-3 py-2">التاريخ</th> : null}
                    {vm("weekday") ? <th className="px-3 py-2">اليوم</th> : null}
                    {vm("firstIn") ? <th className="px-3 py-2">أول دخول</th> : null}
                    {vm("lastOut") ? <th className="px-3 py-2">آخر خروج</th> : null}
                    {vm("status") ? <th className="px-3 py-2">الحالة</th> : null}
                    {vm("posted") ? <th className="px-3 py-2">مرحّل</th> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {data.dayRows.length === 0 ? (
                    <tr>
                      <td colSpan={emptyM} className="px-3 py-6 text-center text-slate-500">
                        لا أيام في الفترة.
                      </td>
                    </tr>
                  ) : (
                    data.dayRows.map((d) => (
                      <tr key={d.dateKey} className={dayRowClass(d.statusKind)}>
                        {vm("date") ? (
                          <td className="px-3 py-2 tabular-nums text-slate-800">
                            {formatReportDateOnly(parseDateOnly(d.dateKey))}
                          </td>
                        ) : null}
                        {vm("weekday") ? (
                          <td className="px-3 py-2 text-slate-700">{d.weekdayLabel}</td>
                        ) : null}
                        {vm("firstIn") ? (
                          <td className="px-3 py-2 tabular-nums text-slate-800">
                            {d.firstIn ? formatReportTimeOnly(d.firstIn) : "—"}
                          </td>
                        ) : null}
                        {vm("lastOut") ? (
                          <td className="px-3 py-2 tabular-nums text-slate-800">
                            {d.lastOut ? formatReportTimeOnly(d.lastOut) : "—"}
                          </td>
                        ) : null}
                        {vm("status") ? (
                          <td className={`px-3 py-2 font-medium ${dayStatusClass(d.statusKind)}`}>
                            {d.statusLabel}
                          </td>
                        ) : null}
                        {vm("posted") ? (
                          <td className="px-3 py-2">
                            {d.statusKind === "present" ? (d.allPosted ? "نعم" : "لا") : "—"}
                          </td>
                        ) : null}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">الإجازات</h2>
              <div className="print:hidden">
                <ReportColumnsToolbar
                  slug="employee-leaves"
                  groups={EMPLOYEE_LEAVES_COLUMN_GROUPS}
                  visibleIds={colLeaves.visibleIds}
                  redirectTo={colLeaves.returnUrl}
                />
              </div>
            </div>
            <div className="table-container rounded-xl border border-slate-200">
              <table className="min-w-full text-right text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    {vl("type") ? <th className="px-3 py-2">النوع</th> : null}
                    {vl("start") ? <th className="px-3 py-2">من</th> : null}
                    {vl("end") ? <th className="px-3 py-2">إلى</th> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {data.leaves.length === 0 ? (
                    <tr>
                      <td colSpan={emptyL} className="px-3 py-6 text-center text-slate-500">
                        لا إجازات في الفترة.
                      </td>
                    </tr>
                  ) : (
                    data.leaves.map((l) => (
                      <tr key={l.id}>
                        {vl("type") ? <td className="px-3 py-2">{l.leaveType.name}</td> : null}
                        {vl("start") ? <td className="px-3 py-2 tabular-nums">{formatReportDateTime(l.startAt)}</td> : null}
                        {vl("end") ? <td className="px-3 py-2 tabular-nums">{formatReportDateTime(l.endAt)}</td> : null}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">الأذونات</h2>
              <div className="print:hidden">
                <ReportColumnsToolbar
                  slug="employee-permissions"
                  groups={EMPLOYEE_PERMISSIONS_COLUMN_GROUPS}
                  visibleIds={colPerms.visibleIds}
                  redirectTo={colPerms.returnUrl}
                />
              </div>
            </div>
            <div className="table-container rounded-xl border border-slate-200">
              <table className="min-w-full text-right text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    {vp("day") ? <th className="px-3 py-2">اليوم</th> : null}
                    {vp("start") ? <th className="px-3 py-2">من</th> : null}
                    {vp("end") ? <th className="px-3 py-2">إلى</th> : null}
                    {vp("reason") ? <th className="px-3 py-2">السبب</th> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {data.perms.length === 0 ? (
                    <tr>
                      <td colSpan={emptyP} className="px-3 py-6 text-center text-slate-500">
                        لا أذونات في الفترة.
                      </td>
                    </tr>
                  ) : (
                    data.perms.map((p) => (
                      <tr key={p.id}>
                        {vp("day") ? <td className="px-3 py-2 tabular-nums">{formatReportDateTime(p.date)}</td> : null}
                        {vp("start") ? <td className="px-3 py-2 tabular-nums">{p.startTime}</td> : null}
                        {vp("end") ? <td className="px-3 py-2 tabular-nums">{p.endTime}</td> : null}
                        {vp("reason") ? <td className="px-3 py-2">{p.reason ?? "—"}</td> : null}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </PageFrame>
  );
}
