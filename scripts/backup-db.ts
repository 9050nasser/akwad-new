/**
 * نسخ احتياطي لملف SQLite (قاعدة العملاء) بجانب الملف الأصلي.
 * تشغيل: npm run db:backup
 * من الواجهة: إعدادات → النسخ الاحتياطي → تنزيل نسخة (.db)
 */
import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const dbPath = path.join(cwd, "prisma", "dev.db");

if (!fs.existsSync(dbPath)) {
  console.error("لم يُعثر على prisma/dev.db — راجع DATABASE_URL في .env");
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dest = path.join(cwd, "prisma", `dev.db.backup-${stamp}`);
fs.copyFileSync(dbPath, dest);
console.log("تم النسخ الاحتياطي إلى:", dest);
