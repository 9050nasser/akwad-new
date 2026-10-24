import {
  formatDurationMinutes,
  formatReportDateOnly,
  formatReportTimeOnly,
  formatSignedDurationMinutes,
} from "@/lib/format";
import type { PayrollOvertimeVsLateDayRow } from "@/lib/payroll-overtime-vs-late";

type Props = {
  rows: PayrollOvertimeVsLateDayRow[];
  missingPackageSalary: boolean;
  fmtMoney: (n: number) => string;
};

export function PayrollOtMinusLateDetailTable({ rows, missingPackageSalary, fmtMoney }: Props) {
  const totals = rows.reduce(
    (acc, r) => {
      acc.ot += r.overtimeMinutes;
      acc.late += r.lateMinutes;
      acc.net += r.netMinutes;
      acc.amount += r.amount;
      return acc;
    },
    { ot: 0, late: 0, net: 0, amount: 0 },
  );

  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">لا توجد أيام في هذه الفترة.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-right text-sm">
        <thead className="bg-slate-50 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-2 py-3">التاريخ</th>
            <th className="px-2 py-3">اليوم</th>
            <th className="px-2 py-3">الحضور</th>
            <th className="px-2 py-3">الانصراف</th>
            <th className="px-2 py-3">الإضافي</th>
            <th className="px-2 py-3">التأخير</th>
            <th className="px-2 py-3 whitespace-nowrap">فرق الدقائق</th>
            <th className="px-2 py-3">المبلغ</th>
            <th className="px-2 py-3">ملاحظات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((r) => (
            <tr key={r.dateKey} className="hover:bg-slate-50/80">
              <td className="px-2 py-3 tabular-nums text-slate-800">{formatReportDateOnly(r.date)}</td>
              <td className="px-2 py-3 text-slate-600">{r.weekdayLabel}</td>
              <td className="px-2 py-3 tabular-nums font-semibold text-slate-900 print:text-[0.65rem]">
                {r.checkInAt ? formatReportTimeOnly(r.checkInAt) : "—"}
              </td>
              <td className="px-2 py-3 tabular-nums font-semibold text-slate-900 print:text-[0.65rem]">
                {r.checkOutAt ? formatReportTimeOnly(r.checkOutAt) : "—"}
              </td>
              <td className="px-2 py-3 tabular-nums text-emerald-700">
                {formatDurationMinutes(r.overtimeMinutes)}
              </td>
              <td className="px-2 py-3 tabular-nums text-rose-700">{formatDurationMinutes(r.lateMinutes)}</td>
              <td className="px-2 py-3 tabular-nums text-slate-800">
                {formatSignedDurationMinutes(r.netMinutes)}
              </td>
              <td
                className={`px-2 py-3 tabular-nums font-medium ${r.amount >= 0 ? "text-emerald-800" : "text-rose-800"}`}
              >
                {missingPackageSalary ? "—" : fmtMoney(r.amount)}
              </td>
              <td className="px-2 py-3 text-xs text-slate-600">{r.dayNote ?? "—"}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900">
          <tr>
            <td colSpan={4} className="px-2 py-3">
              إجمالي الفترة
            </td>
            <td className="px-2 py-3 tabular-nums text-emerald-800">{formatDurationMinutes(totals.ot)}</td>
            <td className="px-2 py-3 tabular-nums text-rose-800">{formatDurationMinutes(totals.late)}</td>
            <td className="px-2 py-3 tabular-nums">{formatSignedDurationMinutes(totals.net)}</td>
            <td className="px-2 py-3 tabular-nums text-teal-900">
              {missingPackageSalary ? "—" : fmtMoney(totals.amount)}
            </td>
            <td className="px-2 py-3" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
