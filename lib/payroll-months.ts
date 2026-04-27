/** أشهر YYYY-MM التي تتقاطع مع الفترة [from, to] (تقريباً بالتقويم المحلي). */
export function yearMonthsInInclusiveRange(from: Date, to: Date): string[] {
  const yms: string[] = [];
  const d = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);
  while (d <= end) {
    yms.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    d.setMonth(d.getMonth() + 1);
  }
  return yms;
}

export function ymFromDateLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
