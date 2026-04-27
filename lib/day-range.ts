/** حدود يوم تقويمي محلي (وفق توقيت الخادم) */
export function localDayRange(d = new Date()) {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function parseDateOnly(value: string | undefined, fallback = new Date()) {
  if (!value) return new Date(fallback);
  const [y, m, day] = value.split("-").map(Number);
  if (!y || !m || !day) return new Date(fallback);
  return new Date(y, m - 1, day);
}

export function eachCalendarDay(from: Date, to: Date) {
  const days: Date[] = [];
  const cur = new Date(from);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (cur <= end) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}
