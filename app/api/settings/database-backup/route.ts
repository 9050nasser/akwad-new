import { NextResponse } from "next/server";
import fs from "node:fs";
import { getSession } from "@/lib/auth/session";
import { getUserPermissionRows } from "@/lib/rbac/data";
import { userMay } from "@/lib/rbac/evaluate";
import { assertReadableSqliteDb, resolveSqliteDatabaseAbsolutePath } from "@/lib/sqlite-db-path";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session?.companyId || session.isPlatformAdmin) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const rows = await getUserPermissionRows(session.id);
  const ok =
    userMay(rows, "settings.company", "view") || userMay(rows, "settings.company", "update");
  if (!ok) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const dbPath = resolveSqliteDatabaseAbsolutePath();
    assertReadableSqliteDb(dbPath);
    const buf = fs.readFileSync(dbPath);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/x-sqlite3",
        "Content-Disposition": `attachment; filename="akwad-backup-${stamp}.db"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
