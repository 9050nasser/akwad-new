import { parseTimeToMinutes } from "@/lib/schedule-time";

export type ScheduleDayRow = {
  weekday: number;
  segmentOrder: number;
  startTime: string;
  endTime: string;
};

/** شفتات يوم معيّن مرتبة حسب segmentOrder ثم وقت البداية. */
export function segmentsForWeekday(days: ScheduleDayRow[] | undefined, weekday: number): ScheduleDayRow[] {
  if (!days?.length) return [];
  return days
    .filter((d) => d.weekday === weekday)
    .slice()
    .sort((a, b) => a.segmentOrder - b.segmentOrder || a.startTime.localeCompare(b.startTime));
}

/** أول بداية شفت لذلك اليوم (بالدقائق من منتصف الليل) — لاحتساب التأخير والتبكير. */
export function firstSegmentStartMinutes(weekday: number, days: ScheduleDayRow[] | undefined): number | null {
  const segs = segmentsForWeekday(days, weekday);
  if (!segs.length) return null;
  return parseTimeToMinutes(segs[0].startTime);
}
