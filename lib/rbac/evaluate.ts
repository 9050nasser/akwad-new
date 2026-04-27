import type { PermissionAction } from "@/lib/rbac/resources";

export type PermissionRow = { resource: string; action: string };

/**
 * تقييم صلاحية مستخدم من صفوف RolePermission.
 * يدعم: `*:manage`، `resource:manage`، وصلاحيات دقيقة، وقيم قديمة (master+edit، reports+view).
 */
export function userMay(rows: PermissionRow[], resource: string, action: PermissionAction): boolean {
  for (const row of rows) {
    const r = row.resource;
    const a = row.action;

    if (r === "*" && a === "manage") return true;
    if (r === resource && a === "manage") return true;
    if (r === resource && a === action) return true;

    if (r === "master" && a === "edit" && resource.startsWith("master.")) {
      if (action === "view") return true;
      if (action === "create" || action === "update" || action === "delete") return true;
    }

    if (r === "reports" && a === "view") {
      if (resource === "reports" || resource.startsWith("reports.")) {
        if (action === "view") return true;
      }
    }

    if (r === "operations" && a === "edit" && resource.startsWith("operations.")) {
      if (action === "view") return true;
      if (action === "create" || action === "update" || action === "delete") return true;
    }

    if (r === "settings" && a === "edit" && resource.startsWith("settings.")) {
      if (action === "view") return true;
      if (action === "create" || action === "update" || action === "delete") return true;
    }
  }
  return false;
}
