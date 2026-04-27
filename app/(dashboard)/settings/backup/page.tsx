import { restoreDatabaseBackup } from "@/app/actions/database-backup";
import { FlashBanner } from "@/components/flash-banner";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { PageFrame } from "@/components/page-frame";
import { formatFlash } from "@/lib/flash";
import { getUserPermissionRows } from "@/lib/rbac/data";
import { userMay } from "@/lib/rbac/evaluate";
import { requireCompanyAndPermission } from "@/lib/rbac/guards";
import { requireTenantSession } from "@/lib/tenant";

export default async function BackupSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { userId } = await requireCompanyAndPermission("settings.company", "view");
  const rows = await getUserPermissionRows(userId);
  const canRestore = userMay(rows, "settings.company", "update");

  const sp = (await searchParams) ?? {};
  const flash = formatFlash(sp);

  return (
    <PageFrame
      title="النسخ الاحتياطي واستعادة القاعدة"
      subtitle="ملف SQLite واحد يحتوي كل بيانات التطبيق (كل الشركات على هذا الخادم). خذ نسخة دورية واحفظها خارج السيرفر."
    >
      <FlashBanner notice={flash.notice} error={flash.error} />

      <div className="space-y-8 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-slate-900">تنزيل نسخة كاملة</h2>
          <p className="text-sm text-slate-600">
            يُنزَّل نسخة مطابقة لملف قاعدة البيانات الحالي. يمكنك استخدامها للاستعادة لاحقاً أو أرشفتها. لا يشمل
            الملفات المرفوعة (مثل الشعارات) إلا إذا كانت داخل مجلد قاعدة البيانات نفسه — الشعارات في{" "}
            <code className="rounded bg-slate-100 px-1 text-xs">public/uploads</code> تُنسخ منفصلة إن لزم.
          </p>
          <a
            href="/api/settings/database-backup"
            className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
            download
          >
            تنزيل نسخة احتياطية (.db)
          </a>
          <p className="text-xs text-slate-500">
            من الطرفية يمكن أيضاً: <code className="rounded bg-slate-100 px-1">npm run db:backup</code>
          </p>
        </section>

        {canRestore ? (
          <section className="space-y-3 border-t border-slate-100 pt-6">
            <h2 className="text-sm font-bold text-rose-900">استعادة من ملف (.db)</h2>
            <p className="text-sm text-rose-800/90">
              <strong>تحذير:</strong> يستبدل ملف قاعدة البيانات بالكامل بما في ذلك <strong>كل الشركات</strong> على
              هذا السيرفر. يُنشأ تلقائياً ملف احتياطي قبل الاستعادة باسم ينتهي بـ{" "}
              <code className="rounded bg-rose-50 px-1 text-xs">.pre-restore-…</code> بجانب قاعدة البيانات.
            </p>
            <form action={restoreDatabaseBackup} className="grid max-w-lg gap-4">
              <div>
                <Label htmlFor="database">ملف SQLite (.db)</Label>
                <input id="database" name="database" type="file" accept=".db,application/x-sqlite3,*/*" className={fieldClass} required />
              </div>
              <div>
                <Label htmlFor="confirm">اكتب للتأكيد: استعادة</Label>
                <input
                  id="confirm"
                  name="confirm"
                  type="text"
                  autoComplete="off"
                  className={fieldClass}
                  placeholder="استعادة"
                  required
                />
              </div>
              <PrimaryButton className="w-fit bg-rose-700 hover:bg-rose-800">استعادة القاعدة</PrimaryButton>
            </form>
          </section>
        ) : (
          <p className="text-sm text-slate-600">استعادة القاعدة متاحة لمن لديه صلاحية تعديل بيانات الشركة.</p>
        )}
      </div>
    </PageFrame>
  );
}
