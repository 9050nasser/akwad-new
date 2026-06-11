import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { attendanceForCompany, employeesForCompany } from "@/lib/company-scope";
import { eachCalendarDay, localDayRange, parseDateOnly } from "@/lib/day-range";
import {
  firstCheckInLastCheckOutOfDay,
  localCalendarDayStart,
  localDayKey,
  metricsForFixedDay,
  pairInOutSequence,
  preparePunchesForAttendanceReport,
  totalScheduledMinutesForSegments,
  type DaySegment,
  type ShiftDayMetrics,
} from "@/lib/shift-metrics";
import {
  applyCompanyOvertimeMinutes,
  normalizeAttendancePolicy,
  normalizeOvertimePolicy,
  type CompanyAttendancePolicy,
  type CompanyOvertimePolicy,
} from "@/lib/company-attendance";
import { formatReportDateOnly } from "@/lib/format";
import { expandHolidaysToDayKeys, holidayOverlapWhere } from "@/lib/holidays";
import {
  hasReportEmployeeFilters,
  reportEmployeeWhereExtras,
  type ReportEmployeeFilterParams,
} from "@/lib/report-employee-filters";

/** تصفية موظفين الشركة/الفرع مع بحث الأقسام والدوام… — لاستخدامها في تقارير Prisma المتداخلة (إجازات، أذونات، …). */
export function employeeReportWhere(
  companyId: string,
  branchId: string | undefined,
  filters?: ReportEmployeeFilterParams,
): Prisma.EmployeeWhereInput {
  return {
    active: true,
    ...employeesForCompany(companyId, branchId),
    ...reportEmployeeWhereExtras(filters),
  };
}

export type DailyStatusRow = {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  branch: string;
  departmentName: string;
  dutyName: string;
  projectName: string;
  jobTitleName: string;
  scheduleName: string;
  shift1In?: Date;
  shift1Out?: Date;
  shift2In?: Date;
  shift2Out?: Date;
  /** يوجد جدولا دخول/خروج ثانٍ لهذا اليوم (عمود «الدوام الثاني» في تقرير حالة اليوم). */
  hasSecondShiftSegment: boolean;
  lateMinutes: number;
  overtimeMinutes: number;
  workMinutes: number;
  dayStatus: string;
  isOpenSchedule: boolean;
};

export type DailyStatusParams = {
  companyId: string;
  date: Date;
  branchId?: string;
} & ReportEmployeeFilterParams;

export async function getDailyStatus(params: DailyStatusParams) {
  const { start, end } = localDayRange(params.date);
  const dayStart = localCalendarDayStart(params.date);
  const weekday = dayStart.getDay();

  const employeeFilters: ReportEmployeeFilterParams = {
    q: params.q,
    departmentGroupId: params.departmentGroupId,
    workDutyId: params.workDutyId,
    projectId: params.projectId,
    jobTitleId: params.jobTitleId,
    workScheduleId: params.workScheduleId,
  };

  const employees = await prisma.employee.findMany({
    where: employeeReportWhere(params.companyId, params.branchId, employeeFilters),
    orderBy: [{ employeeCode: "asc" }, { fullName: "asc" }],
    include: {
      branch: true,
      departmentGroup: { select: { name: true } },
      workDuty: { select: { name: true } },
      project: { select: { name: true } },
      jobTitle: { select: { name: true } },
      workSchedule: { include: { days: true } },
    },
  });

  if (employees.length === 0) {
    return { rows: [], range: { start, end } };
  }

  const employeeIdsForDay = employees.map((e) => e.id);

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
  const fridayOff = !attendancePolicy.fridayIsWorkday;
  const cGrace = attendancePolicy.lateGraceMinutes;

  // --- بداية التعديل: توسيع نافذة البحث لـ 8 صباحاً من اليوم التالي ---
  const queryEnd = new Date(end);
  queryEnd.setHours(queryEnd.getHours() + 8); 

  const events = await prisma.attendanceEvent.findMany({
    where: {
      isPosted: true,
      at: { gte: start, lte: queryEnd },
      ...attendanceForCompany(params.companyId, params.branchId),
      employeeId: { in: employeeIdsForDay },
    },
    orderBy: { at: "asc" },
  });

  const empExtendMap = new Map<string, boolean>();
  for (const emp of employees) {
    empExtendMap.set(emp.id, emp.workSchedule?.extendShiftNextDay === true);
  }

  const byEmp = new Map<string, typeof events>();
  for (const e of events) {
    if (!e.employeeId) continue;

    const extendsNextDay = empExtendMap.get(e.employeeId);
    const isNextDayMorning = e.at.getTime() > end.getTime(); 

    // إذا كانت البصمة في اليوم التالي والموظف ليس لديه شفت ممتد، نتجاهلها
    if (isNextDayMorning && !extendsNextDay) continue;

    const arr = byEmp.get(e.employeeId) ?? [];
    arr.push(e);
    byEmp.set(e.employeeId, arr);
  }
  // --- نهاية التعديل ---

  const employeeIds = employees.map((e) => e.id);
  const [leaves, perms, holidays] = await Promise.all([
    employeeIds.length
      ? prisma.leave.findMany({
          where: {
            employeeId: { in: employeeIds },
            AND: [{ startAt: { lte: end } }, { endAt: { gte: start } }],
          },
          include: { leaveType: true },
        })
      : [],
    employeeIds.length
      ? prisma.permissionSlot.findMany({
          where: { employeeId: { in: employeeIds }, date: { gte: start, lte: end } },
        })
      : [],
    prisma.holiday.findMany({
      where: holidayOverlapWhere(params.companyId, start, end),
    }),
  ]);

  const leavesByEmp = new Map<string, typeof leaves>();
  for (const l of leaves) {
    const arr = leavesByEmp.get(l.employeeId) ?? [];
    arr.push(l);
    leavesByEmp.set(l.employeeId, arr);
  }
  const permsByEmp = new Map<string, typeof perms>();
  for (const p of perms) {
    const arr = permsByEmp.get(p.employeeId) ?? [];
    arr.push(p);
    permsByEmp.set(p.employeeId, arr);
  }

  const rows: DailyStatusRow[] = employees.map((emp) => {
    const list = byEmp.get(emp.id) ?? [];
    const sched = emp.workSchedule;
    const isOpen = Boolean(sched?.isOpen);
    const scheduleName = sched?.name ?? "—";

    let shift1In: Date | undefined;
    let shift1Out: Date | undefined;
    let shift2In: Date | undefined;
    let shift2Out: Date | undefined;
    let hasSecondShiftSegment = false;
    let lateMinutes = 0;
    let overtimeMinutes = 0;
    let workMinutes = 0;
    let m: ShiftDayMetrics | null = null;

    const deduped = preparePunchesForAttendanceReport(
      list.map((x) => ({ at: x.at, kind: x.kind })),
      attendancePolicy.punchDedupeMinutes,
    );
    const pairs = pairInOutSequence(deduped);
    const firstLast = firstCheckInLastCheckOutOfDay(deduped);

    if (!sched) {
      shift1In = firstLast.firstIn;
      shift1Out = firstLast.lastOut;
      if (firstLast.firstIn && firstLast.lastOut) {
        workMinutes = Math.max(
          0,
          Math.round((firstLast.lastOut.getTime() - firstLast.firstIn.getTime()) / 60000),
        );
      } else {
        workMinutes = pairs.reduce((s, p) => {
          if (p.in && p.out) return s + Math.max(0, Math.round((p.out.getTime() - p.in.getTime()) / 60000));
          return s;
        }, 0);
      }
    } else if (isOpen) {
      shift1In = firstLast.firstIn;
      shift1Out = firstLast.lastOut;
      const exp = sched.expectedDailyMinutes ?? 0;
      if (shift1In && shift1Out && exp > 0) {
        workMinutes = Math.max(0, Math.round((shift1Out.getTime() - shift1In.getTime()) / 60000));
        const graceIn = sched.graceInMinutes ?? 0;
        const graceOut = sched.graceOutMinutes ?? 0;
        const deficitRaw = Math.max(0, exp - workMinutes);
        const deficitEff = Math.max(0, deficitRaw - graceIn - cGrace);
        lateMinutes = deficitEff;
        const surplusRaw = Math.max(0, workMinutes - exp);
        const surplusEff0 = Math.max(0, surplusRaw - graceOut - cGrace);
        const enableOt = sched.enableOvertimeCalc !== false;
        const surplusEff = enableOt ? surplusEff0 : 0;
        const deduct = sched.deductLateFromOvertime === true;
        const netRaw = deduct ? Math.max(0, surplusEff - lateMinutes) : surplusEff;
        overtimeMinutes = applyCompanyOvertimeMinutes(netRaw, overtimePolicy);
      } else if (shift1In && shift1Out) {
        workMinutes = Math.max(0, Math.round((shift1Out.getTime() - shift1In.getTime()) / 60000));
      }
    } else {
      const segments: DaySegment[] = (sched.days ?? [])
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
        }))
        .sort((a, b) => a.segmentOrder - b.segmentOrder || a.startTime.localeCompare(b.startTime));

      hasSecondShiftSegment = segments.length > 1;

      if (segments.length > 0) {
        m = metricsForFixedDay(
          dayStart,
          segments,
          sched.extendShiftNextDay,
          sched.graceInMinutes ?? 0,
          sched.graceOutMinutes ?? 0,
          pairs,
          attendancePolicy.lateGraceMinutes,
        );
        lateMinutes = m.lateMinutes;
        workMinutes = m.workedMinutes;
        const schedMin = totalScheduledMinutesForSegments(dayStart, segments, sched.extendShiftNextDay);
        const surplusRaw = Math.max(0, workMinutes - schedMin);
        overtimeMinutes = applyCompanyOvertimeMinutes(surplusRaw, overtimePolicy);
      }

      shift1In = pairs[0]?.in;
      shift1Out = pairs[0]?.out;
      shift2In = pairs[1]?.in;
      shift2Out = pairs[1]?.out;
    }

    const empLeaves = leavesByEmp.get(emp.id) ?? [];
    const empPerms = permsByEmp.get(emp.id) ?? [];
    const expectedSegCount =
      sched && !isOpen
        ? (sched.days ?? []).filter((d) => !(fridayOff && d.weekday === 5) && d.weekday === weekday).length
        : 0;
    const dayStatus = buildDailyStatusLabel({
      holidays,
      leaves: empLeaves,
      perms: empPerms,
      sched,
      expectedSegments: expectedSegCount,
      postedCount: list.length,
      isOpen,
      lateMinutes,
      earlyLeaveMinutes: m?.earlyLeaveMinutes ?? 0,
      pairsLen: pairs.length,
    });

    return {
      employeeId: emp.id,
      employeeCode: emp.employeeCode?.trim() || "—",
      fullName: emp.fullName,
      branch: emp.branch.name,
      departmentName: emp.departmentGroup?.name ?? "—",
      dutyName: emp.workDuty?.name ?? "—",
      projectName: emp.project?.name ?? "—",
      jobTitleName: emp.jobTitle?.name ?? "—",
      scheduleName,
      shift1In,
      shift1Out,
      shift2In,
      shift2Out,
      hasSecondShiftSegment,
      lateMinutes,
      overtimeMinutes,
      workMinutes,
      dayStatus,
      isOpenSchedule: isOpen,
    };
  });

  return { rows, range: { start, end } };
}

export type AttendanceDetailRow = {
  dateKey: string;
  employeeId: string;
  employeeCode: string;
  fullName: string;
  branch: string;
  checkInAt?: Date;
  checkOutAt?: Date;
  overtimeMinutes: number;
  lateMinutes: number;
  expectedWorkMinutes: number;
  actualWorkMinutes: number;
  differenceMinutes: number;
  /** غياب / عطلة / إجازة — غير مُعرَّف عند وجود حركات مرحّلة عادية. */
  dayNote?: string;
};

function attendanceDetailExpectedWorkday(
  workSchedule: {
    isOpen: boolean;
    expectedDailyMinutes: number | null;
    days: { weekday: number }[];
  } | null,
  weekday: number,
  fridayOff: boolean,
): boolean {
  if (!workSchedule) return false;
  if (workSchedule.isOpen) return (workSchedule.expectedDailyMinutes ?? 0) > 0;
  return (workSchedule.days ?? []).some((d) => !(fridayOff && d.weekday === 5) && d.weekday === weekday);
}

type EmpForAttendanceDetailDay = {
  id: string;
  employeeCode: string | null;
  fullName: string;
  branch: { name: string };
  workSchedule: {
    isOpen: boolean;
    name: string;
    expectedDailyMinutes: number | null;
    graceInMinutes: number | null;
    graceOutMinutes: number | null;
    enableOvertimeCalc: boolean | null;
    deductLateFromOvertime: boolean | null;
    extendShiftNextDay: boolean;
    days: {
      weekday: number;
      segmentOrder: number;
      startTime: string;
      endTime: string;
      graceInMinutes: number;
      graceOutMinutes: number;
    }[];
  } | null;
};

type AttDetailDayEvent = { at: Date; kind: string };

/** منطق يوم واحد مُوحَّد لتقرير التفصيلي ولتجميع الملخص. */
function computeAttendanceDetailRowForEmployeeDay(input: {
  emp: EmpForAttendanceDetailDay;
  dateKey: string;
  dayStart: Date;
  weekday: number;
  list: AttDetailDayEvent[];
  fridayOff: boolean;
  cGrace: number;
  attendancePolicy: CompanyAttendancePolicy;
  overtimePolicy: CompanyOvertimePolicy;
  holidayDateKeys: Set<string>;
  holidayNoteByDateKey: Map<string, string>;
  onLeaveEmpDay: Set<string>;
  leaveNoteByEmpDay: Map<string, string>;
}): AttendanceDetailRow | null {
  const {
    emp,
    dateKey,
    dayStart,
    weekday,
    list,
    fridayOff,
    cGrace,
    attendancePolicy,
    overtimePolicy,
    holidayDateKeys,
    holidayNoteByDateKey,
    onLeaveEmpDay,
    leaveNoteByEmpDay,
  } = input;

  const base = (): Pick<
    AttendanceDetailRow,
    "dateKey" | "employeeId" | "employeeCode" | "fullName" | "branch"
  > => ({
    dateKey,
    employeeId: emp.id,
    employeeCode: emp.employeeCode?.trim() || "—",
    fullName: emp.fullName,
    branch: emp.branch.name,
  });

  if (list.length === 0) {
    const sched = emp.workSchedule;
    const empDay = `${emp.id}:${dateKey}`;
    const isHoliday = holidayDateKeys.has(dateKey);
    const onLeave = onLeaveEmpDay.has(empDay);

    // صف بدون أي دقائق محسوبة — لإظهار كل الأيام مهما كان نوعها.
    const zeroRow = (dayNote: string): AttendanceDetailRow => ({
      ...base(),
      checkInAt: undefined,
      checkOutAt: undefined,
      overtimeMinutes: 0,
      lateMinutes: 0,
      expectedWorkMinutes: 0,
      actualWorkMinutes: 0,
      differenceMinutes: 0,
      dayNote,
    });

    if (isHoliday) return zeroRow(holidayNoteByDateKey.get(dateKey) ?? "عطلة رسمية");
    if (onLeave) return zeroRow(leaveNoteByEmpDay.get(empDay) ?? "إجازة");
    if (!sched) return zeroRow("غياب (بدون جدول دوام)");
    if (!attendanceDetailExpectedWorkday(sched, weekday, fridayOff)) {
      return zeroRow("راحة أسبوعية");
    }

    const isOpen = Boolean(sched.isOpen);

    let lateMinutes = 0;
    let overtimeMinutes = 0;
    let actualWorkMinutes = 0;
    let expectedWorkMinutes = 0;

    if (isOpen) {
      const exp = sched.expectedDailyMinutes ?? 0;
      if (exp <= 0) return null;
      expectedWorkMinutes = exp;
      const graceIn = sched.graceInMinutes ?? 0;
      const deficitRaw = Math.max(0, exp - actualWorkMinutes);
      lateMinutes = Math.max(0, deficitRaw - graceIn - cGrace);
    } else {
      const segments: DaySegment[] = (sched.days ?? [])
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
        }))
        .sort((a, b) => a.segmentOrder - b.segmentOrder || a.startTime.localeCompare(b.startTime));

      if (segments.length === 0) return null;
      expectedWorkMinutes = totalScheduledMinutesForSegments(dayStart, segments, sched.extendShiftNextDay);
      const dayM = metricsForFixedDay(
        dayStart,
        segments,
        sched.extendShiftNextDay,
        sched.graceInMinutes ?? 0,
        sched.graceOutMinutes ?? 0,
        [],
        attendancePolicy.lateGraceMinutes,
      );
      lateMinutes = dayM.lateMinutes;
    }

    return {
      ...base(),
      checkInAt: undefined,
      checkOutAt: undefined,
      overtimeMinutes,
      lateMinutes,
      expectedWorkMinutes,
      actualWorkMinutes,
      differenceMinutes: actualWorkMinutes - expectedWorkMinutes,
      dayNote: "غياب",
    };
  }

  const sched = emp.workSchedule;
  const isOpen = Boolean(sched?.isOpen);

  const deduped = preparePunchesForAttendanceReport(
    list.map((x) => ({ at: x.at, kind: x.kind })),
    attendancePolicy.punchDedupeMinutes,
  );
  const pairs = pairInOutSequence(deduped);
  const firstLast = firstCheckInLastCheckOutOfDay(deduped);

  const checkInAt = firstLast.firstIn;
  const checkOutAt = firstLast.lastOut;

  let lateMinutes = 0;
  let overtimeMinutes = 0;
  let actualWorkMinutes = 0;
  let expectedWorkMinutes = 0;

  if (!sched) {
    if (firstLast.firstIn && firstLast.lastOut) {
      actualWorkMinutes = Math.max(
        0,
        Math.round((firstLast.lastOut.getTime() - firstLast.firstIn.getTime()) / 60000),
      );
    } else {
      actualWorkMinutes = pairs.reduce((s, p) => {
        if (p.in && p.out) return s + Math.max(0, Math.round((p.out.getTime() - p.in.getTime()) / 60000));
        return s;
      }, 0);
    }
  } else if (isOpen) {
    const shift1In = firstLast.firstIn;
    const shift1Out = firstLast.lastOut;
    const exp = sched.expectedDailyMinutes ?? 0;
    if (shift1In && shift1Out && exp > 0) {
      actualWorkMinutes = Math.max(0, Math.round((shift1Out.getTime() - shift1In.getTime()) / 60000));
      expectedWorkMinutes = exp;
      const graceIn = sched.graceInMinutes ?? 0;
      const graceOut = sched.graceOutMinutes ?? 0;
      const deficitRaw = Math.max(0, exp - actualWorkMinutes);
      const deficitEff = Math.max(0, deficitRaw - graceIn - cGrace);
      lateMinutes = deficitEff;
      const surplusRaw = Math.max(0, actualWorkMinutes - exp);
      const surplusEff0 = Math.max(0, surplusRaw - graceOut - cGrace);
      const enableOt = sched.enableOvertimeCalc !== false;
      const surplusEff = enableOt ? surplusEff0 : 0;
      const deduct = sched.deductLateFromOvertime === true;
      const netRaw = deduct ? Math.max(0, surplusEff - lateMinutes) : surplusEff;
      overtimeMinutes = applyCompanyOvertimeMinutes(netRaw, overtimePolicy);
    } else if (shift1In && shift1Out) {
      actualWorkMinutes = Math.max(0, Math.round((shift1Out.getTime() - shift1In.getTime()) / 60000));
      expectedWorkMinutes = exp > 0 ? exp : 0;
    }
  } else {
    const segments: DaySegment[] = (sched.days ?? [])
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
      }))
      .sort((a, b) => a.segmentOrder - b.segmentOrder || a.startTime.localeCompare(b.startTime));

    if (segments.length > 0) {
      expectedWorkMinutes = totalScheduledMinutesForSegments(dayStart, segments, sched.extendShiftNextDay);
      const dayM = metricsForFixedDay(
        dayStart,
        segments,
        sched.extendShiftNextDay,
        sched.graceInMinutes ?? 0,
        sched.graceOutMinutes ?? 0,
        pairs,
        attendancePolicy.lateGraceMinutes,
      );
      lateMinutes = dayM.lateMinutes;
      actualWorkMinutes = dayM.workedMinutes;
      const surplusRaw = Math.max(0, actualWorkMinutes - expectedWorkMinutes);
      overtimeMinutes = applyCompanyOvertimeMinutes(surplusRaw, overtimePolicy);
    } else {
      expectedWorkMinutes = 0;
      actualWorkMinutes = pairs.reduce((s, p) => {
        if (p.in && p.out) return s + Math.max(0, Math.round((p.out.getTime() - p.in.getTime()) / 60000));
        return s;
      }, 0);
    }
  }

  const differenceMinutes = actualWorkMinutes - expectedWorkMinutes;

  return {
    ...base(),
    checkInAt,
    checkOutAt,
    overtimeMinutes,
    lateMinutes,
    expectedWorkMinutes,
    actualWorkMinutes,
    differenceMinutes,
  };
}

/**
 * صفوف يومية لكل موظف: حركات مرحّلة، أو غياب متوقع، أو صف إجازة/عطلة رسمية
 * عندما يكون اليوم يوم عمل متوقعًا حسب الدوام.
 */
export async function getEmployeesAttendanceDetailReport(params: {
  companyId: string;
  from: Date;
  to: Date;
  branchId?: string;
  employeeFilters?: ReportEmployeeFilterParams;
  maxRows?: number;
}): Promise<{ rows: AttendanceDetailRow[]; capped: boolean }> {
  const maxRows = params.maxRows ?? 4000;
  const employeeFilters = params.employeeFilters;

  const employees = await prisma.employee.findMany({
    where: employeeReportWhere(params.companyId, params.branchId, employeeFilters),
    orderBy: [{ employeeCode: "asc" }, { fullName: "asc" }],
    include: {
      branch: true,
      workSchedule: { include: { days: true } },
    },
  });

  if (employees.length === 0) return { rows: [], capped: false };

  const employeeIds = employees.map((e) => e.id);
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
  const fridayOff = !attendancePolicy.fridayIsWorkday;
  const cGrace = attendancePolicy.lateGraceMinutes;

  // --- بداية التعديل ---
  const queryTo = new Date(params.to);
  queryTo.setHours(queryTo.getHours() + 8); // تمديد لـ 8 صباحاً من اليوم التالي لنهاية التقرير

  const events = await prisma.attendanceEvent.findMany({
    where: {
      isPosted: true,
      at: { gte: params.from, lte: queryTo },
      ...attendanceForCompany(params.companyId, params.branchId),
      employeeId: { in: employeeIds },
    },
    orderBy: { at: "asc" },
    select: { employeeId: true, at: true, kind: true },
  });

  const empExtendMap = new Map<string, boolean>();
  for (const emp of employees) {
    empExtendMap.set(emp.id, emp.workSchedule?.extendShiftNextDay === true);
  }

  type Ev = (typeof events)[number];
  const byEmpDay = new Map<string, Ev[]>();
  
  for (const e of events) {
    if (!e.employeeId) continue;

    const extendsNextDay = empExtendMap.get(e.employeeId);
    let logicalDate = new Date(e.at);

    // إرجاع البصمة لليوم السابق منطقياً إذا كانت قبل 8 صباحاً وكان الشفت ممتداً
    if (extendsNextDay && logicalDate.getHours() < 8) {
      logicalDate.setDate(logicalDate.getDate() - 1);
    }

    // تجاهل البصمات التي تخرج عن نافذة التقرير المطلوبة بعد التعديل المنطقي
    if (logicalDate.getTime() > params.to.getTime()) continue;
    if (logicalDate.getTime() < params.from.getTime()) continue;

    const k = `${e.employeeId}:${localDayKey(logicalDate)}`;
    const arr = byEmpDay.get(k) ?? [];
    arr.push(e);
    byEmpDay.set(k, arr);
  }
  // --- نهاية التعديل ---

  const [leaves, holidays] = await Promise.all([
    employeeIds.length
      ? prisma.leave.findMany({
          where: {
            employeeId: { in: employeeIds },
            AND: [{ startAt: { lte: params.to } }, { endAt: { gte: params.from } }],
          },
          select: { employeeId: true, startAt: true, endAt: true, leaveType: { select: { name: true } } },
        })
      : [],
    prisma.holiday.findMany({
      where: holidayOverlapWhere(params.companyId, params.from, params.to),
      select: { date: true, endDate: true, name: true },
    }),
  ]);

  const days = eachCalendarDay(params.from, params.to);
  const onLeaveEmpDay = new Set<string>();
  const leaveNoteByEmpDay = new Map<string, string>();
  for (const l of leaves) {
    for (const day of days) {
      const dStart = localCalendarDayStart(day);
      const dk = localDayKey(dStart);
      const dEnd = new Date(dStart);
      dEnd.setHours(23, 59, 59, 999);
      if (l.startAt.getTime() <= dEnd.getTime() && l.endAt.getTime() >= dStart.getTime()) {
        const key = `${l.employeeId}:${dk}`;
        onLeaveEmpDay.add(key);
        const part = l.leaveType?.name ? `إجازة: ${l.leaveType.name}` : "إجازة";
        const prev = leaveNoteByEmpDay.get(key);
        leaveNoteByEmpDay.set(key, prev ? `${prev} — ${part}` : part);
      }
    }
  }
  const { dateKeys: holidayDateKeys, noteByDateKey: holidayNoteByDateKey } = expandHolidaysToDayKeys(
    holidays,
    params.from,
    params.to,
  );

  const rows: AttendanceDetailRow[] = [];
  let capped = false;

  for (const day of days) {
    if (capped) break;
    const dayStart = localCalendarDayStart(day);
    const dateKey = localDayKey(dayStart);
    const weekday = dayStart.getDay();

    for (const emp of employees) {
      if (rows.length >= maxRows) {
        capped = true;
        break;
      }
      const list = byEmpDay.get(`${emp.id}:${dateKey}`) ?? [];
      const row = computeAttendanceDetailRowForEmployeeDay({
        emp: emp as EmpForAttendanceDetailDay,
        dateKey,
        dayStart,
        weekday,
        list,
        fridayOff,
        cGrace,
        attendancePolicy,
        overtimePolicy,
        holidayDateKeys,
        holidayNoteByDateKey,
        onLeaveEmpDay,
        leaveNoteByEmpDay,
      });
      if (!row) continue;
      rows.push(row);
    }
  }

  return { rows, capped };
}

function buildDailyStatusLabel(opts: {
  holidays: { name: string }[];
  leaves: { leaveType: { name: string } }[];
  perms: { reason: string | null }[];
  sched: { isOpen: boolean; days: { weekday: number }[] } | null;
  expectedSegments: number;
  postedCount: number;
  isOpen: boolean;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  pairsLen: number;
}): string {
  const parts: string[] = [];
  if (opts.holidays.length) {
    parts.push(`عطلة رسمية (${opts.holidays.map((h) => h.name).join("، ")})`);
  }
  if (opts.leaves.length) {
    parts.push(`إجازة: ${opts.leaves.map((l) => l.leaveType.name).join("، ")}`);
  }
  if (opts.perms.length) {
    parts.push("إذن مسجّل");
  }
  if (!opts.sched) {
    parts.push("بدون جدول دوام");
    return parts.join(" — ") || "—";
  }
  if (!opts.isOpen && opts.expectedSegments === 0) {
    parts.push("لا دوام مجدول لهذا اليوم");
  }
  if (opts.isOpen) {
    if (opts.postedCount === 0) parts.push("لا حركات مرحّلة");
    else if (opts.postedCount === 1) parts.push("حركة واحدة فقط (دوام مفتوح)");
    else parts.push("دوام مفتوح — مرحّل");
  } else if (opts.expectedSegments > 0) {
    if (opts.postedCount === 0) parts.push("غائب / لا حركات");
    else if (opts.pairsLen < opts.expectedSegments) parts.push("غير مكتمل (ناقص شفت أو خروج)");
    else parts.push("مكتمل");
    if (opts.lateMinutes > 0) parts.push(`تأخير ${opts.lateMinutes} د`);
    if (opts.earlyLeaveMinutes > 0) parts.push(`خروج مبكر ${opts.earlyLeaveMinutes} د`);
  }
  return parts.join(" — ") || "—";
}

export async function getMovements(params: {
  companyId: string;
  from: Date;
  to: Date;
  branchId?: string;
  posted?: "all" | "yes" | "no";
  employeeId?: string;
  employeeFilters?: ReportEmployeeFilterParams;
}) {
  let employeeIdIn: string[] | undefined;
  if (!params.employeeId && hasReportEmployeeFilters(params.employeeFilters)) {
    const emps = await prisma.employee.findMany({
      where: employeeReportWhere(params.companyId, params.branchId, params.employeeFilters),
      select: { id: true },
    });
    employeeIdIn = emps.map((e) => e.id);
    if (employeeIdIn.length === 0) return [];
  }

  const where: Prisma.AttendanceEventWhereInput = {
    at: { gte: params.from, lte: params.to },
    ...attendanceForCompany(params.companyId, params.branchId),
    ...(params.employeeId ? { employeeId: params.employeeId } : {}),
    ...(employeeIdIn ? { employeeId: { in: employeeIdIn } } : {}),
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

export type EmployeeDayStatusKind =
  | "present"
  | "absent"
  | "leave"
  | "holiday"
  | "rest"
  | "none"
  | "future";

export type EmployeeReportDayRow = {
  dateKey: string;
  date: Date;
  weekdayLabel: string;
  firstIn?: Date;
  lastOut?: Date;
  allPosted: boolean;
  statusKind: EmployeeDayStatusKind;
  statusLabel: string;
};

export type EmployeeReportDaySummary = {
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  holidayDays: number;
  restDays: number;
};

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

  // --- تمديد نافذة البحث ---
  const queryTo = new Date(params.to);
  queryTo.setHours(queryTo.getHours() + 8);

  const events = await prisma.attendanceEvent.findMany({
    where: {
      employeeId: params.employeeId,
      at: { gte: params.from, lte: queryTo },
    },
    orderBy: { at: "asc" },
  });

  const companyRow = await prisma.company.findUnique({
    where: { id: params.companyId },
    select: { punchDedupeMinutes: true, fridayIsWorkday: true, lateGraceMinutes: true },
  });
  const employeeAttendancePolicy = normalizeAttendancePolicy(companyRow);
  const punchWin = employeeAttendancePolicy.punchDedupeMinutes;
  const fridayOff = !employeeAttendancePolicy.fridayIsWorkday;

  const extendsNextDay = employee.workSchedule?.extendShiftNextDay === true;

  const byDay = new Map<string, typeof events>();
  for (const e of events) {
    let logicalDate = new Date(e.at);
    // --- إرجاع اليوم المنطقي ---
    if (extendsNextDay && logicalDate.getHours() < 8) {
      logicalDate.setDate(logicalDate.getDate() - 1);
    }
    // --- تجاهل البصمات خارج النطاق ---
    if (logicalDate.getTime() > params.to.getTime() || logicalDate.getTime() < params.from.getTime()) continue;

    const dk = localDayKey(logicalDate);
    const arr = byDay.get(dk) ?? [];
    arr.push(e);
    byDay.set(dk, arr);
  }

  const movementDays = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, dayEv]) => {
      const raw = dayEv.map((x) => ({ at: x.at, kind: x.kind as string }));
      const prep = preparePunchesForAttendanceReport(raw, punchWin);
      const fl = firstCheckInLastCheckOutOfDay(prep);
      return {
        dateKey,
        firstIn: fl.firstIn,
        lastOut: fl.lastOut,
        allPosted: dayEv.every((x) => x.isPosted),
      };
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

  const holidays = await prisma.holiday.findMany({
    where: holidayOverlapWhere(params.companyId, params.from, params.to),
    select: { date: true, endDate: true, name: true },
  });
  const { dateKeys: holidayKeys, noteByDateKey: holidayNotes } = expandHolidaysToDayKeys(
    holidays,
    params.from,
    params.to,
  );

  const movementByKey = new Map(movementDays.map((m) => [m.dateKey, m]));
  const sched = employee.workSchedule;
  const isOpenSchedule = Boolean(sched?.isOpen);
  const weekdayFmt = new Intl.DateTimeFormat("ar-u-nu-latn", { weekday: "long" });
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const leaveNoteForDay = (dayStart: Date): string | null => {
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    const dayLeaves = leaves.filter(
      (l) => l.startAt.getTime() <= dayEnd.getTime() && l.endAt.getTime() >= dayStart.getTime(),
    );
    if (dayLeaves.length === 0) return null;
    return `إجازة: ${dayLeaves.map((l) => l.leaveType.name).join("، ")}`;
  };

  /** هل اليوم يوم عمل مجدول؟ (دوام مفتوح = كل الأيام؛ ثابت = حسب أيام الجدول مع سياسة الجمعة) */
  const isScheduledWorkday = (weekday: number): boolean => {
    if (!sched) return false;
    if (isOpenSchedule) return (sched.expectedDailyMinutes ?? 0) > 0;
    return (sched.days ?? []).some((d) => !(fridayOff && d.weekday === 5) && d.weekday === weekday);
  };

  const daySummary: EmployeeReportDaySummary = {
    presentDays: 0,
    absentDays: 0,
    leaveDays: 0,
    holidayDays: 0,
    restDays: 0,
  };

  const dayRows: EmployeeReportDayRow[] = eachCalendarDay(params.from, params.to).map((day) => {
    const dayStart = localCalendarDayStart(day);
    const dateKey = localDayKey(dayStart);
    const weekday = dayStart.getDay();
    const weekdayLabel = weekdayFmt.format(dayStart);
    const movement = movementByKey.get(dateKey);
    const isHoliday = holidayKeys.has(dateKey);
    const holidayNote = holidayNotes.get(dateKey);

    const base = {
      dateKey,
      date: dayStart,
      weekdayLabel,
      firstIn: movement?.firstIn,
      lastOut: movement?.lastOut,
      allPosted: movement?.allPosted ?? false,
    };

    if (movement) {
      daySummary.presentDays += 1;
      return {
        ...base,
        statusKind: "present" as const,
        statusLabel: isHoliday ? "حضور (يوم عطلة رسمية)" : "حضور",
      };
    }
    if (isHoliday) {
      daySummary.holidayDays += 1;
      return { ...base, statusKind: "holiday" as const, statusLabel: holidayNote ?? "عطلة رسمية" };
    }
    const leaveNote = leaveNoteForDay(dayStart);
    if (leaveNote) {
      daySummary.leaveDays += 1;
      return { ...base, statusKind: "leave" as const, statusLabel: leaveNote };
    }
    if (!sched) {
      return { ...base, statusKind: "none" as const, statusLabel: "بدون جدول دوام" };
    }
    if (!isScheduledWorkday(weekday)) {
      daySummary.restDays += 1;
      return { ...base, statusKind: "rest" as const, statusLabel: "راحة أسبوعية" };
    }
    if (dayStart.getTime() > todayEnd.getTime()) {
      return { ...base, statusKind: "future" as const, statusLabel: "—" };
    }
    daySummary.absentDays += 1;
    return { ...base, statusKind: "absent" as const, statusLabel: "غياب" };
  });

  return { employee, events, movementDays, dayRows, daySummary, leaves, perms };
}

function absenceDayPresenceKey(employeeId: string, d: Date): string {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return `${employeeId}:${x.toISOString().slice(0, 10)}`;
}

type AbsencePresenceEmployee = {
  id: string;
  fullName: string;
  employeeCode: string | null;
  branch: { name: string };
  jobTitle: { name: string } | null;
  workSchedule: { name: string; isOpen: boolean } | null;
};

async function loadAbsencePresenceCore(params: {
  companyId: string;
  from: Date;
  to: Date;
  branchId?: string;
  employeeFilters?: ReportEmployeeFilterParams;
}): Promise<{
  employees: AbsencePresenceEmployee[];
  presentKeys: Set<string>;
  calendarDays: Date[];
}> {
  const employees = await prisma.employee.findMany({
    where: employeeReportWhere(params.companyId, params.branchId, params.employeeFilters),
    include: {
      branch: true,
      jobTitle: { select: { name: true } },
      workSchedule: { select: { name: true, isOpen: true, extendShiftNextDay: true } },
    },
  });

  const calendarDays = eachCalendarDay(params.from, params.to);

  const queryTo = new Date(params.to);
  queryTo.setHours(queryTo.getHours() + 8);

  const postedMarkers = await prisma.attendanceEvent.findMany({
    where: {
      isPosted: true,
      employeeId: { not: null },
      at: { gte: params.from, lte: queryTo },
      ...attendanceForCompany(params.companyId, params.branchId),
    },
    select: { employeeId: true, at: true, kind: true },
  });

  const empById = new Map(employees.map((e) => [e.id, e]));
  const empIdSet = new Set(employees.map((e) => e.id));

  const presentKeys = new Set<string>();
  for (const e of postedMarkers) {
    if (!e.employeeId || !empIdSet.has(e.employeeId)) continue;
    const emp = empById.get(e.employeeId);
    
    let logicalDate = new Date(e.at);
    const extendsNextDay = emp?.workSchedule?.extendShiftNextDay === true;
    
    if (extendsNextDay && logicalDate.getHours() < 8) {
      logicalDate.setDate(logicalDate.getDate() - 1);
    }
    if (logicalDate.getTime() > params.to.getTime() || logicalDate.getTime() < params.from.getTime()) continue;

    const open = emp?.workSchedule?.isOpen;
    if (!open && e.kind !== "CHECK_IN") continue;
    
    logicalDate.setHours(0, 0, 0, 0);
    presentKeys.add(absenceDayPresenceKey(e.employeeId, logicalDate));
  }

  return { employees, presentKeys, calendarDays };
}

export async function getAbsenceSummary(params: {
  companyId: string;
  from: Date;
  to: Date;
  branchId?: string;
  employeeFilters?: ReportEmployeeFilterParams;
}) {
  const { employees, presentKeys, calendarDays } = await loadAbsencePresenceCore(params);

  const rows = employees.map((emp) => {
    let absentDays = 0;
    for (const d of calendarDays) {
      if (!presentKeys.has(absenceDayPresenceKey(emp.id, d))) absentDays += 1;
    }
    return {
      employeeId: emp.id,
      fullName: emp.fullName,
      branch: emp.branch.name,
      absentDays,
      totalDays: calendarDays.length,
    };
  });

  return { rows, days: calendarDays.length };
}

export type AbsenceDailyAbsentee = {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  jobTitleName: string;
  scheduleName: string;
};

export type AbsenceDailyRow = {
  date: Date;
  weekdayLabel: string;
  dateLabel: string;
  absentees: AbsenceDailyAbsentee[];
};

/** صف لكل يوم تقويمي مع قائمة من ليس لهم دخول مرحّل في ذلك اليوم (حسب نفس منطق ملخص الغياب). */
export async function getAbsenceDailyDetail(params: {
  companyId: string;
  from: Date;
  to: Date;
  branchId?: string;
  employeeFilters?: ReportEmployeeFilterParams;
}): Promise<{ dailyRows: AbsenceDailyRow[]; periodDayCount: number }> {
  const { employees, presentKeys, calendarDays } = await loadAbsencePresenceCore(params);
  const weekdayFmt = new Intl.DateTimeFormat("ar-u-nu-latn", { weekday: "long" });

  const dailyRows: AbsenceDailyRow[] = calendarDays.map((d) => {
    const absentees: AbsenceDailyAbsentee[] = employees
      .filter((emp) => !presentKeys.has(absenceDayPresenceKey(emp.id, d)))
      .map((emp) => {
        const sched = emp.workSchedule;
        const scheduleName = sched?.name?.trim()
          ? sched.isOpen
            ? `${sched.name} (دوام مفتوح)`
            : sched.name
          : "—";
        return {
          employeeId: emp.id,
          employeeCode: emp.employeeCode?.trim() || "—",
          fullName: emp.fullName,
          jobTitleName: emp.jobTitle?.name?.trim() || "—",
          scheduleName,
        };
      })
      .sort((a, b) => {
        const aCode = a.employeeCode === "—" ? null : a.employeeCode;
        const bCode = b.employeeCode === "—" ? null : b.employeeCode;
        if (aCode && bCode) {
          const n = aCode.localeCompare(bCode, "ar", { numeric: true });
          if (n !== 0) return n;
        } else if (aCode && !bCode) return -1;
        else if (!aCode && bCode) return 1;
        return a.fullName.localeCompare(b.fullName, "ar");
      });

    return {
      date: d,
      weekdayLabel: weekdayFmt.format(d),
      dateLabel: formatReportDateOnly(d),
      absentees,
    };
  });

  return { dailyRows, periodDayCount: calendarDays.length };
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

  const queryTo = new Date(params.to);
  queryTo.setHours(queryTo.getHours() + 8);

  const dayEvents = await prisma.attendanceEvent.findMany({
    where: {
      employeeId: { in: fixedIds },
      isPosted: true,
      at: { gte: params.from, lte: queryTo },
      ...attendanceForCompany(params.companyId, params.branchId),
    },
    orderBy: { at: "asc" },
    select: { employeeId: true, at: true, kind: true },
  });

  const empExtendMap = new Map<string, boolean>();
  for (const emp of fixed) {
    empExtendMap.set(emp.id, emp.workSchedule?.extendShiftNextDay === true);
  }

  const groups = new Map<string, { employeeId: string; atSample: Date; events: { at: Date; kind: string }[] }>();
  for (const e of dayEvents) {
    if (!e.employeeId) continue;
    
    let logicalDate = new Date(e.at);
    const extendsNextDay = empExtendMap.get(e.employeeId);
    
    if (extendsNextDay && logicalDate.getHours() < 8) {
      logicalDate.setDate(logicalDate.getDate() - 1);
    }
    if (logicalDate.getTime() > params.to.getTime() || logicalDate.getTime() < params.from.getTime()) continue;

    const key = `${e.employeeId}:${localDayKey(logicalDate)}`;
    const cur = groups.get(key) ?? { employeeId: e.employeeId, atSample: logicalDate, events: [] };
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
    const deduped = preparePunchesForAttendanceReport(g.events, params.attendancePolicy.punchDedupeMinutes);
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
  employeeFilters?: ReportEmployeeFilterParams;
}): Promise<{ rows: FixedScheduleShiftRollupRow[] }> {
  const employees = await prisma.employee.findMany({
    where: employeeReportWhere(params.companyId, params.branchId, params.employeeFilters),
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
  employeeFilters?: ReportEmployeeFilterParams;
}) {
  const employees = await prisma.employee.findMany({
    where: employeeReportWhere(params.companyId, params.branchId, params.employeeFilters),
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

export type DelaySummaryRow = {
  employeeId: string;
  employeeCode: string;
  name: string;
  branch: string;
  delays: number;
  delayMinutes: number;
  /** دقائق الانصراف المبكر (دوام ثابت فقط؛ ٠ لدوام مفتوح أو غير المحسوب من الشفتات). */
  earlyLeaveMinutes: number;
};

export async function getDelaySummary(params: {
  companyId: string;
  from: Date;
  to: Date;
  branchId?: string;
  attendancePolicy?: CompanyAttendancePolicy;
  employeeFilters?: ReportEmployeeFilterParams;
}) {
  const employees = await prisma.employee.findMany({
    where: employeeReportWhere(params.companyId, params.branchId, params.employeeFilters),
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

  const perEmployee = new Map<string, DelaySummaryRow>();
  let delayEvents = 0;
  for (const [empId, v] of roll) {
    delayEvents += v.lateShifts;
    const emp = employees.find((e) => e.id === empId);
    perEmployee.set(empId, {
      employeeId: empId,
      employeeCode: emp?.employeeCode ?? "",
      name: v.name,
      branch: v.branch,
      delays: v.lateShifts,
      delayMinutes: v.lateMinutes,
      earlyLeaveMinutes: v.earlyLeaveMinutes,
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
    // --- التعديل يبدأ من هنا ---
    const queryTo = new Date(params.to);
    queryTo.setHours(queryTo.getHours() + 8); // تمديد لـ 8 صباحاً

    const spans = await prisma.attendanceEvent.findMany({
      where: {
        employeeId: { in: openIds },
        isPosted: true,
        at: { gte: params.from, lte: queryTo },
        ...attendanceForCompany(params.companyId, params.branchId),
      },
      orderBy: { at: "asc" },
      select: { employeeId: true, at: true },
    });

    for (const e of spans) {
      if (!e.employeeId) continue;
      
      const emp = employees.find(x => x.id === e.employeeId);
      let logicalDate = new Date(e.at);
      const extendsNextDay = emp?.workSchedule?.extendShiftNextDay === true;
      
      // إرجاع البصمة لليوم السابق منطقياً إذا كانت قبل 8 صباحاً وكان الشفت ممتداً
      if (extendsNextDay && logicalDate.getHours() < 8) {
        logicalDate.setDate(logicalDate.getDate() - 1);
      }
      // تجاهل البصمات خارج نافذة التقرير المطلوبة
      if (logicalDate.getTime() > params.to.getTime() || logicalDate.getTime() < params.from.getTime()) continue;

      const dayKey = `${e.employeeId}:${logicalDate.toISOString().slice(0, 10)}`;
      const cur = spanMap.get(dayKey);
      if (!cur) spanMap.set(dayKey, { first: e.at, last: e.at });
      else spanMap.set(dayKey, { first: cur.first, last: e.at });
    }
    // --- نهاية التعديل ---
  }

  const bumpOpenShortage = (
    employeeId: string,
    emp: { fullName: string; employeeCode: string | null; branch: { name: string } },
    deficitMin: number,
  ) => {
    delayEvents += 1;
    const cur = perEmployee.get(employeeId) ?? {
      employeeId,
      employeeCode: emp.employeeCode ?? "",
      name: emp.fullName,
      branch: emp.branch.name,
      delays: 0,
      delayMinutes: 0,
      earlyLeaveMinutes: 0,
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
  employeeFilters?: ReportEmployeeFilterParams;
}): Promise<{ rows: OpenScheduleBalanceRow[] }> {
  const employees = await prisma.employee.findMany({
    where: employeeReportWhere(params.companyId, params.branchId, params.employeeFilters),
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

  // --- التعديل يبدأ من هنا ---
  const queryTo = new Date(params.to);
  queryTo.setHours(queryTo.getHours() + 8); // تمديد لـ 8 صباحاً

  const spans = await prisma.attendanceEvent.findMany({
    where: {
      employeeId: { in: openIds },
      isPosted: true,
      at: { gte: params.from, lte: queryTo },
      ...attendanceForCompany(params.companyId, params.branchId),
    },
    orderBy: { at: "asc" },
    select: { employeeId: true, at: true },
  });

  const spanMap = new Map<string, { first: Date; last: Date }>();
  for (const e of spans) {
    if (!e.employeeId) continue;

    const emp = employees.find(x => x.id === e.employeeId);
    let logicalDate = new Date(e.at);
    const extendsNextDay = emp?.workSchedule?.extendShiftNextDay === true;
    
    // إرجاع البصمة لليوم السابق منطقياً إذا كانت قبل 8 صباحاً وكان الشفت ممتداً
    if (extendsNextDay && logicalDate.getHours() < 8) {
      logicalDate.setDate(logicalDate.getDate() - 1);
    }
    // تجاهل البصمات خارج نافذة التقرير المطلوبة
    if (logicalDate.getTime() > params.to.getTime() || logicalDate.getTime() < params.from.getTime()) continue;

    const dayKey = `${e.employeeId}:${logicalDate.toISOString().slice(0, 10)}`;
    const cur = spanMap.get(dayKey);
    if (!cur) spanMap.set(dayKey, { first: e.at, last: e.at });
    else spanMap.set(dayKey, { first: cur.first, last: e.at });
  }
  // --- نهاية التعديل ---

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

export type IncompleteMovementRow = {
  employee: string;
  branch: string;
  day: string;
  /** عدد حركات الدخول المرحّلة في ذلك اليوم */
  ins: number;
  /** عدد حركات الخروج المرحّلة في ذلك اليوم */
  outs: number;
  /** دخول بدون خروج كافٍ، أو العكس */
  issueAr: string;
};

export async function getIncompleteRows(params: {
  companyId: string;
  from: Date;
  to: Date;
  branchId?: string;
  employeeFilters?: ReportEmployeeFilterParams;
}): Promise<IncompleteMovementRow[]> {
  const days = eachCalendarDay(params.from, params.to);
  const employees = await prisma.employee.findMany({
    where: employeeReportWhere(params.companyId, params.branchId, params.employeeFilters),
    include: { branch: true, workSchedule: { select: { extendShiftNextDay: true } } },
  });

  const rows: IncompleteMovementRow[] = [];

  for (const emp of employees) {
    const extendsNextDay = emp.workSchedule?.extendShiftNextDay === true;
    
    for (const day of days) {
      const start = new Date(day);
      start.setHours(0, 0, 0, 0);
      const end = new Date(day);
      end.setHours(23, 59, 59, 999);

      const queryEnd = new Date(end);
      queryEnd.setHours(queryEnd.getHours() + 8);

      const evRaw = await prisma.attendanceEvent.findMany({
        where: {
          employeeId: emp.id,
          isPosted: true,
          at: { gte: start, lte: queryEnd },
          ...attendanceForCompany(params.companyId),
        },
        select: { kind: true, at: true },
      });

      if (evRaw.length === 0) continue;

      const ev = evRaw.filter(e => {
        let logicalDate = new Date(e.at);
        if (extendsNextDay && logicalDate.getHours() < 8) {
          logicalDate.setDate(logicalDate.getDate() - 1);
        }
        return logicalDate.getTime() >= start.getTime() && logicalDate.getTime() <= end.getTime();
      });

      if (ev.length === 0) continue;

      const ins = ev.filter((e) => e.kind === "CHECK_IN").length;
      const outs = ev.filter((e) => e.kind === "CHECK_OUT").length;
      if (ins === outs) continue;

      const issueAr = ins > outs ? "دخول بدون خروج" : "خروج بدون دخول";
      rows.push({
        employee: emp.fullName,
        branch: emp.branch.name,
        day: day.toISOString().slice(0, 10),
        ins,
        outs,
        issueAr,
      });
    }
  }

  return rows.slice(0, 500);
}

export type EmployeesAttendanceSummaryRow = {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  jobTitleName: string;
  scheduleName: string;
  /** مجموع الدقائق المتوقعة (صفوف التفصيلي: حضور/غياب؛ عطلة/إجازة = ٠). */
  scheduleMinutesTotal: number;
  lateMinutesTotal: number;
  absenceDays: number;
  leaveDays: number;
  overtimeMinutesTotal: number;
  actualWorkMinutesTotal: number;
};

/** ملخص حضور لكل موظف على الفترة — نفس منطق التقرير التفصيلي اليومي. */
export async function getEmployeesAttendanceSummaryRollup(params: {
  companyId: string;
  from: Date;
  to: Date;
  branchId?: string;
  employeeFilters?: ReportEmployeeFilterParams;
}): Promise<EmployeesAttendanceSummaryRow[]> {
  const employeeFilters = params.employeeFilters;

  const employees = await prisma.employee.findMany({
    where: employeeReportWhere(params.companyId, params.branchId, employeeFilters),
    orderBy: [{ employeeCode: "asc" }, { fullName: "asc" }],
    include: {
      branch: true,
      jobTitle: { select: { name: true } },
      workSchedule: { include: { days: true } },
    },
  });

  if (employees.length === 0) return [];

  const employeeIds = employees.map((e) => e.id);
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
  const fridayOff = !attendancePolicy.fridayIsWorkday;
  const cGrace = attendancePolicy.lateGraceMinutes;

  // --- بداية التعديل ---
  const queryTo = new Date(params.to);
  queryTo.setHours(queryTo.getHours() + 8);
  
  const events = await prisma.attendanceEvent.findMany({
    where: {
      isPosted: true,
      at: { gte: params.from, lte: queryTo },
      ...attendanceForCompany(params.companyId, params.branchId),
      employeeId: { in: employeeIds },
    },
    orderBy: { at: "asc" },
    select: { employeeId: true, at: true, kind: true },
  });

  const empExtendMap = new Map<string, boolean>();
  for (const emp of employees) {
    empExtendMap.set(emp.id, emp.workSchedule?.extendShiftNextDay === true);
  }

  type Ev = (typeof events)[number];
  const byEmpDay = new Map<string, Ev[]>();
  
  for (const e of events) {
    if (!e.employeeId) continue;

    const extendsNextDay = empExtendMap.get(e.employeeId);
    let logicalDate = new Date(e.at);

    if (extendsNextDay && logicalDate.getHours() < 8) {
      logicalDate.setDate(logicalDate.getDate() - 1);
    }

    if (logicalDate.getTime() > params.to.getTime()) continue;
    if (logicalDate.getTime() < params.from.getTime()) continue;

    const k = `${e.employeeId}:${localDayKey(logicalDate)}`;
    const arr = byEmpDay.get(k) ?? [];
    arr.push(e);
    byEmpDay.set(k, arr);
  }
  // --- نهاية التعديل ---

  const [leaves, holidays] = await Promise.all([
    employeeIds.length
      ? prisma.leave.findMany({
          where: {
            employeeId: { in: employeeIds },
            AND: [{ startAt: { lte: params.to } }, { endAt: { gte: params.from } }],
          },
          select: { employeeId: true, startAt: true, endAt: true, leaveType: { select: { name: true } } },
        })
      : [],
    prisma.holiday.findMany({
      where: holidayOverlapWhere(params.companyId, params.from, params.to),
      select: { date: true, endDate: true, name: true },
    }),
  ]);

  const days = eachCalendarDay(params.from, params.to);
  const onLeaveEmpDay = new Set<string>();
  const leaveNoteByEmpDay = new Map<string, string>();
  for (const l of leaves) {
    for (const day of days) {
      const dStart = localCalendarDayStart(day);
      const dk = localDayKey(dStart);
      const dEnd = new Date(dStart);
      dEnd.setHours(23, 59, 59, 999);
      if (l.startAt.getTime() <= dEnd.getTime() && l.endAt.getTime() >= dStart.getTime()) {
        const key = `${l.employeeId}:${dk}`;
        onLeaveEmpDay.add(key);
        const part = l.leaveType?.name ? `إجازة: ${l.leaveType.name}` : "إجازة";
        const prev = leaveNoteByEmpDay.get(key);
        leaveNoteByEmpDay.set(key, prev ? `${prev} — ${part}` : part);
      }
    }
  }
  const { dateKeys: holidayDateKeys, noteByDateKey: holidayNoteByDateKey } = expandHolidaysToDayKeys(
    holidays,
    params.from,
    params.to,
  );

  type Acc = {
    scheduleMinutesTotal: number;
    lateMinutesTotal: number;
    absenceDays: number;
    leaveDays: number;
    overtimeMinutesTotal: number;
    actualWorkMinutesTotal: number;
  };
  const accByEmp = new Map<string, Acc>();
  for (const emp of employees) {
    accByEmp.set(emp.id, {
      scheduleMinutesTotal: 0,
      lateMinutesTotal: 0,
      absenceDays: 0,
      leaveDays: 0,
      overtimeMinutesTotal: 0,
      actualWorkMinutesTotal: 0,
    });
  }

  for (const day of days) {
    const dayStart = localCalendarDayStart(day);
    const dateKey = localDayKey(dayStart);
    const weekday = dayStart.getDay();

    for (const emp of employees) {
      const list = byEmpDay.get(`${emp.id}:${dateKey}`) ?? [];
      const row = computeAttendanceDetailRowForEmployeeDay({
        emp: emp as EmpForAttendanceDetailDay,
        dateKey,
        dayStart,
        weekday,
        list,
        fridayOff,
        cGrace,
        attendancePolicy,
        overtimePolicy,
        holidayDateKeys,
        holidayNoteByDateKey,
        onLeaveEmpDay,
        leaveNoteByEmpDay,
      });
      if (!row) continue;
      const a = accByEmp.get(emp.id)!;
      a.scheduleMinutesTotal += row.expectedWorkMinutes;
      a.lateMinutesTotal += row.lateMinutes;
      a.overtimeMinutesTotal += row.overtimeMinutes;
      a.actualWorkMinutesTotal += row.actualWorkMinutes;
      if (row.dayNote?.startsWith("غياب")) a.absenceDays += 1;
      else if (row.dayNote?.startsWith("إجازة")) a.leaveDays += 1;
    }
  }

  return employees.map((emp) => {
    const a = accByEmp.get(emp.id)!;
    return {
      employeeId: emp.id,
      employeeCode: emp.employeeCode?.trim() || "—",
      fullName: emp.fullName,
      jobTitleName: emp.jobTitle?.name ?? "—",
      scheduleName: emp.workSchedule?.name ?? "—",
      ...a,
    };
  });
}

export async function getEmployeeCheckInSummary(params: {
  companyId: string;
  from: Date;
  to: Date;
  branchId?: string;
  employeeFilters?: ReportEmployeeFilterParams;
}) {
  const employees = await prisma.employee.findMany({
    where: employeeReportWhere(params.companyId, params.branchId, params.employeeFilters),
    orderBy: { fullName: "asc" },
    include: { branch: true, departmentGroup: true },
  });

  const empIds = employees.map((e) => e.id);
  if (empIds.length === 0) return [];

  const grouped = await prisma.attendanceEvent.groupBy({
    by: ["employeeId"],
    where: {
      isPosted: true,
      kind: "CHECK_IN",
      employeeId: { in: empIds },
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
