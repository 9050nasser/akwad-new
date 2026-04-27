import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { PrismaClient } from "@prisma/client";
import { bridgeConfig, loadDotEnvIfPresent } from "./env";
import { pollAllDevices, summarizePollForLog } from "./poll";

loadDotEnvIfPresent();

const prisma = new PrismaClient();
let pollLock = false;
let lastPollAt: string | null = null;
let lastPollSummaries: Awaited<ReturnType<typeof pollAllDevices>> | null = null;
let lastPollError: string | null = null;
/** إن وُجد، آخر طلب سحب استخدم ?deviceId= (السحب الدوري لكل الأجهزة يضع null). */
let lastPollDeviceId: string | null = null;

function json(res: ServerResponse, code: number, body: unknown) {
  res.writeHead(code, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function checkBridgeAuth(req: IncomingMessage, bridgeSecret: string) {
  if (!bridgeSecret) return true;
  const h = req.headers["x-fingerprint-bridge-key"];
  const key = Array.isArray(h) ? h[0] : h;
  return key === bridgeSecret;
}

async function runPollOnce(opts?: { deviceId?: string }) {
  if (pollLock) {
    return { skipped: true as const, reason: "poll_already_running" };
  }
  pollLock = true;
  lastPollError = null;
  try {
    const summaries = await pollAllDevices(prisma, {
      deviceId: opts?.deviceId,
    });
    lastPollSummaries = summaries;
    lastPollAt = new Date().toISOString();
    lastPollDeviceId = opts?.deviceId?.trim() || null;
    console.log(`[fingerprint-bridge] ${lastPollAt}`, summarizePollForLog(summaries).join(" | "));
    return { skipped: false as const, summaries };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    lastPollError = msg;
    console.error("[fingerprint-bridge] poll error", msg);
    return { skipped: false as const, error: msg };
  } finally {
    pollLock = false;
  }
}

async function handler(req: IncomingMessage, res: ServerResponse) {
  const cfg = bridgeConfig();
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/health") {
    json(res, 200, {
      ok: true,
      service: "fingerprint-bridge",
      time: new Date().toISOString(),
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/status") {
    json(res, 200, {
      ok: true,
      lastPollAt,
      lastPollDeviceId,
      lastPollError,
      lastDevices: lastPollSummaries?.map((s) => ({
        deviceId: s.deviceId,
        name: s.name,
        ip: s.ip,
        ok: s.ok,
        sent: s.sent,
        fetched: s.fetched,
        error: s.error,
      })),
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/poll") {
    if (!checkBridgeAuth(req, cfg.bridgeSecret)) {
      json(res, 401, { ok: false, error: "غير مصرح — أرسل x-fingerprint-bridge-key" });
      return;
    }
    const deviceId = url.searchParams.get("deviceId")?.trim() || undefined;
    const out = await runPollOnce(deviceId ? { deviceId } : undefined);
    if ("error" in out && out.error) {
      json(res, 500, { ok: false, error: out.error });
      return;
    }
    if (out.skipped) {
      json(res, 429, { ok: false, error: "عملية سحب أخرى ما زالت تعمل" });
      return;
    }
    json(res, 200, { ok: true, summaries: out.summaries });
    return;
  }

  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(`<!DOCTYPE html><html lang="ar"><head><meta charset="utf-8"/><title>وسيط البصمة</title></head>
<body style="font-family:system-ui;padding:1.5rem;max-width:42rem">
<h1>وسيط أجهزة البصمة</h1>
<p>المنفذ مخصص للتكامل مع أجهزة ZK على الشبكة. يتم سحب السجلات دوريًا وإرسالها إلى تطبيق أكواد عبر <code>/api/zk/ingest</code>.</p>
<ul>
<li><a href="/health">/health</a> — جاهزية الخدمة</li>
<li><a href="/status">/status</a> — آخر عملية سحب</li>
<li><code>POST /poll</code> — سحب فوري لكل الأجهزة المفعّلة (اختياري: <code>?deviceId=</code> معرّف الجهاز في النظام)</li>
<li>يتطلب هيدر <code>x-fingerprint-bridge-key</code> إذا ضبطت <code>FINGERPRINT_BRIDGE_SECRET</code></li>
<li>دخول/خروج يُستنتج من حقل verify state على الجهاز (ZK).</li>
</ul>
</body></html>`);
    return;
  }

  if (req.method === "POST" && url.pathname === "/ingest") {
    res.writeHead(410, { "content-type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify({
        ok: false,
        error:
          "استخدم مسار التطبيق الرئيسي POST /api/zk/ingest — هذا المنفذ للوسيط فقط (سحب من الأجهزة).",
      }),
    );
    return;
  }

  json(res, 404, { ok: false, error: "غير موجود" });
}

const cfg = bridgeConfig();
const server = createServer((req, res) => {
  void handler(req, res).catch((e) => {
    console.error(e);
    json(res, 500, { ok: false, error: e instanceof Error ? e.message : String(e) });
  });
});

server.listen(cfg.port, () => {
  console.log(
    `[fingerprint-bridge] يعمل على http://localhost:${cfg.port} — سحب كل ${cfg.pollMs}ms — إرسال إلى ${cfg.ingestUrl}`,
  );
});

const interval = setInterval(() => {
  void runPollOnce();
}, cfg.pollMs);

void runPollOnce();

function shutdown() {
  clearInterval(interval);
  server.close();
  void prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
