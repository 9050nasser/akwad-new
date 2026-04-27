"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCompanyAndPermission } from "@/lib/rbac/guards";

export async function updateUnknownNote(formData: FormData) {
  const { company } = await requireCompanyAndPermission("master.unregistered", "update");
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!id) redirect("/master/unregistered?err=required");
  const row = await prisma.unknownDeviceUser.findFirst({
    where: { id, device: { branch: { companyId: company.id } } },
  });
  if (!row) redirect("/master/unregistered?err=missing");
  await prisma.unknownDeviceUser.update({ where: { id }, data: { note } });
  revalidatePath("/master/unregistered");
  redirect("/master/unregistered?notice=1");
}

export async function linkUnknownToEmployee(formData: FormData) {
  const { company } = await requireCompanyAndPermission("master.unregistered", "update");
  const unknownId = String(formData.get("unknownId") ?? "");
  const employeeId = String(formData.get("employeeId") ?? "");
  if (!unknownId || !employeeId) redirect("/master/unregistered?err=required");

  const row = await prisma.unknownDeviceUser.findFirst({
    where: { id: unknownId, device: { branch: { companyId: company.id } } },
    include: { device: true },
  });
  if (!row) redirect("/master/unregistered?err=missing");

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, branchId: row.device.branchId, branch: { companyId: company.id } },
  });
  if (!employee) redirect("/master/unregistered?err=employee_branch");

  await prisma.$transaction([
    prisma.employee.update({
      where: { id: employee.id },
      data: { deviceUserId: row.zkUserId },
    }),
    prisma.unknownDeviceUser.delete({ where: { id: unknownId } }),
  ]);

  revalidatePath("/master/unregistered");
  revalidatePath("/master/employees");
  redirect("/master/unregistered?notice=1");
}
