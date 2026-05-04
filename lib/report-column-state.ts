import { normalizeVisibleColumnGroups } from "@/lib/report-column-config";
import { buildReportReturnUrl, loadReportColumnsCookie } from "@/lib/report-columns-cookie";

export async function getReportColumnState(
  pathname: string,
  slug: string,
  searchParams: Record<string, string | string[] | undefined>,
): Promise<{ visibleIds: string[]; returnUrl: string }> {
  const colCookie = await loadReportColumnsCookie();
  return {
    visibleIds: normalizeVisibleColumnGroups(slug, colCookie.bySlug?.[slug]),
    returnUrl: buildReportReturnUrl(pathname, searchParams),
  };
}
