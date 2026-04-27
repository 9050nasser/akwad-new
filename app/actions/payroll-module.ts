"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseDateOnly } from "@/lib/day-range";
import { prisma } from "@/lib/prisma";
import { requireCompanyAndPermission } from "@/lib/rbac/guards";

function assertPayrollEnabled(company: { enablePayroll: boolean }) {
  if (!company.enablePayroll) redirect("/reports?err=payroll_disabled");
}

async function assertEmployeeInCompany(employeeId: string, companyId: string) {
  const e = await prisma.employee.findFirst({ where: { id: employeeId, branch: { companyId } } });
  return !!e;
}

export async function createPayrollVacation(formData: FormData) {
  const { company } = await requireCompanyAndPermission("reports.payroll.vacations", "create");
  assertPayrollEnabled(company);

  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const startStr = String(formData.get("startDate") ?? "").trim();
  const endStr = String(formData.get("endDate") ?? "").trim();
  const noteRaw = String(formData.get("note") ?? "").trim();
  const note = noteRaw ? noteRaw : null;

  if (!employeeId || !startStr || !endStr) redirect("/reports/payroll/vacations?err=required");
  if (!(await assertEmployeeInCompany(employeeId, company.id))) {
    redirect("/reports/payroll/vacations?err=employee_invalid");
  }

  const startDate = parseDateOnly(startStr);
  startDate.setHours(0, 0, 0, 0);
  const endDate = parseDateOnly(endStr);
  endDate.setHours(23, 59, 59, 999);
  if (endDate < startDate) redirect("/reports/payroll/vacations?err=vacation_range");

  await prisma.payrollVacation.create({
    data: { companyId: company.id, employeeId, startDate, endDate, note },
  });

  revalidatePath("/reports/payroll");
  revalidatePath("/reports/payroll/vacations");
  revalidatePath("/reports/payroll/vacations/report");
  redirect("/reports/payroll/vacations?notice=1");
}

export async function deletePayrollVacation(formData: FormData) {
  const { company } = await requireCompanyAndPermission("reports.payroll.vacations", "delete");
  assertPayrollEnabled(company);
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/reports/payroll/vacations?err=required");

  const v = await prisma.payrollVacation.findFirst({ where: { id, companyId: company.id } });
  if (!v) redirect("/reports/payroll/vacations?err=missing");

  await prisma.payrollVacation.delete({ where: { id } });
  revalidatePath("/reports/payroll");
  revalidatePath("/reports/payroll/vacations");
  revalidatePath("/reports/payroll/vacations/report");
  redirect("/reports/payroll/vacations?notice=1");
}

export async function createPayrollManualDeduction(formData: FormData) {
  const { company } = await requireCompanyAndPermission("reports.payroll.deductions", "create");
  assertPayrollEnabled(company);

  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const ym = String(formData.get("deductionPeriodYm") ?? "").trim();

  if (!employeeId || !amountRaw || !reason || !ym) redirect("/reports/payroll/deductions?err=required");
  if (!(await assertEmployeeInCompany(employeeId, company.id))) {
    redirect("/reports/payroll/deductions?err=employee_invalid");
  }

  const amount = Number(amountRaw.replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) redirect("/reports/payroll/deductions?err=deduction_amount");
  if (!/^\d{4}-\d{2}$/.test(ym)) redirect("/reports/payroll/deductions?err=deduction_month");

  await prisma.payrollManualDeduction.create({
    data: {
      companyId: company.id,
      employeeId,
      amount: Math.round(amount * 100) / 100,
      reason,
      deductionPeriodYm: ym,
    },
  });

  revalidatePath("/reports/payroll");
  revalidatePath("/reports/payroll/deductions");
  redirect("/reports/payroll/deductions?notice=1");
}

export async function deletePayrollManualDeduction(formData: FormData) {
  const { company } = await requireCompanyAndPermission("reports.payroll.deductions", "delete");
  assertPayrollEnabled(company);
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/reports/payroll/deductions?err=required");

  const row = await prisma.payrollManualDeduction.findFirst({ where: { id, companyId: company.id } });
  if (!row) redirect("/reports/payroll/deductions?err=missing");

  await prisma.payrollManualDeduction.delete({ where: { id } });
  revalidatePath("/reports/payroll");
  revalidatePath("/reports/payroll/deductions");
  redirect("/reports/payroll/deductions?notice=1");
}

export async function createPayrollManualBonus(formData: FormData) {
  const { company } = await requireCompanyAndPermission("reports.payroll.bonuses", "create");
  assertPayrollEnabled(company);

  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const ym = String(formData.get("bonusPeriodYm") ?? "").trim();

  if (!employeeId || !amountRaw || !reason || !ym) redirect("/reports/payroll/bonuses?err=required");
  if (!(await assertEmployeeInCompany(employeeId, company.id))) {
    redirect("/reports/payroll/bonuses?err=employee_invalid");
  }

  const amount = Number(amountRaw.replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) redirect("/reports/payroll/bonuses?err=bonus_amount");
  if (!/^\d{4}-\d{2}$/.test(ym)) redirect("/reports/payroll/bonuses?err=bonus_month");

  await prisma.payrollManualBonus.create({
    data: {
      companyId: company.id,
      employeeId,
      amount: Math.round(amount * 100) / 100,
      reason,
      bonusPeriodYm: ym,
    },
  });

  revalidatePath("/reports/payroll");
  revalidatePath("/reports/payroll/bonuses");
  redirect("/reports/payroll/bonuses?notice=1");
}

export async function deletePayrollManualBonus(formData: FormData) {
  const { company } = await requireCompanyAndPermission("reports.payroll.bonuses", "delete");
  assertPayrollEnabled(company);
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/reports/payroll/bonuses?err=required");

  const row = await prisma.payrollManualBonus.findFirst({ where: { id, companyId: company.id } });
  if (!row) redirect("/reports/payroll/bonuses?err=missing");

  await prisma.payrollManualBonus.delete({ where: { id } });
  revalidatePath("/reports/payroll");
  revalidatePath("/reports/payroll/bonuses");
  redirect("/reports/payroll/bonuses?notice=1");
}
