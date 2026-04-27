/**
 * بذور أولية فقط — لا تحذف شركات العملاء ولا مستخدميهم.
 * تُنشئ أو تُحدّث الحد الأدنى (منصة + شركة تجريبية slug=main إن لم توجد).
 * لتفادي فقدان البيانات لا تستخدم prisma db push --force-reset على قواعد الإنتاج.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getOrCreateFullAdminRole } from "../lib/roles-bootstrap";

const prisma = new PrismaClient();

async function ensurePlatformCompany() {
  const exp = new Date();
  exp.setFullYear(exp.getFullYear() + 10);

  let plat = await prisma.company.findUnique({ where: { slug: "default" } });
  if (!plat) {
    plat = await prisma.company.create({
      data: {
        name: "منصة أكواد",
        slug: "default",
        isPlatformTenant: true,
        licenseExpiresAt: exp,
        maxEmployees: 999999,
        maxDevices: 999999,
        enablePayroll: false,
        timezone: "Africa/Cairo",
      },
    });
  }

  const adminRole = await getOrCreateFullAdminRole(plat.id);

  const platUser = await prisma.user.findFirst({
    where: { email: "platform@akwad.platform", companyId: plat.id },
  });
  if (!platUser) {
    await prisma.user.create({
      data: {
        email: "platform@akwad.platform",
        name: "أدمن المنصة",
        companyId: plat.id,
        roleId: adminRole.id,
        isPlatformAdmin: true,
        passwordHash: await bcrypt.hash("platform123", 10),
      },
    });
  }

  return plat;
}

async function ensureDemoTenant() {
  let tenant = await prisma.company.findFirst({
    where: { isPlatformTenant: false, slug: "main" },
  });

  if (!tenant) {
    const anyTenant = await prisma.company.findFirst({ where: { isPlatformTenant: false } });
    if (anyTenant) {
      tenant = await prisma.company.update({
        where: { id: anyTenant.id },
        data: { slug: "main", enablePayroll: true },
      });
    }
  }

  if (!tenant) {
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);

    tenant = await prisma.company.create({
      data: {
        name: "شركة أكواد التجريبية",
        slug: "main",
        isPlatformTenant: false,
        licenseExpiresAt: expires,
        maxEmployees: 500,
        maxDevices: 20,
        phone: "01000000000",
        email: "info@akwad.local",
        clientPhone: "01000000000",
        brokerName: "وسيط تجريبي",
        brokerPhone: "01000000001",
        enablePayroll: true,
        timezone: "Africa/Cairo",
      },
    });

    const adminRole = await getOrCreateFullAdminRole(tenant.id);
    const passwordHash = await bcrypt.hash("admin123", 10);
    await prisma.user.create({
      data: {
        email: "admin@akwad.local",
        name: "مدير المنصة",
        companyId: tenant.id,
        roleId: adminRole.id,
        passwordHash,
      },
    });

    const branch = await prisma.branch.create({
      data: { name: "الفرع الرئيسي", code: "HQ", companyId: tenant.id },
    });

    const job = await prisma.jobTitle.create({
      data: { companyId: tenant.id, name: "موظف إداري" },
    });
    await prisma.leaveType.create({
      data: { companyId: tenant.id, name: "إجازة اعتيادية", paid: true },
    });

    const schedule = await prisma.workSchedule.create({
      data: {
        companyId: tenant.id,
        name: "دوام رسمي",
        description: "من الأحد للخميس",
        days: {
          create: [
            { weekday: 0, startTime: "08:00", endTime: "16:00" },
            { weekday: 1, startTime: "08:00", endTime: "16:00" },
            { weekday: 2, startTime: "08:00", endTime: "16:00" },
            { weekday: 3, startTime: "08:00", endTime: "16:00" },
            { weekday: 4, startTime: "08:00", endTime: "16:00" },
          ],
        },
      },
    });

    await prisma.fingerprintDevice.create({
      data: { name: "جهاز الاستقبال", model: "ZK", ip: "192.168.1.201", branchId: branch.id },
    });

    await prisma.employee.create({
      data: {
        fullName: "موظف تجريبي",
        employeeCode: "EMP001",
        deviceUserId: 1,
        branchId: branch.id,
        jobTitleId: job.id,
        workScheduleId: schedule.id,
      },
    });
  } else {
    await getOrCreateFullAdminRole(tenant.id);
    await prisma.user.updateMany({
      where: { email: "admin@akwad.local", companyId: tenant.id, passwordHash: null },
      data: { passwordHash: await bcrypt.hash("admin123", 10) },
    });
  }
}

async function main() {
  await ensurePlatformCompany();
  await ensureDemoTenant();
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
