import { ConfirmServerActionForm } from "@/components/confirm-server-action-form";
import { FlashBanner } from "@/components/flash-banner";
import { IfCan } from "@/components/rbac-if-can";
import { DangerButton, Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { PageFrame } from "@/components/page-frame";
import { createBranch, deleteBranch } from "@/app/actions/branches";
import { formatFlash } from "@/lib/flash";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant";

export default async function BranchesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireTenantSession();
  const companyId = session.companyId;
  const sp = (await searchParams) ?? {};
  const flash = formatFlash(sp);
  const branches = await prisma.branch.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
    include: { _count: { select: { employees: true, devices: true } } },
  });

  return (
    <PageFrame
      title="الفروع"
      subtitle="إدارة فروع الشركة وربط كل فرع بأجهزة البصمة والموظفين."
    >
      <FlashBanner notice={flash.notice} error={flash.error} />

      <IfCan userId={session.id} resource="master.branches" action="create">
        <form action={createBranch} className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <Label htmlFor="name">اسم الفرع</Label>
            <input id="name" name="name" className={fieldClass} required />
          </div>
          <div>
            <Label htmlFor="code">رمز (اختياري)</Label>
            <input id="code" name="code" className={fieldClass} />
          </div>
          <div className="md:col-span-3">
            <PrimaryButton>إضافة فرع</PrimaryButton>
          </div>
        </form>
      </IfCan>

      <div className="mt-8 table-container rounded-xl border border-slate-200">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-16 px-4 py-3 hidden sm:table-cell">المسلسل</th>
              <th className="px-4 py-3">الاسم</th>
              <th className="px-4 py-3 hidden sm:table-cell">الرمز</th>
              <th className="px-4 py-3 hidden sm:table-cell">الموظفين</th>
              <th className="px-4 py-3 hidden sm:table-cell">الأجهزة</th>
              <th className="px-4 py-3 w-40">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {branches.map((b, i) => (
              <tr key={b.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 text-slate-500 tabular-nums hidden sm:table-cell">{i + 1}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{b.name}</td>
                <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{b.code ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{b._count.employees}</td>
                <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{b._count.devices}</td>
                <td className="px-4 py-3">
                  <IfCan userId={session.id} resource="master.branches" action="delete">
                    <ConfirmServerActionForm
                      action={deleteBranch}
                      confirmMessage="حذف هذا الفرع؟"
                      className="inline"
                    >
                      <input type="hidden" name="id" value={b.id} />
                      <DangerButton
                        disabled={b._count.employees > 0 || b._count.devices > 0}
                        title={
                          b._count.employees > 0 || b._count.devices > 0
                            ? "لا يمكن الحذف طالما توجد بيانات مرتبطة"
                            : "حذف الفرع"
                        }
                      >
                        حذف
                      </DangerButton>
                    </ConfirmServerActionForm>
                  </IfCan>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageFrame>
  );
}
