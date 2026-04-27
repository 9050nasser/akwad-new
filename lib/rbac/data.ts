import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { PermissionRow } from "@/lib/rbac/evaluate";

export const getUserPermissionRows = cache(async (userId: string): Promise<PermissionRow[]> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: {
        select: {
          perms: { select: { resource: true, action: true } },
        },
      },
    },
  });
  return user?.role.perms ?? [];
});
