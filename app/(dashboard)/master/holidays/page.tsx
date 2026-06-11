import { ConfirmServerActionForm } from "@/components/confirm-server-action-form";
import { FlashBanner } from "@/components/flash-banner";
import { DangerButton, Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { PageFrame } from "@/components/page-frame";
import { createHoliday, deleteHoliday } from "@/app/actions/holidays";
import { formatDateOnly } from "@/lib/format";
import { holidayDayCount } from "@/lib/holidays";
import { formatFlash } from "@/lib/flash";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant";

export default async function HolidaysPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireTenantSession();
  const companyId = session.companyId;
  const sp = (await searchParams) ?? {};
  const flash = formatFlash(sp);
  const rows = await prisma.holiday.findMany({ where: { companyId }, orderBy: { date: "asc" } });

  return (
    <PageFrame title="العطلات الرسمية" subtitle="تقويم العطلات التي تؤثر على احتساب الغياب والتأخير.">
      <FlashBanner notice={flash.notice} error={flash.error} />
      <form action={createHoliday} className="grid gap-4 md:grid-cols-4">
        <div className="md:col-span-2">
          <Label htmlFor="name">اسم العطلة</Label>
          <input id="name" name="name" className={fieldClass} required />
        </div>
        <div>
          <Label htmlFor="date">من تاريخ</Label>
          <input id="date" name="date" type="date" className={fieldClass} required />
        </div>
        <div>
          <Label htmlFor="endDate">إلى تاريخ (اختياري)</Label>
          <input id="endDate" name="endDate" type="date" className={fieldClass} />
        </div>
        <div className="flex items-end gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="annual" className="h-4 w-4 rounded border-slate-300" />
            سنوية
          </label>
        </div>
        <div className="md:col-span-4">
          <PrimaryButton>إضافة</PrimaryButton>
        </div>
      </form>
      <div className="mt-8 table-container rounded-xl border border-slate-200">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-16 px-4 py-3 hidden sm:table-cell">المسلسل</th>
              <th className="px-4 py-3">الاسم</th>
              <th className="px-4 py-3 hidden sm:table-cell">من</th>
              <th className="px-4 py-3 hidden sm:table-cell">إلى</th>
              <th className="px-4 py-3 hidden sm:table-cell">عدد الأيام</th>
              <th className="px-4 py-3 hidden sm:table-cell">سنوية</th>
              <th className="px-4 py-3 w-32">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((r, i) => (
              <tr key={r.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 text-slate-500 tabular-nums hidden sm:table-cell">{i + 1}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td>
                <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{formatDateOnly(r.date)}</td>
                <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">
                  {formatDateOnly(r.endDate ?? r.date)}
                </td>
                <td className="px-4 py-3 text-slate-600 tabular-nums hidden sm:table-cell">{holidayDayCount(r)}</td>
                <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{r.annual ? "نعم" : "لا"}</td>
                <td className="px-4 py-3">
                  <ConfirmServerActionForm action={deleteHoliday} confirmMessage="حذف هذه العطلة؟" className="inline">
                    <input type="hidden" name="id" value={r.id} />
                    <DangerButton>حذف</DangerButton>
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
