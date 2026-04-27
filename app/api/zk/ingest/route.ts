import { NextResponse } from "next/server";
import { applyZkPunchesToDevice } from "@/lib/zk-apply-punches";

type PunchInput = {
  zkUserId: number;
  at: string;
  kind: "CHECK_IN" | "CHECK_OUT";
};

type Body = {
  deviceId: string;
  punches: PunchInput[];
};

function unauthorized() {
  return NextResponse.json({ ok: false, error: "غير مصرح" }, { status: 401 });
}

export async function POST(request: Request) {
  const secret = process.env.ZK_INGEST_SECRET;
  if (secret) {
    const key = request.headers.get("x-akwad-key");
    if (key !== secret) return unauthorized();
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "جسم الطلب غير صالح" }, { status: 400 });
  }

  if (!body?.deviceId || !Array.isArray(body.punches)) {
    return NextResponse.json({ ok: false, error: "deviceId و punches مطلوبان" }, { status: 400 });
  }

  let inserted: number;
  try {
    const r = await applyZkPunchesToDevice(body.deviceId, body.punches);
    inserted = r.inserted;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "الجهاز غير موجود") {
      return NextResponse.json({ ok: false, error: msg }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    inserted,
    message: "تم استلام الحركات. الحركات الجديدة غير مرحّلة افتراضياً حتى تنفّذ عملية الترحيل.",
  });
}
