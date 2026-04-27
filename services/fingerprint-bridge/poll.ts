import { createRequire } from "module";
import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import { bridgeConfig } from "./env";
import { readCursors, writeCursor, type DeviceCursor } from "./state-file";
import { augmentZklibAttendanceDecode } from "./zk-augment-decode";

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ZKLib = require("node-zklib") as any;

export type PollOptions = {
  /** إن وُجد، يُسحب هذا الجهاز فقط (معرّف النظام cuid من شاشة أجهزة البصمة). */
  deviceId?: string;
};

/** حقل verify state من جهاز ZK → نوع الحركة في النظام. */
export function verifyStateToKind(verifyState: number | undefined): "CHECK_IN" | "CHECK_OUT" {
  const v = verifyState ?? 0;
  if (v === 1 || v === 2 || v === 5) return "CHECK_OUT";
  return "CHECK_IN";
}

export type PollSummary = {
  deviceId: string;
  name: string;
  ip: string;
  ok: boolean;
  fetched?: number;
  sent?: number;
  error?: string;
};

type Punch = { zkUserId: number; at: string; kind: "CHECK_IN" | "CHECK_OUT" };

function parseZkUserId(raw: string): number | null {
  const n = Number.parseInt(String(raw).trim(), 10);
  if (Number.isFinite(n)) return n;
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;
  const m = Number.parseInt(digits, 10);
  return Number.isFinite(m) ? m : null;
}

function compareCursor(a: DeviceCursor, b: DeviceCursor) {
  if (a.t !== b.t) return a.t - b.t;
  return a.sn - b.sn;
}

function isAfterCursor(recT: number, recSn: number, c: DeviceCursor) {
  return compareCursor({ t: recT, sn: recSn }, c) > 0;
}

async function postIngest(
  ingestUrl: string,
  deviceId: string,
  punches: Punch[],
  secret: string,
) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (secret) headers["x-akwad-key"] = secret;
  const res = await fetch(ingestUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ deviceId, punches }),
  });
  const text = await res.text();
  let json: { ok?: boolean; inserted?: number; error?: string } = {};
  try {
    json = JSON.parse(text) as typeof json;
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    throw new Error(json.error || text || `HTTP ${res.status}`);
  }
  if (!json.ok) {
    throw new Error(json.error || "ingest رفض الطلب");
  }
  return json.inserted ?? punches.length;
}

const CHUNK = 200;

export async function pollAllDevices(
  prisma: PrismaClient,
  options?: PollOptions,
): Promise<PollSummary[]> {
  augmentZklibAttendanceDecode();
  const cfg = bridgeConfig();
  const maxAgeDays = Number(process.env.FINGERPRINT_BRIDGE_MAX_AGE_DAYS ?? "30");
  const minTime = Date.now() - (Number.isFinite(maxAgeDays) ? maxAgeDays : 30) * 86400000;

  const where: Prisma.FingerprintDeviceWhereInput = { enabled: true };
  if (options?.deviceId) where.id = options.deviceId;

  const devices = await prisma.fingerprintDevice.findMany({
    where,
    orderBy: { name: "asc" },
  });

  if (options?.deviceId && devices.length === 0) {
    return [
      {
        deviceId: options.deviceId,
        name: "—",
        ip: "—",
        ok: false,
        error: "الجهاز غير موجود أو غير مفعّل في أجهزة البصمة.",
      },
    ];
  }

  const cursors = readCursors();
  const summaries: PollSummary[] = [];

  for (const d of devices) {
    const cursor = cursors[d.id] ?? { t: 0, sn: -1 };
    const zk = new ZKLib(d.ip, d.port, cfg.tcpTimeout, cfg.udpInPort);
    try {
      await zk.createSocket();
      const { data: rows, err } = await zk.getAttendances();
      if (err) {
        summaries.push({
          deviceId: d.id,
          name: d.name,
          ip: d.ip,
          ok: false,
          error: String(err.message || err),
        });
        await zk.disconnect().catch(() => {});
        continue;
      }

      const normalized = (rows || [])
        .map((r: { userSn: number; deviceUserId: string; recordTime: Date | string; verifyState?: number }) => {
          const zkUserId = parseZkUserId(r.deviceUserId);
          if (zkUserId === null) return null;
          const rt = r.recordTime instanceof Date ? r.recordTime : new Date(r.recordTime);
          const t = rt.getTime();
          if (Number.isNaN(t) || t < minTime) return null;
          return {
            userSn: r.userSn,
            zkUserId,
            recordTime: rt,
            t,
            kind: verifyStateToKind(r.verifyState),
          };
        })
        .filter((x: any): x is NonNullable<any> => x !== null)
        .sort((a: any, b: any) => a.t - b.t || a.userSn - b.userSn);

      const newRows = normalized.filter((r: any) => isAfterCursor(r.t, r.userSn, cursor));

      let sent = 0;

      for (let i = 0; i < newRows.length; i += CHUNK) {
        const slice = newRows.slice(i, i + CHUNK);
        const punches: Punch[] = slice.map((r: any) => ({
          zkUserId: r.zkUserId,
          at: r.recordTime.toISOString(),
          kind: r.kind,
        }));
        await postIngest(cfg.ingestUrl, d.id, punches, cfg.ingestSecret);
        sent += punches.length;
        const last = slice[slice.length - 1]!;
        writeCursor(d.id, { t: last.t, sn: last.userSn });
      }

      summaries.push({
        deviceId: d.id,
        name: d.name,
        ip: d.ip,
        ok: true,
        fetched: normalized.length,
        sent,
      });
    } catch (e) {
      summaries.push({
        deviceId: d.id,
        name: d.name,
        ip: d.ip,
        ok: false,
        error: e instanceof Error ? e.message : (typeof e === "object" ? JSON.stringify(e) : String(e)),
      });
    } finally {
      await zk.disconnect().catch(() => {});
    }
  }

  return summaries;
}

export function summarizePollForLog(summaries: PollSummary[]) {
  return summaries.map((s) =>
    s.ok
      ? `${s.name}: +${s.sent ?? 0} (من الجهاز ${s.fetched ?? 0})`
      : `${s.name}: فشل — ${s.error ?? ""}`,
  );
}
