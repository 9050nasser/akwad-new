"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { reconcileOpenScheduleKindsForDay } from "@/lib/open-schedule-kinds";
import { prisma } from "@/lib/prisma";
import { requireCompanyAndPermission } from "@/lib/rbac/guards";

function rangeFromForm(formData: FormData) {
  const fromStr = String(formData.get("from") ?? "");
  const toStr = String(formData.get("to") ?? "");
  const branchId = String(formData.get("branchId") ?? "").trim() || undefined;
  if (!fromStr || !toStr) return null;
  const from = new Date(`${fromStr}T00:00:00`);
  const to = new Date(`${toStr}T23:59:59.999`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  if (from > to) return null;
  return { from, to, branchId };
}

export async function postMovements(formData: FormData) {
  const { company } = await requireCompanyAndPermission("operations.post", "update");
  const range = rangeFromForm(formData);
  if (!range) redirect("/operations/post?err=range");

  const { count } = await prisma.attendanceEvent.updateMany({
    where: {
      isPosted: false,
      at: { gte: range.from, lte: range.to },
      branch: range.branchId
        ? { id: range.branchId, companyId: company.id }
        : { companyId: company.id },
    },
    data: { isPosted: true },
  });

  revalidatePath("/operations/movements");
  revalidatePath("/operations/post");
  revalidatePath("/dashboard");
  redirect(`/operations/post?notice=posted&n=${count}`);
}

export async function unpostMovements(formData: FormData) {
  const { company } = await requireCompanyAndPermission("operations.unpost", "update");
  const range = rangeFromForm(formData);
  if (!range) redirect("/operations/unpost?err=range");

  const { count } = await prisma.attendanceEvent.updateMany({
    where: {
      isPosted: true,
      at: { gte: range.from, lte: range.to },
      branch: range.branchId
        ? { id: range.branchId, companyId: company.id }
        : { companyId: company.id },
    },
    data: { isPosted: false },
  });

  revalidatePath("/operations/movements");
  revalidatePath("/operations/unpost");
  revalidatePath("/dashboard");
  redirect(`/operations/unpost?notice=unposted&n=${count}`);
}

export async function createManualMovement(formData: FormData) {
  const { company } = await requireCompanyAndPermission("operations.edit_movements", "create");
  const branchId = String(formData.get("branchId") ?? "");
  const employeeId = String(formData.get("employeeId") ?? "");
  const atStr = String(formData.get("at") ?? "");
  const kind = String(formData.get("kind") ?? "CHECK_IN");
  if (!branchId || !employeeId || !atStr) redirect("/operations/edit-movements?err=required");

  const at = new Date(atStr);
  if (Number.isNaN(at.getTime())) redirect("/operations/edit-movements?err=date");

  const branchOk = await prisma.branch.findFirst({ where: { id: branchId, companyId: company.id } });
  if (!branchOk) redirect("/operations/edit-movements?err=employee_branch");

  const emp = await prisma.employee.findFirst({
    where: { id: employeeId, branchId },
    include: { workSchedule: { select: { isOpen: true } } },
  });
  if (!emp) redirect("/operations/edit-movements?err=employee_branch");

  await prisma.attendanceEvent.create({
    data: {
      branchId,
      employeeId,
      at,
      kind: kind === "CHECK_OUT" ? "CHECK_OUT" : "CHECK_IN",
      source: "MANUAL",
      isPosted: false,
    },
  });

  if (emp.workSchedule?.isOpen) {
    await reconcileOpenScheduleKindsForDay(emp.id, at);
  }

  revalidatePath("/operations/movements");
  revalidatePath("/operations/edit-movements");
  revalidatePath("/dashboard");
  redirect("/operations/edit-movements?notice=1");
}
