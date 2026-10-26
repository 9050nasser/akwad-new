/** تحليل ردود ZK ADMS (OPERLOG / USERINFO / BIODATA) لاستخراج المستخدم والبصمة والوجه. */

export type OperlogKind = "USER" | "FINGER" | "FACE" | "BIODATA";

export type OperlogItem = {
  pin: string;
  kind: OperlogKind;
  fid: number;
  command: string;
};

function parseZkFields(line: string): Record<string, string> {
  const out: Record<string, string> = {};
  const body = line.replace(/^[A-Za-z]+\s+/, "");
  for (const part of body.split(/\t+/)) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    out[part.slice(0, eq).trim()] = part.slice(eq + 1);
  }
  return out;
}

function restAfterToken(line: string, token: string): string {
  const re = new RegExp(`^${token}\\s+`, "i");
  return line.replace(re, "").trim();
}

export function parseOperlogBody(raw: string): OperlogItem[] {
  const items: OperlogItem[] = [];
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const fields = parseZkFields(line);
    const pin = String(fields.PIN ?? fields.Pin ?? "").trim();
    if (!pin) continue;

    if (/^USER(\s|\t)/i.test(line)) {
      items.push({
        pin,
        kind: "USER",
        fid: 0,
        command: `DATA UPDATE USERINFO ${restAfterToken(line, "USER")}`,
      });
      continue;
    }
    if (/^FP(\s|\t)/i.test(line)) {
      items.push({
        pin,
        kind: "FINGER",
        fid: Number(fields.FID ?? 0) || 0,
        command: `DATA UPDATE FINGERTMP ${restAfterToken(line, "FP")}`,
      });
      continue;
    }
    if (/^FACE(\s|\t)/i.test(line)) {
      items.push({
        pin,
        kind: "FACE",
        fid: Number(fields.FID ?? 0) || 0,
        command: `DATA UPDATE FACE ${restAfterToken(line, "FACE")}`,
      });
      continue;
    }
    if (/^BIODATA(\s|\t)/i.test(line)) {
      items.push({
        pin,
        kind: "BIODATA",
        fid: Number(fields.No ?? fields.Index ?? 0) || 0,
        command: `DATA UPDATE BIODATA ${restAfterToken(line, "BIODATA")}`,
      });
    }
  }
  return items;
}

export function zkUserName(fullName: string): string {
  const t = fullName.trim().replace(/\s+/g, " ");
  return t.slice(0, 24) || "User";
}

export function userInfoUpdateCommand(pin: string, fullName: string): string {
  return `DATA UPDATE USERINFO PIN=${pin}\tName=${zkUserName(fullName)}\tPri=0`;
}
