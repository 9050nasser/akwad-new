const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const company = await p.company.findFirst({
    where: { OR: [{ slug: "mn" }, { name: { contains: "نمر" } }] },
    select: { id: true, name: true, lateGraceMinutes: true },
  });
  if (!company) {
    console.log("no company");
    return;
  }
  const emp = await p.employee.findFirst({
    where: { branch: { companyId: company.id }, fullName: { contains: "عزيز" } },
    include: { workSchedule: { include: { days: true } }, branch: true },
  });
  if (!emp) {
    console.log("no emp");
    return;
  }
  const sunday = emp.workSchedule?.days?.filter((d) => d.weekday === 0) ?? [];
  console.log(
    JSON.stringify(
      {
        company: company.name,
        emp: emp.fullName,
        branch: emp.branch.name,
        schedule: emp.workSchedule?.name,
        graceCompany: company.lateGraceMinutes,
        schedGraceIn: emp.workSchedule?.graceInMinutes,
        extend: emp.workSchedule?.extendShiftNextDay,
        extendedDayStartHour: emp.workSchedule?.extendedDayStartHour,
        sundaySegments: sunday.map((d) => ({
          seg: d.segmentOrder,
          start: d.startTime,
          end: d.endTime,
          gin: d.graceInMinutes,
          gout: d.graceOutMinutes,
        })),
      },
      null,
      2,
    ),
  );
  const ev = await p.attendanceEvent.findMany({
    where: {
      employeeId: emp.id,
      isPosted: true,
      at: { gte: new Date(2026, 6, 4, 0, 0, 0), lte: new Date(2026, 6, 6, 23, 59, 59) },
    },
    orderBy: { at: "asc" },
    select: { at: true, kind: true },
  });
  console.log(
    "events",
    ev.map((e) => ({ at: e.at.toISOString(), local: e.at.toString(), kind: e.kind })),
  );

  const co = await p.company.findUnique({
    where: { id: company.id },
    select: { punchDedupeMinutes: true, lateGraceMinutes: true },
  });
  console.log("punchDedupeMinutes", co?.punchDedupeMinutes);

  const j5 = ev.filter((e) => {
    const d = e.at;
    return d.getFullYear() === 2026 && d.getMonth() === 6 && d.getDate() === 5;
  });
  console.log("j5 count", j5.length, j5.map((e) => e.at.toString()));

  // simulate pairInOutSequence
  const sorted = [...j5].sort((a, b) => a.at - b.at);
  const pairs = [];
  let pendingIn;
  for (const e of sorted) {
    if (pendingIn) {
      pairs.push({ in: pendingIn.at.toString(), out: e.at.toString() });
      pendingIn = undefined;
    } else pendingIn = e;
  }
  if (pendingIn) pairs.push({ inOnly: pendingIn.at.toString() });
  console.log("pairs", pairs);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
