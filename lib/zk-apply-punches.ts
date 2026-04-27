import { reconcileOpenScheduleKindsForDay } from "@/lib/open-schedule-kinds";
import { prisma } from "@/lib/prisma";

export type ZkPunchInput = {
  zkUserId: number;
  at: string;
  kind: "CHECK_IN" | "CHECK_OUT";
};

export type ApplyZkPunchesResult = { inserted: number };

/**
 * يسجّل حركات قادمة من جهاز (ingest JSON أو ZK Push) ويربطها بالموظفين ويحدّث lastSyncAt.
 */
export async function applyZkPunchesToDevice(
  deviceId: string,
  punches: ZkPunchInput[],
): Promise<ApplyZkPunchesResult> {
  const device = await prisma.fingerprintDevice.findUnique({
    where: { id: deviceId },
  });

  if (!device) {
    throw new Error("الجهاز غير موجود");
  }

  let inserted = 0;
  const sortedPunches = [...punches].sort((a, b) => +new Date(a.at) - +new Date(b.at));

  for (const p of sortedPunches) {
    const at = new Date(p.at);
    if (Number.isNaN(at.getTime())) {
      throw new Error("تاريخ غير صالح في الحركات");
    }

    const kind = p.kind === "CHECK_OUT" ? "CHECK_OUT" : "CHECK_IN";

    const employee = await prisma.employee.findFirst({
      where: { deviceUserId: p.zkUserId, branchId: device.branchId, active: true },
      include: { workSchedule: { select: { isOpen: true } } },
    });

    if (!employee) {
      await prisma.unknownDeviceUser.upsert({
        where: {
          deviceId_zkUserId: { deviceId: device.id, zkUserId: p.zkUserId },
        },
        update: { lastSeenAt: at },
        create: {
          deviceId: device.id,
          zkUserId: p.zkUserId,
          lastSeenAt: at,
        },
      });
    }

    await prisma.attendanceEvent.create({
      data: {
        branchId: device.branchId,
        deviceId: device.id,
        employeeId: employee?.id,
        at,
        kind,
        source: "DEVICE",
        isPosted: false,
      },
    });
    inserted += 1;

    if (employee?.workSchedule?.isOpen) {
      await reconcileOpenScheduleKindsForDay(employee.id, at);
    }
  }

  await prisma.fingerprintDevice.update({
    where: { id: device.id },
    data: { lastSyncAt: new Date() },
  });

  return { inserted };
}
