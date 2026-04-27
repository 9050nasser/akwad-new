import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageFrame } from "@/components/page-frame";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { monthRangeInputs } from "@/lib/default-range";
import { firstQuery } from "@/lib/flash";
import { formatDateOnly } from "@/lib/format";
import { parseRangeFromSearch } from "@/lib/reports";
import { formatCompanyMoney } from "@/lib/company-settings";
import { getPayrollRowForEmployee } from "@/lib/payroll";
import { prisma } from "@/lib/prisma";
import { getUiLocale } from "@/lib/ui/prefs";
import { requireTenantSession } from "@/lib/tenant";

export default async function PayrollSlipPage({
  params,
  searchParams,
}: {
  params: Promise<{ employeeId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireTenantSession();
  const companyId = session.companyId;
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company?.enablePayroll) redirect("/reports?err=payroll_disabled");
  const locale = await getUiLocale(company.defaultLocale === "en" ? "en" : "ar");
  const fmtMoney = (n: number) => formatCompanyMoney(company, n, locale);

  const { employeeId } = await params;
  const sp = (await searchParams) ?? {};
  const defaults = monthRangeInputs();
  const fromStr = firstQuery(sp.from) ?? defaults.from;
  const toStr = firstQuery(sp.to) ?? defaults.to;
  const { from, to } = parseRangeFromSearch(fromStr, toStr);

  const [employee, row] = await Promise.all([
    prisma.employee.findFirst({
      where: { id: employeeId, branch: { companyId } },
      include: { branch: true },
    }),
    getPayrollRowForEmployee(employeeId, { companyId, from, to }),
  ]);

  if (!employee || !row) notFound();

  const qBack = new URLSearchParams({ from: fromStr, to: toStr });

  return (
    <PageFrame exportFileSlug="payroll-slip" title="قسيمة راتب" subtitle={employee.fullName}>
      <div className="print:hidden" data-html2canvas-ignore="true">
        <p className="mb-4 flex flex-wrap gap-3 text-sm">
          <Link href={`/reports/payroll?${qBack.toString()}`} className="font-medium text-teal-700 hover:text-teal-900">
            ← تقرير الرواتب
          </Link>
          <span className="text-slate-400">|</span>
          <span className="text-slate-600">للطباعة: Ctrl+P أو قائمة المتصفح → طباعة</span>
        </p>
        <form method="get" className="mb-6 grid gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="slip-from">من</Label>
            <input id="slip-from" name="from" type="date" className={fieldClass} defaultValue={fromStr} />
          </div>
          <div>
            <Label htmlFor="slip-to">إلى</Label>
            <input id="slip-to" name="to" type="date" className={fieldClass} defaultValue={toStr} />
          </div>
          <div className="flex items-end">
            <PrimaryButton type="submit">تحديث الفترة</PrimaryButton>
          </div>
        </form>
      </div>

      <article className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm print:border-0 print:shadow-none">
        <header className="border-b border-slate-200 pb-4 text-center">
          <p className="text-lg font-bold text-slate-900">{company.shellShortName?.trim() || company.name}</p>
          {company.reportHeaderLine ? (
            <p className="mt-1 text-sm font-medium text-slate-700">{company.reportHeaderLine}</p>
          ) : null}
          <p className="mt-1 text-sm text-slate-600">قسيمة راتب — {formatDateOnly(from)} إلى {formatDateOnly(to)}</p>
        </header>

        <section className="mt-4 space-y-2 text-sm">
          <p>
            <span className="text-slate-500">الموظف:</span>{" "}
            <span className="font-semibold text-slate-900">{employee.fullName}</span>
          </p>
          <p>
            <span className="text-slate-500">الفرع:</span> {employee.branch.name}
          </p>
          <p>
            <span className="text-slate-500">نوع الدوام في الحساب:</span>{" "}
            {row.isOpenSchedule ? "دوام مفتوح" : "دوام بشفتات ثابتة"}
          </p>
          {row.missingPackageSalary ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
              لم يُعرَّف راتب أو بدلات شهرية (المجموع صفر)؛ المبالغ المعروضة صفر. حدِّد الأساسي أو البدلات من شاشة الموظفين.
            </p>
          ) : (
            <div className="space-y-1 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm">
              <p className="flex justify-between gap-4">
                <span className="text-slate-500">الراتب الأساسي الشهري</span>
                <span className="tabular-nums font-medium">{fmtMoney(row.baseSalaryMonthly ?? 0)}</span>
              </p>
              <p className="flex justify-between gap-4">
                <span className="text-slate-500">بدل سكن شهري</span>
                <span className="tabular-nums font-medium">{fmtMoney(row.allowanceHousingMonthly)}</span>
              </p>
              <p className="flex justify-between gap-4">
                <span className="text-slate-500">بدل مواصلات شهري</span>
                <span className="tabular-nums font-medium">{fmtMoney(row.allowanceTransportMonthly)}</span>
              </p>
              <p className="flex justify-between gap-4 border-t border-slate-200 pt-1 font-semibold text-slate-900">
                <span>المجموع الشهري</span>
                <span className="tabular-nums">{fmtMoney(row.packageMonthly)}</span>
              </p>
            </div>
          )}
        </section>

        <section className="mt-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">تفاصيل الدقائق (من البصمة المرحّلة)</h2>
          <dl className="grid gap-1 text-sm text-slate-700">
            {!row.isOpenSchedule ? (
              <>
                <div className="flex justify-between gap-4">
                  <dt>دقائق العمل الفعلية</dt>
                  <dd className="tabular-nums">{row.workedMinutes}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>دقائق الدوام المجدولة في الفترة</dt>
                  <dd className="tabular-nums">{row.expectedMinutes}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>تأخير + خروج مبكر (دقائق)</dt>
                  <dd className="tabular-nums">{row.lateMinutes + row.earlyLeaveMinutes}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>نقص عن المجدول (دقائق)</dt>
                  <dd className="tabular-nums">{row.shortageMinutes}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>وقت إضافي عن المجدول (دقائق)</dt>
                  <dd className="tabular-nums">{row.overtimeMinutes}</dd>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between gap-4">
                  <dt>نقص عن الهدف اليومي (دقائق)</dt>
                  <dd className="tabular-nums">{row.shortageMinutes}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>إضافي صافٍ (دقائق)</dt>
                  <dd className="tabular-nums">{row.overtimeMinutes}</dd>
                </div>
              </>
            )}
          </dl>
        </section>

        {row.hasPayrollVacationInPeriod ? (
          <section className="mt-6 rounded-lg border border-violet-100 bg-violet-50/50 p-4 text-sm">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-800">إجازة (موديول الرواتب)</h2>
            <ul className="list-disc space-y-1.5 ps-4 text-slate-700">
              {row.payrollVacations.map((v) => (
                <li key={v.id}>
                  من {formatDateOnly(new Date(v.startDate))} إلى {formatDateOnly(new Date(v.endDate))}
                  {v.note ? ` — ${v.note}` : ""}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-6 border-t border-slate-200 pt-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            الاستحقاق والخصومات للفترة ({row.periodDays} يوماً)
          </h2>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {!row.missingPackageSalary ? (
                <>
                  <tr>
                    <td className="py-2 text-slate-600">الأساسي المنسوب</td>
                    <td className="py-2 text-end tabular-nums font-medium">{fmtMoney(row.baseProportional)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-600">بدل السكن المنسوب</td>
                    <td className="py-2 text-end tabular-nums font-medium">{fmtMoney(row.allowanceHousingProportional)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-600">بدل المواصلات المنسوب</td>
                    <td className="py-2 text-end tabular-nums font-medium">{fmtMoney(row.allowanceTransportProportional)}</td>
                  </tr>
                  <tr className="bg-slate-50 font-semibold text-slate-900">
                    <td className="py-2">إجمالي الاستحقاق الثابت</td>
                    <td className="py-2 text-end tabular-nums">{fmtMoney(row.grossFixedProportional)}</td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td colSpan={2} className="py-2 text-sm text-amber-800">
                    لا يوجد استحقاق ثابت (راتب/بدلات) — خصومات الحضور والإضافي تُحسب بقيمة دقيقة صفر.
                  </td>
                </tr>
              )}
              <tr>
                <td className="py-2 text-emerald-800">+ إضافي (من الحركات المرحّلة)</td>
                <td className="py-2 text-end tabular-nums font-medium text-emerald-900">{fmtMoney(row.additionAmount)}</td>
              </tr>
              <tr>
                <td className="py-2 text-rose-800">− خصومات الحضور (من الحركات المرحّلة)</td>
                <td className="py-2 text-end tabular-nums font-medium text-rose-900">{fmtMoney(row.deductionAmount)}</td>
              </tr>
              {row.manualDeductions.map((d) => (
                <tr key={d.id}>
                  <td className="py-2 text-rose-900">
                    − خصم يدوي ({d.deductionPeriodYm}): {d.reason}
                  </td>
                  <td className="py-2 text-end tabular-nums font-medium text-rose-950">{fmtMoney(d.amount)}</td>
                </tr>
              ))}
              {row.manualBonuses.map((b) => (
                <tr key={b.id}>
                  <td className="py-2 text-emerald-900">
                    + إضافة يدوية ({b.bonusPeriodYm}): {b.reason}
                  </td>
                  <td className="py-2 text-end tabular-nums font-medium text-emerald-950">{fmtMoney(b.amount)}</td>
                </tr>
              ))}
              <tr className="border-t border-slate-300 bg-teal-50/60 font-bold">
                <td className="py-3 text-slate-900">الصافي</td>
                <td className="py-3 text-end text-lg tabular-nums text-slate-900">{fmtMoney(row.netSalary)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <footer className="mt-8 border-t border-slate-100 pt-3 text-center text-xs text-slate-400 print:mt-12">
          {company.reportFooterLine ? (
            <p className="mb-2 text-sm font-medium text-slate-600">{company.reportFooterLine}</p>
          ) : null}
          <p>وثيقة مولَّدة آلياً من النظام — لا تعتبر مستنداً رسمياً دون اعتماد الموارد البشرية.</p>
        </footer>
      </article>
    </PageFrame>
  );
}
