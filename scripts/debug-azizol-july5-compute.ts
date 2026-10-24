import { PrismaClient } from "@prisma/client";
import { getEmployeesAttendanceDetailReport } from "../lib/reports";
import {
  metricsForFixedDay,
  localCalendarDayStart,
  pairInOutSequence,
  preparePunchesForAttendanceReport,
} from "../lib/shift-metrics";
import { extendedShiftPolicyFromSchedule, punchLogicalInstant } from "../lib/attendance-logical-day";
import { localDayKey } from "../lib/shift-metrics";
import { normalizeAttendancePolicy } from "../lib/company-attendance";

const p = new PrismaClient();

async function main() {
  const company = await p.company.findFirst({ where: { name: { contains: "نمر" } } });
  if (!company) throw new Error("no company");
  const emp = await p.employee.findFirst({
    where: { branch: { companyId: company.id }, fullName: { contains: "عزيز" } },
    include: { workSchedule: { include: { days: true } } },
  });
  if (!emp?.workSchedule) throw new Error("no emp");

  const from = new Date(2026, 6, 5, 0, 0, 0, 0);
  const to = new Date(2026, 6, 5, 23, 59, 59, 999);
  const { rows } = await getEmployeesAttendanceDetailReport({
    companyId: company.id,
    from,
    to,
    employeeId: emp.id,
    maxRows: 5,
  });
  console.log("detail row", rows[0]);

  const co = await p.company.findUnique({
    where: { id: company.id },
    select: { lateGraceMinutes: true, punchDedupeMinutes: true },
  });
  const ap = normalizeAttendancePolicy(co);
  const policy = extendedShiftPolicyFromSchedule(emp.workSchedule);
  const ev = await p.attendanceEvent.findMany({
    where: { employeeId: emp.id, isPosted: true, at: { gte: new Date(2026, 6, 4), lte: new Date(2026, 6, 7) } },
    orderBy: { at: "asc" },
  });
  const list = ev.filter((e) => {
    const ld = punchLogicalInstant(new Date(e.at), policy);
    return localDayKey(ld) === "2026-07-05";
  });
  const ded = preparePunchesForAttendanceReport(
    list.map((e) => ({ at: e.at, kind: e.kind })),
    ap.punchDedupeMinutes,
  );
  const pairs = pairInOutSequence(ded);
  const dayStart = localCalendarDayStart(new Date(2026, 6, 5));
  const segs = emp.workSchedule.days
    .filter((d) => d.weekday === 0)
    .map((d) => ({
      weekday: d.weekday,
      segmentOrder: d.segmentOrder,
      startTime: d.startTime,
      endTime: d.endTime,
      graceInMinutes: d.graceInMinutes,
      graceOutMinutes: d.graceOutMinutes,
    }));
  const m = metricsForFixedDay(
    dayStart,
    segs,
    emp.workSchedule.extendShiftNextDay,
    emp.workSchedule.graceInMinutes ?? 0,
    emp.workSchedule.graceOutMinutes ?? 0,
    pairs,
    ap.lateGraceMinutes,
  );
  console.log("pairs", pairs);
  console.log("metrics", m);
}

main()
  .finally(() => p.$disconnect());
