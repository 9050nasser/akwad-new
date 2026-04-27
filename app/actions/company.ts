"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCompanyAndPermission } from "@/lib/rbac/guards";
import { sniffLogoExtension } from "@/lib/validate-company-logo";

export async function updateCompany(formData: FormData) {
  const { company } = await requireCompanyAndPermission("settings.company", "update");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/settings/company?err=required");

  await prisma.company.update({
    where: { id: company.id },
    data: {
      name,
      phone: String(formData.get("phone") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      address: String(formData.get("address") ?? "").trim() || null,
      taxNumber: String(formData.get("taxNumber") ?? "").trim() || null,
      clientPhone: String(formData.get("clientPhone") ?? "").trim() || null,
      brokerName: String(formData.get("brokerName") ?? "").trim() || null,
      brokerPhone: String(formData.get("brokerPhone") ?? "").trim() || null,
    },
  });

  revalidatePath("/settings/company");
  revalidatePath("/", "layout");
  redirect("/settings/company?notice=1");
}

const LOGO_MAX_BYTES = 2 * 1024 * 1024;

export async function uploadCompanyLogo(formData: FormData) {
  const { company } = await requireCompanyAndPermission("settings.company", "update");
  const file = formData.get("logo");
  if (!file || typeof file === "string" || file.size === 0) {
    redirect("/settings/company?err=logo_invalid");
  }
  if (file.size > LOGO_MAX_BYTES) {
    redirect("/settings/company?err=logo_large");
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = sniffLogoExtension(buf);
  if (!ext) {
    redirect("/settings/company?err=logo_invalid");
  }
  const dir = path.join(process.cwd(), "public", "uploads", "company-logos");
  await fs.mkdir(dir, { recursive: true });
  for (const e of ["png", "jpg", "jpeg", "webp"] as const) {
    try {
      await fs.unlink(path.join(dir, `${company.id}.${e}`));
    } catch {
      /* ignore */
    }
  }
  const filename = `${company.id}.${ext}`;
  await fs.writeFile(path.join(dir, filename), buf);
  const publicPath = `/uploads/company-logos/${filename}`;
  await prisma.company.update({
    where: { id: company.id },
    data: { logoPath: publicPath },
  });
  revalidatePath("/settings/company");
  revalidatePath("/", "layout");
  revalidatePath("/reports", "layout");
  redirect("/settings/company?notice=logo");
}

export async function removeCompanyLogo(_formData: FormData) {
  const { company } = await requireCompanyAndPermission("settings.company", "update");
  if (company.logoPath) {
    const rel = company.logoPath.replace(/^\//, "");
    const full = path.join(process.cwd(), "public", rel);
    try {
      await fs.unlink(full);
    } catch {
      /* ignore */
    }
  }
  await prisma.company.update({
    where: { id: company.id },
    data: { logoPath: null },
  });
  revalidatePath("/settings/company");
  revalidatePath("/", "layout");
  revalidatePath("/reports", "layout");
  redirect("/settings/company?notice=logo_removed");
}

function clampInt(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function parseIntField(raw: unknown, fallback: number, min: number, max: number) {
  const n = parseInt(String(raw ?? ""), 10);
  if (Number.isNaN(n)) return fallback;
  return clampInt(n, min, max);
}

export async function updateGeneralSettings(formData: FormData) {
  const { company } = await requireCompanyAndPermission("settings.general", "update");

  const timezone = String(formData.get("timezone") ?? "").trim() || "Africa/Cairo";
  const defaultLocale = String(formData.get("defaultLocale") ?? "ar") === "en" ? "en" : "ar";
  const weekStartsOn = parseIntField(formData.get("weekStartsOn"), 6, 0, 6);
  const lateGraceMinutes = parseIntField(formData.get("lateGraceMinutes"), 0, 0, 240);
  const punchDedupeMinutes = parseIntField(formData.get("punchDedupeMinutes"), 0, 0, 120);
  const fridayIsWorkday = formData.get("fridayIsWorkday") === "on";
  const overtimeAfterMinutes = parseIntField(formData.get("overtimeAfterMinutes"), 0, 0, 24 * 60);
  const overtimeRoundMinutes = parseIntField(formData.get("overtimeRoundMinutes"), 15, 1, 120);

  const currency = (String(formData.get("currency") ?? "SAR").trim().toUpperCase() || "SAR").slice(0, 8);
  const currencyDecimals = parseIntField(formData.get("currencyDecimals"), 2, 0, 6);

  const payrollPeriodRaw = String(formData.get("payrollPeriod") ?? "monthly").toLowerCase();
  const payrollPeriod = payrollPeriodRaw === "biweekly" ? "biweekly" : "monthly";
  const payrollClosingDay = parseIntField(formData.get("payrollClosingDay"), 25, 1, 28);

  const reportHeaderLine = String(formData.get("reportHeaderLine") ?? "").trim() || null;
  const reportFooterLine = String(formData.get("reportFooterLine") ?? "").trim() || null;
  const shellShortName = String(formData.get("shellShortName") ?? "").trim() || null;

  const minPasswordLength = parseIntField(formData.get("minPasswordLength"), 6, 6, 128);
  const sessionDays = parseIntField(formData.get("sessionDays"), 7, 1, 30);

  const smtpHost = String(formData.get("smtpHost") ?? "").trim() || null;
  const smtpPortRaw = String(formData.get("smtpPort") ?? "").trim();
  const smtpPortParsed = parseInt(smtpPortRaw, 10);
  const smtpPort =
    smtpPortRaw && !Number.isNaN(smtpPortParsed) ? clampInt(smtpPortParsed, 1, 65535) : null;
  const smtpUser = String(formData.get("smtpUser") ?? "").trim() || null;
  const smtpFromEmail = String(formData.get("smtpFromEmail") ?? "").trim() || null;

  let defaultReportBranchId: string | null = String(formData.get("defaultReportBranchId") ?? "").trim() || null;
  if (defaultReportBranchId) {
    const branchOk = await prisma.branch.findFirst({
      where: { id: defaultReportBranchId, companyId: company.id },
    });
    if (!branchOk) defaultReportBranchId = null;
  }

  await prisma.company.update({
    where: { id: company.id },
    data: {
      timezone,
      defaultLocale,
      weekStartsOn,
      lateGraceMinutes,
      punchDedupeMinutes,
      fridayIsWorkday,
      overtimeAfterMinutes,
      overtimeRoundMinutes,
      currency,
      currencyDecimals,
      payrollPeriod,
      payrollClosingDay,
      reportHeaderLine,
      reportFooterLine,
      shellShortName,
      minPasswordLength,
      sessionDays,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpFromEmail,
      defaultReportBranchId,
    },
  });

  revalidatePath("/settings/general");
  revalidatePath("/", "layout");
  redirect("/settings/general?notice=1");
}
