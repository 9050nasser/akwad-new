"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCompanyAndPermission } from "@/lib/rbac/guards";

export async function createLeave(formData: FormData) {
  const { company } = await requireCompanyAndPermission("operations.leave", "create");
  const employeeId = String(formData.get("employeeId") ?? "");
  const leaveTypeId = String(formData.get("leaveTypeId") ?? "");
  const startAt = new Date(String(formData.get("startAt") ?? ""));
  const endAt = new Date(String(formData.get("endAt") ?? ""));
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!employeeId || !leaveTypeId || Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    redirect("/operations/leave?err=required");
  }
  if (startAt > endAt) redirect("/operations/leave?err=range");

  const emp = await prisma.employee.findFirst({
    where: { id: employeeId, branch: { companyId: company.id } },
  });
  if (!emp) redirect("/operations/leave?err=required");

  const lt = await prisma.leaveType.findFirst({ where: { id: leaveTypeId, companyId: company.id } });
  if (!lt) redirect("/operations/leave?err=required");

  await prisma.leave.create({
    data: { employeeId, leaveTypeId, startAt, endAt, note },
  });

  revalidatePath("/operations/leave");
  revalidatePath("/reports/leaves");
  redirect("/operations/leave?notice=1");
}

export async function createPermission(formData: FormData) {
  const { company } = await requireCompanyAndPermission("operations.permission", "create");
  const employeeId = String(formData.get("employeeId") ?? "");
  const dateStr = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "").trim();
  const endTime = String(formData.get("endTime") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!employeeId || !dateStr || !startTime || !endTime) {
    redirect("/operations/permission?err=required");
  }

  const date = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(date.getTime())) redirect("/operations/permission?err=date");

  const emp = await prisma.employee.findFirst({
    where: { id: employeeId, branch: { companyId: company.id } },
  });
  if (!emp) redirect("/operations/permission?err=required");

  await prisma.permissionSlot.create({
    data: { employeeId, date, startTime, endTime, reason },
  });

  revalidatePath("/operations/permission");
  revalidatePath("/reports/permissions");
  redirect("/operations/permission?notice=1");
}
