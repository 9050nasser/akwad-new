import { cookies } from "next/headers";

export const REPORT_COLUMNS_COOKIE = "akwad_report_columns_v1";

export type ReportColumnsCookiePayload = {
  /** لكل `exportFileSlug` ترتيب معرفات مجموعات الأعمدة الظاهرة */
  bySlug?: Record<string, string[]>;
};

export async function loadReportColumnsCookie(): Promise<ReportColumnsCookiePayload> {
  const raw = (await cookies()).get(REPORT_COLUMNS_COOKIE)?.value;
  if (!raw?.trim()) return {};
  try {
    return JSON.parse(raw) as ReportColumnsCookiePayload;
  } catch {
    return {};
  }
}

/** إعادة التوجيه بعد حفظ الأعمدة مع الحفاظ على فلاتر التقرير في الـ URL */
export function buildReportReturnUrl(
  pathname: string,
  searchParams: Record<string, string | string[] | undefined>,
): string {
  const q = new URLSearchParams();
  for (const [key, raw] of Object.entries(searchParams)) {
    if (raw === undefined) continue;
    if (Array.isArray(raw)) {
      for (const item of raw) {
        if (item !== undefined && item !== "") q.append(key, String(item));
      }
    } else if (raw !== "") {
      q.set(key, String(raw));
    }
  }
  const s = q.toString();
  return `${pathname}${s ? `?${s}` : ""}`;
}
