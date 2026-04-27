"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { createSession, destroySession } from "@/lib/auth/session";
import { safeInternalPath } from "@/lib/auth/redirect";
import { prisma } from "@/lib/prisma";

function normalizeCompanyKey(raw: string) {
  return raw.trim().toLowerCase().replace(/\s+/g, "-");
}

function resolveLoginEmail(companySlug: string, login: string, isPlatformTenant: boolean) {
  const t = login.trim();
  if (!t) return "";
  if (t.includes("@")) return t.toLowerCase();
  if (isPlatformTenant && companySlug === "default" && t.toLowerCase() === "platform") {
    return "platform@akwad.platform";
  }
  return t.toLowerCase();
}

export async function login(formData: FormData) {
  const companySlug = normalizeCompanyKey(
    String(formData.get("companySlug") ?? formData.get("companyKey") ?? ""),
  );
  const loginField = String(formData.get("username") ?? formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const from = safeInternalPath(String(formData.get("from") ?? ""));

  if (!companySlug || !loginField || !password) {
    redirect(`/login?err=required&from=${encodeURIComponent(from)}`);
  }

  const company = await prisma.company.findUnique({
    where: { slug: companySlug },
  });
  if (!company) {
    redirect(`/login?err=unknown_company&from=${encodeURIComponent(from)}`);
  }

  if (!company.isPlatformTenant && company.onHold) {
    redirect(`/login?err=account_on_hold&from=${encodeURIComponent(from)}`);
  }

  const email = resolveLoginEmail(company.slug, loginField, company.isPlatformTenant);
  if (!email) {
    redirect(`/login?err=required&from=${encodeURIComponent(from)}`);
  }

  const user = await prisma.user.findFirst({
    where: { email, companyId: company.id },
    include: { role: true },
  });

  if (!user || !user.active) {
    redirect(`/login?err=invalid&from=${encodeURIComponent(from)}`);
  }

  if (!user.passwordHash) {
    redirect(`/login?err=no_password&from=${encodeURIComponent(from)}`);
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    redirect(`/login?err=invalid&from=${encodeURIComponent(from)}`);
  }

  const licenseOk = company.licenseExpiresAt >= new Date(new Date().toDateString());
  if (!company.isPlatformTenant && !licenseOk) {
    redirect(`/login?err=license_expired&from=${encodeURIComponent(from)}`);
  }

  const sessionDays = Math.min(30, Math.max(1, company.sessionDays ?? 7));
  await createSession(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      companyId: company.id,
      isPlatformAdmin: user.isPlatformAdmin,
    },
    { sessionDays },
  );

  if (user.isPlatformAdmin) {
    redirect("/platform/dashboard");
  }
  redirect(from || "/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
