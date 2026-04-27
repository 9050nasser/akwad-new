import Link from "next/link";
import { PageFrame } from "@/components/page-frame";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { monthRangeInputs } from "@/lib/default-range";
import { formatDateOnly } from "@/lib/format";
import { firstQuery } from "@/lib/flash";
import { prisma } from "@/lib/prisma";
import { parseRangeFromSearch } from "@/lib/reports";
import { requireTenantSession } from "@/lib/tenant";
import { redirect } from "next/navigation";

export default async function PayrollVacationsReportPage({
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
  const { from, to } = parseRangeFromSearch(fromStr, toStr);

  const rows = await prisma.payrollVacation.findMany({
    where: {
      companyId,
      startDate: { lte: to },
      endDate: { gte: from },
    },
    include: { employee: { select: { fullName: true, branch: { select: { name: true } } } } },
    orderBy: { startDate: "asc" },
  });

  return (
    <PageFrame
      exportFileSlug="payroll-vacations-report"
      title="تقرير إجازات الموظفين (الرواتب)"
      subtitle="كل الإجازات المسجلة في موديول الرواتب التي تتقاطع مع الفترة المحددة."
    >
      <p className="mb-6 flex flex-wrap gap-3 text-sm">
        <Link href="/reports/payroll/vacations" className="font-medium text-teal-700 hover:text-teal-900">
          ← تسجيل الإجازات
        </Link>
        <Link href="/reports/payroll" className="font-medium text-teal-700 hover:text-teal-900">
          تقرير الرواتب
        </Link>
      </p>

      <form method="get" className="mb-6 grid gap-4 md:grid-cols-4">
        <div>
          <Label htmlFor="from">من</Label>
          <input id="from" name="from" type="date" className={fieldClass} defaultValue={fromStr} />
        </div>
        <div>
          <Label htmlFor="to">إلى</Label>
          <input id="to" name="to" type="date" className={fieldClass} defaultValue={toStr} />
        </div>
        <div className="flex items-end">
          <PrimaryButton type="submit">عرض</PrimaryButton>
        </div>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3">الموظف</th>
              <th className="px-3 py-3">الفرع</th>
              <th className="px-3 py-3">بداية الإجازة</th>
              <th className="px-3 py-3">نهاية الإجازة</th>
              <th className="px-3 py-3">ملاحظة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                  لا توجد إجازات في هذه الفترة.
                </td>
              </tr>
            ) : (
              rows.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/80">
                  <td className="px-3 py-3 font-medium text-slate-900">{v.employee.fullName}</td>
                  <td className="px-3 py-3 text-slate-600">{v.employee.branch.name}</td>
                  <td className="px-3 py-3 tabular-nums text-slate-700">{formatDateOnly(v.startDate)}</td>
                  <td className="px-3 py-3 tabular-nums text-slate-700">{formatDateOnly(v.endDate)}</td>
                  <td className="px-3 py-3 text-slate-600">{v.note ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-slate-500">عدد السجلات: {rows.length}</p>
    </PageFrame>
  );
}
