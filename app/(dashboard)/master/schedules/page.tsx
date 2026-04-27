import Link from "next/link";
import { ConfirmServerActionForm } from "@/components/confirm-server-action-form";
import { FlashBanner } from "@/components/flash-banner";
import { ScheduleWeekdayGrid } from "@/components/schedule-weekday-grid";
import { DangerButton, Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { PageFrame } from "@/components/page-frame";
import { createWorkSchedule, deleteWorkSchedule } from "@/app/actions/schedules";
import { formatFlash } from "@/lib/flash";
import { isOvernightShift } from "@/lib/schedule-time";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant";

/** حقول السماح لكل شفت؛ يُزال عند تطابق أنواع Prisma بعد `prisma generate`. */
type ScheduleDayRow = {
  graceInMinutes?: number | null;
  graceOutMinutes?: number | null;
};

const WEEKDAYS = [
  { id: 0, label: "الأحد" },
  { id: 1, label: "الإثنين" },
  { id: 2, label: "الثلاثاء" },
  { id: 3, label: "الأربعاء" },
  { id: 4, label: "الخميس" },
  { id: 5, label: "الجمعة" },
  { id: 6, label: "السبت" },
];

export default async function SchedulesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireTenantSession();
  const companyId = session.companyId;
  const sp = (await searchParams) ?? {};
  const flash = formatFlash(sp);
  const rows = await prisma.workSchedule.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
    include: { days: true, _count: { select: { employees: true } } },
  });

  return (
    <PageFrame
      title="أوقات العمل"
      subtitle="شفتات متعددة لنفس اليوم، سماح لكل شفت من النموذج أدناه، دوام مفتوح مع هدف ساعات يومية، وخيارات الإضافي — تُستخدم في تقارير التأخير والإضافي."
    >
      <FlashBanner notice={flash.notice} error={flash.error} />

      <form action={createWorkSchedule} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="name">اسم الدوام</Label>
            <input id="name" name="name" className={fieldClass} required />
          </div>
          <div>
            <Label htmlFor="description">وصف (اختياري)</Label>
            <input id="description" name="description" className={fieldClass} />
          </div>
        </div>

        <ScheduleWeekdayGrid weekdays={WEEKDAYS} />

        <PrimaryButton>حفظ دوام جديد</PrimaryButton>
        <p className="text-xs text-slate-500">
          استخدم «+ شفت» لإضافة فترة ثانية لنفس اليوم (مثل ٠٩:٠٠–١٢:٠٠ ثم ١٦:٠٠–٢١:٠٠). دوام «مفتوح» يتطلب
          إدخال هدف الساعات اليومية. «عدم احتساب الإضافي» و«خصم التأخير من الإضافي» تؤثران على عمود الإضافي في
          تقرير الإضافي. دوام «ممتد» يسمح بشفت يعبر منتصف الليل عندما تكون نهاية الشفت قبل بدايته بالساعة.
        </p>
      </form>

      <div className="mt-10 space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">الدوامات المحفوظة</h2>
        <p className="text-xs text-slate-500">اضغط على اسم الدوام لعرض التفاصيل والتعديل أو الحذف.</p>
        {rows.map((s) => (
          <details
            key={s.id}
            className="group rounded-xl border border-slate-200 bg-slate-50/40 open:bg-white open:shadow-sm"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:hidden [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 truncate font-semibold text-slate-900">{s.name}</span>
              <span
                className="shrink-0 text-slate-400 transition-transform duration-200 group-open:-rotate-180"
                aria-hidden
              >
                ▼
              </span>
            </summary>
            <div className="border-t border-slate-200 px-4 py-4">
              <p className="text-xs text-slate-600">{s.description?.trim() ? s.description : "—"}</p>
              <p className="mt-2 text-xs text-slate-500">مرتبط بـ {s._count.employees} موظف</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {s.isOpen ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                    دوام مفتوح
                  </span>
                ) : null}
                {!s.isOpen && s.extendShiftNextDay ? (
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-900">
                    دوام ممتد
                  </span>
                ) : null}
              </div>
              <div className="mt-3 space-y-1 border-t border-slate-200/80 pt-3 text-xs text-slate-600">
                {(s.graceInMinutes ?? 0) > 0 || (s.graceOutMinutes ?? 0) > 0 ? (
                  <p>
                    سماح عام للدوام (قديم): دخول {s.graceInMinutes} د — خروج {s.graceOutMinutes} د
                  </p>
                ) : null}
                <p>
                  احتساب الإضافي: {s.enableOvertimeCalc ? "مفعّل" : "معطّل"} — خصم نقص الساعات من الإضافي:{" "}
                  {s.deductLateFromOvertime ? "نعم" : "لا"}
                </p>
                {s.isOpen && s.expectedDailyMinutes != null ? (
                  <p>
                    هدف العمل اليومي: {Math.round((s.expectedDailyMinutes / 60) * 100) / 100} ساعة (
                    {s.expectedDailyMinutes} دقيقة)
                  </p>
                ) : null}
              </div>
              {s.isOpen ? (
                <p className="mt-3 text-sm text-slate-700">
                  دوام مفتوح: بدون نوافذ وقت ثابتة. عند استلام البصمات من الـ API يُعاد تلقائياً تصنيف حركات ذلك
                  اليوم (أول بصمة = دخول، آخر بصمة = خروج). في التقارير تُستخدم نفس القاعدة لمن لديه هذا الدوام.
                </p>
              ) : (
                <ul className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                  {s.days
                    .slice()
                    .sort((a, b) => a.weekday - b.weekday || a.segmentOrder - b.segmentOrder)
                    .map((d) => {
                      const label = WEEKDAYS.find((w) => w.id === d.weekday)?.label ?? `يوم ${d.weekday}`;
                      const overnight = s.extendShiftNextDay && isOvernightShift(d.startTime, d.endTime);
                      const sameDay = s.days.filter((x) => x.weekday === d.weekday).length;
                      const segLabel = sameDay > 1 ? ` — شفت ${d.segmentOrder + 1}` : "";
                      const g = d as typeof d & ScheduleDayRow;
                      const gin = g.graceInMinutes ?? 0;
                      const gout = g.graceOutMinutes ?? 0;
                      return (
                        <li key={d.id} className="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200/80">
                          {label}
                          {segLabel}: {d.startTime} → {d.endTime}
                          <span className="me-2 text-xs text-slate-500">
                            {" "}
                            (سماح دخول/خروج الشفت: {gin}/{gout} د)
                          </span>
                          {overnight ? (
                            <span className="me-1 text-xs text-sky-700"> (حتى اليوم التالي)</span>
                          ) : null}
                        </li>
                      );
                    })}
                </ul>
              )}
              <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <Link
                  href={`/master/schedules/${s.id}/edit`}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
                >
                  تعديل
                </Link>
                <ConfirmServerActionForm action={deleteWorkSchedule} confirmMessage="حذف هذا الدوام؟">
                  <input type="hidden" name="id" value={s.id} />
                  <DangerButton disabled={s._count.employees > 0}>حذف</DangerButton>
                </ConfirmServerActionForm>
              </div>
            </div>
          </details>
        ))}
      </div>
    </PageFrame>
  );
}
