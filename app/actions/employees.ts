"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCompanyAndPermission } from "@/lib/rbac/guards";

async function assertBranchInCompany(branchId: string, companyId: string) {
  const b = await prisma.branch.findFirst({ where: { id: branchId, companyId } });
  if (!b) redirect("/master/employees?err=branch");
}

async function assertWorkScheduleInCompany(scheduleId: string | null, companyId: string) {
  if (!scheduleId) return;
  const s = await prisma.workSchedule.findFirst({ where: { id: scheduleId, companyId } });
  if (!s) redirect("/master/employees?err=schedule");
}

async function assertDepartmentGroupInCompany(groupId: string | null, companyId: string) {
  if (!groupId) return;
  const g = await prisma.employeeGroup.findFirst({ where: { id: groupId, companyId } });
  if (!g) redirect("/master/employees?err=department_bad");
}

async function assertCatalogRefsInCompany(
  companyId: string,
  refs: {
    jobTitleId: string | null;
    projectId: string | null;
    nationalityId: string | null;
    workDutyId: string | null;
  },
) {
  if (refs.jobTitleId) {
    const r = await prisma.jobTitle.findFirst({ where: { id: refs.jobTitleId, companyId } });
    if (!r) redirect("/master/employees?err=catalog_bad");
  }
  if (refs.projectId) {
    const r = await prisma.project.findFirst({ where: { id: refs.projectId, companyId } });
    if (!r) redirect("/master/employees?err=catalog_bad");
  }
  if (refs.nationalityId) {
    const r = await prisma.nationality.findFirst({ where: { id: refs.nationalityId, companyId } });
    if (!r) redirect("/master/employees?err=catalog_bad");
  }
  if (refs.workDutyId) {
    const r = await prisma.workDuty.findFirst({ where: { id: refs.workDutyId, companyId } });
    if (!r) redirect("/master/employees?err=catalog_bad");
  }
}

function emptyToNull(v: string) {
  const t = v.trim();
  return t ? t : null;
}

function parseBaseSalaryMonthly(raw: string): number | null {
  const t = raw.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

export async function createEmployee(formData: FormData) {
  const { company } = await requireCompanyAndPermission("master.employees", "create");
  const activeCount = await prisma.employee.count({
    where: { active: true, branch: { companyId: company.id } },
  });
  if (activeCount >= company.maxEmployees) {
    redirect("/master/employees?err=license_employees");
  }

  const fullName = String(formData.get("fullName") ?? "").trim();
  const branchId = String(formData.get("branchId") ?? "");
  if (!fullName || !branchId) redirect("/master/employees?err=required");
  await assertBranchInCompany(branchId, company.id);

  const employeeCode = emptyToNull(String(formData.get("employeeCode") ?? ""));
  const deviceUserIdRaw = String(formData.get("deviceUserId") ?? "").trim();
  const deviceUserId = deviceUserIdRaw ? Number(deviceUserIdRaw) : null;
  if (deviceUserIdRaw && !Number.isFinite(deviceUserId)) {
    redirect("/master/employees?err=device_id");
  }

  const jobTitleId = emptyToNull(String(formData.get("jobTitleId") ?? ""));
  const projectId = emptyToNull(String(formData.get("projectId") ?? ""));
  const nationalityId = emptyToNull(String(formData.get("nationalityId") ?? ""));
  const workDutyId = emptyToNull(String(formData.get("workDutyId") ?? ""));
  const workScheduleId = emptyToNull(String(formData.get("workScheduleId") ?? ""));
  const departmentGroupId = emptyToNull(String(formData.get("departmentGroupId") ?? ""));
  const baseSalaryMonthly = parseBaseSalaryMonthly(String(formData.get("baseSalaryMonthly") ?? ""));
  const allowanceHousingMonthly = parseBaseSalaryMonthly(String(formData.get("allowanceHousingMonthly") ?? ""));
  const allowanceTransportMonthly = parseBaseSalaryMonthly(String(formData.get("allowanceTransportMonthly") ?? ""));
  await assertWorkScheduleInCompany(workScheduleId, company.id);
  await assertDepartmentGroupInCompany(departmentGroupId, company.id);
  await assertCatalogRefsInCompany(company.id, {
    jobTitleId,
    projectId,
    nationalityId,
    workDutyId,
  });

  const payrollOn = company.enablePayroll;

  await prisma.employee.create({
    data: {
      fullName,
      employeeCode,
      deviceUserId: deviceUserId ?? undefined,
      branchId,
      jobTitleId: jobTitleId ?? undefined,
      projectId: projectId ?? undefined,
      nationalityId: nationalityId ?? undefined,
      workDutyId: workDutyId ?? undefined,
      workScheduleId: workScheduleId ?? undefined,
      departmentGroupId: departmentGroupId ?? undefined,
      ...(payrollOn
        ? {
            baseSalaryMonthly: baseSalaryMonthly ?? undefined,
            allowanceHousingMonthly: allowanceHousingMonthly ?? undefined,
            allowanceTransportMonthly: allowanceTransportMonthly ?? undefined,
          }
        : {}),
      active: true,
    },
  });

  revalidatePath("/master/employees");
  revalidatePath("/dashboard");
  redirect("/master/employees?notice=1");
}

export async function updateEmployee(formData: FormData) {
  const { company } = await requireCompanyAndPermission("master.employees", "update");
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/master/employees?err=required");

  const fullName = String(formData.get("fullName") ?? "").trim();
  const branchId = String(formData.get("branchId") ?? "");
  if (!fullName || !branchId) redirect("/master/employees?err=required");
  await assertBranchInCompany(branchId, company.id);

  const existingEmp = await prisma.employee.findFirst({
    where: { id, branch: { companyId: company.id } },
  });
  if (!existingEmp) redirect("/master/employees?err=not_found");

  const employeeCode = emptyToNull(String(formData.get("employeeCode") ?? ""));
  const deviceUserIdRaw = String(formData.get("deviceUserId") ?? "").trim();
  const deviceUserId = deviceUserIdRaw ? Number(deviceUserIdRaw) : null;
  if (deviceUserIdRaw && !Number.isFinite(deviceUserId)) {
    redirect("/master/employees?err=device_id");
  }

  const jobTitleId = emptyToNull(String(formData.get("jobTitleId") ?? ""));
  const projectId = emptyToNull(String(formData.get("projectId") ?? ""));
  const nationalityId = emptyToNull(String(formData.get("nationalityId") ?? ""));
  const workDutyId = emptyToNull(String(formData.get("workDutyId") ?? ""));
  const workScheduleId = emptyToNull(String(formData.get("workScheduleId") ?? ""));
  const departmentGroupId = emptyToNull(String(formData.get("departmentGroupId") ?? ""));
  const active = String(formData.get("active") ?? "on") !== "off";
  const includePayroll = String(formData.get("includePayrollFields") ?? "") === "1";
  const baseSalaryMonthly = parseBaseSalaryMonthly(String(formData.get("baseSalaryMonthly") ?? ""));
  const allowanceHousingMonthly = parseBaseSalaryMonthly(String(formData.get("allowanceHousingMonthly") ?? ""));
  const allowanceTransportMonthly = parseBaseSalaryMonthly(String(formData.get("allowanceTransportMonthly") ?? ""));
  await assertWorkScheduleInCompany(workScheduleId, company.id);
  await assertDepartmentGroupInCompany(departmentGroupId, company.id);
  await assertCatalogRefsInCompany(company.id, {
    jobTitleId,
    projectId,
    nationalityId,
    workDutyId,
  });

  await prisma.employee.update({
    where: { id },
    data: {
      fullName,
      employeeCode,
      deviceUserId: deviceUserId ?? null,
      branchId,
      jobTitleId: jobTitleId ?? null,
      projectId: projectId ?? null,
      nationalityId: nationalityId ?? null,
      workDutyId: workDutyId ?? null,
      workScheduleId: workScheduleId ?? null,
      departmentGroupId: departmentGroupId ?? null,
      ...(includePayroll && company.enablePayroll
        ? {
            baseSalaryMonthly,
            allowanceHousingMonthly,
            allowanceTransportMonthly,
          }
        : {}),
      active,
    },
  });

  revalidatePath("/master/employees");
  revalidatePath("/dashboard");
  redirect("/master/employees?notice=1");
}

export async function deactivateEmployee(formData: FormData) {
  const { company } = await requireCompanyAndPermission("master.employees", "delete");
  const id = String(formData.get("id") ?? "");
  const existingEmp = await prisma.employee.findFirst({
    where: { id, branch: { companyId: company.id } },
  });
  if (!existingEmp) redirect("/master/employees?err=not_found");
  await prisma.employee.update({ where: { id }, data: { active: false } });
  revalidatePath("/master/employees");
  revalidatePath("/dashboard");
  redirect("/master/employees?notice=1");
}
