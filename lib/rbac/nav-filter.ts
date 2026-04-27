import type { NavSection } from "@/lib/nav";
import { resourceForNavHref } from "@/lib/rbac/resources";
import type { PermissionRow } from "@/lib/rbac/evaluate";
import { userMay } from "@/lib/rbac/evaluate";

export function filterNavSectionsByView(sections: NavSection[], rows: PermissionRow[]): NavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        const res = resourceForNavHref(item.href);
        if (!res) return true;
        return userMay(rows, res, "view");
      }),
    }))
    .filter((s) => s.items.length > 0);
}
