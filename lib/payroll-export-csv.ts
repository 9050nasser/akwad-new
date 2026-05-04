import type { PayrollRow } from "@/lib/payroll";

/** رؤوس CSV الحالية (مستقرة للاستيراد الآلي) */
const PAYROLL_CSV_HEADER_BY_COLUMN_ID: Record<string, string> = {
  employee: "employee",
  branch: "branch",
  base: "base_period",
  housing: "housing_period",
  transport: "transport_period",
  gross: "gross_fixed",
  vacation: "vacation",
  addition: "addition_attendance",
  dedAttendance: "deduction_attendance",
  dedManual: "manual_deductions",
  addManual: "manual_bonuses",
  net: "net",
  slip: "slip_url",
};

function csvCell(v: string | number): string {
  const s = String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildPayrollCsvFromVisibleColumns(input: {
  rows: PayrollRow[];
  /** ترتيب معرفات الأعمدة كما في `normalizeVisibleColumnGroups("payroll", …)` */
  visibleColumnIds: string[];
  slipQuery: URLSearchParams;
  origin: string;
}): string {
  const { rows, visibleColumnIds, slipQuery, origin } = input;
  const ids = visibleColumnIds.filter((id) => PAYROLL_CSV_HEADER_BY_COLUMN_ID[id]);
  const header = ids.map((id) => PAYROLL_CSV_HEADER_BY_COLUMN_ID[id]).join(",");

  const lineForRow = (r: PayrollRow): string => {
    const cells: (string | number)[] = [];
    for (const id of ids) {
      switch (id) {
        case "employee":
          cells.push(r.fullName);
          break;
        case "branch":
          cells.push(r.branch);
          break;
        case "base":
          cells.push(r.missingPackageSalary ? "" : r.baseProportional);
          break;
        case "housing":
          cells.push(r.missingPackageSalary ? "" : r.allowanceHousingProportional);
          break;
        case "transport":
          cells.push(r.missingPackageSalary ? "" : r.allowanceTransportProportional);
          break;
        case "gross":
          cells.push(r.missingPackageSalary ? "" : r.grossFixedProportional);
          break;
        case "vacation":
          cells.push(r.hasPayrollVacationInPeriod ? "yes" : "");
          break;
        case "addition":
          cells.push(r.additionAmount);
          break;
        case "dedAttendance":
          cells.push(r.deductionAmount);
          break;
        case "dedManual":
          cells.push(r.manualDeductionsTotal);
          break;
        case "addManual":
          cells.push(r.manualBonusesTotal);
          break;
        case "net":
          cells.push(r.netSalary);
          break;
        case "slip": {
          const q = new URLSearchParams(slipQuery.toString());
          cells.push(`${origin}/reports/payroll/${r.employeeId}/slip?${q.toString()}`);
          break;
        }
        default:
          break;
      }
    }
    return cells.map(csvCell).join(",");
  };

  const body = rows.map(lineForRow).join("\r\n");
  return `\uFEFF${header}\r\n${body}`;
}
