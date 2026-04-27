import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

function redirectClearSession(nextPath: string) {
  redirect(`/api/auth/clear-session?next=${encodeURIComponent(nextPath)}`);
}

export async function requireTenantSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.isPlatformAdmin) redirect("/platform/dashboard");

  const company = await prisma.company.findUnique({
    where: { id: session.companyId },
    select: { onHold: true, isPlatformTenant: true },
  });
  if (!company || company.isPlatformTenant || company.onHold) {
    redirectClearSession("/login?err=account_on_hold");
  }

  return session;
}

export async function requirePlatformSession() {
  const session = await getSession();
  if (!session) redirect("/login?from=/platform/dashboard");
  if (!session.isPlatformAdmin) redirect("/dashboard");
  return session;
}

/** شركة العميل النشطة (ليس شركة المنصة الوهمية). */
export async function requireCompany() {
  const session = await getSession();
  if (!session) throw new Error("غير مصرّح.");
  if (session.isPlatformAdmin) {
    throw new Error("حساب أدمن المنصة لا ينفّذ عمليات بيانات العميل من هنا.");
  }
  const company = await prisma.company.findUnique({
    where: { id: session.companyId },
  });
  if (!company || company.isPlatformTenant) {
    throw new Error("شركة غير صالحة.");
  }
  if (company.onHold) {
    redirectClearSession("/login?err=account_on_hold");
  }
  return company;
}

/** شركة العميل + معرّف المستخدم (لصلاحيات الإجراءات). */
export async function requireCompanyAndUserId() {
  const company = await requireCompany();
  const session = await getSession();
  if (!session) redirect("/login");
  return { company, userId: session.id };
}

export async function getTenantCompanyForShell() {
  const session = await getSession();
  if (!session || session.isPlatformAdmin) return null;
  return prisma.company.findUnique({
    where: { id: session.companyId },
  });
}
