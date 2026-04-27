import type { Prisma } from "@prisma/client";

export function branchBelongsToCompany(companyId: string, branchId?: string): Prisma.BranchWhereInput {
  return branchId ? { id: branchId, companyId } : { companyId };
}

export function employeesForCompany(companyId: string, branchId?: string): Prisma.EmployeeWhereInput {
  return { branch: branchBelongsToCompany(companyId, branchId) };
}

export function attendanceForCompany(companyId: string, branchId?: string): Prisma.AttendanceEventWhereInput {
  return { branch: branchBelongsToCompany(companyId, branchId) };
}
