import {
  applyCompanyOvertimeMinutes,
  normalizeAttendancePolicy,
  normalizeOvertimePolicy,
} from "@/lib/company-attendance";
import { prisma } from "@/lib/prisma";
import { eachCalendarDay } from "@/lib/day-range";
import { yearMonthsInInclusiveRange } from "@/lib/payroll-months";
import { parseTimeToMinutes } from "@/lib/schedule-time";
import { getFixedScheduleShiftRollup, getOpenScheduleBalanceSummary } from "@/lib/reports";

/** قيمة الدقيقة من المجموع الشهري (أساسي + بدلات): افتراض ٣٠ يوماً × ٨ ساعات عمل يومية. */
const MINUTES_IN_MONTH_NORM = 30 * 8 * 60;

export type PayrollRow = {
  employeeId: string;
  fullName: string;
  branch: string;
  isOpenSchedule: boolean;
  baseSalaryMonthly: number | null;
  allowanceHousingMonthly: number;
  allowanceTransportMonthly: number;
  /** مجموع الأساسي + السكن + المواصلات شهرياً (أساس للدقيقة). */
  packageMonthly: number;
  periodDays: number;
  /** جزء الراتب الأساسي المنسوب للفترة فقط. */
  baseProportional: number;
  allowanceHousingProportional: number;
  allowanceTransportProportional: number;
  /** مجموع ما يُستحق ثابتاً للفترة (أساسي + بدلات مُنسَبة). */
  grossFixedProportional: number;
  ratePerMinute: number;
  workedMinutes: number;
  expectedMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  shortageMinutes: number;
  overtimeMinutes: number;
  deductionAmount: number;
  additionAmount: number;
  netSalary: number;
  /** لا يوجد مبلغ شهري (أساسي+بدلات) لاشتقاق قيمة الدقيقة. */
  missingPackageSalary: boolean;
  /** إجازات مسجلة في موديول الرواتب وتتقاطع مع الفترة. */
  payrollVacations: { id: string; startDate: string; endDate: string; note: string | null }[];
  hasPayrollVacationInPeriod: boolean;
  manualDeductions: { id: string; amount: number; reason: string; deductionPeriodYm: string }[];
  manualDeductionsTotal: number;
  manualBonuses: { id: string; amount: number; reason: string; bonusPeriodYm: string }[];
  manualBonusesTotal: number;
};

function segmentDurationMinutes(startTime: string, endTime: string, extendNextDay: boolean): number {
  const sm = parseTimeToMinutes(startTime);
  const em = parseTimeToMinutes(endTime);
  if (sm == null || em == null) return 0;
  let dur = em - sm;
  if (extendNextDay && dur <= 0) dur += 24 * 60;
  if (!extendNextDay && dur <= 0) return 0;
  return dur;
}

export function expectedMinutesInPeriod(
  schedule: { extendShiftNextDay: boolean; days: { weekday: number; startTime: string; endTime: string }[] },
  from: Date,
  to: Date,
  opts?: { treatFridayAsOff?: boolean },
): number {
  let sum = 0;
  const friOff = opts?.treatFridayAsOff ?? false;
  for (const d of eachCalendarDay(from, to)) {
    const wd = d.getDay();
    if (friOff && wd === 5) continue;
    const segs = schedule.days.filter((x) => x.weekday === wd);
    for (const s of segs) {
      sum += segmentDurationMinutes(s.startTime, s.endTime, schedule.extendShiftNextDay);
    }
  }
  return sum;
}

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

export async function getPayrollRows(params: {
  companyId: string;
  from: Date;
  to: Date;
  branchId?: string;
  employeeId?: string;
}): Promise<{ rows: PayrollRow[]; periodDays: number }> {
  const periodDays = eachCalendarDay(params.from, params.to).length;

  const companyRow = await prisma.company.findUnique({
    where: { id: params.companyId },
    select: {
      lateGraceMinutes: true,
      punchDedupeMinutes: true,
      fridayIsWorkday: true,
      overtimeAfterMinutes: true,
      overtimeRoundMinutes: true,
    },
  });
  const attendancePolicy = normalizeAttendancePolicy(companyRow);
  const overtimePolicy = normalizeOvertimePolicy(companyRow);
  const treatFridayAsOff = !attendancePolicy.fridayIsWorkday;

  const employees = await prisma.employee.findMany({
    where: {
      ...(params.employeeId
        ? { id: params.employeeId, branch: { companyId: params.companyId } }
        : { active: true, branch: { companyId: params.companyId, ...(params.branchId ? { id: params.branchId } : {}) } }),
    },
    orderBy: { fullName: "asc" },
    include: {
      branch: true,
      workSchedule: { include: { days: true } },
    },
  });

  const [{ rows: fixedRows }, { rows: openRows }] = await Promise.all([
    getFixedScheduleShiftRollup({
      companyId: params.companyId,
      from: params.from,
      to: params.to,
      branchId: params.branchId,
      attendancePolicy,
    }),
    getOpenScheduleBalanceSummary({
      companyId: params.companyId,
      from: params.from,
      to: params.to,
      branchId: params.branchId,
      attendancePolicy,
      overtimePolicy,
    }),
  ]);

  const fixedMap = new Map(fixedRows.map((r) => [r.employeeId, r]));
  const openMap = new Map(openRows.map((r) => [r.employeeId, r]));

  const employeeIds = employees.map((e) => e.id);
  const ymsInRange = yearMonthsInInclusiveRange(params.from, params.to);
  const branchEmpWhere = params.branchId ? { employee: { branchId: params.branchId } } : {};

  const [vacationsRaw, deductionsRaw, bonusesRaw] =
    employeeIds.length === 0
      ? [[], [], []]
      : await Promise.all([
          prisma.payrollVacation.findMany({
            where: {
              companyId: params.companyId,
              ...(params.employeeId ? { employeeId: params.employeeId } : { employeeId: { in: employeeIds } }),
              ...branchEmpWhere,
              startDate: { lte: params.to },
              endDate: { gte: params.from },
            },
            orderBy: { startDate: "asc" },
          }),
          prisma.payrollManualDeduction.findMany({
            where: {
              companyId: params.companyId,
              deductionPeriodYm: { in: ymsInRange },
              ...(params.employeeId ? { employeeId: params.employeeId } : { employeeId: { in: employeeIds } }),
              ...branchEmpWhere,
            },
            orderBy: { createdAt: "desc" },
          }),
          prisma.payrollManualBonus.findMany({
            where: {
              companyId: params.companyId,
              bonusPeriodYm: { in: ymsInRange },
              ...(params.employeeId ? { employeeId: params.employeeId } : { employeeId: { in: employeeIds } }),
              ...branchEmpWhere,
            },
            orderBy: { createdAt: "desc" },
          }),
        ]);

  const vacByEmp = new Map<string, typeof vacationsRaw>();
  for (const v of vacationsRaw) {
    const list = vacByEmp.get(v.employeeId) ?? [];
    list.push(v);
    vacByEmp.set(v.employeeId, list);
  }
  const dedByEmp = new Map<string, typeof deductionsRaw>();
  for (const d of deductionsRaw) {
    const list = dedByEmp.get(d.employeeId) ?? [];
    list.push(d);
    dedByEmp.set(d.employeeId, list);
  }
  const bonusByEmp = new Map<string, typeof bonusesRaw>();
  for (const b of bonusesRaw) {
    const list = bonusByEmp.get(b.employeeId) ?? [];
    list.push(b);
    bonusByEmp.set(b.employeeId, list);
  }

  const rows: PayrollRow[] = [];

  for (const emp of employees) {
    const baseRaw = emp.baseSalaryMonthly;
    const baseSalaryMonthly =
      baseRaw != null && Number.isFinite(Number(baseRaw)) ? Number(baseRaw) : null;
    const baseNum = baseSalaryMonthly != null && baseSalaryMonthly > 0 ? baseSalaryMonthly : 0;

    const housingRaw = emp.allowanceHousingMonthly;
    const housingNum =
      housingRaw != null && Number.isFinite(Number(housingRaw)) && Number(housingRaw) > 0 ? Number(housingRaw) : 0;
    const transportRaw = emp.allowanceTransportMonthly;
    const transportNum =
      transportRaw != null && Number.isFinite(Number(transportRaw)) && Number(transportRaw) > 0
        ? Number(transportRaw)
        : 0;

    const packageMonthly = roundMoney(baseNum + housingNum + transportNum);
    const missingPackageSalary = packageMonthly <= 0;
    const ratePerMinute = missingPackageSalary ? 0 : packageMonthly / MINUTES_IN_MONTH_NORM;
    const baseProportional = missingPackageSalary ? 0 : roundMoney((baseNum * periodDays) / 30);
    const allowanceHousingProportional = missingPackageSalary ? 0 : roundMoney((housingNum * periodDays) / 30);
    const allowanceTransportProportional = missingPackageSalary ? 0 : roundMoney((transportNum * periodDays) / 30);
    const grossFixedProportional = roundMoney(
      baseProportional + allowanceHousingProportional + allowanceTransportProportional,
    );

    const sched = emp.workSchedule;
    const isOpen = !!sched?.isOpen;

    let workedMinutes = 0;
    let lateMinutes = 0;
    let earlyLeaveMinutes = 0;
    let expectedMinutes = 0;
    let shortageMinutes = 0;
    let overtimeMinutes = 0;

    if (isOpen) {
      const o = openMap.get(emp.id);
      shortageMinutes = o?.shortageMinutes ?? 0;
      overtimeMinutes = o?.netOvertimeMinutes ?? 0;
    } else {
      const f = fixedMap.get(emp.id);
      workedMinutes = f?.workedMinutes ?? 0;
      lateMinutes = f?.lateMinutes ?? 0;
      earlyLeaveMinutes = f?.earlyLeaveMinutes ?? 0;
      if (sched && sched.days.length > 0) {
        expectedMinutes = expectedMinutesInPeriod(sched, params.from, params.to, { treatFridayAsOff });
      }
      const short = Math.max(0, expectedMinutes - workedMinutes);
      const otRaw = Math.max(0, workedMinutes - expectedMinutes);
      shortageMinutes = short;
      overtimeMinutes = applyCompanyOvertimeMinutes(otRaw, overtimePolicy);
    }

    let deductionAmount = 0;
    let additionAmount = 0;

    if (isOpen) {
      deductionAmount = roundMoney(shortageMinutes * ratePerMinute);
      additionAmount = roundMoney(overtimeMinutes * ratePerMinute);
    } else {
      const disciplineMin = lateMinutes + earlyLeaveMinutes;
      deductionAmount = roundMoney((disciplineMin + shortageMinutes) * ratePerMinute);
      additionAmount = roundMoney(overtimeMinutes * ratePerMinute);
    }

    const vacList = vacByEmp.get(emp.id) ?? [];
    const payrollVacations = vacList.map((v) => ({
      id: v.id,
      startDate: v.startDate.toISOString(),
      endDate: v.endDate.toISOString(),
      note: v.note,
    }));
    const hasPayrollVacationInPeriod = payrollVacations.length > 0;

    const dedList = dedByEmp.get(emp.id) ?? [];
    const manualDeductions = dedList.map((d) => ({
      id: d.id,
      amount: roundMoney(Number(d.amount)),
      reason: d.reason,
      deductionPeriodYm: d.deductionPeriodYm,
    }));
    const manualDeductionsTotal = roundMoney(manualDeductions.reduce((s, d) => s + d.amount, 0));

    const bonusList = bonusByEmp.get(emp.id) ?? [];
    const manualBonuses = bonusList.map((b) => ({
      id: b.id,
      amount: roundMoney(Number(b.amount)),
      reason: b.reason,
      bonusPeriodYm: b.bonusPeriodYm,
    }));
    const manualBonusesTotal = roundMoney(manualBonuses.reduce((s, b) => s + b.amount, 0));

    const netSalary = roundMoney(
      grossFixedProportional +
        additionAmount -
        deductionAmount -
        manualDeductionsTotal +
        manualBonusesTotal,
    );

    rows.push({
      employeeId: emp.id,
      fullName: emp.fullName,
      branch: emp.branch.name,
      isOpenSchedule: isOpen,
      baseSalaryMonthly: baseSalaryMonthly != null && baseSalaryMonthly > 0 ? baseSalaryMonthly : null,
      allowanceHousingMonthly: housingNum,
      allowanceTransportMonthly: transportNum,
      packageMonthly,
      periodDays,
      baseProportional,
      allowanceHousingProportional,
      allowanceTransportProportional,
      grossFixedProportional,
      ratePerMinute,
      workedMinutes,
      expectedMinutes,
      lateMinutes,
      earlyLeaveMinutes,
      shortageMinutes,
      overtimeMinutes,
      deductionAmount,
      additionAmount,
      netSalary,
      missingPackageSalary,
      payrollVacations,
      hasPayrollVacationInPeriod,
      manualDeductions,
      manualDeductionsTotal,
      manualBonuses,
      manualBonusesTotal,
    });
  }

  return { rows, periodDays };
}

export async function getPayrollRowForEmployee(
  employeeId: string,
  params: { companyId: string; from: Date; to: Date },
): Promise<PayrollRow | null> {
  const { rows } = await getPayrollRows({ ...params, employeeId });
  return rows[0] ?? null;
}
