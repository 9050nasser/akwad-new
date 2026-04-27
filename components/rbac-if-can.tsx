import { tenantMay } from "@/lib/rbac/guards";
import type { PermissionAction } from "@/lib/rbac/resources";

type Props = {
  userId: string;
  resource: string;
  action: PermissionAction;
  children: React.ReactNode;
};

/** يخفي المحتوى إن لم تتوفر الصلاحية (لا يمنع استدعاء الإجراء — الحماية في الخادم). */
export async function IfCan({ userId, resource, action, children }: Props) {
  const ok = await tenantMay(userId, resource, action);
  if (!ok) return null;
  return <>{children}</>;
}
