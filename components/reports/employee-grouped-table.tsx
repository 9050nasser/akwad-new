"use client";

import { useMemo } from "react";
import { parseDateOnly } from "@/lib/day-range";
import {
  formatDurationMinutes,
  formatReportDateOnly,
  formatReportTimeOnly,
  formatSignedDurationMinutes,
} from "@/lib/format";
import type { AttendanceDetailRow } from "@/lib/reports";

type Props = {
  rows: AttendanceDetailRow[];
  visibleGroupIds: string[];
  totals: {
    overtimeMinutes: number;
    lateMinutes: number;
    expectedWorkMinutes: number;
    actualWorkMinutes: number;
    differenceMinutes: number;
  };
};

export function EmployeeGroupedTable({ rows, visibleGroupIds, totals }: Props) {
  const visible = new Set(visibleGroupIds);
  const v = (id: string) => visible.has(id);

  const leadIds = ["date", "code", "name"] as const;
  const leadCount = Math.max(1, leadIds.filter((id) => v(id)).length);

  const groupedByEmployee = useMemo(() => {
    const map = new Map<
      string,
      {
        employeeId: string;
        fullName: string;
        employeeCode: string;
        rows: AttendanceDetailRow[];
        totals: Props["totals"];
      }
    >();

    for (const r of rows) {
      if (!map.has(r.employeeId)) {
        map.set(r.employeeId, {
          employeeId: r.employeeId,
          fullName: r.fullName,
          employeeCode: r.employeeCode,
          rows: [],
          totals: {
            overtimeMinutes: 0,
            lateMinutes: 0,
            expectedWorkMinutes: 0,
            actualWorkMinutes: 0,
            differenceMinutes: 0,
          },
        });
      }
      const g = map.get(r.employeeId)!;
      g.rows.push(r);
      g.totals.overtimeMinutes += r.overtimeMinutes;
      g.totals.lateMinutes += r.lateMinutes;
      g.totals.expectedWorkMinutes += r.expectedWorkMinutes;
      g.totals.actualWorkMinutes += r.actualWorkMinutes;
      g.totals.differenceMinutes += r.differenceMinutes;
    }

    return Array.from(map.values());
  }, [rows]);

  if (rows.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
        لا توجد بيانات ضمن الفترة والتصفية المختارة.
      </div>
    );
  }

  return (
    <div className="employees-detail-wrapper mt-8 space-y-12 print:space-y-0 print:block">
      {groupedByEmployee.map((group) => (
        <div
          key={group.employeeId}
          className="print:break-after-page mb-12 print:mb-0 rounded-xl border border-slate-200 bg-white print:rounded-none print:border-0 print:shadow-none"
        >
          <div className="flex items-center gap-4 border-b border-slate-200 bg-slate-100 px-4 py-3 rounded-t-xl print:border-b-2 print:border-slate-800 print:bg-transparent print:px-0">
            <h3 className="text-lg font-bold text-slate-800 print:text-base">
              {group.fullName}
            </h3>
            <span className="rounded bg-white px-2 py-0.5 font-mono text-sm text-slate-500 border border-slate-200 print:border-0 print:bg-transparent print:px-0">
              كود: {group.employeeCode}
            </span>
          </div>

          <div className="overflow-x-auto print:overflow-visible">
            <table className="min-w-[1100px] w-full max-w-full text-right text-sm print:min-w-0 print:w-full print:table-auto">
              <thead className="bg-slate-50 text-xs font-semibold normal-case tracking-normal text-slate-600 print:bg-transparent">
                <tr>
                  {v("date") && <th className="px-3 py-3 print:px-1.5 print:py-2">التاريخ</th>}
                  {v("code") && <th className="px-3 py-3 print:px-1.5 print:py-2">الكود</th>}
                  {v("name") && <th className="px-3 py-3 print:px-1.5 print:py-2">الاسم</th>}
                  {v("checkIn") && <th className="px-3 py-3 print:px-1.5 print:py-2">الحضور</th>}
                  {v("checkOut") && <th className="px-3 py-3 print:px-1.5 print:py-2">الانصراف</th>}
                  {v("overtime") && <th className="px-3 py-3 print:px-1.5 print:py-2">الإضافي</th>}
                  {v("late") && <th className="px-3 py-3 print:px-1.5 print:py-2">التأخير</th>}
                  {v("expectedWork") && <th className="px-3 py-3 print:px-1.5 print:py-2">عمل افتراضي</th>}
                  {v("actualWork") && <th className="px-3 py-3 print:px-1.5 print:py-2">عمل حقيقي</th>}
                  {v("diff") && <th className="px-3 py-3 print:px-1.5 print:py-2">الفرق</th>}
                  {v("note") && <th className="px-3 py-3 print:px-1.5 print:py-2">ملاحظات</th>}
                  {v("dayName") && <th className="px-3 py-3 print:px-1.5 print:py-2">اسم اليوم</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {group.rows.map((r) => (
                  <tr key={`${r.dateKey}-${r.employeeId}`} className="hover:bg-slate-50/80 print:break-inside-avoid">
                    {v("date") && <td className="px-3 py-3 print:px-1.5">{formatReportDateOnly(parseDateOnly(r.dateKey))}</td>}
                    {v("code") && <td className="px-3 py-3 font-mono text-xs print:px-1.5">{r.employeeCode}</td>}
                    {v("name") && <td className="px-3 py-3 font-medium print:px-1.5">{r.fullName}</td>}
                    {v("checkIn") && <td className="px-3 py-3 print:px-1.5">{r.checkInAt ? formatReportTimeOnly(r.checkInAt) : "—"}</td>}
                    {v("checkOut") && <td className="px-3 py-3 print:px-1.5">{r.checkOutAt ? formatReportTimeOnly(r.checkOutAt) : "—"}</td>}
                    {v("overtime") && <td className="px-3 py-3 tabular-nums print:px-1.5">{formatDurationMinutes(r.overtimeMinutes)}</td>}
                    {v("late") && <td className="px-3 py-3 tabular-nums print:px-1.5">{formatDurationMinutes(r.lateMinutes)}</td>}
                    {v("expectedWork") && <td className="px-3 py-3 tabular-nums print:px-1.5">{formatDurationMinutes(r.expectedWorkMinutes)}</td>}
                    {v("actualWork") && <td className="px-3 py-3 tabular-nums print:px-1.5">{formatDurationMinutes(r.actualWorkMinutes)}</td>}
                    {v("diff") && <td className="px-3 py-3 tabular-nums print:px-1.5">{formatSignedDurationMinutes(r.differenceMinutes)}</td>}
                    {v("note") && <td className="px-3 py-3 text-xs print:px-1.5">{r.dayNote ?? "—"}</td>}
                    {v("dayName") && <td className="px-3 py-3 print:px-1.5">{parseDateOnly(r.dateKey).toLocaleDateString("ar-SA", { weekday: "long" })}</td>}
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 bg-slate-50/90 font-semibold text-slate-800 print:break-inside-avoid print:border-t-[1px]">
                <tr>
                  <td colSpan={leadCount} className="px-3 py-3 print:px-1.5">إجمالي الموظف</td>
                  {v("checkIn") && <td className="px-3 py-3 print:px-1.5">—</td>}
                  {v("checkOut") && <td className="px-3 py-3 print:px-1.5">—</td>}
                  {v("overtime") && <td className="px-3 py-3 text-emerald-600 print:px-1.5">{formatDurationMinutes(group.totals.overtimeMinutes)}</td>}
                  {v("late") && <td className="px-3 py-3 text-rose-600 print:px-1.5">{formatDurationMinutes(group.totals.lateMinutes)}</td>}
                  {v("expectedWork") && <td className="px-3 py-3 print:px-1.5">{formatDurationMinutes(group.totals.expectedWorkMinutes)}</td>}
                  {v("actualWork") && <td className="px-3 py-3 print:px-1.5">{formatDurationMinutes(group.totals.actualWorkMinutes)}</td>}
                  {v("diff") && <td className="px-3 py-3 print:px-1.5">{formatSignedDurationMinutes(group.totals.differenceMinutes)}</td>}
                  {v("note") && <td className="px-3 py-3 print:px-1.5">—</td>}
                  {v("dayName") && <td className="px-3 py-3 print:px-1.5">—</td>}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ))}

      <div className="print:break-inside-avoid print:mt-12 rounded-xl border border-slate-200 bg-slate-50 p-6 print:border-2 print:border-slate-800">
        <h3 className="mb-4 text-lg font-bold text-slate-800">الإجمالي العام للفرع / الشركة</h3>
        <div className="flex flex-wrap gap-x-8 gap-y-4 text-sm">
          {v("overtime") && (
            <div>
              <span className="block text-slate-500">إجمالي الإضافي:</span>
              <span className="font-semibold text-emerald-600 text-lg">{formatDurationMinutes(totals.overtimeMinutes)}</span>
            </div>
          )}
          {v("late") && (
            <div>
              <span className="block text-slate-500">إجمالي التأخير:</span>
              <span className="font-semibold text-rose-600 text-lg">{formatDurationMinutes(totals.lateMinutes)}</span>
            </div>
          )}
          {v("expectedWork") && (
            <div>
              <span className="block text-slate-500">ساعات العمل الافتراضي:</span>
              <span className="font-semibold text-slate-800 text-lg">{formatDurationMinutes(totals.expectedWorkMinutes)}</span>
            </div>
          )}
          {v("actualWork") && (
            <div>
              <span className="block text-slate-500">ساعات العمل الحقيقي:</span>
              <span className="font-semibold text-slate-800 text-lg">{formatDurationMinutes(totals.actualWorkMinutes)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}