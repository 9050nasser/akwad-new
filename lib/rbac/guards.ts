import type { Company } from "@prisma/client";
import { redirect } from "next/navigation";
import { getUserPermissionRows } from "@/lib/rbac/data";
import { userMay } from "@/lib/rbac/evaluate";
import type { PermissionAction } from "@/lib/rbac/resources";
import { resolvePathPermission } from "@/lib/rbac/resources";
import { requireCompanyAndUserId } from "@/lib/tenant";

export async function tenantMay(userId: string, resource: string, action: PermissionAction): Promise<boolean> {
  const rows = await getUserPermissionRows(userId);
  return userMay(rows, resource, action);
}

export async function requireTenantPathPermission(userId: string, pathname: string) {
  const { resource, action } = resolvePathPermission(pathname);
  const ok = await tenantMay(userId, resource, action);
  if (!ok) {
    redirect("/dashboard?err=forbidden");
  }
}

/** لحماية إجراءات الخادم (إضافة/تعديل/حذف). */
export async function assertTenantPermission(userId: string, resource: string, action: PermissionAction) {
  const ok = await tenantMay(userId, resource, action);
  if (!ok) {
    redirect("/dashboard?err=forbidden");
  }
}

export async function requireCompanyAndPermission(
  resource: string,
  action: PermissionAction,
): Promise<{ company: Company; userId: string }> {
  const ctx = await requireCompanyAndUserId();
  await assertTenantPermission(ctx.userId, resource, action);
  return ctx;
}
