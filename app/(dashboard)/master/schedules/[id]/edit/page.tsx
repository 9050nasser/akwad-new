import Link from "next/link";
import { notFound } from "next/navigation";
import { FlashBanner } from "@/components/flash-banner";
import { ScheduleWeekdayGrid, type ScheduleGridInitial } from "@/components/schedule-weekday-grid";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { PageFrame } from "@/components/page-frame";
import { updateWorkSchedule } from "@/app/actions/schedules";
import { formatFlash } from "@/lib/flash";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant";

const WEEKDAYS = [
  { id: 0, label: "الأحد" },
  { id: 1, label: "الإثنين" },
  { id: 2, label: "الثلاثاء" },
  { id: 3, label: "الأربعاء" },
  { id: 4, label: "الخميس" },
  { id: 5, label: "الجمعة" },
  { id: 6, label: "السبت" },
];

export default async function EditSchedulePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireTenantSession();
  const companyId = session.companyId;
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const flash = formatFlash(sp);

  const schedule = await prisma.workSchedule.findFirst({
    where: { id, companyId },
    include: { days: true },
  });
  if (!schedule) notFound();

  const expectedDailyHours =
    schedule.expectedDailyMinutes != null
      ? Math.round((schedule.expectedDailyMinutes / 60) * 100) / 100
      : null;

  const initial: ScheduleGridInitial = {
    enableOvertimeCalc: schedule.enableOvertimeCalc,
    deductLateFromOvertime: schedule.deductLateFromOvertime,
    isOpen: schedule.isOpen,
    extendShiftNextDay: schedule.extendShiftNextDay,
    expectedDailyHours,
    days: schedule.isOpen
      ? []
      : schedule.days.map((d) => ({
          weekday: d.weekday,
          segmentOrder: d.segmentOrder,
          startTime: d.startTime,
          endTime: d.endTime,
          graceInMinutes: d.graceInMinutes,
          graceOutMinutes: d.graceOutMinutes,
        })),
  };

  return (
    <PageFrame title="تعديل الدوام" subtitle={schedule.name}>
      <FlashBanner notice={flash.notice} error={flash.error} />

      <p className="mb-6">
        <Link href="/master/schedules" className="text-sm font-medium text-teal-700 hover:text-teal-800">
          ← العودة إلى أوقات العمل
        </Link>
      </p>

      <form action={updateWorkSchedule} className="space-y-4">
        <input type="hidden" name="scheduleId" value={id} />
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="name">اسم الدوام</Label>
            <input id="name" name="name" className={fieldClass} required defaultValue={schedule.name} />
          </div>
          <div>
            <Label htmlFor="description">وصف (اختياري)</Label>
            <input
              id="description"
              name="description"
              className={fieldClass}
              defaultValue={schedule.description ?? ""}
            />
          </div>
        </div>

        <ScheduleWeekdayGrid weekdays={WEEKDAYS} initialSchedule={initial} />

        <PrimaryButton>حفظ التعديلات</PrimaryButton>
      </form>
    </PageFrame>
  );
}
