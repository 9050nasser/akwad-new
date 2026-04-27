"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCompanyAndPermission } from "@/lib/rbac/guards";
import { PERMISSION_ACTIONS, SCREEN_RESOURCES, type PermissionAction } from "@/lib/rbac/resources";

/** إضافة دور جديد للشركة (بدون صلاحيات حتى تضبطها من الشاشة ثم تحفظ). */
export async function createCompanyRole(formData: FormData) {
  const { company } = await requireCompanyAndPermission("settings.permissions", "create");
  const name = String(formData.get("roleName") ?? "").trim();
  if (name.length < 2) redirect("/settings/permissions?err=role_name");

  const dup = await prisma.role.findFirst({
    where: { companyId: company.id, name },
  });
  if (dup) redirect("/settings/permissions?err=role_exists");

  await prisma.role.create({
    data: {
      companyId: company.id,
      name,
    },
  });

  revalidatePath("/", "layout");
  revalidatePath("/settings/permissions");
  revalidatePath("/settings/users");
  redirect("/settings/permissions?notice=role");
}

export async function saveRolePermissions(formData: FormData) {
  const { company } = await requireCompanyAndPermission("settings.permissions", "update");
  const roleId = String(formData.get("roleId") ?? "").trim();
  if (!roleId) redirect("/settings/permissions?err=required");

  const role = await prisma.role.findFirst({ where: { id: roleId, companyId: company.id } });
  if (!role) redirect("/settings/permissions?err=required");

  const pairs: { resource: string; action: string }[] = [];

  for (const scr of SCREEN_RESOURCES) {
    const actions: PermissionAction[] =
      scr.crud === false ? (["view"] as const) : ([...PERMISSION_ACTIONS] as PermissionAction[]);
    for (const action of actions) {
      const key = `p__${scr.id}__${action}`;
      if (formData.get(key) === "on") {
        pairs.push({ resource: scr.id, action });
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({ where: { roleId } });
    if (pairs.length > 0) {
      await tx.rolePermission.createMany({ data: pairs.map((p) => ({ roleId, resource: p.resource, action: p.action })) });
    }
  });

  revalidatePath("/", "layout");
  revalidatePath("/settings/permissions");
  redirect("/settings/permissions?notice=1");
}
