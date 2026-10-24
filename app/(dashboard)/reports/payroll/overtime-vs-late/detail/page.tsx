import Link from "next/link";
import { redirect } from "next/navigation";
import { PageFrame } from "@/components/page-frame";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { eachCalendarDay } from "@/lib/day-range";
import { monthRangeInputs } from "@/lib/default-range";
import { firstQuery } from "@/lib/flash";
import {
  formatDateOnly,
  formatDurationMinutes,
  formatReportDateOnly,
  formatReportTimeOnly,
  formatSignedDurationMinutes,
} from "@/lib/format";
import { formatCompanyMoney } from "@/lib/company-settings";
import { getPayrollOvertimeVsLateDetail } from "@/lib/payroll-overtime-vs-late";
import { parseRangeFromSearch } from "@/lib/reports";
import { prisma } from "@/lib/prisma";
import { getUiLocale } from "@/lib/ui/prefs";
import { requireTenantSession } from "@/lib/tenant";

export default async function PayrollOvertimeVsLateDetailPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireTenantSession();
  const companyId = session.companyId;
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company?.enablePayroll) redirect("/reports?err=payroll_disabled");

  const sp = (await searchParams) ?? {};
  const defaults = monthRangeInputs();
  const fromStr = firstQuery(sp.from) ?? defaults.from;
  const toStr = firstQuery(sp.to) ?? defaults.to;
  const employeeId = firstQuery(sp.employeeId)?.trim() ?? "";

  const locale = await getUiLocale(company.defaultLocale === "en" ? "en" : "ar");
  const fmtMoney = (n: number) => formatCompanyMoney(company, n, locale);
  const { from, to } = parseRangeFromSearch(fromStr, toStr);

  const employees = await prisma.employee.findMany({
    where: { active: true, branch: { companyId } },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, employeeCode: true },
  });

  const emptyPeriodDays = eachCalendarDay(from, to).length;
  const { employee, rows, periodDays, ratePerMinute, missingPackageSalary } = employeeId
    ? await getPayrollOvertimeVsLateDetail({ companyId, employeeId, from, to })
    : {
        employee: null,
        rows: [],
        periodDays: emptyPeriodDays,
        ratePerMinute: 0,
        missingPackageSalary: true,
      };

  const qBack = new URLSearchParams({ from: fromStr, to: toStr });

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

  return (
    <PageFrame exportFileSlug="payroll-ot-minus-late-detail" title="فرق الإضافي من التأخير بالرواتب — تفصيلي">
      <p className="mb-4 flex flex-wrap items-center gap-3 text-sm print:hidden" data-html2canvas-ignore="true">
        <Link href="/reports/payroll" className="font-medium text-teal-700 hover:text-teal-900">
          تقرير الرواتب
        </Link>
        <Link
          href={`/reports/payroll/overtime-vs-late?${qBack.toString()}`}
          className="font-medium text-teal-700 hover:text-teal-900"
        >
          التقرير الإجمالي
        </Link>
      </p>

      <div className="print:hidden">
        <form method="get" className="grid gap-4 md:grid-cols-4">
          <div>
            <Label htmlFor="from">من</Label>
            <input id="from" name="from" type="date" className={fieldClass} defaultValue={fromStr} />
          </div>
          <div>
            <Label htmlFor="to">إلى</Label>
            <input id="to" name="to" type="date" className={fieldClass} defaultValue={toStr} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="employeeId">الموظف</Label>
            <select id="employeeId" name="employeeId" className={fieldClass} defaultValue={employeeId} required>
              <option value="">— اختر موظفاً —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName}
                  {e.employeeCode?.trim() ? ` (${e.employeeCode.trim()})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-4 flex items-end">
            <PrimaryButton type="submit">عرض</PrimaryButton>
          </div>
        </form>
      </div>

      {employee ? (
        <div className="mt-4 space-y-1 text-sm text-slate-800">
          <p>
            <span className="font-semibold">الموظف:</span> {employee.fullName}
            <span className="mx-2 text-slate-400">|</span>
            <span className="font-semibold">الكود:</span> {employee.employeeCode?.trim() || "—"}
            <span className="mx-2 text-slate-400">|</span>
            <span className="font-semibold">الفرع:</span> {employee.branchName}
          </p>
          <p className="text-xs text-slate-600">
            من {formatDateOnly(from)} إلى {formatDateOnly(to)} ({periodDays} يوماً). معامل الساعة: ساعة بساعة — قيمة
            الدقيقة: {missingPackageSalary ? "—" : fmtMoney(ratePerMinute)}.
          </p>
        </div>
      ) : employeeId ? (
        <p className="mt-4 text-sm text-rose-800">لم يُعثر على الموظف.</p>
      ) : (
        <p className="mt-4 text-sm text-slate-600">اختر موظفاً ثم اضغط «عرض».</p>
      )}

      {employee && rows.length > 0 ? (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
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
                  <td className="px-2 py-3 tabular-nums">
                    {r.checkInAt ? formatReportTimeOnly(r.checkInAt) : "—"}
                  </td>
                  <td className="px-2 py-3 tabular-nums">
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
      ) : null}
    </PageFrame>
  );
}
