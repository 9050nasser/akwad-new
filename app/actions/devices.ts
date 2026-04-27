"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCompanyAndPermission } from "@/lib/rbac/guards";

const DEVICES_PATH = "/master/devices";

export async function createDevice(formData: FormData) {
  const { company } = await requireCompanyAndPermission("master.devices", "create");
  const count = await prisma.fingerprintDevice.count({
    where: { branch: { companyId: company.id } },
  });
  if (count >= company.maxDevices) {
    redirect(`${DEVICES_PATH}?err=license_devices`);
  }

  const name = String(formData.get("name") ?? "").trim();
  const branchId = String(formData.get("branchId") ?? "");
  const ip = String(formData.get("ip") ?? "").trim();
  if (!name || !branchId || !ip) redirect(`${DEVICES_PATH}?err=required`);

  const branchOk = await prisma.branch.findFirst({ where: { id: branchId, companyId: company.id } });
  if (!branchOk) redirect(`${DEVICES_PATH}?err=branch`);

  const port = Number(formData.get("port") ?? 4370);
  const model = String(formData.get("model") ?? "").trim() || "ZK";
  const serialNumber = String(formData.get("serialNumber") ?? "").trim() || null;
  const enabled = formData.getAll("enabled").includes("on");

  await prisma.fingerprintDevice.create({
    data: {
      name,
      branchId,
      ip,
      port: Number.isFinite(port) ? port : 4370,
      model,
      serialNumber,
      enabled,
    },
  });

  revalidatePath(DEVICES_PATH);
  revalidatePath("/settings/devices");
  revalidatePath("/dashboard");
  redirect(`${DEVICES_PATH}?notice=1`);
}

export async function updateDevice(formData: FormData) {
  const { company } = await requireCompanyAndPermission("master.devices", "update");
  const id = String(formData.get("id") ?? "");
  if (!id) redirect(`${DEVICES_PATH}?err=required`);

  const existing = await prisma.fingerprintDevice.findFirst({
    where: { id, branch: { companyId: company.id } },
  });
  if (!existing) redirect(`${DEVICES_PATH}?err=not_found`);

  const name = String(formData.get("name") ?? "").trim();
  const branchId = String(formData.get("branchId") ?? "");
  const ip = String(formData.get("ip") ?? "").trim();
  if (!name || !branchId || !ip) redirect(`${DEVICES_PATH}?err=required`);

  const branchOk = await prisma.branch.findFirst({ where: { id: branchId, companyId: company.id } });
  if (!branchOk) redirect(`${DEVICES_PATH}?err=branch`);

  const port = Number(formData.get("port") ?? 4370);
  const model = String(formData.get("model") ?? "").trim() || "ZK";
  const serialNumber = String(formData.get("serialNumber") ?? "").trim() || null;
  const enabled = formData.getAll("enabled").includes("on");

  await prisma.fingerprintDevice.update({
    where: { id },
    data: {
      name,
      branchId,
      ip,
      port: Number.isFinite(port) ? port : 4370,
      model,
      serialNumber,
      enabled,
    },
  });

  revalidatePath(DEVICES_PATH);
  revalidatePath("/settings/devices");
  redirect(`${DEVICES_PATH}?notice=1`);
}

export async function deleteDevice(formData: FormData) {
  const { company } = await requireCompanyAndPermission("master.devices", "delete");
  const id = String(formData.get("id") ?? "");
  const existing = await prisma.fingerprintDevice.findFirst({
    where: { id, branch: { companyId: company.id } },
  });
  if (!existing) redirect(`${DEVICES_PATH}?err=delete`);
  try {
    await prisma.fingerprintDevice.delete({ where: { id } });
  } catch {
    redirect(`${DEVICES_PATH}?err=delete`);
  }
  revalidatePath(DEVICES_PATH);
  revalidatePath("/settings/devices");
  revalidatePath("/dashboard");
  redirect(`${DEVICES_PATH}?notice=1`);
}
