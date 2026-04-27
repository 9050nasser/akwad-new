import { FlashBanner } from "@/components/flash-banner";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { PageFrame } from "@/components/page-frame";
import { createPermission } from "@/app/actions/leaves-perms";
import { formatFlash } from "@/lib/flash";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant";

export default async function OperationsPermissionPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireTenantSession();
  const companyId = session.companyId;
  const sp = (await searchParams) ?? {};
  const flash = formatFlash(sp);

  const employees = await prisma.employee.findMany({
    where: { active: true, branch: { companyId } },
    orderBy: { fullName: "asc" },
    include: { branch: true },
  });

  return (
    <PageFrame title="إضافة إذن" subtitle="تسجيل أذونات خروج أو حضور جزئي لموظف في يوم محدد.">
      <FlashBanner notice={flash.notice} error={flash.error} />

      <form action={createPermission} className="grid gap-4 md:grid-cols-2">
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
          <Label htmlFor="date">اليوم</Label>
          <input id="date" name="date" type="date" className={fieldClass} required />
        </div>
        <div>
          <Label htmlFor="reason">السبب</Label>
          <input id="reason" name="reason" className={fieldClass} />
        </div>
        <div>
          <Label htmlFor="startTime">من الساعة</Label>
          <input id="startTime" name="startTime" type="time" className={fieldClass} required />
        </div>
        <div>
          <Label htmlFor="endTime">إلى الساعة</Label>
          <input id="endTime" name="endTime" type="time" className={fieldClass} required />
        </div>
        <div className="md:col-span-2">
          <PrimaryButton>حفظ الإذن</PrimaryButton>
        </div>
      </form>
    </PageFrame>
  );
}
