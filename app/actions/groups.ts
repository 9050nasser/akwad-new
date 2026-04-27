"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCompanyAndPermission } from "@/lib/rbac/guards";

export async function createEmployeeGroup(formData: FormData) {
  const { company } = await requireCompanyAndPermission("master.groups", "create");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/master/groups?err=required");
  await prisma.employeeGroup.create({ data: { name, companyId: company.id } });
  revalidatePath("/master/groups");
  redirect("/master/groups?notice=1");
}

export async function deleteEmployeeGroup(formData: FormData) {
  const { company } = await requireCompanyAndPermission("master.groups", "delete");
  const id = String(formData.get("id") ?? "");
  const g = await prisma.employeeGroup.findFirst({ where: { id, companyId: company.id } });
  if (!g) redirect("/master/groups?err=required");
  await prisma.employeeGroup.delete({ where: { id } });
  revalidatePath("/master/groups");
  redirect("/master/groups?notice=1");
}

export async function addEmployeeToGroup(formData: FormData) {
  const { company } = await requireCompanyAndPermission("master.groups", "update");
  const groupId = String(formData.get("groupId") ?? "");
  const employeeId = String(formData.get("employeeId") ?? "");
  if (!groupId || !employeeId) redirect("/master/groups?err=required");
  const group = await prisma.employeeGroup.findFirst({ where: { id: groupId, companyId: company.id } });
  if (!group) redirect("/master/groups?err=required");
  const emp = await prisma.employee.findFirst({
    where: { id: employeeId, branch: { companyId: company.id } },
  });
  if (!emp) redirect("/master/groups?err=required");
  await prisma.employeeGroupMember.upsert({
    where: { groupId_employeeId: { groupId, employeeId } },
    update: {},
    create: { groupId, employeeId },
  });
  revalidatePath("/master/groups");
  redirect(`/master/groups?group=${encodeURIComponent(groupId)}&notice=1`);
}

export async function removeEmployeeFromGroup(formData: FormData) {
  const { company } = await requireCompanyAndPermission("master.groups", "update");
  const groupId = String(formData.get("groupId") ?? "");
  const employeeId = String(formData.get("employeeId") ?? "");
  const group = await prisma.employeeGroup.findFirst({ where: { id: groupId, companyId: company.id } });
  if (!group) redirect("/master/groups?err=required");
  const emp = await prisma.employee.findFirst({
    where: { id: employeeId, branch: { companyId: company.id } },
  });
  if (!emp) redirect("/master/groups?err=required");
  await prisma.employeeGroupMember.delete({
    where: { groupId_employeeId: { groupId, employeeId } },
  });
  revalidatePath("/master/groups");
  redirect(`/master/groups?group=${encodeURIComponent(groupId)}&notice=1`);
}
