import fs from "node:fs";
import path from "node:path";

/** يحل مسار ملف SQLite من DATABASE_URL (مثل file:./prisma/dev.db). */
export function resolveSqliteDatabaseAbsolutePath(): string {
  const raw = (process.env.DATABASE_URL ?? "file:./prisma/dev.db").trim();
  const withoutQuery = raw.split("?")[0] ?? raw;
  if (!withoutQuery.toLowerCase().startsWith("file:")) {
    throw new Error("DATABASE_URL يجب أن يشير إلى ملف SQLite (file:...).");
  }
  let p = withoutQuery.slice("file:".length).trim();
  if (p.startsWith("//")) {
    p = p.slice(2);
    if (/^[A-Za-z]:[/\\]/.test(p)) {
      return p.replace(/\//g, "\\");
    }
    return path.resolve(p);
  }
  const normalized = p.replace(/^\.\//, "");
  return path.join(process.cwd(), normalized);
}

export function assertSqliteMagicHeader(buf: Buffer): boolean {
  const head = buf.subarray(0, 16).toString("utf8");
  return head.startsWith("SQLite format 3");
}

export function assertReadableSqliteDb(dbPath: string): void {
  if (!fs.existsSync(dbPath)) {
    throw new Error("ملف قاعدة البيانات غير موجود.");
  }
}
