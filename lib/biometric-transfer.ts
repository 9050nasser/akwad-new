import { parseOperlogBody, userInfoUpdateCommand, type OperlogItem } from "@/lib/iclock-operlog";
import { prisma } from "@/lib/prisma";

const ACTIVE = ["WAITING_DATA", "QUEUED_PUSH", "PARTIAL"] as const;

function targetSnsFrom(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function queueCommand(deviceSn: string, command: string) {
  await prisma.deviceCommand.create({
    data: { deviceSn, command, status: "PENDING" },
  });
}

export async function enqueueSourceQueries(opts: {
  sourceSn: string;
  pin: string;
  includeFinger: boolean;
  includeFace: boolean;
}) {
  await queueCommand(opts.sourceSn, `DATA QUERY USERINFO PIN=${opts.pin}`);
  if (opts.includeFinger) {
    await queueCommand(opts.sourceSn, `DATA QUERY FINGERTMP PIN=${opts.pin}`);
  }
  if (opts.includeFace) {
    await queueCommand(opts.sourceSn, `DATA QUERY FACE PIN=${opts.pin}`);
  }
}

export async function enqueueUserOnTargets(targetSns: string[], pin: string, fullName: string) {
  const cmd = userInfoUpdateCommand(pin, fullName);
  for (const sn of targetSns) {
    await queueCommand(sn, cmd);
  }
}

function acceptItem(item: OperlogItem, includeFinger: boolean, includeFace: boolean): boolean {
  if (item.kind === "USER") return true;
  if (item.kind === "FINGER") return includeFinger;
  if (item.kind === "FACE") return includeFace;
  if (item.kind === "BIODATA") return includeFinger || includeFace;
  return false;
}

export async function ingestOperlogForDevice(deviceSn: string, raw: string): Promise<number> {
  const items = parseOperlogBody(raw);
  if (items.length === 0) return 0;

  let stored = 0;
  const pins = [...new Set(items.map((i) => i.pin))];
  const transfers = await prisma.biometricTransfer.findMany({
    where: {
      sourceDeviceSn: deviceSn,
      pin: { in: pins },
      status: { in: [...ACTIVE] },
    },
  });
  if (transfers.length === 0) return 0;

  for (const item of items) {
    const matches = transfers.filter((t) => t.pin === item.pin);
    for (const transfer of matches) {
      if (!acceptItem(item, transfer.includeFinger, transfer.includeFace)) continue;
      try {
        await prisma.biometricTemplate.create({
          data: {
            transferId: transfer.id,
            kind: item.kind,
            fid: item.fid,
            command: item.command,
          },
        });
        stored += 1;
      } catch {
        continue;
      }
      const targets = targetSnsFrom(transfer.targetDeviceSns);
      for (const sn of targets) {
        await queueCommand(sn, item.command);
      }
      const counts = await prisma.biometricTemplate.groupBy({
        by: ["kind"],
        where: { transferId: transfer.id },
        _count: { _all: true },
      });
      const finger = counts.find((c) => c.kind === "FINGER")?._count._all ?? 0;
      const face = counts.find((c) => c.kind === "FACE" || c.kind === "BIODATA")?._count._all ?? 0;
      const nextStatus =
        (transfer.includeFinger && finger === 0 && transfer.includeFace && face === 0) ||
        (transfer.includeFinger && finger === 0 && !transfer.includeFace) ||
        (transfer.includeFace && face === 0 && !transfer.includeFinger)
          ? "PARTIAL"
          : "QUEUED_PUSH";
      await prisma.biometricTransfer.update({
        where: { id: transfer.id },
        data: { status: nextStatus },
      });
    }
  }
  return stored;
}
