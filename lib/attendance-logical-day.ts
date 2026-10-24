/** سياسة إسناد البصمة ليوم منطقي عند «دوام ممتد». */
export type ExtendedShiftPolicy = {
  extendShiftNextDay: boolean;
  /** الساعة التي يبدأ عندها «اليوم الجديد» محلياً (مثلاً 6 = بصمة 05:59 تبع أمس، 06:00 تبع اليوم). */
  extendedDayStartHour: number;
};

export const DEFAULT_EXTENDED_DAY_START_HOUR = 8;

export function normalizeExtendedDayStartHour(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(Number(value))) return DEFAULT_EXTENDED_DAY_START_HOUR;
  return Math.min(23, Math.max(0, Math.floor(Number(value))));
}

export function extendedShiftPolicyFromSchedule(
  sched: { extendShiftNextDay?: boolean | null; extendedDayStartHour?: number | null } | null | undefined,
): ExtendedShiftPolicy {
  return {
    extendShiftNextDay: sched?.extendShiftNextDay === true,
    extendedDayStartHour: normalizeExtendedDayStartHour(sched?.extendedDayStartHour),
  };
}

/** يُرجع تاريخ/وقت البصمة بعد إسنادها لليوم المنطقي (بدون تصفير الوقت). */
export function punchLogicalInstant(punchAt: Date, policy: ExtendedShiftPolicy): Date {
  const d = new Date(punchAt);
  if (policy.extendShiftNextDay && d.getHours() < policy.extendedDayStartHour) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

export function maxExtendedDayStartHour(policies: Iterable<ExtendedShiftPolicy>): number {
  let max = DEFAULT_EXTENDED_DAY_START_HOUR;
  for (const p of policies) {
    if (p.extendShiftNextDay) {
      max = Math.max(max, normalizeExtendedDayStartHour(p.extendedDayStartHour));
    }
  }
  return max;
}

/** أقصى `at` في استعلام الحركات بعد آخر يوم في التقرير (للبصمات بعد منتصف الليل). */
export function attendanceQueryUpperBound(to: Date, maxDayStartHour: number): Date {
  const h = normalizeExtendedDayStartHour(maxDayStartHour);
  const bound = new Date(to);
  bound.setDate(bound.getDate() + 1);
  bound.setHours(h, 59, 59, 999);
  return bound;
}
