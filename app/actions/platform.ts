"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { effectiveMinPasswordLength } from "@/lib/company-settings";
import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/lib/tenant";

function normalizeSlug(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");
}

function parseDateEndOfDay(raw: string) {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function createTenantCompany(formData: FormData) {
  await requirePlatformSession();
  const name = String(formData.get("name") ?? "").trim();
  const slug = normalizeSlug(String(formData.get("slug") ?? ""));
  const licenseRaw = String(formData.get("licenseExpiresAt") ?? "").trim();
  const maxEmployees = Math.max(1, parseInt(String(formData.get("maxEmployees") ?? "100"), 10) || 100);
  const maxDevices = Math.max(1, parseInt(String(formData.get("maxDevices") ?? "10"), 10) || 10);
  const clientPhone = String(formData.get("clientPhone") ?? "").trim() || null;
  const brokerName = String(formData.get("brokerName") ?? "").trim() || null;
  const brokerPhone = String(formData.get("brokerPhone") ?? "").trim() || null;
  const enablePayroll = formData.get("enablePayroll") === "on";
  const adminEmail = String(formData.get("adminEmail") ?? "").trim().toLowerCase();
  const adminName = String(formData.get("adminName") ?? "").trim() || "مدير النظام";
  const adminPassword = String(formData.get("adminPassword") ?? "");
  const minPasswordLengthRaw = parseInt(String(formData.get("minPasswordLength") ?? "8"), 10);
  const minPasswordLength = Math.min(128, Math.max(6, Number.isNaN(minPasswordLengthRaw) ? 8 : minPasswordLengthRaw));

  if (!name || !slug || !licenseRaw) redirect("/platform/companies/new?err=required");
  if (slug === "default") redirect("/platform/companies/new?err=slug_reserved");
  const licenseExpiresAt = parseDateEndOfDay(licenseRaw);
  if (!licenseExpiresAt) redirect("/platform/companies/new?err=date");
  if (!adminEmail || adminPassword.length < effectiveMinPasswordLength({ minPasswordLength })) {
    redirect("/platform/companies/new?err=admin");
  }

  const dup = await prisma.company.findUnique({ where: { slug } });
  if (dup) redirect("/platform/companies/new?err=slug");

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name,
        slug,
        isPlatformTenant: false,
        licenseExpiresAt,
        maxEmployees,
        maxDevices,
        clientPhone,
        brokerName,
        brokerPhone,
        enablePayroll,
        timezone: "Africa/Cairo",
        minPasswordLength,
      },
    });
    await tx.branch.create({
      data: { name: "الفرع الرئيسي", code: "HQ", companyId: company.id },
    });
    await tx.jobTitle.create({
      data: { companyId: company.id, name: "موظف إداري" },
    });
    await tx.leaveType.create({
      data: { companyId: company.id, name: "إجازة اعتيادية", paid: true },
    });
    /** إنشاء الدور عبر تحديث الشركة يتفادى أخطاء PrismaClientValidation مع connect داخل المعاملة على بعض الإصدارات. */
    await tx.company.update({
      where: { id: company.id },
      data: {
        roles: {
          create: {
            name: "مدير النظام",
            perms: {
              create: [{ resource: "*", action: "manage" }],
            },
          },
        },
      },
    });
    const adminRole = await tx.role.findFirstOrThrow({
      where: { companyId: company.id, name: "مدير النظام" },
    });
    await tx.user.create({
      data: {
        email: adminEmail,
        name: adminName,
        companyId: company.id,
        roleId: adminRole.id,
        passwordHash,
        isPlatformAdmin: false,
      },
    });
  });

  revalidatePath("/platform/companies");
  revalidatePath("/platform/dashboard");
  redirect("/platform/companies?notice=1");
}

export async function updateTenantCompany(formData: FormData) {
  await requirePlatformSession();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/platform/companies?err=required");

  const existing = await prisma.company.findFirst({
    where: { id, isPlatformTenant: false },
  });
  if (!existing) redirect("/platform/companies?err=not_found");

  const name = String(formData.get("name") ?? "").trim();
  const slug = normalizeSlug(String(formData.get("slug") ?? ""));
  const licenseRaw = String(formData.get("licenseExpiresAt") ?? "").trim();
  const maxEmployees = Math.max(1, parseInt(String(formData.get("maxEmployees") ?? "100"), 10) || 100);
  const maxDevices = Math.max(1, parseInt(String(formData.get("maxDevices") ?? "10"), 10) || 10);
  const clientPhone = String(formData.get("clientPhone") ?? "").trim() || null;
  const brokerName = String(formData.get("brokerName") ?? "").trim() || null;
  const brokerPhone = String(formData.get("brokerPhone") ?? "").trim() || null;
  const enablePayroll = formData.get("enablePayroll") === "on";
  const onHold = formData.get("onHold") === "on";

  if (!name || !slug || !licenseRaw) redirect(`/platform/companies/${id}/edit?err=required`);
  if (slug === "default") redirect(`/platform/companies/${id}/edit?err=slug_reserved`);
  const licenseExpiresAt = parseDateEndOfDay(licenseRaw);
  if (!licenseExpiresAt) redirect(`/platform/companies/${id}/edit?err=date`);

  const dup = await prisma.company.findFirst({ where: { slug, NOT: { id } } });
  if (dup) redirect(`/platform/companies/${id}/edit?err=slug`);

  await prisma.company.update({
    where: { id },
    data: {
      name,
      slug,
      licenseExpiresAt,
      maxEmployees,
      maxDevices,
      clientPhone,
      brokerName,
      brokerPhone,
      enablePayroll,
      onHold,
    },
  });

  revalidatePath("/platform/companies");
  revalidatePath("/platform/dashboard");
  revalidatePath("/platform/reports/on-hold-clients");
  redirect("/platform/companies?notice=1");
}

export async function updatePlatformAdminPassword(formData: FormData) {
  const session = await requirePlatformSession();
  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");
  if (!current || next.length < 8 || next !== confirm) {
    redirect("/platform/settings/password?err=invalid");
  }

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user?.passwordHash) redirect("/platform/settings/password?err=invalid");
  const ok = await bcrypt.compare(current, user.passwordHash);
  if (!ok) redirect("/platform/settings/password?err=invalid");

  const passwordHash = await bcrypt.hash(next, 10);
  await prisma.user.update({ where: { id: session.id }, data: { passwordHash } });
  redirect("/platform/settings/password?notice=1");
}
