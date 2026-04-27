import type { ZkPunchInput } from "@/lib/zk-apply-punches";

function parseDeviceDateTime(dtRaw: string): Date | null {
  const t = dtRaw.trim().replace("T", " ");
  const digits = t.replace(/\D/g, "");
  if (digits.length >= 14) {
    const y = digits.slice(0, 4);
    const mo = digits.slice(4, 6);
    const d = digits.slice(6, 8);
    const h = digits.slice(8, 10);
    const mi = digits.slice(10, 12);
    const s = digits.slice(12, 14);
    const dt = new Date(
      Number(y),
      Number(mo) - 1,
      Number(d),
      Number(h),
      Number(mi),
      Number(s),
    );
    if (!Number.isNaN(dt.getTime())) return dt;
  }
  const dt = new Date(t);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/**
 * تحليل سطور ATTLOG من بروتوكول ZK Push (حقول مفصولة بتاب).
 * الحقل 0: رقم المستخدم، 1: التاريخ والوقت، 2 (افتراضيًا): حالة الحضور (0 دخول / 1 خروج في كثير من الأجهزة).
 * يمكن ضبط العمود عبر ZK_ICLOCK_STATUS_COLUMN.
 */
export function parseZkAttlogBody(body: string): ZkPunchInput[] {
  const statusIdx = Number(process.env.ZK_ICLOCK_STATUS_COLUMN ?? "2");
  const col = Number.isFinite(statusIdx) && statusIdx >= 0 ? statusIdx : 2;

  const lines = body
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("OPLOG"));

  const out: ZkPunchInput[] = [];

  for (const line of lines) {
    const parts = line.split("\t").map((p) => p.trim());
    if (parts.length < 2) continue;

    const pinRaw = parts[0] ?? "";
    const zkUserId = Number.parseInt(pinRaw.replace(/\D/g, "") || pinRaw, 10);
    if (!Number.isFinite(zkUserId)) continue;

    const at = parseDeviceDateTime(parts[1] ?? "");
    if (!at) continue;

    const statusVal = parts[col];
    const state = statusVal !== undefined && statusVal !== "" ? Number.parseInt(statusVal, 10) : 0;
    const kind: "CHECK_IN" | "CHECK_OUT" =
      state === 1 || state === 2 || state === 5 ? "CHECK_OUT" : "CHECK_IN";

    out.push({
      zkUserId,
      at: at.toISOString(),
      kind,
    });
  }

  return out;
}
