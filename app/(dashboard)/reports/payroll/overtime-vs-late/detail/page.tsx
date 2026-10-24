import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { PageFrame } from "@/components/page-frame";
import { PayrollOtMinusLateDetailTable } from "@/components/reports/payroll-ot-minus-late-detail-table";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { eachCalendarDay } from "@/lib/day-range";
import { monthRangeInputs } from "@/lib/default-range";
import { firstQuery } from "@/lib/flash";
import { formatDateOnly } from "@/lib/format";
import { formatCompanyMoney } from "@/lib/company-settings";
import {
  getPayrollOvertimeVsLateDetail,
  getPayrollOvertimeVsLateDetailAll,
} from "@/lib/payroll-overtime-vs-late";
import { parseRangeFromSearch } from "@/lib/reports";
import { prisma } from "@/lib/prisma";
import { getUiLocale } from "@/lib/ui/prefs";
import { requireTenantSession } from "@/lib/tenant";

function parseBranchId(
  rawBranch: string | undefined,
  defaultReportBranchId: string | null,
): string | undefined {
  if (rawBranch === undefined) return defaultReportBranchId ?? undefined;
  if (rawBranch === "") return undefined;
  return rawBranch;
}

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
  const showAll = firstQuery(sp.allEmployees) === "1";
  const branchId = parseBranchId(firstQuery(sp.branchId), company.defaultReportBranchId);

  const locale = await getUiLocale(company.defaultLocale === "en" ? "en" : "ar");
  const fmtMoney = (n: number) => formatCompanyMoney(company, n, locale);
  const { from, to } = parseRangeFromSearch(fromStr, toStr);

  const branches = await prisma.branch.findMany({ where: { companyId }, orderBy: { name: "asc" } });

  const employees = await prisma.employee.findMany({
    where: { active: true, branch: { companyId } },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, employeeCode: true },
  });

  const emptyPeriodDays = eachCalendarDay(from, to).length;

  const allData = showAll
    ? await getPayrollOvertimeVsLateDetailAll({ companyId, from, to, branchId })
    : null;

  const singleData =
    !showAll && employeeId
      ? await getPayrollOvertimeVsLateDetail({ companyId, employeeId, from, to })
      : {
          employee: null,
          rows: [],
          periodDays: emptyPeriodDays,
          ratePerMinute: 0,
          missingPackageSalary: true,
        };

  const qBack = new URLSearchParams({ from: fromStr, to: toStr });
  if (branchId) qBack.set("branchId", branchId);

  const periodDays = showAll ? (allData?.periodDays ?? emptyPeriodDays) : singleData.periodDays;
  const employee = showAll ? null : singleData.employee;
  const rows = showAll ? [] : singleData.rows;
  const ratePerMinute = showAll ? 0 : singleData.ratePerMinute;
  const missingPackageSalary = showAll ? true : singleData.missingPackageSalary;

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
          <div>
            <Label htmlFor="employeeId">الموظف</Label>
            <select
              id="employeeId"
              name="employeeId"
              className={fieldClass}
              defaultValue={employeeId}
              required={!showAll}
              disabled={showAll}
            >
              <option value="">— اختر موظفاً —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName}
                  {e.employeeCode?.trim() ? ` (${e.employeeCode.trim()})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-4 flex flex-wrap items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm hover:bg-slate-50">
              <input
                type="checkbox"
                name="allEmployees"
                value="1"
                defaultChecked={showAll}
                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <Users className="h-4 w-4 text-teal-700" aria-hidden />
              <span className="font-medium">إظهار كل الموظفين (تفصيلي)</span>
            </label>
            <PrimaryButton type="submit">عرض</PrimaryButton>
          </div>
        </form>
      </div>

      {showAll ? (
        <>
          <p className="mt-4 text-sm text-slate-800">
            من {formatDateOnly(from)} إلى {formatDateOnly(to)} ({periodDays} يوماً)
            {branchId ? (
              <>
                {" "}
                — الفرع: {branches.find((b) => b.id === branchId)?.name ?? "—"}
              </>
            ) : (
              " — كل الفروع"
            )}
            . عدد الموظفين: {allData?.blocks.length ?? 0}.
          </p>
          {allData?.capped ? (
            <p className="mt-2 text-sm text-amber-800">تم اقتصار النتائج على الحد الأقصى للصفوف؛ قد تكون البيانات ناقصة.</p>
          ) : null}
          <div className="mt-6 space-y-10">
            {(allData?.blocks ?? []).map((block, idx, arr) => (
              <section
                key={block.employeeId}
                className={idx < arr.length - 1 ? "print:break-after-page" : undefined}
              >
                <div className="mb-3 space-y-1 text-sm text-slate-800">
                  <p>
                    <span className="font-semibold">الموظف:</span> {block.fullName}
                    <span className="mx-2 text-slate-400">|</span>
                    <span className="font-semibold">الكود:</span> {block.employeeCode?.trim() || "—"}
                    <span className="mx-2 text-slate-400">|</span>
                    <span className="font-semibold">الفرع:</span> {block.branchName}
                  </p>
                  <p className="text-xs text-slate-600">
                    قيمة الدقيقة:{" "}
                    {block.missingPackageSalary ? "—" : fmtMoney(block.ratePerMinute)}.
                  </p>
                </div>
                <PayrollOtMinusLateDetailTable
                  rows={block.rows}
                  missingPackageSalary={block.missingPackageSalary}
                  fmtMoney={fmtMoney}
                />
              </section>
            ))}
          </div>
          {(allData?.blocks.length ?? 0) === 0 ? (
            <p className="mt-4 text-sm text-slate-600">لا يوجد موظفون في هذا الفرع.</p>
          ) : null}
        </>
      ) : (
        <>
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
            <p className="mt-4 text-sm text-slate-600">اختر موظفاً أو فعّل «إظهار كل الموظفين» ثم اضغط «عرض».</p>
          )}

          {employee ? (
            <div className="mt-6">
              <PayrollOtMinusLateDetailTable
                rows={rows}
                missingPackageSalary={missingPackageSalary}
                fmtMoney={fmtMoney}
              />
            </div>
          ) : null}
        </>
      )}
    </PageFrame>
  );
}
