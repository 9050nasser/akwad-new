import { eachCalendarDay } from "@/lib/day-range";
import { getPayrollRowForEmployee, getPayrollRows } from "@/lib/payroll";
import { prisma } from "@/lib/prisma";
import type { ReportEmployeeFilterParams } from "@/lib/report-employee-filters";
import { employeeReportWhere, getEmployeesAttendanceDetailReport, type AttendanceDetailRow } from "@/lib/reports";

/** نفس أساس اشتقاق قيمة الدقيقة في `lib/payroll.ts`. */
const MINUTES_IN_MONTH_NORM = 30 * 8 * 60;

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

export function payrollRatePerMinuteFromEmployee(emp: {
  baseSalaryMonthly: unknown;
  allowanceHousingMonthly: unknown;
  allowanceTransportMonthly: unknown;
}): { ratePerMinute: number; missingPackageSalary: boolean } {
  const baseRaw = emp.baseSalaryMonthly;
  const baseNum =
    baseRaw != null && Number.isFinite(Number(baseRaw)) && Number(baseRaw) > 0 ? Number(baseRaw) : 0;
  const housingRaw = emp.allowanceHousingMonthly;
  const housingNum =
    housingRaw != null && Number.isFinite(Number(housingRaw)) && Number(housingRaw) > 0
      ? Number(housingRaw)
      : 0;
  const transportRaw = emp.allowanceTransportMonthly;
  const transportNum =
    transportRaw != null && Number.isFinite(Number(transportRaw)) && Number(transportRaw) > 0
      ? Number(transportRaw)
      : 0;
  const packageMonthly = roundMoney(baseNum + housingNum + transportNum);
  const missingPackageSalary = packageMonthly <= 0;
  const ratePerMinute = missingPackageSalary ? 0 : packageMonthly / MINUTES_IN_MONTH_NORM;
  return { ratePerMinute, missingPackageSalary };
}

export type PayrollOvertimeVsLateDayRow = {
  dateKey: string;
  date: Date;
  weekdayLabel: string;
  employeeId: string;
  employeeCode: string;
  fullName: string;
  branch: string;
  checkInAt?: Date;
  checkOutAt?: Date;
  overtimeMinutes: number;
  lateMinutes: number;
  netMinutes: number;
  amount: number;
  dayNote?: string;
  ratePerMinute: number;
};

/** إجماليات الفترة كما في تقرير الرواتب (مصدر واحد للدقائق والمبالغ). */
export type PayrollOvertimeVsLatePeriodTotals = {
  overtimeMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  shortageMinutes: number;
  netMinutesOtMinusLate: number;
  additionAmount: number;
  deductionAmount: number;
  netAttendanceAmount: number;
};

export type PayrollOvertimeVsLateSummaryRow = {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  branch: string;
  ratePerMinute: number;
  missingPackageSalary: boolean;
  overtimeMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  shortageMinutes: number;
  /** إضافي − تأخير (دقائق) — للعرض فقط. */
  netMinutes: number;
  additionAmount: number;
  deductionAmount: number;
  /** صافي تأثير الحضور = إضافي − خصم حضور (مثل تقرير الرواتب). */
  amount: number;
};

function summaryRowFromPayroll(
  pr: Awaited<ReturnType<typeof getPayrollRows>>["rows"][number],
  employeeCode: string,
): PayrollOvertimeVsLateSummaryRow {
  return {
    employeeId: pr.employeeId,
    employeeCode,
    fullName: pr.fullName,
    branch: pr.branch,
    ratePerMinute: pr.ratePerMinute,
    missingPackageSalary: pr.missingPackageSalary,
    overtimeMinutes: pr.overtimeMinutes,
    lateMinutes: pr.lateMinutes,
    earlyLeaveMinutes: pr.earlyLeaveMinutes,
    shortageMinutes: pr.shortageMinutes,
    netMinutes: pr.overtimeMinutes - pr.lateMinutes,
    additionAmount: pr.additionAmount,
    deductionAmount: pr.deductionAmount,
    amount: roundMoney(pr.additionAmount - pr.deductionAmount),
  };
}

export function payrollPeriodTotalsFromPayrollRow(
  pr: Awaited<ReturnType<typeof getPayrollRows>>["rows"][number],
): PayrollOvertimeVsLatePeriodTotals {
  return {
    overtimeMinutes: pr.overtimeMinutes,
    lateMinutes: pr.lateMinutes,
    earlyLeaveMinutes: pr.earlyLeaveMinutes,
    shortageMinutes: pr.shortageMinutes,
    netMinutesOtMinusLate: pr.overtimeMinutes - pr.lateMinutes,
    additionAmount: pr.additionAmount,
    deductionAmount: pr.deductionAmount,
    netAttendanceAmount: roundMoney(pr.additionAmount - pr.deductionAmount),
  };
}

function weekdayLabelFor(date: Date): string {
  return new Intl.DateTimeFormat("ar-u-nu-latn", { weekday: "long" }).format(date);
}

function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function mapAttendanceToPayrollDay(
  row: AttendanceDetailRow,
  ratePerMinute: number,
): PayrollOvertimeVsLateDayRow {
  const netMinutes = row.overtimeMinutes - row.lateMinutes;
  return {
    dateKey: row.dateKey,
    date: parseDateKey(row.dateKey),
    weekdayLabel: weekdayLabelFor(parseDateKey(row.dateKey)),
    employeeId: row.employeeId,
    employeeCode: row.employeeCode,
    fullName: row.fullName,
    branch: row.branch,
    checkInAt: row.checkInAt,
    checkOutAt: row.checkOutAt,
    overtimeMinutes: row.overtimeMinutes,
    lateMinutes: row.lateMinutes,
    netMinutes,
    amount: roundMoney(netMinutes * ratePerMinute),
    dayNote: row.dayNote,
    ratePerMinute,
  };
}

export async function getPayrollOvertimeVsLateSummary(params: {
  companyId: string;
  from: Date;
  to: Date;
  branchId?: string;
  employeeFilters?: ReportEmployeeFilterParams;
}): Promise<{ rows: PayrollOvertimeVsLateSummaryRow[]; periodDays: number; capped: boolean }> {
  const periodDays = eachCalendarDay(params.from, params.to).length;
  const { rows: payrollRows } = await getPayrollRows({
    companyId: params.companyId,
    from: params.from,
    to: params.to,
    branchId: params.branchId,
    employeeId: undefined,
  });

  const codes = await prisma.employee.findMany({
    where: { id: { in: payrollRows.map((r) => r.employeeId) } },
    select: { id: true, employeeCode: true },
  });
  const codeById = new Map(codes.map((c) => [c.id, c.employeeCode?.trim() || "—"]));

  const rows = payrollRows.map((pr) => summaryRowFromPayroll(pr, codeById.get(pr.employeeId) ?? "—"));

  return { rows, periodDays, capped: false };
}

export async function getPayrollOvertimeVsLateDetail(params: {
  companyId: string;
  employeeId: string;
  from: Date;
  to: Date;
}): Promise<{
  employee: { id: string; fullName: string; employeeCode: string | null; branchName: string } | null;
  rows: PayrollOvertimeVsLateDayRow[];
  periodDays: number;
  ratePerMinute: number;
  missingPackageSalary: boolean;
  payrollPeriodTotals: PayrollOvertimeVsLatePeriodTotals | null;
}> {
  const periodDays = eachCalendarDay(params.from, params.to).length;
  const employee = await prisma.employee.findFirst({
    where: { id: params.employeeId, branch: { companyId: params.companyId } },
    select: {
      id: true,
      fullName: true,
      employeeCode: true,
      baseSalaryMonthly: true,
      allowanceHousingMonthly: true,
      allowanceTransportMonthly: true,
      branch: { select: { name: true } },
    },
  });
  if (!employee) {
    return {
      employee: null,
      rows: [],
      periodDays,
      ratePerMinute: 0,
      missingPackageSalary: true,
      payrollPeriodTotals: null,
    };
  }

  const payrollRow = await getPayrollRowForEmployee(params.employeeId, {
    companyId: params.companyId,
    from: params.from,
    to: params.to,
  });

  const { ratePerMinute, missingPackageSalary } = payrollRatePerMinuteFromEmployee(employee);
  const { rows: detailRows } = await getEmployeesAttendanceDetailReport({
    companyId: params.companyId,
    from: params.from,
    to: params.to,
    employeeId: params.employeeId,
    maxRows: 400,
  });

  const rows = detailRows
    .map((r) => mapAttendanceToPayrollDay(r, ratePerMinute))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  return {
    employee: {
      id: employee.id,
      fullName: employee.fullName,
      employeeCode: employee.employeeCode,
      branchName: employee.branch.name,
    },
    rows,
    periodDays,
    ratePerMinute,
    missingPackageSalary,
    payrollPeriodTotals: payrollRow ? payrollPeriodTotalsFromPayrollRow(payrollRow) : null,
  };
}

export type PayrollOvertimeVsLateDetailBlock = {
  employeeId: string;
  fullName: string;
  employeeCode: string | null;
  branchName: string;
  ratePerMinute: number;
  missingPackageSalary: boolean;
  rows: PayrollOvertimeVsLateDayRow[];
  payrollPeriodTotals: PayrollOvertimeVsLatePeriodTotals | null;
};

export async function getPayrollOvertimeVsLateDetailAll(params: {
  companyId: string;
  from: Date;
  to: Date;
  branchId?: string;
}): Promise<{ blocks: PayrollOvertimeVsLateDetailBlock[]; periodDays: number; capped: boolean }> {
  const periodDays = eachCalendarDay(params.from, params.to).length;

  const employees = await prisma.employee.findMany({
    where: employeeReportWhere(params.companyId, params.branchId, undefined),
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      fullName: true,
      employeeCode: true,
      baseSalaryMonthly: true,
      allowanceHousingMonthly: true,
      allowanceTransportMonthly: true,
      branch: { select: { name: true } },
    },
  });

  if (employees.length === 0) {
    return { blocks: [], periodDays, capped: false };
  }

  const rateById = new Map<string, { ratePerMinute: number; missingPackageSalary: boolean }>();
  for (const emp of employees) {
    rateById.set(emp.id, payrollRatePerMinuteFromEmployee(emp));
  }

  const [{ rows: detailRows, capped }, { rows: payrollRows }] = await Promise.all([
    getEmployeesAttendanceDetailReport({
      companyId: params.companyId,
      from: params.from,
      to: params.to,
      branchId: params.branchId,
      maxRows: 120_000,
    }),
    getPayrollRows({
      companyId: params.companyId,
      from: params.from,
      to: params.to,
      branchId: params.branchId,
    }),
  ]);
  const payrollById = new Map(payrollRows.map((r) => [r.employeeId, r]));

  const rowsByEmp = new Map<string, PayrollOvertimeVsLateDayRow[]>();
  for (const r of detailRows) {
    const rate = rateById.get(r.employeeId)?.ratePerMinute ?? 0;
    const mapped = mapAttendanceToPayrollDay(r, rate);
    const list = rowsByEmp.get(r.employeeId) ?? [];
    list.push(mapped);
    rowsByEmp.set(r.employeeId, list);
  }

  const blocks: PayrollOvertimeVsLateDetailBlock[] = employees.map((emp) => {
    const rateInfo = rateById.get(emp.id) ?? { ratePerMinute: 0, missingPackageSalary: true };
    const rows = (rowsByEmp.get(emp.id) ?? []).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    const pr = payrollById.get(emp.id);
    return {
      employeeId: emp.id,
      fullName: emp.fullName,
      employeeCode: emp.employeeCode,
      branchName: emp.branch.name,
      ratePerMinute: rateInfo.ratePerMinute,
      missingPackageSalary: rateInfo.missingPackageSalary,
      rows,
      payrollPeriodTotals: pr ? payrollPeriodTotalsFromPayrollRow(pr) : null,
    };
  });

  return { blocks, periodDays, capped };
}
