import Link from "next/link";
import { ConfirmServerActionForm } from "@/components/confirm-server-action-form";
import { FlashBanner } from "@/components/flash-banner";
import { DangerButton, Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { PageFrame } from "@/components/page-frame";
import {
  addEmployeeToGroup,
  createEmployeeGroup,
  deleteEmployeeGroup,
  removeEmployeeFromGroup,
} from "@/app/actions/groups";
import { firstQuery, formatFlash } from "@/lib/flash";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant";

export default async function GroupsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireTenantSession();
  const companyId = session.companyId;
  const sp = (await searchParams) ?? {};
  const flash = formatFlash(sp);
  const groupId = firstQuery(sp.group);

  const groups = await prisma.employeeGroup.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
    include: { _count: { select: { members: true } } },
  });

  const selected = groupId
    ? await prisma.employeeGroup.findFirst({
        where: { id: groupId, companyId },
        include: {
          members: {
            where: { employee: { branch: { companyId } } },
            include: { employee: { include: { branch: true } } },
            orderBy: { employee: { fullName: "asc" } },
          },
        },
      })
    : null;

  const employees = await prisma.employee.findMany({
    where: { active: true, branch: { companyId } },
    orderBy: { fullName: "asc" },
    include: { branch: true },
  });

  return (
    <PageFrame
      title="الأقسام"
      subtitle="تعريف الأقسام وربط الموظفين كأعضاء (قوائم). القسم الرئيسي لبطاقة الموظف (للتقارير) يُحدَّد من شاشة الموظفين — حقل «القسم»."
    >
      <FlashBanner notice={flash.notice} error={flash.error} />

      <p className="mb-4 text-sm">
        <Link href="/master/employees" className="font-medium text-teal-700 hover:text-teal-900">
          ← الموظفين
        </Link>
      </p>

      <form action={createEmployeeGroup} className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <Label htmlFor="name">اسم القسم</Label>
          <input id="name" name="name" className={fieldClass} required />
        </div>
        <div className="flex items-end">
          <PrimaryButton>إضافة قسم</PrimaryButton>
        </div>
      </form>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="table-container rounded-xl border border-slate-200">
          <table className="min-w-full text-right text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-16 px-4 py-3">المسلسل</th>
                <th className="px-4 py-3">القسم</th>
                <th className="px-4 py-3">العدد</th>
                <th className="px-4 py-3 w-40">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {groups.map((g, i) => (
                <tr key={g.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 text-slate-500 tabular-nums">{i + 1}</td>
                  <td className="px-4 py-3">
                    <Link className="font-medium text-teal-800 hover:underline" href={`/master/groups?group=${g.id}`}>
                      {g.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{g._count.members}</td>
                  <td className="px-4 py-3">
                    <ConfirmServerActionForm
                      action={deleteEmployeeGroup}
                      confirmMessage="حذف القسم بالكامل؟"
                      className="inline"
                    >
                      <input type="hidden" name="id" value={g.id} />
                      <DangerButton disabled={g._count.members > 0}>حذف</DangerButton>
                    </ConfirmServerActionForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
          {!selected ? (
            <p className="text-sm text-slate-600">اختر قسماً من الجدول لعرض الموظفين وإضافة أعضاء.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">موظفو القسم: {selected.name}</h2>
                <p className="text-xs text-slate-500">{selected.members.length} موظف</p>
              </div>

              <form action={addEmployeeToGroup} className="grid gap-3 md:grid-cols-2">
                <input type="hidden" name="groupId" value={selected.id} />
                <div className="md:col-span-2">
                  <Label htmlFor="employeeId">إضافة موظف</Label>
                  <select id="employeeId" name="employeeId" className={fieldClass} required defaultValue="">
                    <option value="" disabled>
                      اختر موظفاً
                    </option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.fullName} — {e.branch.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <PrimaryButton>إضافة للقسم</PrimaryButton>
                </div>
              </form>

              <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                {selected.members.map((m, idx) => (
                  <li key={m.employeeId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span className="font-medium text-slate-900">
                      <span className="me-2 inline-block min-w-[1.5rem] text-slate-500 tabular-nums">{idx + 1}.</span>
                      {m.employee.fullName}
                    </span>
                    <ConfirmServerActionForm
                      action={removeEmployeeFromGroup}
                      confirmMessage="إزالة الموظف من القسم؟"
                      className="inline"
                    >
                      <input type="hidden" name="groupId" value={selected.id} />
                      <input type="hidden" name="employeeId" value={m.employeeId} />
                      <DangerButton>إزالة</DangerButton>
                    </ConfirmServerActionForm>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </PageFrame>
  );
}
