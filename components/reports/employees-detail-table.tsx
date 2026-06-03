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

export function EmployeesDetailTable({ rows, visibleGroupIds, totals }: Props) {
  const visible = new Set(visibleGroupIds);
  const v = (id: string) => visible.has(id);

  const leadIds = ["date", "code", "name"] as const;
  const leadCount = Math.max(1, leadIds.filter((id) => v(id)).length);

  const visibleCount = visibleGroupIds.length;
  const emptyColSpan = Math.max(1, visibleCount);

  return (
    <div className="employees-detail-table mt-8 overflow-x-auto rounded-xl border border-slate-200 print:overflow-visible print:rounded-none print:border-0 print:shadow-none">
      <table className="min-w-[1100px] w-full max-w-full text-right text-sm print:min-w-0 print:w-full print:table-auto">
        <thead className="bg-slate-50 text-xs font-semibold normal-case tracking-normal text-slate-600 print:bg-transparent">
          <tr>
            {v("date") ? (
              <th className="px-3 py-3 whitespace-nowrap print:min-w-0 print:whitespace-normal print:px-1.5 print:py-2 print:text-[0.65rem] print:font-semibold print:leading-snug">
                التاريخ
              </th>
            ) : null}
            {v("code") ? (
              <th className="px-3 py-3 whitespace-nowrap print:min-w-0 print:whitespace-normal print:px-1.5 print:py-2 print:text-[0.65rem] print:font-semibold print:leading-snug">
                كود الموظف
              </th>
            ) : null}
            {v("name") ? (
              <th className="px-3 py-3 whitespace-nowrap print:min-w-0 print:max-w-[7.5rem] print:whitespace-normal print:px-1.5 print:py-2 print:text-[0.65rem] print:font-semibold print:leading-snug">
                اسم الموظف
              </th>
            ) : null}
            {v("checkIn") ? (
              <th className="px-3 py-3 whitespace-nowrap print:min-w-0 print:whitespace-normal print:px-1.5 print:py-2 print:text-[0.65rem] print:font-semibold print:leading-snug">
                وقت الحضور
              </th>
            ) : null}
            {v("checkOut") ? (
              <th className="px-3 py-3 whitespace-nowrap print:min-w-0 print:whitespace-normal print:px-1.5 print:py-2 print:text-[0.65rem] print:font-semibold print:leading-snug">
                وقت الانصراف
              </th>
            ) : null}
            {v("overtime") ? (
              <th className="px-3 py-3 whitespace-nowrap print:min-w-0 print:whitespace-normal print:px-1.5 print:py-2 print:text-[0.65rem] print:font-semibold print:leading-snug">
                الإضافي
              </th>
            ) : null}
            {v("late") ? (
              <th className="px-3 py-3 whitespace-nowrap print:min-w-0 print:whitespace-normal print:px-1.5 print:py-2 print:text-[0.65rem] print:font-semibold print:leading-snug">
                التأخير
              </th>
            ) : null}
            {v("expectedWork") ? (
              <th className="px-3 py-3 whitespace-nowrap print:min-w-0 print:whitespace-normal print:px-1.5 print:py-2 print:text-[0.65rem] print:font-semibold print:leading-snug">
                ساعات العمل الافتراضي
              </th>
            ) : null}
            {v("actualWork") ? (
              <th className="px-3 py-3 whitespace-nowrap print:min-w-0 print:whitespace-normal print:px-1.5 print:py-2 print:text-[0.65rem] print:font-semibold print:leading-snug">
                ساعات العمل الحقيقي
              </th>
            ) : null}
            {v("diff") ? (
              <th className="px-3 py-3 whitespace-nowrap print:min-w-0 print:whitespace-normal print:px-1.5 print:py-2 print:text-[0.65rem] print:font-semibold print:leading-snug">
                الفرق
              </th>
            ) : null}
            {v("note") ? (
              <th className="min-w-[140px] px-3 py-3 align-top text-[0.65rem] font-semibold normal-case tracking-normal text-slate-600 print:min-w-0 print:w-auto print:max-w-[22%] print:whitespace-normal print:px-1.5 print:py-2 print:leading-snug">
                ملاحظات
              </th>
            ) : null}
            {v("dayName") ? (
              <th className="px-3 py-3 whitespace-nowrap print:min-w-0 print:whitespace-normal print:px-1.5 print:py-2 print:text-[0.65rem] print:font-semibold print:leading-snug">
                اسم اليوم
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={emptyColSpan} className="px-4 py-8 text-center text-slate-500">
                لا توجد بيانات ضمن الفترة والتصفية المختارة.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={`${r.dateKey}-${r.employeeId}`} className="hover:bg-slate-50/80 print:break-inside-avoid">
                {v("date") ? (
                  <td className="px-3 py-3 align-top whitespace-nowrap text-slate-600 print:whitespace-normal print:px-1.5 print:py-1.5 print:text-[0.65rem] print:leading-snug">
                    {formatReportDateOnly(parseDateOnly(r.dateKey))}
                  </td>
                ) : null}
                {v("code") ? (
                  <td className="px-3 py-3 align-top font-mono text-xs text-slate-700 whitespace-nowrap print:whitespace-normal print:break-all print:px-1.5 print:py-1.5 print:text-[0.65rem] print:leading-snug">
                    {r.employeeCode}
                  </td>
                ) : null}
                {v("name") ? (
                  <td className="px-3 py-3 align-top font-medium text-slate-900 whitespace-nowrap print:max-w-[7.5rem] print:whitespace-normal print:break-words print:px-1.5 print:py-1.5 print:text-[0.65rem] print:leading-snug">
                    {r.fullName}
                  </td>
                ) : null}
                {v("checkIn") ? (
                  <td className="px-3 py-3 align-top text-slate-600 whitespace-nowrap print:whitespace-normal print:px-1.5 print:py-1.5 print:text-[0.65rem] print:leading-snug">
                    {r.checkInAt ? formatReportTimeOnly(r.checkInAt) : "—"}
                  </td>
                ) : null}
                {v("checkOut") ? (
                  <td className="px-3 py-3 align-top text-slate-600 whitespace-nowrap print:whitespace-normal print:px-1.5 print:py-1.5 print:text-[0.65rem] print:leading-snug">
                    {r.checkOutAt ? formatReportTimeOnly(r.checkOutAt) : "—"}
                  </td>
                ) : null}
                {v("overtime") ? (
                  <td className="px-3 py-3 align-top text-slate-600 tabular-nums whitespace-nowrap print:whitespace-normal print:px-1.5 print:py-1.5 print:text-[0.65rem] print:leading-snug">
                    {formatDurationMinutes(r.overtimeMinutes)}
                  </td>
                ) : null}
                {v("late") ? (
                  <td className="px-3 py-3 align-top text-slate-600 tabular-nums whitespace-nowrap print:whitespace-normal print:px-1.5 print:py-1.5 print:text-[0.65rem] print:leading-snug">
                    {formatDurationMinutes(r.lateMinutes)}
                  </td>
                ) : null}
                {v("expectedWork") ? (
                  <td className="px-3 py-3 align-top text-slate-600 tabular-nums whitespace-nowrap print:whitespace-normal print:px-1.5 print:py-1.5 print:text-[0.65rem] print:leading-snug">
                    {formatDurationMinutes(r.expectedWorkMinutes)}
                  </td>
                ) : null}
                {v("actualWork") ? (
                  <td className="px-3 py-3 align-top text-slate-600 tabular-nums whitespace-nowrap print:whitespace-normal print:px-1.5 print:py-1.5 print:text-[0.65rem] print:leading-snug">
                    {formatDurationMinutes(r.actualWorkMinutes)}
                  </td>
                ) : null}
                {v("diff") ? (
                  <td className="px-3 py-3 align-top text-slate-600 tabular-nums whitespace-nowrap print:whitespace-normal print:px-1.5 print:py-1.5 print:text-[0.65rem] print:leading-snug">
                    {formatSignedDurationMinutes(r.differenceMinutes)}
                  </td>
                ) : null}
                {v("note") ? (
                  <td className="px-3 py-3 align-top text-xs leading-relaxed text-slate-600 whitespace-normal break-words print:max-w-[22%] print:px-1.5 print:py-1.5 print:text-[0.65rem] print:leading-snug">
                    {r.dayNote ?? "—"}
                  </td>
                ) : null}
                {v("dayName") ? (
                  <td className="px-3 py-3 align-top text-slate-600 whitespace-nowrap print:whitespace-normal print:px-1.5 print:py-1.5 print:text-[0.65rem] print:leading-snug">
                    {parseDateOnly(r.dateKey).toLocaleDateString("ar-SA", { weekday: "long" })}
                  </td>
                ) : null}
              </tr>
            ))
          )}
        </tbody>
        {rows.length > 0 ? (
          <tfoot className="border-t-2 border-slate-200 bg-slate-50/90 font-semibold text-slate-800 print:break-inside-avoid">
            <tr>
              <td
                colSpan={leadCount}
                className="px-3 py-3 align-top whitespace-nowrap print:whitespace-normal print:px-1.5 print:py-1.5 print:text-[0.65rem] print:leading-snug"
              >
                الإجمالي
              </td>
              {v("checkIn") ? (
                <td className="px-3 py-3 align-top text-slate-500 print:px-1.5 print:py-1.5 print:text-[0.65rem]">
                  —
                </td>
              ) : null}
              {v("checkOut") ? (
                <td className="px-3 py-3 align-top text-slate-500 print:px-1.5 print:py-1.5 print:text-[0.65rem]">
                  —
                </td>
              ) : null}
              {v("overtime") ? (
                <td className="px-3 py-3 align-top tabular-nums whitespace-nowrap print:whitespace-normal print:px-1.5 print:py-1.5 print:text-[0.65rem] print:leading-snug">
                  {formatDurationMinutes(totals.overtimeMinutes)}
                </td>
              ) : null}
              {v("late") ? (
                <td className="px-3 py-3 align-top tabular-nums whitespace-nowrap print:whitespace-normal print:px-1.5 print:py-1.5 print:text-[0.65rem] print:leading-snug">
                  {formatDurationMinutes(totals.lateMinutes)}
                </td>
              ) : null}
              {v("expectedWork") ? (
                <td className="px-3 py-3 align-top tabular-nums whitespace-nowrap print:whitespace-normal print:px-1.5 print:py-1.5 print:text-[0.65rem] print:leading-snug">
                  {formatDurationMinutes(totals.expectedWorkMinutes)}
                </td>
              ) : null}
              {v("actualWork") ? (
                <td className="px-3 py-3 align-top tabular-nums whitespace-nowrap print:whitespace-normal print:px-1.5 print:py-1.5 print:text-[0.65rem] print:leading-snug">
                  {formatDurationMinutes(totals.actualWorkMinutes)}
                </td>
              ) : null}
              {v("diff") ? (
                <td className="px-3 py-3 align-top tabular-nums whitespace-nowrap print:whitespace-normal print:px-1.5 print:py-1.5 print:text-[0.65rem] print:leading-snug">
                  {formatSignedDurationMinutes(totals.differenceMinutes)}
                </td>
              ) : null}
              {v("note") ? (
                <td className="px-3 py-3 align-top text-slate-500 print:px-1.5 print:py-1.5 print:text-[0.65rem]">
                  —
                </td>
              ) : null}
              {v("dayName") ? (
                <td className="px-3 py-3 align-top text-slate-500 print:px-1.5 print:py-1.5 print:text-[0.65rem]">
                  —
                </td>
              ) : null}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}
