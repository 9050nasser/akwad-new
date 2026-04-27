"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { effectiveMinPasswordLength } from "@/lib/company-settings";
import { prisma } from "@/lib/prisma";
import { requireCompanyAndPermission } from "@/lib/rbac/guards";

export async function createUser(formData: FormData) {
  const { company } = await requireCompanyAndPermission("settings.users", "create");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const roleId = String(formData.get("roleId") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!name || !email || !roleId) redirect("/settings/users?err=required");
  const minLen = effectiveMinPasswordLength(company);
  if (password.length < minLen) redirect("/settings/users?err=password_short");

  const roleOk = await prisma.role.findFirst({ where: { id: roleId, companyId: company.id } });
  if (!roleOk) redirect("/settings/users?err=required");

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await prisma.user.create({
      data: { name, email, companyId: company.id, roleId, passwordHash },
    });
  } catch {
    redirect("/settings/users?err=email");
  }

  revalidatePath("/settings/users");
  redirect("/settings/users?notice=1");
}

export async function deleteUser(formData: FormData) {
  const { company } = await requireCompanyAndPermission("settings.users", "delete");
  const id = String(formData.get("id") ?? "");
  const session = await getSession();
  if (session && id === session.id) {
    redirect("/settings/users?err=self_delete");
  }
  const victim = await prisma.user.findFirst({ where: { id, companyId: company.id } });
  if (!victim) redirect("/settings/users?err=delete");
  await prisma.user.delete({ where: { id } }).catch(() => redirect("/settings/users?err=delete"));
  revalidatePath("/settings/users");
  redirect("/settings/users?notice=1");
}
