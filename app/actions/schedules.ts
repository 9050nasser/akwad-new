"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseTimeToMinutes } from "@/lib/schedule-time";
import { prisma } from "@/lib/prisma";
import { requireCompanyAndPermission } from "@/lib/rbac/guards";

function readCheckbox(formData: FormData, key: string) {
  const v = formData.get(key);
  return v === "on" || v === "1" || v === "true";
}

function parseGraceField(formData: FormData, key: string) {
  const n = parseInt(String(formData.get(key) ?? "0"), 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, 24 * 60);
}

function readScheduleOptions(formData: FormData) {
  const disableOvertimeCalc = readCheckbox(formData, "disableOvertimeCalc");
  return {
    enableOvertimeCalc: !disableOvertimeCalc,
    deductLateFromOvertime: readCheckbox(formData, "deductLateFromOvertime"),
    graceInMinutes: parseGraceField(formData, "graceInMinutes"),
    graceOutMinutes: parseGraceField(formData, "graceOutMinutes"),
  };
}

function collectShiftsFromForm(formData: FormData) {
  const out: {
    weekday: number;
    segmentOrder: number;
    startTime: string;
    endTime: string;
    graceInMinutes: number;
    graceOutMinutes: number;
  }[] = [];
  for (let w = 0; w < 7; w++) {
    for (let seg = 0; seg < 16; seg++) {
      const startTime = String(formData.get(`start_${w}_${seg}`) ?? "").trim();
      const endTime = String(formData.get(`end_${w}_${seg}`) ?? "").trim();
      if (!startTime && !endTime) {
        if (seg === 0) break;
        break;
      }
      if (!startTime || !endTime) {
        redirect("/master/schedules?err=times");
      }
      out.push({
        weekday: w,
        segmentOrder: seg,
        startTime,
        endTime,
        graceInMinutes: parseGraceField(formData, `graceIn_${w}_${seg}`),
        graceOutMinutes: parseGraceField(formData, `graceOut_${w}_${seg}`),
      });
    }
  }
  return out;
}

export async function createWorkSchedule(formData: FormData) {
  const { company } = await requireCompanyAndPermission("master.schedules", "create");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/master/schedules?err=required");
  const description = String(formData.get("description") ?? "").trim() || null;

  const opts = readScheduleOptions(formData);
  const isOpen = readCheckbox(formData, "isOpen");
  const extendShiftNextDay = !isOpen && readCheckbox(formData, "extendShiftNextDay");

  if (isOpen) {
    const hoursStr = String(formData.get("expectedDailyHours") ?? "").trim().replace(",", ".");
    const hours = Number(hoursStr);
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
      redirect("/master/schedules?err=open_hours");
    }
    const expectedDailyMinutes = Math.round(hours * 60);

    await prisma.workSchedule.create({
      data: {
        companyId: company.id,
        name,
        description,
        isOpen: true,
        extendShiftNextDay: false,
        expectedDailyMinutes,
        ...opts,
      },
    });
    revalidatePath("/master/schedules");
    revalidatePath("/master/employees");
    redirect("/master/schedules?notice=1");
  }

  const dayCreates = collectShiftsFromForm(formData);

  if (dayCreates.length === 0) {
    redirect("/master/schedules?err=days");
  }

  for (const d of dayCreates) {
    const sm = parseTimeToMinutes(d.startTime);
    const em = parseTimeToMinutes(d.endTime);
    if (sm == null || em == null) {
      redirect("/master/schedules?err=times");
    }
    if (!extendShiftNextDay) {
      if (em <= sm) {
        redirect("/master/schedules?err=times");
      }
    } else if (em === sm) {
      redirect("/master/schedules?err=times");
    }
  }

  await prisma.workSchedule.create({
    data: {
      companyId: company.id,
      name,
      description,
      isOpen: false,
      extendShiftNextDay,
      expectedDailyMinutes: null,
      ...opts,
      days: { create: dayCreates },
    },
  });

  revalidatePath("/master/schedules");
  revalidatePath("/master/employees");
  redirect("/master/schedules?notice=1");
}

function editErrRedirect(scheduleId: string, code: string): never {
  redirect(`/master/schedules/${scheduleId}/edit?err=${code}`);
}

export async function updateWorkSchedule(formData: FormData) {
  const { company } = await requireCompanyAndPermission("master.schedules", "update");
  const scheduleId = String(formData.get("scheduleId") ?? "").trim();
  if (!scheduleId) redirect("/master/schedules?err=required");

  const existing = await prisma.workSchedule.findFirst({
    where: { id: scheduleId, companyId: company.id },
    include: { days: true },
  });
  if (!existing) redirect("/master/schedules?err=not_found");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) editErrRedirect(scheduleId, "required");
  const description = String(formData.get("description") ?? "").trim() || null;

  const opts = readScheduleOptions(formData);
  const isOpen = readCheckbox(formData, "isOpen");
  const extendShiftNextDay = !isOpen && readCheckbox(formData, "extendShiftNextDay");

  if (isOpen) {
    const hoursStr = String(formData.get("expectedDailyHours") ?? "").trim().replace(",", ".");
    const hours = Number(hoursStr);
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
      editErrRedirect(scheduleId, "open_hours");
    }
    const expectedDailyMinutes = Math.round(hours * 60);

    await prisma.$transaction([
      prisma.workScheduleDay.deleteMany({ where: { scheduleId } }),
      prisma.workSchedule.update({
        where: { id: scheduleId },
        data: {
          name,
          description,
          isOpen: true,
          extendShiftNextDay: false,
          expectedDailyMinutes,
          ...opts,
        },
      }),
    ]);
    revalidatePath("/master/schedules");
    revalidatePath("/master/employees");
    redirect("/master/schedules?notice=edit");
  }

  const dayCreates = collectShiftsFromForm(formData);

  if (dayCreates.length === 0) {
    editErrRedirect(scheduleId, "days");
  }

  for (const d of dayCreates) {
    const sm = parseTimeToMinutes(d.startTime);
    const em = parseTimeToMinutes(d.endTime);
    if (sm == null || em == null) {
      editErrRedirect(scheduleId, "times");
    }
    if (!extendShiftNextDay) {
      if (em <= sm) {
        editErrRedirect(scheduleId, "times");
      }
    } else if (em === sm) {
      editErrRedirect(scheduleId, "times");
    }
  }

  await prisma.$transaction([
    prisma.workScheduleDay.deleteMany({ where: { scheduleId } }),
    prisma.workSchedule.update({
      where: { id: scheduleId },
      data: {
        name,
        description,
        isOpen: false,
        extendShiftNextDay,
        expectedDailyMinutes: null,
        ...opts,
        days: { create: dayCreates },
      },
    }),
  ]);

  revalidatePath("/master/schedules");
  revalidatePath("/master/employees");
  redirect("/master/schedules?notice=edit");
}

export async function deleteWorkSchedule(formData: FormData) {
  const { company } = await requireCompanyAndPermission("master.schedules", "delete");
  const id = String(formData.get("id") ?? "");
  const owned = await prisma.workSchedule.findFirst({ where: { id, companyId: company.id } });
  if (!owned) redirect("/master/schedules?err=not_found");
  try {
    await prisma.workSchedule.delete({ where: { id } });
  } catch {
    redirect("/master/schedules?err=in_use");
  }
  revalidatePath("/master/schedules");
  redirect("/master/schedules?notice=1");
}
