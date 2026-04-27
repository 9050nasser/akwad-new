import { FlashBanner } from "@/components/flash-banner";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { PageFrame } from "@/components/page-frame";
import { createManualMovement } from "@/app/actions/attendance";
import { formatFlash } from "@/lib/flash";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant";

export default async function EditMovementsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireTenantSession();
  const companyId = session.companyId;
  const sp = (await searchParams) ?? {};
  const flash = formatFlash(sp);

  const branches = await prisma.branch.findMany({ where: { companyId }, orderBy: { name: "asc" } });
  const employees = await prisma.employee.findMany({
    where: { active: true, branch: { companyId } },
    orderBy: { fullName: "asc" },
    include: { branch: true },
  });

  return (
    <PageFrame
      title="إضافة / تعديل حركات"
      subtitle="تصحيح يدوي عند تعطل الجهاز أو نسيان البصمة. يُسجَّل المصدر كيدوي ولا يُرحَّل تلقائياً."
    >
      <FlashBanner notice={flash.notice} error={flash.error} />

      <form action={createManualMovement} className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="branchId">الفرع</Label>
          <select id="branchId" name="branchId" className={fieldClass} required defaultValue={branches[0]?.id}>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="employeeId">الموظف (نفس الفرع)</Label>
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
          <Label htmlFor="at">التاريخ والوقت</Label>
          <input id="at" name="at" type="datetime-local" className={fieldClass} required />
        </div>
        <div>
          <Label htmlFor="kind">النوع</Label>
          <select id="kind" name="kind" className={fieldClass} defaultValue="CHECK_IN">
            <option value="CHECK_IN">دخول</option>
            <option value="CHECK_OUT">خروج</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <PrimaryButton>حفظ الحركة</PrimaryButton>
        </div>
      </form>
    </PageFrame>
  );
}
