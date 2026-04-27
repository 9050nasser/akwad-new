import { FlashBanner } from "@/components/flash-banner";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { PageFrame } from "@/components/page-frame";
import { postMovements } from "@/app/actions/attendance";
import { formatFlash } from "@/lib/flash";
import { monthRangeInputs } from "@/lib/default-range";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant";

export default async function PostMovementsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireTenantSession();
  const companyId = session.companyId;
  const sp = (await searchParams) ?? {};
  const flash = formatFlash(sp);
  const defaults = monthRangeInputs();
  const branches = await prisma.branch.findMany({ where: { companyId }, orderBy: { name: "asc" } });

  return (
    <PageFrame
      title="ترحيل الحركات"
      subtitle="تحويل الحركات المعتمدة إلى حالة مرحّلة لتظهر في التقارير الرسمية."
    >
      <FlashBanner notice={flash.notice} error={flash.error} />

      <form action={postMovements} className="grid gap-4 md:grid-cols-4">
        <div>
          <Label htmlFor="from">من تاريخ</Label>
          <input id="from" name="from" type="date" className={fieldClass} required defaultValue={defaults.from} />
        </div>
        <div>
          <Label htmlFor="to">إلى تاريخ</Label>
          <input id="to" name="to" type="date" className={fieldClass} required defaultValue={defaults.to} />
        </div>
        <div>
          <Label htmlFor="branchId">الفرع (اختياري)</Label>
          <select id="branchId" name="branchId" className={fieldClass} defaultValue="">
            <option value="">كل الفروع</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <PrimaryButton>ترحيل</PrimaryButton>
        </div>
      </form>
    </PageFrame>
  );
}
