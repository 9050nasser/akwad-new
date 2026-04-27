import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { attendanceForCompany, employeesForCompany } from "@/lib/company-scope";
import { eachCalendarDay, localDayRange, parseDateOnly } from "@/lib/day-range";
import {
  dedupePunchSequence,
  localCalendarDayStart,
  localDayKey,
  metricsForFixedDay,
  pairInOutSequence,
  type ShiftDayMetrics,
} from "@/lib/shift-metrics";
import {
  applyCompanyOvertimeMinutes,
  normalizeAttendancePolicy,
  normalizeOvertimePolicy,
  type CompanyAttendancePolicy,
  type CompanyOvertimePolicy,
} from "@/lib/company-attendance";

export type DailyRow = {
  employeeId: string;
  fullName: string;
  branch: string;
  hasPostedIn: boolean;
  hasPostedOut: boolean;
  firstAt?: Date;
  lastAt?: Date;
};

export async function getDailyStatus(params: { companyId: string; date: Date; branchId?: string }) {
  const { start, end } = localDayRange(params.date);
  const employees = await prisma.employee.findMany({
    where: {
      active: true,
      ...employeesForCompany(params.companyId, params.branchId),
    },
    orderBy: { fullName: "asc" },
    include: { branch: true, workSchedule: { select: { isOpen: true } } },
  });

  const events = await prisma.attendanceEvent.findMany({
    where: {
      isPosted: true,
      at: { gte: start, lte: end },
      ...attendanceForCompany(params.companyId, params.branchId),
      employeeId: { not: null },
    },
    orderBy: { at: "asc" },
  });

  const byEmp = new Map<string, typeof events>();
  for (const e of events) {
    if (!e.employeeId) continue;
    const arr = byEmp.get(e.employeeId) ?? [];
    arr.push(e);
    byEmp.set(e.employeeId, arr);
  }

  const rows: DailyRow[] = employees.map((emp) => {
    const list = byEmp.get(emp.id) ?? [];
    const ins = list.filter((x) => x.kind === "CHECK_IN");
    const outs = list.filter((x) => x.kind === "CHECK_OUT");
    const firstAt = list[0]?.at;
    const lastAt = list[list.length - 1]?.at;
    const open = emp.workSchedule?.isOpen;
    return {
      employeeId: emp.id,
      fullName: emp.fullName,
      branch: emp.branch.name,
      hasPostedIn: open ? list.length > 0 : ins.length > 0,
      hasPostedOut: open ? list.length > 1 : outs.length > 0,
      firstAt,
      lastAt,
    };
  });

  return { rows, range: { start, end } };
}

export async function getMovements(params: {
  companyId: string;
  from: Date;
  to: Date;
  branchId?: string;
  posted?: "all" | "yes" | "no";
  employeeId?: string;
}) {
  const where: Prisma.AttendanceEventWhereInput = {
    at: { gte: params.from, lte: params.to },
    ...attendanceForCompany(params.companyId, params.branchId),
    ...(params.employeeId ? { employeeId: params.employeeId } : {}),
  };

  if (params.posted === "yes") where.isPosted = true;
  if (params.posted === "no") where.isPosted = false;

  return prisma.attendanceEvent.findMany({
    where,
    orderBy: { at: "desc" },
    include: {
      branch: true,
      employee: true,
      device: true,
    },
    take: 500,
  });
}

export async function getEmployeeReport(params: {
  companyId: string;
  employeeId: string;
  from: Date;
  to: Date;
}) {
  const employee = await prisma.employee.findFirst({
    where: { id: params.employeeId, ...employeesForCompany(params.companyId) },
    include: {
      branch: true,
      jobTitle: true,
      workSchedule: { include: { days: true } },
    },
  });
  if (!employee) return null;

  const events = await prisma.attendanceEvent.findMany({
    where: {
      employeeId: params.employeeId,
      at: { gte: params.from, lte: params.to },
    },
    orderBy: { at: "asc" },
  });

  const leaves = await prisma.leave.findMany({
    where: {
      employeeId: params.employeeId,
      AND: [{ startAt: { lte: params.to } }, { endAt: { gte: params.from } }],
    },
    include: { leaveType: true },
  });

  const perms = await prisma.permissionSlot.findMany({
    where: {
      employeeId: params.employeeId,
      date: { gte: params.from, lte: params.to },
    },
    orderBy: { date: "asc" },
  });

  return { employee, events, leaves, perms };
}

export async function getAbsenceSummary(params: {
  companyId: string;
  from: Date;
  to: Date;
  branchId?: string;
}) {
  const employees = await prisma.employee.findMany({
    where: { active: true, ...employeesForCompany(params.companyId, params.branchId) },
    include: { branch: true, workSchedule: { select: { isOpen: true } } },
  });

  const days = eachCalendarDay(params.from, params.to);

  const postedMarkers = await prisma.attendanceEvent.findMany({
    where: {
      isPosted: true,
      employeeId: { not: null },
      at: { gte: params.from, lte: params.to },
      ...attendanceForCompany(params.companyId, params.branchId),
    },
    select: { employeeId: true, at: true, kind: true },
  });

  const empById = new Map(employees.map((e) => [e.id, e]));

  const key = (empId: string, d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return `${empId}:${x.toISOString().slice(0, 10)}`;
  };

  const presentKeys = new Set<string>();
  for (const e of postedMarkers) {
    if (!e.employeeId) continue;
    const emp = empById.get(e.employeeId);
    const open = emp?.workSchedule?.isOpen;
    if (!open && e.kind !== "CHECK_IN") continue;
    const d = new Date(e.at);
    d.setHours(0, 0, 0, 0);
    presentKeys.add(key(e.employeeId, d));
  }

  const rows = employees.map((emp) => {
    let absentDays = 0;
    for (const d of days) {
      if (!presentKeys.has(key(emp.id, d))) absentDays += 1;
    }
    return {
      employeeId: emp.id,
      fullName: emp.fullName,
      branch: emp.branch.name,
      absentDays,
      totalDays: days.length,
    };
  });

  return { rows, days: days.length };
}

type EmployeeWithScheduleDays = {
  id: string;
  fullName: string;
  branch: { name: string };
  workSchedule: null | {
    isOpen: boolean;
    extendShiftNextDay: boolean;
    graceInMinutes: number;
    graceOutMinutes: number;
    days: {
      weekday: number;
      segmentOrder: number;
      startTime: string;
      endTime: string;
      graceInMinutes: number;
      graceOutMinutes: number;
    }[];
  };
};

async function loadFixedScheduleRollupByEmployee(params: {
  companyId: string;
  employees: EmployeeWithScheduleDays[];
  from: Date;
  to: Date;
  branchId?: string;
  attendancePolicy: CompanyAttendancePolicy;
}): Promise<Map<string, ShiftDayMetrics & { name: string; branch: string }>> {
  const fixed = params.employees.filter(
    (e) => e.workSchedule && !e.workSchedule.isOpen && e.workSchedule.days.length > 0,
  );
  const fixedIds = fixed.map((e) => e.id);
  const perEmp = new Map<string, ShiftDayMetrics & { name: string; branch: string }>();
  if (fixedIds.length === 0) return perEmp;

  const dayEvents = await prisma.attendanceEvent.findMany({
    where: {
      employeeId: { in: fixedIds },
      isPosted: true,
      at: { gte: params.from, lte: params.to },
      ...attendanceForCompany(params.companyId, params.branchId),
    },
    orderBy: { at: "asc" },
    select: { employeeId: true, at: true, kind: true },
  });

  const groups = new Map<string, { employeeId: string; atSample: Date; events: { at: Date; kind: string }[] }>();
  for (const e of dayEvents) {
    if (!e.employeeId) continue;
    const key = `${e.employeeId}:${localDayKey(e.at)}`;
    const cur = groups.get(key) ?? { employeeId: e.employeeId, atSample: e.at, events: [] };
    cur.events.push({ at: e.at, kind: e.kind });
    groups.set(key, cur);
  }

  for (const g of groups.values()) {
    const emp = params.employees.find((x) => x.id === g.employeeId);
    const sched = emp?.workSchedule;
    if (!sched || sched.isOpen) continue;
    const dayStart = localCalendarDayStart(g.atSample);
    const weekday = g.atSample.getDay();
    const fridayOff = !params.attendancePolicy.fridayIsWorkday;
    const segments = sched.days
      .filter((d) => {
        if (fridayOff && d.weekday === 5) return false;
        return d.weekday === weekday;
      })
      .map((d) => ({
        weekday: d.weekday,
        segmentOrder: d.segmentOrder,
        startTime: d.startTime,
        endTime: d.endTime,
        graceInMinutes: d.graceInMinutes,
        graceOutMinutes: d.graceOutMinutes,
      }));
    if (!segments.length) continue;
    const deduped = dedupePunchSequence(g.events, params.attendancePolicy.punchDedupeMinutes);
    const pairs = pairInOutSequence(deduped);
    const m = metricsForFixedDay(
      dayStart,
      segments,
      sched.extendShiftNextDay,
      sched.graceInMinutes ?? 0,
      sched.graceOutMinutes ?? 0,
      pairs,
      params.attendancePolicy.lateGraceMinutes,
    );

    const cur = perEmp.get(emp.id);
    if (!cur) {
      perEmp.set(emp.id, {
        name: emp.fullName,
        branch: emp.branch.name,
        ...m,
      });
    } else {
      cur.lateShifts += m.lateShifts;
      cur.lateMinutes += m.lateMinutes;
      cur.earlyArrivalShifts += m.earlyArrivalShifts;
      cur.earlyArrivalMinutes += m.earlyArrivalMinutes;
      cur.earlyLeaveShifts += m.earlyLeaveShifts;
      cur.earlyLeaveMinutes += m.earlyLeaveMinutes;
      cur.workedMinutes += m.workedMinutes;
    }
  }

  return perEmp;
}

export type FixedScheduleShiftRollupRow = ShiftDayMetrics & {
  employeeId: string;
  name: string;
  branch: string;
};

export async function getFixedScheduleShiftRollup(params: {
  companyId: string;
  from: Date;
  to: Date;
  branchId?: string;
  attendancePolicy?: CompanyAttendancePolicy;
}): Promise<{ rows: FixedScheduleShiftRollupRow[] }> {
  const employees = await prisma.employee.findMany({
    where: { active: true, ...employeesForCompany(params.companyId, params.branchId) },
    include: { branch: true, workSchedule: { include: { days: true } } },
  });
  const attendancePolicy =
    params.attendancePolicy ??
    normalizeAttendancePolicy(
      await prisma.company.findUnique({
        where: { id: params.companyId },
        select: { lateGraceMinutes: true, punchDedupeMinutes: true, fridayIsWorkday: true },
      }),
    );
  const roll = await loadFixedScheduleRollupByEmployee({
    companyId: params.companyId,
    employees: employees as EmployeeWithScheduleDays[],
    from: params.from,
    to: params.to,
    branchId: params.branchId,
    attendancePolicy,
  });
  const rows: FixedScheduleShiftRollupRow[] = Array.from(roll.entries()).map(([employeeId, v]) => ({
    employeeId,
    name: v.name,
    branch: v.branch,
    lateShifts: v.lateShifts,
    lateMinutes: v.lateMinutes,
    earlyArrivalShifts: v.earlyArrivalShifts,
    earlyArrivalMinutes: v.earlyArrivalMinutes,
    earlyLeaveShifts: v.earlyLeaveShifts,
    earlyLeaveMinutes: v.earlyLeaveMinutes,
    workedMinutes: v.workedMinutes,
  }));
  return { rows: rows.sort((a, b) => b.lateMinutes - a.lateMinutes) };
}

export async function getEarlyInSummary(params: {
  companyId: string;
  from: Date;
  to: Date;
  branchId?: string;
  attendancePolicy?: CompanyAttendancePolicy;
}) {
  const employees = await prisma.employee.findMany({
    where: { active: true, ...employeesForCompany(params.companyId, params.branchId) },
    include: { branch: true, workSchedule: { include: { days: true } } },
  });

  const attendancePolicy =
    params.attendancePolicy ??
    normalizeAttendancePolicy(
      await prisma.company.findUnique({
        where: { id: params.companyId },
        select: { lateGraceMinutes: true, punchDedupeMinutes: true, fridayIsWorkday: true },
      }),
    );

  const roll = await loadFixedScheduleRollupByEmployee({
    companyId: params.companyId,
    employees: employees as EmployeeWithScheduleDays[],
    from: params.from,
    to: params.to,
    branchId: params.branchId,
    attendancePolicy,
  });

  let earlyEvents = 0;
  const rows: { name: string; branch: string; early: number; earlyMinutes: number }[] = [];
  for (const [, v] of roll) {
    earlyEvents += v.earlyArrivalShifts;
    rows.push({
      name: v.name,
      branch: v.branch,
      early: v.earlyArrivalShifts,
      earlyMinutes: v.earlyArrivalMinutes,
    });
  }

  return {
    rows: rows.sort((a, b) => b.earlyMinutes - a.earlyMinutes),
    earlyEvents,
  };
}

export async function getDelaySummary(params: {
  companyId: string;
  from: Date;
  to: Date;
  branchId?: string;
  attendancePolicy?: CompanyAttendancePolicy;
}) {
  const employees = await prisma.employee.findMany({
    where: { active: true, ...employeesForCompany(params.companyId, params.branchId) },
    include: { branch: true, workSchedule: { include: { days: true } } },
  });

  const attendancePolicy =
    params.attendancePolicy ??
    normalizeAttendancePolicy(
      await prisma.company.findUnique({
        where: { id: params.companyId },
        select: { lateGraceMinutes: true, punchDedupeMinutes: true, fridayIsWorkday: true },
      }),
    );

  const roll = await loadFixedScheduleRollupByEmployee({
    companyId: params.companyId,
    employees: employees as EmployeeWithScheduleDays[],
    from: params.from,
    to: params.to,
    branchId: params.branchId,
    attendancePolicy,
  });

  type DelayRow = {
    employeeId: string;
    name: string;
    branch: string;
    delays: number;
    delayMinutes: number;
  };
  const perEmployee = new Map<string, DelayRow>();
  let delayEvents = 0;
  for (const [empId, v] of roll) {
    delayEvents += v.lateShifts;
    perEmployee.set(empId, {
      employeeId: empId,
      name: v.name,
      branch: v.branch,
      delays: v.lateShifts,
      delayMinutes: v.lateMinutes,
    });
  }

  const openIds = employees
    .filter(
      (e) =>
        e.workSchedule?.isOpen &&
        e.workSchedule.expectedDailyMinutes != null &&
        e.workSchedule.expectedDailyMinutes > 0,
    )
    .map((e) => e.id);

  const spanMap = new Map<string, { first: Date; last: Date }>();
  if (openIds.length > 0) {
    const spans = await prisma.attendanceEvent.findMany({
      where: {
        employeeId: { in: openIds },
        isPosted: true,
        at: { gte: params.from, lte: params.to },
        ...attendanceForCompany(params.companyId, params.branchId),
      },
      orderBy: { at: "asc" },
      select: { employeeId: true, at: true },
    });
    for (const e of spans) {
      if (!e.employeeId) continue;
      const dayKey = `${e.employeeId}:${localDayKey(e.at)}`;
      const cur = spanMap.get(dayKey);
      if (!cur) spanMap.set(dayKey, { first: e.at, last: e.at });
      else spanMap.set(dayKey, { first: cur.first, last: e.at });
    }
  }

  const bumpOpenShortage = (employeeId: string, emp: { fullName: string; branch: { name: string } }, deficitMin: number) => {
    delayEvents += 1;
    const cur = perEmployee.get(employeeId) ?? {
      employeeId,
      name: emp.fullName,
      branch: emp.branch.name,
      delays: 0,
      delayMinutes: 0,
    };
    cur.delays += 1;
    cur.delayMinutes += deficitMin;
    perEmployee.set(employeeId, cur);
  };

  for (const [k, span] of spanMap) {
    const [employeeId] = k.split(":");
    const emp = employees.find((e) => e.id === employeeId);
    const sched = emp?.workSchedule;
    if (!sched?.isOpen || !sched.expectedDailyMinutes) continue;
    const worked = Math.max(0, Math.round((span.last.getTime() - span.first.getTime()) / 60000));
    const expected = sched.expectedDailyMinutes;
    const deficit = expected - worked;
    const graceIn = sched.graceInMinutes ?? 0;
    const cGrace = attendancePolicy.lateGraceMinutes;
    if (deficit > graceIn + cGrace) {
      bumpOpenShortage(employeeId, emp!, deficit - graceIn - cGrace);
    }
  }

  return {
    rows: Array.from(perEmployee.values()).sort((a, b) => b.delayMinutes - a.delayMinutes),
    delayEvents,
  };
}

export type OpenScheduleBalanceRow = {
  employeeId: string;
  fullName: string;
  branch: string;
  shortageMinutes: number;
  netOvertimeMinutes: number;
};

/** تجميع نقص الساعات والإضافي الصافي (دوام مفتوح + هدف يومي) خلال الفترة. */
export async function getOpenScheduleBalanceSummary(params: {
  companyId: string;
  from: Date;
  to: Date;
  branchId?: string;
  attendancePolicy?: CompanyAttendancePolicy;
  overtimePolicy?: CompanyOvertimePolicy;
}): Promise<{ rows: OpenScheduleBalanceRow[] }> {
  const employees = await prisma.employee.findMany({
    where: { active: true, ...employeesForCompany(params.companyId, params.branchId) },
    include: { branch: true, workSchedule: true },
  });

  let attendancePolicy = params.attendancePolicy;
  let overtimePolicy = params.overtimePolicy;
  if (!attendancePolicy || !overtimePolicy) {
    const row = await prisma.company.findUnique({
      where: { id: params.companyId },
      select: {
        lateGraceMinutes: true,
        punchDedupeMinutes: true,
        fridayIsWorkday: true,
        overtimeAfterMinutes: true,
        overtimeRoundMinutes: true,
      },
    });
    attendancePolicy = attendancePolicy ?? normalizeAttendancePolicy(row);
    overtimePolicy = overtimePolicy ?? normalizeOvertimePolicy(row);
  }
  const cGrace = attendancePolicy.lateGraceMinutes;

  const openIds = employees
    .filter(
      (e) =>
        e.workSchedule?.isOpen &&
        e.workSchedule.expectedDailyMinutes != null &&
        e.workSchedule.expectedDailyMinutes > 0,
    )
    .map((e) => e.id);

  if (openIds.length === 0) return { rows: [] };

  const spans = await prisma.attendanceEvent.findMany({
    where: {
      employeeId: { in: openIds },
      isPosted: true,
      at: { gte: params.from, lte: params.to },
      ...attendanceForCompany(params.companyId, params.branchId),
    },
    orderBy: { at: "asc" },
    select: { employeeId: true, at: true },
  });

  const spanMap = new Map<string, { first: Date; last: Date }>();
  for (const e of spans) {
    if (!e.employeeId) continue;
    const d = new Date(e.at);
    const dayKey = `${e.employeeId}:${d.toISOString().slice(0, 10)}`;
    const cur = spanMap.get(dayKey);
    if (!cur) spanMap.set(dayKey, { first: e.at, last: e.at });
    else spanMap.set(dayKey, { first: cur.first, last: e.at });
  }

  type Acc = OpenScheduleBalanceRow & { surplusSum: number; deduct: boolean };
  const agg = new Map<string, Acc>();

  for (const [k, span] of spanMap) {
    const [employeeId] = k.split(":");
    const emp = employees.find((e) => e.id === employeeId);
    const sched = emp?.workSchedule;
    if (!sched?.expectedDailyMinutes || !emp) continue;

    const worked = Math.max(0, Math.round((span.last.getTime() - span.first.getTime()) / 60000));
    const expected = sched.expectedDailyMinutes;
    const graceIn = sched.graceInMinutes ?? 0;
    const graceOut = sched.graceOutMinutes ?? 0;
    const enableOt = sched.enableOvertimeCalc !== false;
    const deduct = sched.deductLateFromOvertime === true;

    const deficitRaw = Math.max(0, expected - worked);
    const surplusRaw = Math.max(0, worked - expected);
    const deficitEff = Math.max(0, deficitRaw - graceIn - cGrace);
    const surplusEff0 = Math.max(0, surplusRaw - graceOut - cGrace);
    const surplusEff = enableOt ? surplusEff0 : 0;

    const cur = agg.get(employeeId) ?? {
      employeeId,
      fullName: emp.fullName,
      branch: emp.branch.name,
      shortageMinutes: 0,
      netOvertimeMinutes: 0,
      surplusSum: 0,
      deduct,
    };
    cur.shortageMinutes += deficitEff;
    cur.surplusSum += surplusEff;
    cur.deduct = deduct;
    agg.set(employeeId, cur);
  }

  const rows: OpenScheduleBalanceRow[] = Array.from(agg.values()).map((r) => {
    const netRaw = r.deduct ? Math.max(0, r.surplusSum - r.shortageMinutes) : r.surplusSum;
    return {
      employeeId: r.employeeId,
      fullName: r.fullName,
      branch: r.branch,
      shortageMinutes: r.shortageMinutes,
      netOvertimeMinutes: applyCompanyOvertimeMinutes(netRaw, overtimePolicy),
    };
  });

  return {
    rows: rows.sort((a, b) => b.netOvertimeMinutes - a.netOvertimeMinutes),
  };
}

export function parseRangeFromSearch(from?: string, to?: string) {
  const f = parseDateOnly(from, new Date());
  const t = parseDateOnly(to, new Date());
  f.setHours(0, 0, 0, 0);
  t.setHours(23, 59, 59, 999);
  if (f > t) {
    return { from: t, to: f };
  }
  return { from: f, to: t };
}

export async function getIncompleteRows(params: {
  companyId: string;
  from: Date;
  to: Date;
  branchId?: string;
}) {
  const days = eachCalendarDay(params.from, params.to);
  const employees = await prisma.employee.findMany({
    where: { active: true, ...employeesForCompany(params.companyId, params.branchId) },
    include: { branch: true, workSchedule: { select: { isOpen: true } } },
  });

  const rows: { employee: string; branch: string; day: string; ins: number; outs: number }[] = [];

  for (const emp of employees) {
    for (const day of days) {
      const start = new Date(day);
      start.setHours(0, 0, 0, 0);
      const end = new Date(day);
      end.setHours(23, 59, 59, 999);

      const ev = await prisma.attendanceEvent.findMany({
        where: {
          employeeId: emp.id,
          isPosted: true,
          at: { gte: start, lte: end },
          ...attendanceForCompany(params.companyId),
        },
        select: { kind: true },
      });

      if (ev.length === 0) continue;
      const ins = ev.filter((e) => e.kind === "CHECK_IN").length;
      const outs = ev.filter((e) => e.kind === "CHECK_OUT").length;
      if (emp.workSchedule?.isOpen) {
        if (ev.length === 1) {
          rows.push({
            employee: emp.fullName,
            branch: emp.branch.name,
            day: day.toISOString().slice(0, 10),
            ins: 1,
            outs: 0,
          });
        }
        continue;
      }
      if (ins !== outs) {
        rows.push({
          employee: emp.fullName,
          branch: emp.branch.name,
          day: day.toISOString().slice(0, 10),
          ins,
          outs,
        });
      }
    }
  }

  return rows.slice(0, 500);
}

export async function getEmployeeCheckInSummary(params: {
  companyId: string;
  from: Date;
  to: Date;
  branchId?: string;
  /** عند التمرير: الموظفون المرتبطون بهذا القسم فقط (حقل القسم في بطاقة الموظف). */
  departmentGroupId?: string;
}) {
  const empWhere: Prisma.EmployeeWhereInput = {
    active: true,
    ...employeesForCompany(params.companyId, params.branchId),
  };
  if (params.departmentGroupId) {
    empWhere.departmentGroupId = params.departmentGroupId;
  }

  const employees = await prisma.employee.findMany({
    where: empWhere,
    orderBy: { fullName: "asc" },
    include: { branch: true, departmentGroup: true },
  });

  const grouped = await prisma.attendanceEvent.groupBy({
    by: ["employeeId"],
    where: {
      isPosted: true,
      kind: "CHECK_IN",
      employeeId: { not: null },
      at: { gte: params.from, lte: params.to },
      ...attendanceForCompany(params.companyId, params.branchId),
    },
    _count: { _all: true },
  });

  const map = new Map<string, number>();
  for (const row of grouped) {
    if (row.employeeId) map.set(row.employeeId, row._count._all);
  }

  return employees.map((e) => ({
    employeeId: e.id,
    fullName: e.fullName,
    branch: e.branch.name,
    department: e.departmentGroup?.name ?? "—",
    postedCheckIns: map.get(e.id) ?? 0,
  }));
}
