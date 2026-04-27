import { type NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/auth/constants";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/login")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/zk")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/iclock")) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("err", "config");
    return NextResponse.redirect(url);
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    const isPlatformAdmin = Boolean((payload as { pla?: boolean }).pla);

    if (pathname.startsWith("/platform")) {
      if (!isPlatformAdmin) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
      return NextResponse.next();
    }

    if (isPlatformAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/platform/dashboard";
      return NextResponse.redirect(url);
    }

    const reqHeaders = new Headers(request.headers);
    reqHeaders.set("x-pathname", pathname);
    return NextResponse.next({ request: { headers: reqHeaders } });
  } catch {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    url.searchParams.set("err", "session");
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: [
    "/iclock/:path*",
    "/",
    "/dashboard",
    "/dashboard/:path*",
    "/master/:path*",
    "/operations/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/platform",
    "/platform/:path*",
  ],
};
