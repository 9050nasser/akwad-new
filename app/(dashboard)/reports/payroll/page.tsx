import Link from "next/link";
import { redirect } from "next/navigation";
import { PageFrame } from "@/components/page-frame";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { monthRangeInputs } from "@/lib/default-range";
import { firstQuery } from "@/lib/flash";
import { formatDateOnly } from "@/lib/format";
import { parseRangeFromSearch } from "@/lib/reports";
import { formatCompanyMoney } from "@/lib/company-settings";
import { getPayrollRows } from "@/lib/payroll";
import { prisma } from "@/lib/prisma";
import { getUiLocale } from "@/lib/ui/prefs";
import { requireTenantSession } from "@/lib/tenant";

export default async function PayrollReportPage({
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
  const rawBranch = firstQuery(sp.branchId);
  let branchId: string | undefined;
  if (rawBranch === undefined) {
    branchId = company.defaultReportBranchId ?? undefined;
  } else if (rawBranch === "") {
    branchId = undefined;
  } else {
    branchId = rawBranch;
  }
  const locale = await getUiLocale(company.defaultLocale === "en" ? "en" : "ar");
  const fmtMoney = (n: number) => formatCompanyMoney(company, n, locale);
  const { from, to } = parseRangeFromSearch(fromStr, toStr);
  const { rows, periodDays } = await getPayrollRows({ companyId, from, to, branchId });
  const branches = await prisma.branch.findMany({ where: { companyId }, orderBy: { name: "asc" } });

  const q = new URLSearchParams({ from: fromStr, to: toStr });
  if (branchId) q.set("branchId", branchId);

  const csvQs = new URLSearchParams({ from: fromStr, to: toStr });
  if (branchId) csvQs.set("branchId", branchId);

  const totals = rows.reduce(
    (acc, r) => {
      if (!r.missingPackageSalary) {
        acc.base += r.baseProportional;
        acc.housing += r.allowanceHousingProportional;
        acc.transport += r.allowanceTransportProportional;
        acc.gross += r.grossFixedProportional;
      }
      acc.add += r.additionAmount;
      acc.ded += r.deductionAmount;
      acc.manDed += r.manualDeductionsTotal;
      acc.manBon += r.manualBonusesTotal;
      acc.net += r.netSalary;
      if (r.hasPayrollVacationInPeriod) acc.vacCount += 1;
      return acc;
    },
    { base: 0, housing: 0, transport: 0, gross: 0, add: 0, ded: 0, manDed: 0, manBon: 0, net: 0, vacCount: 0 },
  );

  return (
    <PageFrame
      exportFileSlug="payroll"
      title="الرواتب"
      subtitle="الاستحقاق الثابت من الراتب والبدلات؛ الإضافي/خصومات الحضور؛ الخصومات والإضافات اليدوية والإجازات من موديول الرواتب. يمكن تصدير الجدول CSV لإكسل."
    >
      <p
        className="mb-4 flex flex-wrap items-center gap-3 text-sm print:hidden"
        data-html2canvas-ignore="true"
      >
        <Link href="/reports/payroll/vacations" className="font-medium text-teal-700 hover:text-teal-900">
          تسجيل إجازات
        </Link>
        <Link href="/reports/payroll/vacations/report" className="font-medium text-teal-700 hover:text-teal-900">
          تقرير إجازات الموظفين
        </Link>
        <Link href="/reports/payroll/deductions" className="font-medium text-teal-700 hover:text-teal-900">
          خصومات يدوية
        </Link>
        <Link href="/reports/payroll/bonuses" className="font-medium text-teal-700 hover:text-teal-900">
          إضافات يدوية
        </Link>
        <a
          href={`/api/payroll/export?${csvQs.toString()}`}
          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
        >
          تصدير CSV
        </a>
      </p>

      <form method="get" className="grid gap-4 md:grid-cols-4">
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
        <div className="flex items-end">
          <PrimaryButton type="submit">عرض</PrimaryButton>
        </div>
      </form>

      <p className="mt-4 text-xs text-slate-600">
        الفترة: {formatDateOnly(from)} — {formatDateOnly(to)} ({periodDays} يوماً). عيّن الراتب والبدلات من شاشة الموظفين (قسم الراتب والبدلات) لظهور المبالغ.
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-slate-50 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-2 py-3">الموظف</th>
              <th className="px-2 py-3">الفرع</th>
              <th className="px-2 py-3 whitespace-nowrap">أساسي</th>
              <th className="px-2 py-3 whitespace-nowrap">سكن</th>
              <th className="px-2 py-3 whitespace-nowrap">مواصلات</th>
              <th className="px-2 py-3 whitespace-nowrap">إجمالي ثابت</th>
              <th className="px-2 py-3 whitespace-nowrap">إجازة</th>
              <th className="px-2 py-3">إضافي</th>
              <th className="px-2 py-3 whitespace-nowrap">خصم حضور</th>
              <th className="px-2 py-3 whitespace-nowrap">خصم يدوي</th>
              <th className="px-2 py-3 whitespace-nowrap">إضافة يدوية</th>
              <th className="px-2 py-3">الصافي</th>
              <th className="px-2 py-3 w-24">قسيمة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((r) => (
              <tr key={r.employeeId} className="hover:bg-slate-50/80">
                <td className="px-2 py-3 font-medium text-slate-900">{r.fullName}</td>
                <td className="px-2 py-3 text-slate-600">{r.branch}</td>
                <td className="px-2 py-3 tabular-nums text-slate-700 text-xs">
                  {r.missingPackageSalary ? "—" : fmtMoney(r.baseProportional)}
                </td>
                <td className="px-2 py-3 tabular-nums text-slate-700 text-xs">
                  {r.missingPackageSalary ? "—" : fmtMoney(r.allowanceHousingProportional)}
                </td>
                <td className="px-2 py-3 tabular-nums text-slate-700 text-xs">
                  {r.missingPackageSalary ? "—" : fmtMoney(r.allowanceTransportProportional)}
                </td>
                <td className="px-2 py-3 tabular-nums font-medium text-slate-800 text-xs">
                  {r.missingPackageSalary ? "—" : fmtMoney(r.grossFixedProportional)}
                </td>
                <td className="px-2 py-3 text-xs text-violet-800">
                  {r.hasPayrollVacationInPeriod ? (
                    <span title="مسجلة في موديول الرواتب">إجازة</span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-2 py-3 tabular-nums text-emerald-800 text-xs">{fmtMoney(r.additionAmount)}</td>
                <td className="px-2 py-3 tabular-nums text-rose-800 text-xs">{fmtMoney(r.deductionAmount)}</td>
                <td className="px-2 py-3 tabular-nums text-rose-900 text-xs">
                  {r.manualDeductionsTotal > 0 ? fmtMoney(r.manualDeductionsTotal) : "—"}
                </td>
                <td className="px-2 py-3 tabular-nums text-emerald-900 text-xs">
                  {r.manualBonusesTotal > 0 ? fmtMoney(r.manualBonusesTotal) : "—"}
                </td>
                <td className="px-2 py-3 font-semibold tabular-nums text-slate-900 text-xs">{fmtMoney(r.netSalary)}</td>
                <td className="px-2 py-3">
                  <Link
                    href={`/reports/payroll/${r.employeeId}/slip?${q.toString()}`}
                    className="text-sm font-medium text-teal-700 hover:text-teal-900"
                  >
                    قسيمة راتب
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900">
            <tr>
              <td colSpan={2} className="px-2 py-3 whitespace-nowrap">
                إجماليات ({rows.length} موظفاً)
              </td>
              <td className="px-2 py-3 tabular-nums">{fmtMoney(totals.base)}</td>
              <td className="px-2 py-3 tabular-nums">{fmtMoney(totals.housing)}</td>
              <td className="px-2 py-3 tabular-nums">{fmtMoney(totals.transport)}</td>
              <td className="px-2 py-3 tabular-nums">{fmtMoney(totals.gross)}</td>
              <td className="px-2 py-3 text-violet-800">{totals.vacCount > 0 ? `${totals.vacCount} بإجازة` : "—"}</td>
              <td className="px-2 py-3 tabular-nums text-emerald-900">{fmtMoney(totals.add)}</td>
              <td className="px-2 py-3 tabular-nums text-rose-900">{fmtMoney(totals.ded)}</td>
              <td className="px-2 py-3 tabular-nums text-rose-950">{fmtMoney(totals.manDed)}</td>
              <td className="px-2 py-3 tabular-nums text-emerald-950">{fmtMoney(totals.manBon)}</td>
              <td className="px-2 py-3 tabular-nums text-base text-teal-900">{fmtMoney(totals.net)}</td>
              <td className="px-2 py-3" />
            </tr>
          </tfoot>
        </table>
      </div>
    </PageFrame>
  );
}
