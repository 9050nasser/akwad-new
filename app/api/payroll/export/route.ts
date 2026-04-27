import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { monthRangeInputs } from "@/lib/default-range";
import { getPayrollRows, type PayrollRow } from "@/lib/payroll";
import { prisma } from "@/lib/prisma";
import { parseRangeFromSearch } from "@/lib/reports";

function csvCell(v: string | number): string {
  const s = String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowToCsvLine(r: PayrollRow): string {
  return [
    r.fullName,
    r.branch,
    r.missingPackageSalary ? "" : r.baseProportional,
    r.missingPackageSalary ? "" : r.allowanceHousingProportional,
    r.missingPackageSalary ? "" : r.allowanceTransportProportional,
    r.missingPackageSalary ? "" : r.grossFixedProportional,
    r.hasPayrollVacationInPeriod ? "yes" : "",
    r.additionAmount,
    r.deductionAmount,
    r.manualDeductionsTotal,
    r.manualBonusesTotal,
    r.netSalary,
  ]
    .map(csvCell)
    .join(",");
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.companyId || session.isPlatformAdmin) {
    return new Response("Unauthorized", { status: 401 });
  }

  const company = await prisma.company.findUnique({ where: { id: session.companyId } });
  if (!company?.enablePayroll || company.isPlatformTenant || company.onHold) {
    return new Response("Forbidden", { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const defaults = monthRangeInputs();
  const fromStr = sp.get("from") ?? defaults.from;
  const toStr = sp.get("to") ?? defaults.to;
  const rawBranch = sp.get("branchId");
  let branchId: string | undefined;
  if (rawBranch === null) {
    branchId = company.defaultReportBranchId ?? undefined;
  } else if (rawBranch === "") {
    branchId = undefined;
  } else {
    branchId = rawBranch || undefined;
  }
  const { from, to } = parseRangeFromSearch(fromStr, toStr);

  const { rows } = await getPayrollRows({ companyId: company.id, from, to, branchId });

  const header = [
    "employee",
    "branch",
    "base_period",
    "housing_period",
    "transport_period",
    "gross_fixed",
    "vacation",
    "addition_attendance",
    "deduction_attendance",
    "manual_deductions",
    "manual_bonuses",
    "net",
  ].join(",");

  const body = rows.map(rowToCsvLine).join("\r\n");
  const csv = `\uFEFF${header}\r\n${body}`;

  const fname = `payroll-${fromStr}-${toStr}.csv`;
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fname}"`,
      "Cache-Control": "no-store",
    },
  });
}
