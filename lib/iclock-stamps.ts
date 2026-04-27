import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const FILE = "fingerprint-iclock-stamps.json";

type Store = Record<string, { attlogStamp: string }>;

function path() {
  return join(process.cwd(), FILE);
}

export function readIclockStamps(): Store {
  const p = path();
  if (!existsSync(p)) return {};
  try {
    const j = JSON.parse(readFileSync(p, "utf8")) as Store;
    return j && typeof j === "object" ? j : {};
  } catch {
    return {};
  }
}

export function getAttlogStamp(sn: string): string {
  const v = readIclockStamps()[sn]?.attlogStamp;
  return v ?? "None";
}

export function setAttlogStamp(sn: string, stamp: string) {
  const all = readIclockStamps();
  all[sn] = { attlogStamp: stamp };
  writeFileSync(path(), JSON.stringify(all, null, 2), "utf8");
}
