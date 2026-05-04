import { formatDurationMinutes, formatReportTimeOnly } from "@/lib/format";
import type { DailyStatusRow } from "@/lib/reports";

type Props = {
  rows: DailyStatusRow[];
  visibleGroupIds: string[];
};

export function DailyStatusTable({ rows, visibleGroupIds }: Props) {
  const visible = new Set(visibleGroupIds);
  const v = (id: string) => visible.has(id);
  const splitHeader = v("shift1") || v("shift2");

  return (
    <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-0 w-full max-w-full text-right text-sm print:table-fixed">
        <thead className="bg-slate-50 text-xs text-slate-500">
          <tr className="uppercase tracking-wide">
            {v("code") ? (
              <th rowSpan={splitHeader ? 2 : 1} className="px-3 py-3 align-middle whitespace-nowrap">
                كود الموظف
              </th>
            ) : null}
            {v("name") ? (
              <th rowSpan={splitHeader ? 2 : 1} className="px-3 py-3 align-middle whitespace-nowrap">
                اسم الموظف
              </th>
            ) : null}
            {v("branch") ? (
              <th rowSpan={splitHeader ? 2 : 1} className="px-3 py-3 align-middle whitespace-nowrap">
                الفرع
              </th>
            ) : null}
            {v("schedule") ? (
              <th rowSpan={splitHeader ? 2 : 1} className="px-3 py-3 align-middle whitespace-nowrap">
                الدوام
              </th>
            ) : null}
            {v("shift1") ? (
              <th
                colSpan={2}
                className="border-b border-slate-200 px-3 py-2 text-center text-[0.7rem] font-semibold normal-case tracking-normal text-slate-700"
              >
                الدوام الأول
              </th>
            ) : null}
            {v("shift2") ? (
              <th
                colSpan={2}
                className="border-b border-slate-200 px-3 py-2 text-center text-[0.7rem] font-semibold normal-case tracking-normal text-slate-700"
              >
                الدوام الثاني
              </th>
            ) : null}
            {v("late") ? (
              <th rowSpan={splitHeader ? 2 : 1} className="px-3 py-3 align-middle whitespace-nowrap uppercase tracking-wide">
                التأخير (د)
              </th>
            ) : null}
            {v("overtime") ? (
              <th rowSpan={splitHeader ? 2 : 1} className="px-3 py-3 align-middle whitespace-nowrap uppercase tracking-wide">
                الإضافي (د)
              </th>
            ) : null}
            {v("work") ? (
              <th rowSpan={splitHeader ? 2 : 1} className="px-3 py-3 align-middle whitespace-nowrap uppercase tracking-wide">
                ساعات العمل
              </th>
            ) : null}
            {v("dayStatus") ? (
              <th rowSpan={splitHeader ? 2 : 1} className="min-w-[200px] px-3 py-3 align-middle uppercase tracking-wide">
                حالة اليوم
              </th>
            ) : null}
          </tr>
          {splitHeader ? (
            <tr className="text-[0.65rem] font-medium normal-case text-slate-600">
              {v("shift1") ? (
                <>
                  <th className="px-3 py-2 whitespace-nowrap">دخول</th>
                  <th className="px-3 py-2 whitespace-nowrap">خروج</th>
                </>
              ) : null}
              {v("shift2") ? (
                <>
                  <th className="px-3 py-2 whitespace-nowrap">دخول</th>
                  <th className="px-3 py-2 whitespace-nowrap">خروج</th>
                </>
              ) : null}
            </tr>
          ) : null}
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((r) => (
            <tr key={r.employeeId} className="hover:bg-slate-50/80">
              {v("code") ? (
                <td className="px-3 py-3 font-mono text-xs text-slate-700">{r.employeeCode}</td>
              ) : null}
              {v("name") ? (
                <td className="px-3 py-3 font-medium text-slate-900 whitespace-nowrap">{r.fullName}</td>
              ) : null}
              {v("branch") ? <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{r.branch}</td> : null}
              {v("schedule") ? (
                <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{r.scheduleName}</td>
              ) : null}
              {v("shift1") ? (
                <>
                  <td className="px-3 py-3 text-slate-600 whitespace-nowrap">
                    {r.shift1In ? formatReportTimeOnly(r.shift1In) : "—"}
                  </td>
                  <td className="px-3 py-3 text-slate-600 whitespace-nowrap">
                    {r.shift1Out ? formatReportTimeOnly(r.shift1Out) : "—"}
                  </td>
                </>
              ) : null}
              {v("shift2") ? (
                <>
                  <td className="px-3 py-3 text-slate-600 whitespace-nowrap">
                    {r.hasSecondShiftSegment ? (r.shift2In ? formatReportTimeOnly(r.shift2In) : "—") : "—"}
                  </td>
                  <td className="px-3 py-3 text-slate-600 whitespace-nowrap">
                    {r.hasSecondShiftSegment ? (r.shift2Out ? formatReportTimeOnly(r.shift2Out) : "—") : "—"}
                  </td>
                </>
              ) : null}
              {v("late") ? (
                <td className="px-3 py-3 text-slate-600 tabular-nums whitespace-nowrap">{r.lateMinutes}</td>
              ) : null}
              {v("overtime") ? (
                <td className="px-3 py-3 text-slate-600 tabular-nums whitespace-nowrap">{r.overtimeMinutes}</td>
              ) : null}
              {v("work") ? (
                <td className="px-3 py-3 text-slate-600 tabular-nums whitespace-nowrap">
                  {formatDurationMinutes(r.workMinutes)}
                </td>
              ) : null}
              {v("dayStatus") ? (
                <td className="px-3 py-3 text-slate-600 text-xs leading-relaxed">{r.dayStatus}</td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
