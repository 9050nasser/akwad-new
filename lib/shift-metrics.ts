import { parseTimeToMinutes } from "@/lib/schedule-time";

export type DaySegment = {
  weekday: number;
  segmentOrder: number;
  startTime: string;
  endTime: string;
  graceInMinutes: number;
  graceOutMinutes: number;
};

export type ShiftDayMetrics = {
  lateShifts: number;
  lateMinutes: number;
  earlyArrivalShifts: number;
  earlyArrivalMinutes: number;
  earlyLeaveShifts: number;
  earlyLeaveMinutes: number;
  workedMinutes: number;
};

const emptyMetrics = (): ShiftDayMetrics => ({
  lateShifts: 0,
  lateMinutes: 0,
  earlyArrivalShifts: 0,
  earlyArrivalMinutes: 0,
  earlyLeaveShifts: 0,
  earlyLeaveMinutes: 0,
  workedMinutes: 0,
});

export function sumShiftDayMetrics(a: ShiftDayMetrics, b: ShiftDayMetrics): ShiftDayMetrics {
  return {
    lateShifts: a.lateShifts + b.lateShifts,
    lateMinutes: a.lateMinutes + b.lateMinutes,
    earlyArrivalShifts: a.earlyArrivalShifts + b.earlyArrivalShifts,
    earlyArrivalMinutes: a.earlyArrivalMinutes + b.earlyArrivalMinutes,
    earlyLeaveShifts: a.earlyLeaveShifts + b.earlyLeaveShifts,
    earlyLeaveMinutes: a.earlyLeaveMinutes + b.earlyLeaveMinutes,
    workedMinutes: a.workedMinutes + b.workedMinutes,
  };
}

/** يزيل تكرار نفس النوع في نفس الثانية (أو أقرب ثانية) — قبل نافذة الدمج بالدقائق. */
export function collapseSameSecondDuplicatePunches<T extends { at: Date; kind: string }>(events: T[]): T[] {
  if (events.length === 0) return [];
  const sorted = [...events].sort((a, b) => a.at.getTime() - b.at.getTime());
  const out: T[] = [];
  for (const e of sorted) {
    const last = out[out.length - 1];
    if (
      last &&
      last.kind === e.kind &&
      Math.floor(last.at.getTime() / 1000) === Math.floor(e.at.getTime() / 1000)
    ) {
      if (e.kind === "CHECK_OUT") out[out.length - 1] = e;
      continue;
    }
    out.push(e);
  }
  return out;
}

/** نفس الثانية ثم `dedupePunchSequence` — للتقارير وعرض أول/آخر حركة. */
export function preparePunchesForAttendanceReport<T extends { at: Date; kind: string }>(
  events: T[],
  punchDedupeWindowMin: number,
): T[] {
  const collapsed = collapseSameSecondDuplicatePunches(events);
  const w = punchDedupeWindowMin <= 0 ? 1 : punchDedupeWindowMin;
  return dedupePunchSequence(collapsed, w);
}

/** أول دخول وآخر خروج بعد تجهيز التسلسل (مرتب زمنيًا). */
export function firstCheckInLastCheckOutOfDay<T extends { at: Date; kind: string }>(
  dedupedSorted: T[],
): { firstIn?: Date; lastOut?: Date } {
  let firstIn: Date | undefined;
  let lastOut: Date | undefined;
  for (const x of dedupedSorted) {
    if (x.kind === "CHECK_IN" && !firstIn) firstIn = x.at;
  }
  for (let i = dedupedSorted.length - 1; i >= 0; i--) {
    if (dedupedSorted[i].kind === "CHECK_OUT") {
      lastOut = dedupedSorted[i].at;
      break;
    }
  }
  return { firstIn, lastOut };
}

/**
 * يدمج بصمات متكررة لنفس النوع خلال نافذة زمنية (دقائق): أول دخول، آخر خروج.
 * لا يُعدّل السجلات في قاعدة البيانات — للحساب فقط.
 */
export function dedupePunchSequence<T extends { at: Date; kind: string }>(events: T[], windowMin: number): T[] {
  if (windowMin <= 0 || events.length === 0) return events;
  const sorted = [...events].sort((a, b) => a.at.getTime() - b.at.getTime());
  const out: T[] = [];
  const winMs = windowMin * 60000;
  for (const e of sorted) {
    const last = out[out.length - 1];
    if (last && e.kind === last.kind) {
      const dt = e.at.getTime() - last.at.getTime();
      if (dt >= 0 && dt <= winMs) {
        if (e.kind === "CHECK_IN") continue;
        if (e.kind === "CHECK_OUT") {
          out[out.length - 1] = e;
        }
        continue;
      }
    }
    out.push(e);
  }
  return out;
}

/** يقرأ تسلسل دخول/خروج ويُكوّن أزواجاً بالترتيب (أول دخول مع أول خروج بعده، إلخ). */
export function pairInOutSequence(events: { at: Date; kind: string }[]): { in?: Date; out?: Date }[] {
  const sorted = [...events].sort((a, b) => a.at.getTime() - b.at.getTime());
  const pairs: { in?: Date; out?: Date }[] = [];
  let pendingIn: Date | undefined;
  for (const e of sorted) {
    if (e.kind === "CHECK_IN") {
      if (pendingIn) pairs.push({ in: pendingIn });
      pendingIn = e.at;
    } else if (e.kind === "CHECK_OUT") {
      if (pendingIn) {
        pairs.push({ in: pendingIn, out: e.at });
        pendingIn = undefined;
      }
    }
  }
  if (pendingIn) pairs.push({ in: pendingIn });
  return pairs;
}

function segmentWindow(
  dayStart: Date,
  startTime: string,
  endTime: string,
  extendNextDay: boolean,
): { start: Date; end: Date } {
  const sm = parseTimeToMinutes(startTime);
  const em = parseTimeToMinutes(endTime);
  if (sm == null || em == null) {
    return { start: dayStart, end: dayStart };
  }
  const [sh, sM] = startTime.split(":").map(Number);
  const [eh, eM] = endTime.split(":").map(Number);
  const start = new Date(dayStart);
  start.setHours(sh, sM, 0, 0);
  const end = new Date(dayStart);
  end.setHours(eh, eM, 0, 0);
  if (extendNextDay && em <= sm) {
    end.setDate(end.getDate() + 1);
  }
  return { start, end };
}

/** مجموع الدقائق المجدولة لجميع شرائح يوم واحد (دوام ثابت). */
export function totalScheduledMinutesForSegments(
  dayStart: Date,
  segments: DaySegment[],
  extendNextDay: boolean,
): number {
  let total = 0;
  for (const seg of segments) {
    const { start, end } = segmentWindow(dayStart, seg.startTime, seg.endTime, extendNextDay);
    total += Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  }
  return total;
}

/** يطابق الشفتات بالترتيب مع الأزواج (الشفت ١ مع الزوج ١، …) ويحسب التأخير والتبكير والخروج المبكر والعمل. */
export function metricsForFixedDay(
  dayStart: Date,
  segments: DaySegment[],
  extendNextDay: boolean,
  scheduleGraceIn: number,
  scheduleGraceOut: number,
  pairs: { in?: Date; out?: Date }[],
  /** هامش إضافي من إعدادات الشركة (دقائق) يُضاف لسماح الدخول/الخروج في الشفت. */
  companyGraceMinutes = 0,
): ShiftDayMetrics {
  const out = emptyMetrics();
  if (!segments.length) return out;

  const segs = [...segments]
    .slice()
    .sort((a, b) => a.segmentOrder - b.segmentOrder || a.startTime.localeCompare(b.startTime));

  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    const pair = pairs[i] ?? {};
    const cg = Math.max(0, companyGraceMinutes);
    const gin = (seg.graceInMinutes > 0 ? seg.graceInMinutes : scheduleGraceIn) + cg;
    const gout = (seg.graceOutMinutes > 0 ? seg.graceOutMinutes : scheduleGraceOut) + cg;
    const { start, end } = segmentWindow(dayStart, seg.startTime, seg.endTime, extendNextDay);

    if (pair.in) {
      const diffInMs = pair.in.getTime() - start.getTime();
      const lateBlockMin = Math.floor(diffInMs / 60000);
      if (lateBlockMin > gin) {
        out.lateShifts += 1;
        out.lateMinutes += lateBlockMin - gin;
      } else if (diffInMs < 0) {
        const earlyMin = Math.floor((start.getTime() - pair.in.getTime()) / 60000);
        if (earlyMin > 0) {
          out.earlyArrivalShifts += 1;
          out.earlyArrivalMinutes += earlyMin;
        }
      }
    }

    if (pair.out) {
      const cutoffMs = end.getTime() - gout * 60000;
      if (pair.out.getTime() < cutoffMs) {
        const earlyLeaveMin = Math.floor((cutoffMs - pair.out.getTime()) / 60000);
        if (earlyLeaveMin > 0) {
          out.earlyLeaveShifts += 1;
          out.earlyLeaveMinutes += earlyLeaveMin;
        }
      }
    }

    if (pair.in && pair.out) {
      const w = Math.max(0, Math.round((pair.out.getTime() - pair.in.getTime()) / 60000));
      out.workedMinutes += w;
    }
  }

  return out;
}

export function localCalendarDayStart(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function localDayKey(d: Date): string {
  return localCalendarDayStart(d).toISOString().slice(0, 10);
}
