import { createCompanyRole, saveRolePermissions } from "@/app/actions/roles";
import { FlashBanner } from "@/components/flash-banner";
import { IfCan } from "@/components/rbac-if-can";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { PageFrame } from "@/components/page-frame";
import { formatFlash } from "@/lib/flash";
import { prisma } from "@/lib/prisma";
import { PERMISSION_ACTIONS, SCREEN_RESOURCES } from "@/lib/rbac/resources";
import { requireTenantSession } from "@/lib/tenant";

function hasPerm(perms: { resource: string; action: string }[], resource: string, action: string) {
  return perms.some((p) => p.resource === resource && p.action === action);
}

export default async function PermissionsSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireTenantSession();
  const sp = (await searchParams) ?? {};
  const flash = formatFlash(sp);
  const roles = await prisma.role.findMany({
    where: { companyId: session.companyId },
    orderBy: { name: "asc" },
    include: { perms: true, _count: { select: { users: true } } },
  });

  return (
    <PageFrame
      title="الصلاحيات"
      subtitle="يمكنك إضافة أدوار جديدة (مثل مشرف حضور أو محاسب)، ثم ضبط صلاحيات كل دور من الجداول أدناه. دور «مدير النظام» الافتراضي يبقى كما هو."
    >
      <FlashBanner notice={flash.notice} error={flash.error} />

      <IfCan userId={session.id} resource="settings.permissions" action="create">
        <form action={createCompanyRole} className="mb-8 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-[220px] flex-1">
            <Label htmlFor="roleName">اسم الدور الجديد</Label>
            <input
              id="roleName"
              name="roleName"
              className={fieldClass}
              placeholder="مثال: مشرف حضور، محاسب رواتب"
              minLength={2}
              maxLength={80}
              required
            />
          </div>
          <PrimaryButton type="submit" className="shrink-0">
            إضافة دور
          </PrimaryButton>
        </form>
      </IfCan>

      {roles.length === 0 ? (
        <p className="text-sm text-slate-600">لا توجد أدوار لهذه الشركة.</p>
      ) : (
        <div className="space-y-10">
          {roles.map((role) => (
            <div key={role.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold text-slate-900">{role.name}</h2>
                <p className="text-xs text-slate-500">المستخدمون المرتبطون: {role._count.users}</p>
              </div>

              <form action={saveRolePermissions} className="space-y-4">
                <input type="hidden" name="roleId" value={role.id} />
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-[720px] w-full text-right text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2">الشاشة</th>
                        <th className="px-3 py-2">عرض</th>
                        <th className="px-3 py-2">إضافة</th>
                        <th className="px-3 py-2">تعديل</th>
                        <th className="px-3 py-2">حذف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {SCREEN_RESOURCES.map((scr) => {
                        const viewOn = hasPerm(role.perms, scr.id, "view");
                        const crud = scr.crud !== false;
                        return (
                          <tr key={`${role.id}-${scr.id}`}>
                            <td className="px-3 py-2 text-slate-800">{scr.labelAr}</td>
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                name={`p__${scr.id}__view`}
                                defaultChecked={viewOn}
                                className="h-4 w-4 rounded border-slate-300 text-teal-700"
                              />
                            </td>
                            {crud ? (
                              PERMISSION_ACTIONS.filter((a) => a !== "view").map((action) => (
                                <td key={action} className="px-3 py-2">
                                  <input
                                    type="checkbox"
                                    name={`p__${scr.id}__${action}`}
                                    defaultChecked={hasPerm(role.perms, scr.id, action)}
                                    className="h-4 w-4 rounded border-slate-300 text-teal-700"
                                  />
                                </td>
                              ))
                            ) : (
                              <td colSpan={3} className="px-3 py-2 text-xs text-slate-400">
                                تقرير أو شاشة عرض فقط
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <IfCan userId={session.id} resource="settings.permissions" action="update">
                  <PrimaryButton type="submit">حفظ صلاحيات «{role.name}»</PrimaryButton>
                </IfCan>
              </form>
            </div>
          ))}
        </div>
      )}
    </PageFrame>
  );
}
