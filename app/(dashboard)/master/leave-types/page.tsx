import { ConfirmServerActionForm } from "@/components/confirm-server-action-form";
import { FlashBanner } from "@/components/flash-banner";
import { DangerButton, Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { PageFrame } from "@/components/page-frame";
import { createLeaveType, deleteLeaveType } from "@/app/actions/catalog";
import { formatFlash } from "@/lib/flash";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant";

export default async function LeaveTypesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireTenantSession();
  const companyId = session.companyId;
  const sp = (await searchParams) ?? {};
  const flash = formatFlash(sp);
  const rows = await prisma.leaveType.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
    include: { _count: { select: { leaves: true } } },
  });

  return (
    <PageFrame title="أنواع الإجازات" subtitle="إعداد أنواع الإجازات (مدفوعة / غير مدفوعة).">
      <FlashBanner notice={flash.notice} error={flash.error} />
      <form action={createLeaveType} className="grid gap-4 md:grid-cols-3">
        <div>
          <Label htmlFor="name">اسم الإجازة</Label>
          <input id="name" name="name" className={fieldClass} required />
        </div>
        <div>
          <Label htmlFor="paid">النوع</Label>
          <select id="paid" name="paid" className={fieldClass} defaultValue="yes">
            <option value="yes">مدفوعة</option>
            <option value="no">غير مدفوعة</option>
          </select>
        </div>
        <div className="flex items-end">
          <PrimaryButton>إضافة</PrimaryButton>
        </div>
      </form>
      <div className="mt-8 table-container rounded-xl border border-slate-200">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-16 px-4 py-3 hidden sm:table-cell">المسلسل</th>
              <th className="px-4 py-3">الاسم</th>
              <th className="px-4 py-3">مدفوعة</th>
              <th className="px-4 py-3 hidden sm:table-cell">السجلات</th>
              <th className="px-4 py-3 w-32">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((r, i) => (
              <tr key={r.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 text-slate-500 tabular-nums hidden sm:table-cell">{i + 1}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td>
                <td className="px-4 py-3 text-slate-600">{r.paid ? "نعم" : "لا"}</td>
                <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{r._count.leaves}</td>
                <td className="px-4 py-3">
                  <ConfirmServerActionForm
                    action={deleteLeaveType}
                    confirmMessage="حذف نوع الإجازة؟"
                    className="inline"
                  >
                    <input type="hidden" name="id" value={r.id} />
                    <DangerButton disabled={r._count.leaves > 0}>حذف</DangerButton>
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
