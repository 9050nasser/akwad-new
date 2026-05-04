import { formatDurationMinutes } from "@/lib/format";
import type { EmployeesAttendanceSummaryRow } from "@/lib/reports";

type Props = {
  rows: EmployeesAttendanceSummaryRow[];
  visibleGroupIds: string[];
  totals: {
    scheduleMinutesTotal: number;
    lateMinutesTotal: number;
    absenceDays: number;
    leaveDays: number;
    overtimeMinutesTotal: number;
    actualWorkMinutesTotal: number;
  };
};

export function EmployeesSummaryTable({ rows, visibleGroupIds, totals }: Props) {
  const visible = new Set(visibleGroupIds);
  const v = (id: string) => visible.has(id);

  const leadIds = ["code", "name", "schedule"] as const;
  const leadCount = leadIds.filter((id) => v(id)).length;

  return (
    <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-0 w-full max-w-full text-right text-sm print:table-fixed">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {v("code") ? <th className="px-3 py-3 whitespace-nowrap">كود الموظف</th> : null}
            {v("name") ? <th className="px-3 py-3 whitespace-nowrap">اسم الموظف</th> : null}
            {v("schedule") ? <th className="px-3 py-3 whitespace-nowrap">الدوام</th> : null}
            {v("scheduleHours") ? <th className="px-3 py-3 whitespace-nowrap">ساعات الدوام</th> : null}
            {v("late") ? <th className="px-3 py-3 whitespace-nowrap">التأخير</th> : null}
            {v("absence") ? <th className="px-3 py-3 whitespace-nowrap">الغياب</th> : null}
            {v("leave") ? <th className="px-3 py-3 whitespace-nowrap">الإجازات</th> : null}
            {v("overtime") ? <th className="px-3 py-3 whitespace-nowrap">الإضافي</th> : null}
            {v("work") ? <th className="px-3 py-3 whitespace-nowrap">ساعات العمل الفعلية</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={Math.max(1, visibleGroupIds.length)}
                className="px-4 py-8 text-center text-slate-500"
              >
                لا توجد بيانات ضمن الفترة والتصفية المختارة.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.employeeId} className="hover:bg-slate-50/80">
                {v("code") ? (
                  <td className="px-3 py-3 font-mono text-xs text-slate-700 whitespace-nowrap">{r.employeeCode}</td>
                ) : null}
                {v("name") ? (
                  <td className="px-3 py-3 font-medium text-slate-900 whitespace-nowrap">{r.fullName}</td>
                ) : null}
                {v("schedule") ? (
                  <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{r.scheduleName}</td>
                ) : null}
                {v("scheduleHours") ? (
                  <td className="px-3 py-3 text-slate-600 tabular-nums whitespace-nowrap">
                    {formatDurationMinutes(r.scheduleMinutesTotal)}
                  </td>
                ) : null}
                {v("late") ? (
                  <td className="px-3 py-3 text-slate-600 tabular-nums whitespace-nowrap">
                    {formatDurationMinutes(r.lateMinutesTotal)}
                  </td>
                ) : null}
                {v("absence") ? (
                  <td className="px-3 py-3 text-slate-600 tabular-nums whitespace-nowrap">{r.absenceDays}</td>
                ) : null}
                {v("leave") ? (
                  <td className="px-3 py-3 text-slate-600 tabular-nums whitespace-nowrap">{r.leaveDays}</td>
                ) : null}
                {v("overtime") ? (
                  <td className="px-3 py-3 text-slate-600 tabular-nums whitespace-nowrap">
                    {formatDurationMinutes(r.overtimeMinutesTotal)}
                  </td>
                ) : null}
                {v("work") ? (
                  <td className="px-3 py-3 text-slate-600 tabular-nums whitespace-nowrap">
                    {formatDurationMinutes(r.actualWorkMinutesTotal)}
                  </td>
                ) : null}
              </tr>
            ))
          )}
        </tbody>
        {rows.length > 0 ? (
          <tfoot className="border-t-2 border-slate-200 bg-slate-50/90 font-semibold text-slate-800">
            <tr>
              <td colSpan={Math.max(1, leadCount)} className="px-3 py-3 whitespace-nowrap">
                الإجمالي
              </td>
              {v("scheduleHours") ? (
                <td className="px-3 py-3 tabular-nums whitespace-nowrap">
                  {formatDurationMinutes(totals.scheduleMinutesTotal)}
                </td>
              ) : null}
              {v("late") ? (
                <td className="px-3 py-3 tabular-nums whitespace-nowrap">
                  {formatDurationMinutes(totals.lateMinutesTotal)}
                </td>
              ) : null}
              {v("absence") ? (
                <td className="px-3 py-3 tabular-nums whitespace-nowrap">{totals.absenceDays}</td>
              ) : null}
              {v("leave") ? (
                <td className="px-3 py-3 tabular-nums whitespace-nowrap">{totals.leaveDays}</td>
              ) : null}
              {v("overtime") ? (
                <td className="px-3 py-3 tabular-nums whitespace-nowrap">
                  {formatDurationMinutes(totals.overtimeMinutesTotal)}
                </td>
              ) : null}
              {v("work") ? (
                <td className="px-3 py-3 tabular-nums whitespace-nowrap">
                  {formatDurationMinutes(totals.actualWorkMinutesTotal)}
                </td>
              ) : null}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}
