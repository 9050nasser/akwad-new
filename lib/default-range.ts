import { localDayKey } from "@/lib/shift-metrics";

export function monthRangeInputs(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return {
    from: localDayKey(start),
    to: localDayKey(end),
  };
}
