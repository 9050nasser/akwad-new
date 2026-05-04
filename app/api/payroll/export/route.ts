import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { monthRangeInputs } from "@/lib/default-range";
import { normalizeVisibleColumnGroups } from "@/lib/report-column-config";
import { loadReportColumnsCookie } from "@/lib/report-columns-cookie";
import { buildPayrollCsvFromVisibleColumns } from "@/lib/payroll-export-csv";
import { getPayrollRows } from "@/lib/payroll";
import { prisma } from "@/lib/prisma";
import { parseRangeFromSearch } from "@/lib/reports";

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

  const [{ rows }, colCookie] = await Promise.all([
    getPayrollRows({ companyId: company.id, from, to, branchId }),
    loadReportColumnsCookie(),
  ]);

  const visibleColumnIds = normalizeVisibleColumnGroups("payroll", colCookie.bySlug?.payroll);
  const slipQuery = new URLSearchParams({ from: fromStr, to: toStr });
  if (branchId) slipQuery.set("branchId", branchId);

  const origin = req.nextUrl.origin;
  const csv = buildPayrollCsvFromVisibleColumns({
    rows,
    visibleColumnIds,
    slipQuery,
    origin,
  });

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
