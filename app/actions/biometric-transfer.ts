"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { enqueueSourceQueries, enqueueUserOnTargets } from "@/lib/biometric-transfer";
import { prisma } from "@/lib/prisma";
import { requireCompanyAndPermission } from "@/lib/rbac/guards";

const PATH = "/operations/transfer-biometric";

export async function startBiometricTransfer(formData: FormData) {
  const { company } = await requireCompanyAndPermission("operations.transfer_biometric", "create");

  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const sourceDeviceId = String(formData.get("sourceDeviceId") ?? "").trim();
  const targetMode = String(formData.get("targetMode") ?? "all");
  const targetDeviceId = String(formData.get("targetDeviceId") ?? "").trim();
  const includeFinger = formData.get("includeFinger") === "on";
  const includeFace = formData.get("includeFace") === "on";

  if (!employeeId || !sourceDeviceId) redirect(`${PATH}?err=required`);
  if (!includeFinger && !includeFace) redirect(`${PATH}?err=bio_type`);

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, branch: { companyId: company.id } },
    select: { id: true, fullName: true, deviceUserId: true },
  });
  if (!employee) redirect(`${PATH}?err=employee`);
  if (employee.deviceUserId == null) redirect(`${PATH}?err=bio_pin`);

  const source = await prisma.fingerprintDevice.findFirst({
    where: { id: sourceDeviceId, enabled: true, branch: { companyId: company.id } },
  });
  if (!source?.serialNumber) redirect(`${PATH}?err=bio_source`);

  const allTargets = await prisma.fingerprintDevice.findMany({
    where: {
      enabled: true,
      serialNumber: { not: null },
      id: { not: source.id },
      branch: { companyId: company.id },
    },
    select: { id: true, serialNumber: true, name: true },
  });

  let chosen = allTargets;
  if (targetMode === "one") {
    if (!targetDeviceId) redirect(`${PATH}?err=bio_target`);
    chosen = allTargets.filter((d) => d.id === targetDeviceId);
    if (chosen.length === 0) redirect(`${PATH}?err=bio_target`);
  }
  if (chosen.length === 0) redirect(`${PATH}?err=bio_target_empty`);

  const pin = String(employee.deviceUserId);
  const targetDeviceSns = chosen.map((d) => d.serialNumber!).join(",");

  const transfer = await prisma.biometricTransfer.create({
    data: {
      companyId: company.id,
      employeeId: employee.id,
      employeeName: employee.fullName,
      pin,
      sourceDeviceId: source.id,
      sourceDeviceSn: source.serialNumber,
      includeFinger,
      includeFace,
      targetMode: targetMode === "one" ? "ONE" : "ALL",
      targetDeviceSns,
      status: "WAITING_DATA",
    },
  });

  await enqueueUserOnTargets(
    chosen.map((d) => d.serialNumber!),
    pin,
    employee.fullName,
  );
  await enqueueSourceQueries({
    sourceSn: source.serialNumber,
    pin,
    includeFinger,
    includeFace,
  });

  void transfer;
  revalidatePath(PATH);
  redirect(`${PATH}?notice=bio_queued`);
}
