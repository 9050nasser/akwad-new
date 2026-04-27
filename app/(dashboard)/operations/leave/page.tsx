import { FlashBanner } from "@/components/flash-banner";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { PageFrame } from "@/components/page-frame";
import { createLeave } from "@/app/actions/leaves-perms";
import { formatFlash } from "@/lib/flash";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant";

export default async function OperationsLeavePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireTenantSession();
  const companyId = session.companyId;
  const sp = (await searchParams) ?? {};
  const flash = formatFlash(sp);

  const [employees, types] = await Promise.all([
    prisma.employee.findMany({
      where: { active: true, branch: { companyId } },
      orderBy: { fullName: "asc" },
      include: { branch: true },
    }),
    prisma.leaveType.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <PageFrame title="إضافة إجازة" subtitle="ربط الموظف بنوع إجازة وفترة زمنية.">
      <FlashBanner notice={flash.notice} error={flash.error} />

      {types.length === 0 ? (
        <p className="text-sm text-rose-700">عرّف أنواع الإجازات أولاً من البيانات الأساسية.</p>
      ) : (
        <form action={createLeave} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="employeeId">الموظف</Label>
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
          <div>
            <Label htmlFor="leaveTypeId">نوع الإجازة</Label>
            <select id="leaveTypeId" name="leaveTypeId" className={fieldClass} required>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.paid ? "(مدفوعة)" : "(غير مدفوعة)"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="note">ملاحظة</Label>
            <input id="note" name="note" className={fieldClass} />
          </div>
          <div>
            <Label htmlFor="startAt">بداية</Label>
            <input id="startAt" name="startAt" type="datetime-local" className={fieldClass} required />
          </div>
          <div>
            <Label htmlFor="endAt">نهاية</Label>
            <input id="endAt" name="endAt" type="datetime-local" className={fieldClass} required />
          </div>
          <div className="md:col-span-2">
            <PrimaryButton>حفظ الإجازة</PrimaryButton>
          </div>
        </form>
      )}
    </PageFrame>
  );
}
