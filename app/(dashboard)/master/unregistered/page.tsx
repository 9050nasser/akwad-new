import { FlashBanner } from "@/components/flash-banner";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { PageFrame } from "@/components/page-frame";
import { linkUnknownToEmployee, updateUnknownNote } from "@/app/actions/unknown-users";
import { formatDateTime } from "@/lib/format";
import { formatFlash } from "@/lib/flash";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant";

export default async function UnregisteredPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireTenantSession();
  const companyId = session.companyId;
  const sp = (await searchParams) ?? {};
  const flash = formatFlash(sp);

  const rows = await prisma.unknownDeviceUser.findMany({
    where: { device: { branch: { companyId } } },
    orderBy: { lastSeenAt: "desc" },
    include: { device: { include: { branch: true } } },
  });

  const employees = await prisma.employee.findMany({
    where: { active: true, branch: { companyId } },
    orderBy: { fullName: "asc" },
    include: { branch: true },
  });

  return (
    <PageFrame
      title="موظفين غير مسجلين"
      subtitle="تسجيلات ظهرت على الأجهزة دون مطابقة موظف في النظام. يمكن ربطها بموظف موجود لنقل رقم ZK."
    >
      <FlashBanner notice={flash.notice} error={flash.error} />

      <div className="table-container rounded-xl border border-slate-200">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-16 px-4 py-3 hidden sm:table-cell">المسلسل</th>
              <th className="px-4 py-3">الجهاز</th>
              <th className="px-4 py-3 hidden md:table-cell">الفرع</th>
              <th className="px-4 py-3">ZK ID</th>
              <th className="px-4 py-3 hidden sm:table-cell">آخر ظهور</th>
              <th className="px-4 py-3">ملاحظة</th>
              <th className="px-4 py-3 min-w-[260px]">ربط بموظف</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-600" colSpan={7}>
                  لا توجد سجلات غير مسجلة حالياً.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={r.id} className="align-top hover:bg-slate-50/80">
                  <td className="px-4 py-3 text-slate-500 tabular-nums hidden sm:table-cell">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{r.device.name}</td>
                  <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{r.device.branch.name}</td>
                  <td className="px-4 py-3 text-slate-600">{r.zkUserId}</td>
                  <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{formatDateTime(r.lastSeenAt)}</td>
                  <td className="px-4 py-3">
                    <form action={updateUnknownNote} className="flex flex-col gap-2">
                      <input type="hidden" name="id" value={r.id} />
                      <input name="note" className={fieldClass} defaultValue={r.note ?? ""} placeholder="ملاحظة" />
                      <PrimaryButton className="w-full">حفظ الملاحظة</PrimaryButton>
                    </form>
                  </td>
                  <td className="px-4 py-3">
                    <form action={linkUnknownToEmployee} className="flex flex-col gap-2">
                      <input type="hidden" name="unknownId" value={r.id} />
                      <Label htmlFor={`emp-${r.id}`}>اختر موظفاً من نفس الفرع</Label>
                      <select id={`emp-${r.id}`} name="employeeId" className={fieldClass} required defaultValue="">
                        <option value="" disabled>
                          اختر موظفاً
                        </option>
                        {employees
                          .filter((e) => e.branchId === r.device.branchId)
                          .map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.fullName}
                            </option>
                          ))}
                      </select>
                      <PrimaryButton className="w-full">ربط ونقل رقم ZK</PrimaryButton>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </PageFrame>
  );
}
