/** يمنع فتح ثغرات إعادة التوجيه المفتوحة */
export function safeInternalPath(raw: string | undefined) {
  const path = String(raw ?? "").trim();
  if (!path.startsWith("/") || path.startsWith("//")) return "/dashboard";
  if (path.startsWith("/login")) return "/dashboard";
  return path;
}

/** مسار داخلي فقط (يسمح بـ /login و /platform وغيرها) — لإعادة التوجيه بعد تغيير اللغة/الثيم. */
export function safeAnyInternalPath(raw: string | undefined) {
  const path = String(raw ?? "").trim();
  if (!path.startsWith("/") || path.startsWith("//")) return "/dashboard";
  return path || "/dashboard";
}
