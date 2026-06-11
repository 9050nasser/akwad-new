import { Prisma } from "@prisma/client";
import { eachCalendarDay } from "@/lib/day-range";
import { localDayKey } from "@/lib/shift-metrics";

export type HolidayRangeRow = { name: string; date: Date; endDate: Date | null };

/** شرط Prisma: العطلة (من/إلى) تتداخل مع فترة التقرير. */
export function holidayOverlapWhere(
  companyId: string,
  from: Date,
  to: Date,
): Prisma.HolidayWhereInput {
  return {
    companyId,
    date: { lte: to },
    OR: [{ endDate: { gte: from } }, { endDate: null, date: { gte: from } }],
  };
}

/** عدد أيام العطلة (البداية والنهاية ضمناً). */
export function holidayDayCount(h: { date: Date; endDate?: Date | null }): number {
  const start = new Date(h.date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(h.endDate ?? h.date);
  end.setHours(0, 0, 0, 0);
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
}

/** توسعة عطلات (من/إلى) إلى مفاتيح أيام داخل فترة التقرير + ملاحظة اسم العطلة لكل يوم. */
export function expandHolidaysToDayKeys(
  holidays: HolidayRangeRow[],
  from: Date,
  to: Date,
): { dateKeys: Set<string>; noteByDateKey: Map<string, string> } {
  const dateKeys = new Set<string>();
  const noteByDateKey = new Map<string, string>();
  for (const h of holidays) {
    const end = h.endDate ?? h.date;
    const startClamped = h.date.getTime() < from.getTime() ? from : h.date;
    const endClamped = end.getTime() > to.getTime() ? to : end;
    if (startClamped.getTime() > endClamped.getTime()) continue;
    for (const day of eachCalendarDay(startClamped, endClamped)) {
      const dk = localDayKey(day);
      dateKeys.add(dk);
      const part = `عطلة رسمية: ${h.name}`;
      const prev = noteByDateKey.get(dk);
      noteByDateKey.set(dk, prev ? `${prev} — ${part}` : part);
    }
  }
  return { dateKeys, noteByDateKey };
}
