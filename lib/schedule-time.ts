/** Parses "HH:mm" to minutes from midnight. */
export function parseTimeToMinutes(hhmm: string): number | null {
  const parts = hhmm.trim().split(":").map(Number);
  if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return null;
  return parts[0] * 60 + parts[1];
}

export function isOvernightShift(startTime: string, endTime: string): boolean {
  const s = parseTimeToMinutes(startTime);
  const e = parseTimeToMinutes(endTime);
  if (s == null || e == null) return false;
  return e <= s;
}

/**
 * مدة الشفت بالدقائق للعرض فقط — نفس قواعد الحفظ في `schedules.ts` (دوام ممتد يسمح بنهاية بعد منتصف الليل).
 */
export function shiftDurationDisplayMinutes(
  startTime: string,
  endTime: string,
  extendShiftNextDay: boolean,
): number | null {
  const sm = parseTimeToMinutes(startTime.trim());
  const em = parseTimeToMinutes(endTime.trim());
  if (sm == null || em == null) return null;
  if (!extendShiftNextDay) {
    if (em <= sm) return null;
    return em - sm;
  }
  if (em === sm) return null;
  if (em > sm) return em - sm;
  return 24 * 60 - sm + em;
}

export function formatScheduleDurationMinutes(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return "—";
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  const dec = (totalMinutes / 60).toLocaleString("ar-EG", {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(totalMinutes / 60) ? 0 : 1,
  });
  if (h === 0) return `${m} د ≈ ${dec} س`;
  if (m === 0) return `${h} ساعة`;
  return `${h} س ${m} د (${dec} س)`;
}
