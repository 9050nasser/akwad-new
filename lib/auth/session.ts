import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth/constants";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  companyId: string;
  isPlatformAdmin: boolean;
};

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET غير مضبوط أو قصير جداً (16 حرفاً على الأقل).");
  }
  return new TextEncoder().encode(secret);
}

export type CreateSessionOptions = {
  /** أيام صلاحية الجلسة (1–30)، الافتراضي 7 */
  sessionDays?: number;
};

export async function createSession(user: SessionUser, opts?: CreateSessionOptions) {
  const days = Math.min(30, Math.max(1, Math.floor(opts?.sessionDays ?? 7)));
  const token = await new SignJWT({
    email: user.email,
    name: user.name,
    cid: user.companyId,
    pla: user.isPlatformAdmin,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(getSecretKey());

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * days,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, getSecretKey());
    const id = String(payload.sub ?? "");
    const email = String(payload.email ?? "");
    const name = String(payload.name ?? "");
    const companyId = String((payload as { cid?: string }).cid ?? "");
    const isPlatformAdmin = Boolean((payload as { pla?: boolean }).pla);
    if (!id || !email || !companyId) return null;
    return { id, email, name, companyId, isPlatformAdmin };
  } catch {
    return null;
  }
}
