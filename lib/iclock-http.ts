import { gunzipSync } from "node:zlib";
import type { NextRequest } from "next/server";
import { iclockPushAuthorized } from "@/lib/iclock-auth";
import { parseZkAttlogBody } from "@/lib/iclock-parse-attlog";
import { getAttlogStamp, setAttlogStamp } from "@/lib/iclock-stamps";
import { prisma } from "@/lib/prisma";
import { applyZkPunchesToDevice } from "@/lib/zk-apply-punches";

function textResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      Date: new Date().toUTCString(),
    },
  });
}

function handshakeBody(sn: string) {
  const stamp = getAttlogStamp(sn);
  const tz = process.env.ZK_ICLOCK_TIMEZONE ?? "3";
  return [
    `GET OPTION FROM: ${sn}`,
    `ATTLOGStamp=${stamp}`,
    `OPERLOGStamp=None`,
    `ATTPHOTOStamp=None`,
    `ErrorDelay=30`,
    `Delay=10`,
    `TransTimes=00:00;23:59`,
    `TransInterval=1`,
    `TransFlag=TransData AttLog`,
    `TimeZone=${tz}`,
    `Realtime=1`,
    `ServerVer=2.2.14`,
    `Encrypt=None`,
  ].join("\r\n");
}

export async function handleIclockGetCdata(request: NextRequest) {
  if (!iclockPushAuthorized(request)) {
    return textResponse("Invalid comm key\n", 403);
  }
  const sn = request.nextUrl.searchParams.get("SN")?.trim();
  if (!sn) {
    return textResponse("OK\n");
  }
  return textResponse(handshakeBody(sn));
}

export async function handleIclockPostAttlog(request: NextRequest) {
  if (!iclockPushAuthorized(request)) {
    return textResponse("Invalid comm key\n", 403);
  }
  const url = request.nextUrl;
  const sn = url.searchParams.get("SN")?.trim();
  if (!sn) {
    return textResponse("OK:0");
  }

  const table = url.searchParams.get("table")?.toUpperCase();
  if (table && table !== "ATTLOG") {
    return textResponse("OK:0");
  }

  let buf = Buffer.from(await request.arrayBuffer());
  const enc = request.headers.get("content-encoding") ?? "";
  if (enc.toLowerCase().includes("gzip")) {
    try {
      buf = Buffer.from(gunzipSync(buf));
    } catch {
      return textResponse("OK:0");
    }
  }

  const raw = buf.toString("utf8");
  const punches = parseZkAttlogBody(raw);

  const device = await prisma.fingerprintDevice.findFirst({
    where: {
      enabled: true,
      serialNumber: sn,
    },
  });

  if (!device) {
    console.warn(`[iclock] لا يوجد جهاز مفعّل بنفس السيريال المسجّل: SN=${sn}`);
    return textResponse("OK:0");
  }

  let inserted = 0;
  if (punches.length > 0) {
    try {
      const r = await applyZkPunchesToDevice(device.id, punches);
      inserted = r.inserted;
    } catch (e) {
      console.error("[iclock] apply punches", e);
      return textResponse("OK:0");
    }
  }

  const stamp = url.searchParams.get("Stamp") ?? String(Date.now());
  setAttlogStamp(sn, stamp);

  return textResponse(`OK:${inserted}`);
}

export async function handleIclockGetRequest(request: NextRequest) {
  if (!iclockPushAuthorized(request)) {
    return textResponse("Invalid comm key\n", 403);
  }
  return textResponse("OK\n");
}

export async function handleIclockPostDevicecmd(request: NextRequest) {
  if (!iclockPushAuthorized(request)) {
    return textResponse("Invalid comm key\n", 403);
  }
  void request;
  return textResponse("OK\n");
}
