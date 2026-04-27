"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCompanyAndPermission } from "@/lib/rbac/guards";

export async function createBranch(formData: FormData) {
  const { company } = await requireCompanyAndPermission("master.branches", "create");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/master/branches?err=required");
  const code = String(formData.get("code") ?? "").trim() || null;

  await prisma.branch.create({
    data: { name, code, companyId: company.id },
  });

  revalidatePath("/master/branches");
  revalidatePath("/master/devices");
  revalidatePath("/master/employees");
  redirect("/master/branches?notice=1");
}

export async function deleteBranch(formData: FormData) {
  const { company } = await requireCompanyAndPermission("master.branches", "delete");
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/master/branches?err=required");

  const [emp, dev] = await Promise.all([
    prisma.employee.count({ where: { branchId: id } }),
    prisma.fingerprintDevice.count({ where: { branchId: id } }),
  ]);
  if (emp > 0 || dev > 0) {
    redirect("/master/branches?err=in_use");
  }

  await prisma.branch.delete({ where: { id } }).catch(() => redirect("/master/branches?err=delete"));
  revalidatePath("/master/branches");
  redirect("/master/branches?notice=1");
}
