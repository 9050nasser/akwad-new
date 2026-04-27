"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCompanyAndPermission } from "@/lib/rbac/guards";

export async function createHoliday(formData: FormData) {
  const { company } = await requireCompanyAndPermission("master.holidays", "create");
  const name = String(formData.get("name") ?? "").trim();
  const dateStr = String(formData.get("date") ?? "");
  if (!name || !dateStr) redirect("/master/holidays?err=required");
  const date = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(date.getTime())) redirect("/master/holidays?err=date");
  const annual = String(formData.get("annual") ?? "") === "on";
  await prisma.holiday.create({ data: { name, date, annual, companyId: company.id } });
  revalidatePath("/master/holidays");
  redirect("/master/holidays?notice=1");
}

export async function deleteHoliday(formData: FormData) {
  const { company } = await requireCompanyAndPermission("master.holidays", "delete");
  const id = String(formData.get("id") ?? "");
  const row = await prisma.holiday.findFirst({ where: { id, companyId: company.id } });
  if (!row) redirect("/master/holidays?err=required");
  await prisma.holiday.delete({ where: { id } });
  revalidatePath("/master/holidays");
  redirect("/master/holidays?notice=1");
}
