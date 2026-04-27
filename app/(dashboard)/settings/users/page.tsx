import { ConfirmServerActionForm } from "@/components/confirm-server-action-form";
import { FlashBanner } from "@/components/flash-banner";
import { DangerButton, Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { PageFrame } from "@/components/page-frame";
import { createUser, deleteUser } from "@/app/actions/users";
import { formatFlash } from "@/lib/flash";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant";

export default async function UsersSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireTenantSession();
  const companyId = session.companyId;
  const sp = (await searchParams) ?? {};
  const flash = formatFlash(sp);

  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      where: { companyId },
      include: { role: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.role.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <PageFrame title="بيانات المستخدمين" subtitle="حسابات الدخول إلى المنصة مع الأدوار.">
      <FlashBanner notice={flash.notice} error={flash.error} />

      <form action={createUser} className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="name">الاسم</Label>
          <input id="name" name="name" className={fieldClass} required />
        </div>
        <div>
          <Label htmlFor="email">البريد</Label>
          <input id="email" name="email" type="email" className={fieldClass} required />
        </div>
        <div>
          <Label htmlFor="password">كلمة المرور</Label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={6}
            className={fieldClass}
            required
          />
          <p className="mt-1 text-xs text-slate-500">6 أحرف على الأقل</p>
        </div>
        <div>
          <Label htmlFor="roleId">الدور</Label>
          <select id="roleId" name="roleId" className={fieldClass} required defaultValue={roles[0]?.id}>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <PrimaryButton>إضافة مستخدم</PrimaryButton>
        </div>
      </form>

      <div className="mt-10 table-container rounded-xl border border-slate-200">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">الاسم</th>
              <th className="px-4 py-3 hidden sm:table-cell">البريد</th>
              <th className="px-4 py-3">الدور</th>
              <th className="px-4 py-3 hidden md:table-cell">الحالة</th>
              <th className="px-4 py-3 w-32">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 font-medium text-slate-900">{u.name}</td>
                <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{u.email}</td>
                <td className="px-4 py-3 text-slate-600">{u.role.name}</td>
                <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{u.active ? "نشط" : "موقوف"}</td>
                <td className="px-4 py-3">
                  <ConfirmServerActionForm action={deleteUser} confirmMessage="حذف المستخدم؟" className="inline">
                    <input type="hidden" name="id" value={u.id} />
                    <DangerButton>حذف</DangerButton>
                  </ConfirmServerActionForm>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageFrame>
  );
}
