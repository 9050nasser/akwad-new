"use server";

import fs from "node:fs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCompanyAndPermission } from "@/lib/rbac/guards";
import {
  assertReadableSqliteDb,
  assertSqliteMagicHeader,
  resolveSqliteDatabaseAbsolutePath,
} from "@/lib/sqlite-db-path";

const MAX_RESTORE_BYTES = 80 * 1024 * 1024;

export async function restoreDatabaseBackup(formData: FormData) {
  await requireCompanyAndPermission("settings.company", "update");

  const confirm = String(formData.get("confirm") ?? "").trim();
  if (confirm !== "استعادة") {
    redirect("/settings/backup?err=restore_confirm");
  }

  const file = formData.get("database");
  if (!file || typeof file === "string" || file.size === 0) {
    redirect("/settings/backup?err=restore_bad_file");
  }
  if (file.size > MAX_RESTORE_BYTES) {
    redirect("/settings/backup?err=restore_too_large");
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (!assertSqliteMagicHeader(buf)) {
    redirect("/settings/backup?err=restore_bad_file");
  }

  const dbPath = resolveSqliteDatabaseAbsolutePath();
  assertReadableSqliteDb(dbPath);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const preBackup = `${dbPath}.pre-restore-${stamp}`;
  const tmp = `${dbPath}.restore-tmp`;

  try {
    fs.copyFileSync(dbPath, preBackup);
  } catch {
    redirect("/settings/backup?err=restore_failed");
  }

  try {
    await prisma.$disconnect();
    fs.writeFileSync(tmp, buf);
    fs.renameSync(tmp, dbPath);
  } catch {
    try {
      fs.copyFileSync(preBackup, dbPath);
    } catch {
      /* ignore */
    }
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
    await prisma.$connect().catch(() => {});
    redirect("/settings/backup?err=restore_failed");
  }

  await prisma.$connect().catch(() => {});

  revalidatePath("/", "layout");
  redirect("/settings/backup?notice=restored");
}
