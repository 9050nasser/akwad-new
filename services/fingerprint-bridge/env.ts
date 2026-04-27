import { readFileSync, existsSync } from "fs";
import { join } from "path";

let envLoaded = false;

/** Load `.env` into `process.env` when missing (tsx does not load Next's env). */
export function loadDotEnvIfPresent() {
  if (envLoaded) return;
  envLoaded = true;
  const p = join(process.cwd(), ".env");
  if (!existsSync(p)) return;
  const text = readFileSync(p, "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

export function bridgeConfig() {
  loadDotEnvIfPresent();
  const port = Number(process.env.FINGERPRINT_BRIDGE_PORT ?? "3090");
  const pollMs = Number(process.env.FINGERPRINT_BRIDGE_POLL_MS ?? "60000");
  const ingestUrl =
    process.env.FINGERPRINT_INGEST_URL?.trim() ||
    "http://localhost:3001/api/zk/ingest";
  const ingestSecret = process.env.ZK_INGEST_SECRET?.trim() || "";
  const bridgeSecret = process.env.FINGERPRINT_BRIDGE_SECRET?.trim() || "";
  const tcpTimeout = Number(process.env.FINGERPRINT_BRIDGE_TCP_TIMEOUT ?? "10000");
  const udpInPort = Number(process.env.FINGERPRINT_BRIDGE_UDP_INPORT ?? "4000");
  return {
    port: Number.isFinite(port) ? port : 3090,
    pollMs: Number.isFinite(pollMs) && pollMs >= 5000 ? pollMs : 60000,
    ingestUrl,
    ingestSecret,
    bridgeSecret,
    tcpTimeout: Number.isFinite(tcpTimeout) ? tcpTimeout : 10000,
    udpInPort: Number.isFinite(udpInPort) ? udpInPort : 4000,
  };
}
