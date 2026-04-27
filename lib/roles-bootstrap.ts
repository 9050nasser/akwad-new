import { prisma } from "@/lib/prisma";

const DEFAULT_ADMIN_ROLE_NAME = "مدير النظام";

/** دور مدير كامل الصلاحيات لشركة محددة (معزول عن باقي الشركات). */
export async function getOrCreateFullAdminRole(companyId: string) {
  const existing = await prisma.role.findFirst({
    where: { companyId, name: DEFAULT_ADMIN_ROLE_NAME },
    include: { perms: true },
  });
  if (existing) {
    const hasStar = existing.perms.some((p) => p.resource === "*" && p.action === "manage");
    if (!hasStar) {
      await prisma.rolePermission.create({
        data: { roleId: existing.id, resource: "*", action: "manage" },
      });
    }
    return existing;
  }
  const role = await prisma.role.create({
    data: {
      companyId,
      name: DEFAULT_ADMIN_ROLE_NAME,
    },
  });
  await prisma.rolePermission.create({
    data: { roleId: role.id, resource: "*", action: "manage" },
  });
  return role;
}
