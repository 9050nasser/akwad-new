"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCompanyAndPermission } from "@/lib/rbac/guards";

async function safeDelete(
  path: string,
  fn: () => Promise<unknown>,
) {
  try {
    await fn();
  } catch {
    redirect(`${path}?err=in_use`);
  }
}

export async function createJobTitle(formData: FormData) {
  const { company } = await requireCompanyAndPermission("master.jobs", "create");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/master/jobs?err=required");
  await prisma.jobTitle.create({ data: { name, companyId: company.id } });
  revalidatePath("/master/jobs");
  revalidatePath("/master/employees");
  redirect("/master/jobs?notice=1");
}

export async function deleteJobTitle(formData: FormData) {
  const { company } = await requireCompanyAndPermission("master.jobs", "delete");
  const id = String(formData.get("id") ?? "");
  const row = await prisma.jobTitle.findFirst({ where: { id, companyId: company.id } });
  if (!row) redirect("/master/jobs?err=in_use");
  await safeDelete("/master/jobs", () => prisma.jobTitle.delete({ where: { id } }));
  revalidatePath("/master/jobs");
  redirect("/master/jobs?notice=1");
}

export async function createProject(formData: FormData) {
  const { company } = await requireCompanyAndPermission("master.projects", "create");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/master/projects?err=required");
  const code = String(formData.get("code") ?? "").trim() || null;
  await prisma.project.create({ data: { name, code, companyId: company.id } });
  revalidatePath("/master/projects");
  revalidatePath("/master/employees");
  redirect("/master/projects?notice=1");
}

export async function deleteProject(formData: FormData) {
  const { company } = await requireCompanyAndPermission("master.projects", "delete");
  const id = String(formData.get("id") ?? "");
  const row = await prisma.project.findFirst({ where: { id, companyId: company.id } });
  if (!row) redirect("/master/projects?err=in_use");
  await safeDelete("/master/projects", () => prisma.project.delete({ where: { id } }));
  revalidatePath("/master/projects");
  redirect("/master/projects?notice=1");
}

export async function createNationality(formData: FormData) {
  const { company } = await requireCompanyAndPermission("master.nationalities", "create");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/master/nationalities?err=required");
  await prisma.nationality.create({ data: { name, companyId: company.id } });
  revalidatePath("/master/nationalities");
  revalidatePath("/master/employees");
  redirect("/master/nationalities?notice=1");
}

export async function deleteNationality(formData: FormData) {
  const { company } = await requireCompanyAndPermission("master.nationalities", "delete");
  const id = String(formData.get("id") ?? "");
  const row = await prisma.nationality.findFirst({ where: { id, companyId: company.id } });
  if (!row) redirect("/master/nationalities?err=in_use");
  await safeDelete("/master/nationalities", () => prisma.nationality.delete({ where: { id } }));
  revalidatePath("/master/nationalities");
  redirect("/master/nationalities?notice=1");
}

export async function createWorkDuty(formData: FormData) {
  const { company } = await requireCompanyAndPermission("master.duties", "create");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/master/duties?err=required");
  const description = String(formData.get("description") ?? "").trim() || null;
  await prisma.workDuty.create({ data: { name, description, companyId: company.id } });
  revalidatePath("/master/duties");
  revalidatePath("/master/employees");
  redirect("/master/duties?notice=1");
}

export async function deleteWorkDuty(formData: FormData) {
  const { company } = await requireCompanyAndPermission("master.duties", "delete");
  const id = String(formData.get("id") ?? "");
  const row = await prisma.workDuty.findFirst({ where: { id, companyId: company.id } });
  if (!row) redirect("/master/duties?err=in_use");
  await safeDelete("/master/duties", () => prisma.workDuty.delete({ where: { id } }));
  revalidatePath("/master/duties");
  redirect("/master/duties?notice=1");
}

export async function createLeaveType(formData: FormData) {
  const { company } = await requireCompanyAndPermission("master.leave_types", "create");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/master/leave-types?err=required");
  const paid = String(formData.get("paid") ?? "yes") !== "no";
  await prisma.leaveType.create({ data: { name, paid, companyId: company.id } });
  revalidatePath("/master/leave-types");
  revalidatePath("/operations/leave");
  redirect("/master/leave-types?notice=1");
}

export async function deleteLeaveType(formData: FormData) {
  const { company } = await requireCompanyAndPermission("master.leave_types", "delete");
  const id = String(formData.get("id") ?? "");
  const row = await prisma.leaveType.findFirst({ where: { id, companyId: company.id } });
  if (!row) redirect("/master/leave-types?err=in_use");
  await safeDelete("/master/leave-types", () => prisma.leaveType.delete({ where: { id } }));
  revalidatePath("/master/leave-types");
  redirect("/master/leave-types?notice=1");
}
