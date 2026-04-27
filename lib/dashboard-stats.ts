import { prisma } from "@/lib/prisma";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startEndOfCalendarMonth(ref: Date) {
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export async function getDashboardStats(companyId: string) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) {
    throw new Error("شركة غير موجودة.");
  }
  const dayStart = startOfToday();
  const { start: monthStart, end: monthEnd } = startEndOfCalendarMonth(dayStart);

  const [
    employees,
    devicesEnabled,
    devicesTotal,
    branches,
    postedToday,
    unpostedToday,
    unknownDeviceUsers,
    leavesThisMonth,
    lastSyncAgg,
    activeUsers,
  ] = await Promise.all([
    prisma.employee.count({
      where: { active: true, branch: { companyId } },
    }),
    prisma.fingerprintDevice.count({
      where: { enabled: true, branch: { companyId } },
    }),
    prisma.fingerprintDevice.count({
      where: { branch: { companyId } },
    }),
    prisma.branch.count({ where: { companyId } }),
    prisma.attendanceEvent.count({
      where: {
        isPosted: true,
        at: { gte: dayStart },
        branch: { companyId },
      },
    }),
    prisma.attendanceEvent.count({
      where: {
        isPosted: false,
        at: { gte: dayStart },
        branch: { companyId },
      },
    }),
    prisma.unknownDeviceUser.count({
      where: { device: { branch: { companyId } } },
    }),
    prisma.leave.count({
      where: {
        employee: { branch: { companyId } },
        startAt: { lte: monthEnd },
        endAt: { gte: monthStart },
      },
    }),
    prisma.fingerprintDevice.aggregate({
      where: { branch: { companyId } },
      _max: { lastSyncAt: true },
    }),
    prisma.user.count({ where: { companyId, active: true, isPlatformAdmin: false } }),
  ]);

  const licenseEnd = company.licenseExpiresAt;
  const daysLeftLicense = Math.ceil((licenseEnd.getTime() - Date.now()) / 86400000);

  return {
    company,
    employees,
    devicesEnabled,
    devicesTotal,
    branches,
    postedToday,
    unpostedToday,
    unknownDeviceUsers,
    leavesThisMonth,
    lastDeviceSyncAt: lastSyncAgg._max.lastSyncAt,
    activeUsers,
    daysLeftLicense,
  };
}
