"use client";

import { useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { GhostButton, PrimaryButton, fieldClass, labelClass } from "@/components/ui-fields";
import {
  formatScheduleDurationMinutes,
  shiftDurationDisplayMinutes,
} from "@/lib/schedule-time";

export type WeekdayRow = { id: number; label: string };

export type ScheduleGridInitial = {
  enableOvertimeCalc: boolean;
  deductLateFromOvertime: boolean;
  isOpen: boolean;
  extendShiftNextDay: boolean;
  /** ساعات يومية للدوام المفتوح (رقم عشري مثل ٨ أو ٨٫٢٥) */
  expectedDailyHours: number | null;
  days: Array<{
    weekday: number;
    segmentOrder: number;
    startTime: string;
    endTime: string;
    graceInMinutes: number;
    graceOutMinutes: number;
  }>;
};

function computeShiftsPerDay(days: ScheduleGridInitial["days"]): number[] {
  const c = [1, 1, 1, 1, 1, 1, 1];
  for (const d of days) {
    if (d.weekday >= 0 && d.weekday <= 6) {
      c[d.weekday] = Math.max(c[d.weekday], d.segmentOrder + 1);
    }
  }
  return c;
}

/** يوم بلا شفتات في الداتا = يُعرض كإجازة أسبوعية في النموذج */
function initialDayOffFlags(init: ScheduleGridInitial | null | undefined): boolean[] {
  if (!init || init.isOpen || !init.days.length) return Array.from({ length: 7 }, () => false);
  const hasShift = Array.from({ length: 7 }, () => false);
  for (const row of init.days) {
    if (row.weekday >= 0 && row.weekday <= 6) hasShift[row.weekday] = true;
  }
  return hasShift.map((h) => !h);
}

function cellDay(
  days: ScheduleGridInitial["days"] | undefined,
  w: number,
  seg: number,
  field: "start" | "end" | "gin" | "gout",
): string {
  if (!days?.length) return field === "gin" || field === "gout" ? "0" : "";
  const row = days.find((x) => x.weekday === w && x.segmentOrder === seg);
  if (!row) return field === "gin" || field === "gout" ? "0" : "";
  if (field === "start") return row.startTime;
  if (field === "end") return row.endTime;
  if (field === "gin") return String(row.graceInMinutes ?? 0);
  return String(row.graceOutMinutes ?? 0);
}

export function ScheduleWeekdayGrid({
  weekdays,
  initialSchedule,
}: {
  weekdays: WeekdayRow[];
  initialSchedule?: ScheduleGridInitial | null;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [shiftsPerDay, setShiftsPerDay] = useState(() =>
    initialSchedule?.days?.length ? computeShiftsPerDay(initialSchedule.days) : Array.from({ length: 7 }, () => 1),
  );
  const [isOpenSchedule, setIsOpenSchedule] = useState(() => initialSchedule?.isOpen ?? false);
  const [extendOvernight, setExtendOvernight] = useState(() => initialSchedule?.extendShiftNextDay ?? false);
  const [previewTick, bumpPreview] = useReducer((n: number) => n + 1, 0);
  const [preview, setPreview] = useState<{
    shift: Record<string, string>;
    dayTotal: Record<number, string>;
  }>({ shift: {}, dayTotal: {} });
  const [dayOff, setDayOff] = useState(() => initialDayOffFlags(initialSchedule));

  const setTimeInputsDisabled = (disabled: boolean) => {
    const root = rootRef.current;
    if (!root) return;
    root.querySelectorAll<HTMLInputElement>("#schedule-shifts-tbody input").forEach((inp) => {
      inp.disabled = disabled;
      if (disabled) inp.value = "";
    });
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.querySelectorAll<HTMLInputElement>("#schedule-shifts-tbody input").forEach((inp) => {
      inp.disabled = isOpenSchedule;
      if (isOpenSchedule) inp.value = "";
    });
  }, [isOpenSchedule]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || isOpenSchedule) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- معاينة مُشتقة من حقول وقت غير مضبوطة في DOM
      setPreview({ shift: {}, dayTotal: {} });
      return;
    }
    const shift: Record<string, string> = {};
    const dayMinutes = Array.from({ length: 7 }, () => 0);
    const dayHas = Array.from({ length: 7 }, () => false);
    for (const d of weekdays) {
      if (dayOff[d.id]) continue;
      const n = shiftsPerDay[d.id] ?? 1;
      for (let seg = 0; seg < n; seg++) {
        const s = root.querySelector<HTMLInputElement>(`input[name="start_${d.id}_${seg}"]`)?.value ?? "";
        const e = root.querySelector<HTMLInputElement>(`input[name="end_${d.id}_${seg}"]`)?.value ?? "";
        const mins = shiftDurationDisplayMinutes(s, e, extendOvernight);
        const key = `${d.id}-${seg}`;
        shift[key] = mins == null ? "—" : formatScheduleDurationMinutes(mins);
        if (mins != null) {
          dayMinutes[d.id] += mins;
          dayHas[d.id] = true;
        }
      }
    }
    const dayTotal: Record<number, string> = {};
    for (const d of weekdays) {
      if (dayOff[d.id]) {
        dayTotal[d.id] = "يوم إجازة";
        continue;
      }
      dayTotal[d.id] = dayHas[d.id] ? formatScheduleDurationMinutes(dayMinutes[d.id]) : "—";
    }
    setPreview({ shift, dayTotal });
  }, [weekdays, shiftsPerDay, extendOvernight, isOpenSchedule, previewTick, dayOff]);

  const onOpenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const open = e.target.checked;
    setIsOpenSchedule(open);
    setTimeInputsDisabled(open);
    if (open) setExtendOvernight(false);
    if (!open) {
      const exp = rootRef.current?.querySelector<HTMLInputElement>('input[name="expectedDailyHours"]');
      if (exp) exp.value = "";
    }
    bumpPreview();
  };

  const repeatFirstToRest = () => {
    const root = rootRef.current;
    if (!root) return;
    const probe = root.querySelector<HTMLInputElement>('input[name="start_0_0"]');
    if (probe?.disabled) return;
    if (dayOff[0]) return;

    const nSunday = shiftsPerDay[0] ?? 1;
    const segments: { start: string; end: string; graceIn: string; graceOut: string }[] = [];
    for (let seg = 0; seg < nSunday; seg++) {
      const s = root.querySelector<HTMLInputElement>(`input[name="start_0_${seg}"]`);
      const e = root.querySelector<HTMLInputElement>(`input[name="end_0_${seg}"]`);
      const gi = root.querySelector<HTMLInputElement>(`input[name="graceIn_0_${seg}"]`);
      const go = root.querySelector<HTMLInputElement>(`input[name="graceOut_0_${seg}"]`);
      if (!s || !e) return;
      segments.push({
        start: s.value,
        end: e.value,
        graceIn: gi?.value ?? "0",
        graceOut: go?.value ?? "0",
      });
    }

    flushSync(() => {
      setShiftsPerDay((prev) => {
        const next = [...prev];
        for (const d of weekdays) {
          if (d.id === 0) continue;
          if (dayOff[d.id]) continue;
          next[d.id] = nSunday;
        }
        return next;
      });
    });

    for (const d of weekdays) {
      if (d.id === 0 || dayOff[d.id]) continue;
      for (let seg = 0; seg < nSunday; seg++) {
        const src = segments[seg];
        const s = root.querySelector<HTMLInputElement>(`input[name="start_${d.id}_${seg}"]`);
        const e = root.querySelector<HTMLInputElement>(`input[name="end_${d.id}_${seg}"]`);
        const gi = root.querySelector<HTMLInputElement>(`input[name="graceIn_${d.id}_${seg}"]`);
        const go = root.querySelector<HTMLInputElement>(`input[name="graceOut_${d.id}_${seg}"]`);
        if (s && !s.disabled) s.value = src.start;
        if (e && !e.disabled) e.value = src.end;
        if (gi && !gi.disabled) gi.value = src.graceIn;
        if (go && !go.disabled) go.value = src.graceOut;
      }
    }
    bumpPreview();
  };

  const firstDayLabel = weekdays[0]?.label ?? "اليوم الأول";
  const init = initialSchedule;
  const expectedDefault =
    init?.expectedDailyHours != null && Number.isFinite(init.expectedDailyHours)
      ? String(init.expectedDailyHours)
      : "";

  return (
    <div ref={rootRef} className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 shadow-sm">
        <input type="hidden" name="graceInMinutes" value="0" />
        <input type="hidden" name="graceOutMinutes" value="0" />
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">احتساب الإضافي والتأخير</p>
          <div className="space-y-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent px-1 py-1 text-sm text-slate-800 hover:border-slate-200/80 hover:bg-white/60">
              <input
                type="checkbox"
                name="disableOvertimeCalc"
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300"
                defaultChecked={init != null ? !init.enableOvertimeCalc : false}
              />
              <span>عدم احتساب الإضافي (افتراضياً يُحسب عند وجود فرق ساعات)</span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent px-1 py-1 text-sm text-slate-800 hover:border-slate-200/80 hover:bg-white/60">
              <input
                type="checkbox"
                name="deductLateFromOvertime"
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300"
                defaultChecked={init?.deductLateFromOvertime ?? false}
              />
              <span>خصم التأخير أو نقص الساعات من الإضافي في نفس اليوم</span>
            </label>
          </div>
          <p className="text-xs leading-relaxed text-slate-600">
            سماح الدخول والخروج يُعرَّف لكل شفت في جدول الأسبوع أدناه (أعمدة «سماح دخول / سماح خروج»).
          </p>
        </div>

        <div className="my-6 border-t border-slate-200/90" />

        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">نوع الدوام</p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-8 sm:gap-y-3">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-800">
            <input
              type="checkbox"
              name="isOpen"
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300"
              defaultChecked={init?.isOpen ?? false}
              onChange={onOpenChange}
            />
            <span>
              <span className="font-medium text-slate-900">دوام مفتوح</span>
              <span className="mt-0.5 block text-xs font-normal text-slate-600">
                بدون شفتات ثابتة — أول وآخر بصمة؛ يتطلب هدف ساعات يومية.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-800">
            <input
              type="checkbox"
              name="extendShiftNextDay"
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300"
              disabled={isOpenSchedule}
              checked={extendOvernight}
              onChange={(e) => {
                setExtendOvernight(e.target.checked);
                bumpPreview();
              }}
            />
            <span>
              <span className="font-medium text-slate-900">دوام ممتد</span>
              <span className="mt-0.5 block text-xs font-normal text-slate-600">
                نهاية الشفت قد تكون بعد منتصف الليل (مثل ٢٢:٠٠ → ٠٦:٠٠).
              </span>
            </span>
          </label>
        </div>

        <div
          className={`mt-5 rounded-lg border border-amber-200/70 bg-amber-50/50 p-4 ${!isOpenSchedule ? "hidden" : ""}`}
          aria-hidden={!isOpenSchedule}
        >
          <label htmlFor="expectedDailyHours" className={labelClass}>
            هدف ساعات العمل اليومية
          </label>
          <input
            id="expectedDailyHours"
            name="expectedDailyHours"
            type="number"
            min={0.5}
            max={24}
            step={0.25}
            disabled={!isOpenSchedule}
            required={isOpenSchedule}
            defaultValue={expectedDefault || undefined}
            className={`${fieldClass} mt-2 max-w-xs`}
            placeholder="مثال: 8 أو 9"
          />
          <p className="mt-2 text-xs text-amber-900/80">إلزامي عند حفظ «دوام مفتوح».</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/90 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <p className={labelClass}>جدول الأسبوع</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              فعّل «هذا اليوم إجازة» لأي يوم لإخفاء الشفتات (لا يُحفظ له دوام). أكثر من شفت لنفس يوم العمل عبر «+ شفت». زر
              النسخ ينقل دوام {firstDayLabel} إلى الأيام العاملة فقط (لا يُغيّر الأيام المعينة كإجازة).
            </p>
          </div>
          <PrimaryButton type="button" onClick={repeatFirstToRest} className="w-full shrink-0 sm:w-auto">
            نسخ دوام {firstDayLabel} إلى باقي الأيام
          </PrimaryButton>
        </div>
        <div className="overflow-x-auto table-container">
          <table className="min-w-full text-right text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-28 px-3 py-2">اليوم</th>
                <th className="w-12 px-3 py-2">شفت</th>
                <th className="px-3 py-2">بداية</th>
                <th className="px-3 py-2">نهاية</th>
                <th className="w-24 px-3 py-2">سماح دخول</th>
                <th className="w-24 px-3 py-2">سماح خروج</th>
                <th className="min-w-[9rem] px-3 py-2">مدة الشفت</th>
                <th className="w-36 px-3 py-2"> </th>
              </tr>
            </thead>
            <tbody
              id="schedule-shifts-tbody"
              className="divide-y divide-slate-100 bg-white"
              onInput={() => bumpPreview()}
              onChange={() => bumpPreview()}
            >
              {weekdays.flatMap((d) => {
                if (dayOff[d.id]) {
                  const offRow = (
                    <tr key={`${d.id}-off`} className="bg-violet-50/50 text-violet-950">
                      <td className="px-3 py-2.5 font-medium text-slate-900">{d.label}</td>
                      <td colSpan={5} className="px-3 py-2.5">
                        <label className="flex cursor-pointer flex-wrap items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="h-4 w-4 shrink-0 rounded border-violet-400 text-violet-700 focus:ring-violet-500"
                            checked={dayOff[d.id]}
                            onChange={(e) => {
                              const off = e.target.checked;
                              setDayOff((prev) => {
                                const next = [...prev];
                                next[d.id] = off;
                                return next;
                              });
                              if (!off) {
                                setShiftsPerDay((prev) => {
                                  const next = [...prev];
                                  if ((next[d.id] ?? 0) < 1) next[d.id] = 1;
                                  return next;
                                });
                              }
                              bumpPreview();
                            }}
                          />
                          <span className="font-medium">هذا اليوم إجازة</span>
                          <span className="text-xs font-normal text-violet-900/80">(بدون شفتات — لا يُحسب دوام ثابت)</span>
                        </label>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-violet-900/70">—</td>
                      <td className="px-3 py-2.5" />
                    </tr>
                  );
                  const summary = (
                    <tr key={`${d.id}-day-total`} className="bg-slate-50/90 text-xs text-slate-700">
                      <td colSpan={6} className="px-3 py-2 font-medium text-slate-800">
                        إجمالي دوام {d.label}
                      </td>
                      <td className="px-3 py-2 font-semibold tabular-nums text-violet-900">
                        {preview.dayTotal[d.id] ?? "يوم إجازة"}
                      </td>
                      <td className="px-3 py-2" />
                    </tr>
                  );
                  return [offRow, summary];
                }

                const n = shiftsPerDay[d.id] ?? 1;
                const rows = Array.from({ length: n }, (_, seg) => (
                  <tr key={`${d.id}-${seg}`}>
                    <td className="px-3 py-2 font-medium text-slate-800">
                      {seg === 0 ? (
                        <span className="flex flex-col gap-2">
                          <span>{d.label}</span>
                          <label className="flex cursor-pointer items-center gap-2 text-xs font-normal text-slate-600">
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 shrink-0 rounded border-slate-300"
                              defaultChecked={false}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setDayOff((prev) => {
                                    const next = [...prev];
                                    next[d.id] = true;
                                    return next;
                                  });
                                  bumpPreview();
                                }
                              }}
                            />
                            <span>هذا اليوم إجازة</span>
                          </label>
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-slate-500 tabular-nums">{seg + 1}</td>
                    <td className="px-3 py-2">
                      <input
                        name={`start_${d.id}_${seg}`}
                        className={fieldClass}
                        type="time"
                        defaultValue={cellDay(init?.days, d.id, seg, "start")}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        name={`end_${d.id}_${seg}`}
                        className={fieldClass}
                        type="time"
                        defaultValue={cellDay(init?.days, d.id, seg, "end")}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        name={`graceIn_${d.id}_${seg}`}
                        type="number"
                        min={0}
                        max={720}
                        defaultValue={cellDay(init?.days, d.id, seg, "gin")}
                        className={fieldClass}
                        title="دقائق بعد بداية الشفت (٠ = استخدام سماح الجدول العام)"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        name={`graceOut_${d.id}_${seg}`}
                        type="number"
                        min={0}
                        max={720}
                        defaultValue={cellDay(init?.days, d.id, seg, "gout")}
                        className={fieldClass}
                        title="دقائق قبل نهاية الشفت (٠ = استخدام سماح الجدول العام)"
                      />
                    </td>
                    <td className="px-3 py-2 text-xs leading-snug text-slate-700 tabular-nums">
                      {preview.shift[`${d.id}-${seg}`] ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      {seg === n - 1 ? (
                        <div className="flex flex-wrap gap-1">
                          <GhostButton
                            type="button"
                            className="!px-2 !py-1 text-xs"
                            onClick={() =>
                              setShiftsPerDay((prev) => {
                                const next = [...prev];
                                next[d.id] = Math.min(16, (next[d.id] ?? 1) + 1);
                                return next;
                              })
                            }
                          >
                            + شفت
                          </GhostButton>
                          {n > 1 ? (
                            <GhostButton
                              type="button"
                              className="!px-2 !py-1 text-xs"
                              onClick={() =>
                                setShiftsPerDay((prev) => {
                                  const next = [...prev];
                                  next[d.id] = Math.max(1, (next[d.id] ?? 1) - 1);
                                  return next;
                                })
                              }
                            >
                              حذف آخر
                            </GhostButton>
                          ) : null}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ));
                const summary = (
                  <tr key={`${d.id}-day-total`} className="bg-slate-50/90 text-xs text-slate-700">
                    <td colSpan={6} className="px-3 py-2 font-medium text-slate-800">
                      إجمالي دوام {d.label}
                    </td>
                    <td className="px-3 py-2 font-semibold tabular-nums text-slate-900">
                      {preview.dayTotal[d.id] ?? "—"}
                    </td>
                    <td className="px-3 py-2" />
                  </tr>
                );
                return [...rows, summary];
              })}
            </tbody>
          </table>
        </div>
        <p className="border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 text-xs leading-relaxed text-slate-600">
          عمود «مدة الشفت» و«إجمالي دوام اليوم» يُحدَّثان تلقائياً من البداية والنهاية. مع «دوام ممتد» يُحسب الشفت
          الذي يعبر منتصف الليل (مثل ٢٢:٠٠ → ٠٦:٠٠). أقصى شفتات ليوم عمل: ١٦. يجب أن يبقى يوم عمل واحد على الأقل
          بشفتات (لا يمكن حفظ أسبوع كله إجازة). لا يُنسخ تلقائياً مع «دوام مفتوح».
        </p>
      </div>
    </div>
  );
}
