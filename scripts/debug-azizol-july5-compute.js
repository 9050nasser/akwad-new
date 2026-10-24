const { PrismaClient } = require("@prisma/client");
const { getEmployeesAttendanceDetailReport } = require("../lib/reports.ts");

async function main() {
  const p = new PrismaClient();
  const company = await p.company.findFirst({
    where: { name: { contains: "نمر" } },
    select: { id: true },
  });
  const emp = await p.employee.findFirst({
    where: { branch: { companyId: company.id }, fullName: { contains: "عزيز" } },
    select: { id: true, fullName: true },
  });
  const from = new Date(2026, 6, 5, 0, 0, 0, 0);
  const to = new Date(2026, 6, 5, 23, 59, 59, 999);
  await p.$disconnect();

  const { rows } = await getEmployeesAttendanceDetailReport({
    companyId: company.id,
    from,
    to,
    employeeId: emp.id,
    maxRows: 10,
  });
  console.log(
    rows.map((r) => ({
      dateKey: r.dateKey,
      in: r.checkInAt?.toString(),
      out: r.checkOutAt?.toString(),
      ot: r.overtimeMinutes,
      late: r.lateMinutes,
      expected: r.expectedWorkMinutes,
      actual: r.actualWorkMinutes,
      note: r.dayNote,
    })),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
