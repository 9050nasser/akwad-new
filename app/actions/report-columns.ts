"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { safeAnyInternalPath } from "@/lib/auth/redirect";
import { getReportColumnGroups, normalizeVisibleColumnGroups } from "@/lib/report-column-config";
import {
  REPORT_COLUMNS_COOKIE,
  loadReportColumnsCookie,
  type ReportColumnsCookiePayload,
} from "@/lib/report-columns-cookie";

const COOKIE_OPTS = {
  path: "/",
  maxAge: 60 * 60 * 24 * 400,
  sameSite: "lax" as const,
  httpOnly: false,
};

export async function saveReportColumnGroupsAction(formData: FormData) {
  const redirectTo = safeAnyInternalPath(String(formData.get("redirect") ?? "/reports"));
  const slug = String(formData.get("slug") ?? "").trim();
  if (!slug || !getReportColumnGroups(slug).length) {
    redirect(redirectTo);
  }

  const selected = formData.getAll("g").map(String);
  const normalized = normalizeVisibleColumnGroups(slug, selected);

  const jar = await cookies();
  const prev = await loadReportColumnsCookie();
  const next: ReportColumnsCookiePayload = {
    bySlug: { ...prev.bySlug, [slug]: normalized },
  };
  jar.set(REPORT_COLUMNS_COOKIE, JSON.stringify(next), COOKIE_OPTS);
  redirect(redirectTo);
}

export async function resetReportColumnGroupsAction(formData: FormData) {
  const redirectTo = safeAnyInternalPath(String(formData.get("redirect") ?? "/reports"));
  const slug = String(formData.get("slug") ?? "").trim();
  if (!slug) redirect(redirectTo);

  const jar = await cookies();
  const prev = await loadReportColumnsCookie();
  const bySlug = { ...prev.bySlug };
  delete bySlug[slug];
  const next: ReportColumnsCookiePayload = { bySlug: Object.keys(bySlug).length ? bySlug : undefined };
  if (next.bySlug) {
    jar.set(REPORT_COLUMNS_COOKIE, JSON.stringify(next), COOKIE_OPTS);
  } else {
    jar.delete(REPORT_COLUMNS_COOKIE);
  }
  redirect(redirectTo);
}
