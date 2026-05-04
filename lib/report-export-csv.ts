/** DOM helpers for report export — import only from client components. */

function cellPlainText(cell: HTMLElement): string {
  const input = cell.querySelector("input, select, textarea") as
    | HTMLInputElement
    | HTMLSelectElement
    | HTMLTextAreaElement
    | null;
  if (input) {
    if (input instanceof HTMLInputElement && input.type === "checkbox") {
      return input.checked ? "نعم" : "لا";
    }
    return String("value" in input ? input.value : "").trim();
  }
  return (cell.textContent ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

export function escapeCsvCell(raw: string): string {
  const s = raw.replace(/\r?\n/g, " ");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function tableToCsv(table: HTMLTableElement): string {
  const lines: string[] = [];
  for (const tr of Array.from(table.querySelectorAll("tr"))) {
    if ((tr as HTMLElement).dataset?.csvSkip === "1") continue;
    const cells = Array.from(tr.querySelectorAll(":scope > th, :scope > td")).map((cell) =>
      escapeCsvCell(cellPlainText(cell as HTMLElement)),
    );
    if (cells.length) lines.push(cells.join(","));
  }
  return lines.join("\r\n");
}

function isNestedTable(table: HTMLTableElement): boolean {
  const p = table.parentElement;
  return Boolean(p?.closest("table"));
}

export function rootTablesToCsv(root: HTMLElement): string {
  const tables = Array.from(root.querySelectorAll("table")).filter((t) => !isNestedTable(t));
  if (tables.length === 0) return "";
  const parts: string[] = [];
  tables.forEach((table, i) => {
    if (i > 0) parts.push("");
    parts.push(tableToCsv(table));
  });
  return parts.join("\r\n");
}

export function downloadTextFile(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function sanitizeReportFilename(slug: string): string {
  return slug.replace(/[^a-zA-Z0-9\u0600-\u06FF-_]+/g, "_").slice(0, 80) || "report";
}
