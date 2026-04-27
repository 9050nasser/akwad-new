import { localDayRange } from "@/lib/day-range";
import { prisma } from "@/lib/prisma";

/** يحدّث أنواع الحركات ليوم واحد: أول بصمة = دخول، آخر بصمة = خروج، الوسط دخول (للدوام المفتوح فقط). */
export async function reconcileOpenScheduleKindsForDay(employeeId: string, at: Date) {
  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { workSchedule: { select: { isOpen: true } } },
  });
  if (!emp?.workSchedule?.isOpen) return;

  const { start, end } = localDayRange(at);
  const events = await prisma.attendanceEvent.findMany({
    where: { employeeId, at: { gte: start, lte: end } },
    orderBy: [{ at: "asc" }, { id: "asc" }],
    select: { id: true, kind: true },
  });

  const n = events.length;
  if (n === 0) return;

  const updates: { id: string; kind: "CHECK_IN" | "CHECK_OUT" }[] = [];
  for (let i = 0; i < n; i++) {
    let kind: "CHECK_IN" | "CHECK_OUT";
    if (n === 1) {
      kind = "CHECK_IN";
    } else if (i === 0) {
      kind = "CHECK_IN";
    } else if (i === n - 1) {
      kind = "CHECK_OUT";
    } else {
      kind = "CHECK_IN";
    }
    if (events[i].kind !== kind) {
      updates.push({ id: events[i].id, kind });
    }
  }

  if (updates.length === 0) return;

  await prisma.$transaction(updates.map((u) => prisma.attendanceEvent.update({ where: { id: u.id }, data: { kind: u.kind } })));
}
