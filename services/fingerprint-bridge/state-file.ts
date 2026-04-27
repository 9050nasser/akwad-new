import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

export type DeviceCursor = { t: number; sn: number };

type StateFile = Record<string, DeviceCursor>;

const STATE_NAME = "fingerprint-bridge-state.json";

function statePath() {
  return join(process.cwd(), STATE_NAME);
}

export function readCursors(): StateFile {
  const p = statePath();
  if (!existsSync(p)) return {};
  try {
    const raw = JSON.parse(readFileSync(p, "utf8")) as StateFile;
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

export function writeCursor(deviceId: string, cursor: DeviceCursor) {
  const all = readCursors();
  all[deviceId] = cursor;
  writeFileSync(statePath(), JSON.stringify(all, null, 2), "utf8");
}
