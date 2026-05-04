import type { Prisma } from "@prisma/client";
import { firstQuery } from "@/lib/flash";
import { prisma } from "@/lib/prisma";

/** نفس معاملات البحث في «تقرير حالة اليوم» — تُدمج مع فرع الشركة في استعلام الموظفين. */
export type ReportEmployeeFilterParams = {
  q?: string;
  departmentGroupId?: string;
  workDutyId?: string;
  projectId?: string;
  jobTitleId?: string;
  workScheduleId?: string;
};

export function reportEmployeeWhereExtras(filters: ReportEmployeeFilterParams | undefined): Prisma.EmployeeWhereInput {
  if (!filters) return {};
  const parts: Prisma.EmployeeWhereInput[] = [];
  const q = filters.q?.trim();
  if (q) {
    parts.push({
      OR: [{ fullName: { contains: q } }, { employeeCode: { contains: q } }],
    });
  }
  if (filters.departmentGroupId) parts.push({ departmentGroupId: filters.departmentGroupId });
  if (filters.workDutyId) parts.push({ workDutyId: filters.workDutyId });
  if (filters.projectId) parts.push({ projectId: filters.projectId });
  if (filters.jobTitleId) parts.push({ jobTitleId: filters.jobTitleId });
  if (filters.workScheduleId) parts.push({ workScheduleId: filters.workScheduleId });
  return parts.length ? { AND: parts } : {};
}

/** يقرأ مفاتيح البحث الموحّدة من `searchParams` في صفحات التقارير. */
export function buildEmployeeFiltersFromSearchParams(
  sp: Record<string, string | string[] | undefined>,
): ReportEmployeeFilterParams {
  const fq = (k: string) => firstQuery(sp[k])?.trim() || undefined;
  return {
    q: fq("q"),
    departmentGroupId: fq("departmentGroupId"),
    workDutyId: fq("workDutyId"),
    projectId: fq("projectId"),
    jobTitleId: fq("jobTitleId"),
    workScheduleId: fq("workScheduleId"),
  };
}

export function hasReportEmployeeFilters(filters: ReportEmployeeFilterParams | undefined): boolean {
  if (!filters) return false;
  return Boolean(
    filters.q?.trim() ||
      filters.departmentGroupId ||
      filters.workDutyId ||
      filters.projectId ||
      filters.jobTitleId ||
      filters.workScheduleId,
  );
}

export type ReportFilterDropdowns = {
  branches: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  duties: { id: string; name: string }[];
  projects: { id: string; name: string }[];
  jobs: { id: string; name: string }[];
  schedules: { id: string; name: string }[];
};

export async function loadReportFilterDropdowns(companyId: string): Promise<ReportFilterDropdowns> {
  const [branches, departments, duties, projects, jobs, schedules] = await Promise.all([
    prisma.branch.findMany({ where: { companyId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.employeeGroup.findMany({ where: { companyId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.workDuty.findMany({ where: { companyId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.project.findMany({ where: { companyId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.jobTitle.findMany({ where: { companyId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.workSchedule.findMany({ where: { companyId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return { branches, departments, duties, projects, jobs, schedules };
}
