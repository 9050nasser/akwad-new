import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

/** مسح جلسة الدخول عبر Route Handler (مسموح بتعديل الكوكيز)، ثم إعادة التوجيه. */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("next") ?? "/login";
  const path =
    raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("\n") && !raw.includes("\r")
      ? raw
      : "/login";
  const target = new URL(path, request.url);

  const res = NextResponse.redirect(target);
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
