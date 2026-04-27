import { ConfirmServerActionForm } from "@/components/confirm-server-action-form";
import { FlashBanner } from "@/components/flash-banner";
import { DangerButton, Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { PageFrame } from "@/components/page-frame";
import { createJobTitle, deleteJobTitle } from "@/app/actions/catalog";
import { formatFlash } from "@/lib/flash";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant";

export default async function JobsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireTenantSession();
  const companyId = session.companyId;
  const sp = (await searchParams) ?? {};
  const flash = formatFlash(sp);
  const rows = await prisma.jobTitle.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
    include: { _count: { select: { employees: true } } },
  });

  return (
    <PageFrame title="الوظائف" subtitle="تعريف المسميات الوظيفية المستخدمة في بطاقة الموظف والتقارير.">
      <FlashBanner notice={flash.notice} error={flash.error} />
      <form action={createJobTitle} className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <Label htmlFor="name">اسم الوظيفة</Label>
          <input id="name" name="name" className={fieldClass} required />
        </div>
        <div className="flex items-end">
          <PrimaryButton>إضافة</PrimaryButton>
        </div>
      </form>
      <div className="mt-8 table-container rounded-xl border border-slate-200">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-16 px-4 py-3">المسلسل</th>
              <th className="px-4 py-3">الاسم</th>
              <th className="px-4 py-3">الموظفين</th>
              <th className="px-4 py-3 w-32">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((r, i) => (
              <tr key={r.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 text-slate-500 tabular-nums">{i + 1}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td>
                <td className="px-4 py-3 text-slate-600">{r._count.employees}</td>
                <td className="px-4 py-3">
                  <ConfirmServerActionForm
                    action={deleteJobTitle}
                    confirmMessage="حذف هذه الوظيفة؟"
                    className="inline"
                  >
                    <input type="hidden" name="id" value={r.id} />
                    <DangerButton disabled={r._count.employees > 0}>حذف</DangerButton>
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
