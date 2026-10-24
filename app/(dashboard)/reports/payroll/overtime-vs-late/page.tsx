import Link from "next/link";
import { redirect } from "next/navigation";
import { PageFrame } from "@/components/page-frame";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { monthRangeInputs } from "@/lib/default-range";
import { firstQuery } from "@/lib/flash";
import { formatDateOnly, formatDurationMinutes, formatSignedDurationMinutes } from "@/lib/format";
import { formatCompanyMoney } from "@/lib/company-settings";
import { getPayrollOvertimeVsLateSummary } from "@/lib/payroll-overtime-vs-late";
import { parseRangeFromSearch } from "@/lib/reports";
import { prisma } from "@/lib/prisma";
import { getUiLocale } from "@/lib/ui/prefs";
import { requireTenantSession } from "@/lib/tenant";

export default async function PayrollOvertimeVsLateSummaryPage({
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
  const { rows, periodDays, capped } = await getPayrollOvertimeVsLateSummary({
    companyId,
    from,
    to,
    branchId,
  });
  const branches = await prisma.branch.findMany({ where: { companyId }, orderBy: { name: "asc" } });

  const qBase = new URLSearchParams({ from: fromStr, to: toStr });
  if (branchId) qBase.set("branchId", branchId);

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
    <PageFrame
      exportFileSlug="payroll-ot-minus-late-summary"
      title="فرق الإضافي من التأخير بالرواتب — إجمالي"
    >
      <p className="mb-4 flex flex-wrap items-center gap-3 text-sm print:hidden" data-html2canvas-ignore="true">
        <Link href="/reports/payroll" className="font-medium text-teal-700 hover:text-teal-900">
          تقرير الرواتب
        </Link>
        <Link
          href={`/reports/payroll/overtime-vs-late/detail?${qBase.toString()}`}
          className="font-medium text-teal-700 hover:text-teal-900"
        >
          التقرير التفصيلي (موظف واحد)
        </Link>
        <Link
          href={`/reports/payroll/overtime-vs-late/detail?${new URLSearchParams({ ...Object.fromEntries(qBase), allEmployees: "1" }).toString()}`}
          className="font-medium text-teal-700 hover:text-teal-900"
        >
          التقرير التفصيلي (كل الموظفين)
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
          الفترة: {formatDateOnly(from)} — {formatDateOnly(to)} ({periodDays} يوماً). معامل الساعة: ساعة بساعة — قيمة
          الدقيقة تُشتق من (الأساسي + البدلات) ÷ (30×8×60).
        </p>
      </div>

      {capped ? (
        <p className="mt-4 text-sm text-amber-800 print:hidden">
          تم اقتصار جزء من البيانات اليومية بسبب حجم النتائج. ضيّق الفترة أو الفرع ثم أعد العرض.
        </p>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-slate-50 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-2 py-3">الموظف</th>
              <th className="px-2 py-3">الكود</th>
              <th className="px-2 py-3">الفرع</th>
              <th className="px-2 py-3 whitespace-nowrap">قيمة الدقيقة</th>
              <th className="px-2 py-3">الإضافي</th>
              <th className="px-2 py-3">التأخير</th>
              <th className="px-2 py-3 whitespace-nowrap">فرق الدقائق</th>
              <th className="px-2 py-3">المبلغ</th>
              <th className="px-2 py-3 w-28 print:hidden">تفصيلي</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((r) => {
              const detailQs = new URLSearchParams(qBase);
              detailQs.set("employeeId", r.employeeId);
              return (
                <tr key={r.employeeId} className="hover:bg-slate-50/80">
                  <td className="px-2 py-3 font-medium text-slate-900">{r.fullName}</td>
                  <td className="px-2 py-3 text-slate-600 tabular-nums">{r.employeeCode}</td>
                  <td className="px-2 py-3 text-slate-600">{r.branch}</td>
                  <td className="px-2 py-3 tabular-nums text-xs text-slate-700">
                    {r.missingPackageSalary ? "—" : fmtMoney(r.ratePerMinute)}
                  </td>
                  <td className="px-2 py-3 tabular-nums text-emerald-700">{formatDurationMinutes(r.overtimeMinutes)}</td>
                  <td className="px-2 py-3 tabular-nums text-rose-700">{formatDurationMinutes(r.lateMinutes)}</td>
                  <td className="px-2 py-3 tabular-nums text-slate-800">
                    {formatSignedDurationMinutes(r.netMinutes)}
                  </td>
                  <td
                    className={`px-2 py-3 tabular-nums font-medium ${r.amount >= 0 ? "text-emerald-800" : "text-rose-800"}`}
                  >
                    {r.missingPackageSalary ? "—" : fmtMoney(r.amount)}
                  </td>
                  <td className="px-2 py-3 print:hidden">
                    <Link
                      href={`/reports/payroll/overtime-vs-late/detail?${detailQs.toString()}`}
                      className="text-sm font-medium text-teal-700 hover:text-teal-900"
                    >
                      تفصيلي
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900">
            <tr>
              <td colSpan={4} className="px-2 py-3 whitespace-nowrap">
                إجماليات ({rows.length} موظفاً)
              </td>
              <td className="px-2 py-3 tabular-nums text-emerald-800">{formatDurationMinutes(totals.ot)}</td>
              <td className="px-2 py-3 tabular-nums text-rose-800">{formatDurationMinutes(totals.late)}</td>
              <td className="px-2 py-3 tabular-nums">{formatSignedDurationMinutes(totals.net)}</td>
              <td className="px-2 py-3 tabular-nums text-teal-900">{fmtMoney(totals.amount)}</td>
              <td className="px-2 py-3 print:hidden" />
            </tr>
          </tfoot>
        </table>
      </div>
    </PageFrame>
  );
}
