import { FlashBanner } from "@/components/flash-banner";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { PageFrame } from "@/components/page-frame";
import { startBiometricTransfer } from "@/app/actions/biometric-transfer";
import { formatFlash } from "@/lib/flash";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant";

function statusLabel(status: string) {
  switch (status) {
    case "WAITING_DATA":
      return "بانتظار رد الجهاز المصدر";
    case "QUEUED_PUSH":
      return "تم إرسال القوالب للأجهزة";
    case "PARTIAL":
      return "وصلت بيانات جزئية — بانتظار باقي البصمات";
    case "DONE":
      return "اكتمل";
    case "ERROR":
      return "تعذّر";
    default:
      return status;
  }
}

export default async function TransferBiometricPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireTenantSession();
  const companyId = session.companyId;
  const sp = (await searchParams) ?? {};
  const flash = formatFlash(sp);

  const [employees, devices, transfers] = await Promise.all([
    prisma.employee.findMany({
      where: { active: true, deviceUserId: { not: null }, branch: { companyId } },
      orderBy: { fullName: "asc" },
      include: { branch: { select: { name: true } } },
    }),
    prisma.fingerprintDevice.findMany({
      where: { enabled: true, serialNumber: { not: null }, branch: { companyId } },
      orderBy: { name: "asc" },
      include: { branch: { select: { name: true } } },
    }),
    prisma.biometricTransfer.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { templates: { select: { kind: true } } },
    }),
  ]);

  return (
    <PageFrame
      title="نقل بصمة بين أجهزة البصمة"
      subtitle="انسخ بصمة الإصبع أو الوجه لموظف من جهاز بصمة إلى جهاز بصمة آخر، أو إلى كل أجهزة البصمة المضافة في البرنامج. الجهاز المصدر والهدف لازم يكونوا مفعّلين ومسجّل لهم سيريال ويعملوا بنظام الإرسال للسيرفر (Push / ADMS)."
    >
      <FlashBanner notice={flash.notice} error={flash.error} />

      {devices.length < 2 ? (
        <p className="text-sm text-rose-700">
          يلزم جهازا بصمة على الأقل مفعّلان ولهما سيريال. أضفهما من شاشة أجهزة البصمة.
        </p>
      ) : employees.length === 0 ? (
        <p className="text-sm text-rose-700">
          لا يوجد موظف نشط برقم مستخدم ZK. اضبط «رقم المستخدم على ZK» من شاشة الموظفين أولاً.
        </p>
      ) : (
        <form action={startBiometricTransfer} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="employeeId">الموظف</Label>
            <select id="employeeId" name="employeeId" className={fieldClass} required defaultValue="">
              <option value="" disabled>
                اختر موظفاً
              </option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName} — ZK {e.deviceUserId} — {e.branch.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="sourceDeviceId">جهاز البصمة المصدر (فيه البصمة الآن)</Label>
            <select id="sourceDeviceId" name="sourceDeviceId" className={fieldClass} required defaultValue="">
              <option value="" disabled>
                اختر جهاز البصمة
              </option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} — {d.branch.name} ({d.serialNumber})
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="targetMode">الوجهة</Label>
            <select id="targetMode" name="targetMode" className={fieldClass} defaultValue="all">
              <option value="all">كل أجهزة البصمة الأخرى</option>
              <option value="one">جهاز بصمة واحد</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="targetDeviceId">جهاز البصمة الهدف (عند اختيار جهاز واحد)</Label>
            <select id="targetDeviceId" name="targetDeviceId" className={fieldClass} defaultValue="">
              <option value="">—</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} — {d.branch.name} ({d.serialNumber})
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 flex flex-wrap gap-6 text-sm text-slate-800">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="includeFinger" defaultChecked />
              <span>بصمة الإصبع</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="includeFace" defaultChecked />
              <span>بصمة الوجه</span>
            </label>
          </div>
          <div className="md:col-span-2">
            <PrimaryButton>إرسال أمر النقل</PrimaryButton>
            <p className="mt-2 text-xs text-slate-500">
              الأمر يُرسل لجهاز البصمة المصدر عند اتصاله بالسيرفر، ثم تُنقل القوالب لأجهزة البصمة المختارة في الاتصال التالي.
              تأكد أن رقم المستخدم على ZK للموظف هو نفسه على جهاز البصمة المصدر.
            </p>
          </div>
        </form>
      )}

      <div className="mt-10 table-container rounded-xl border border-slate-200">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">الموظف</th>
              <th className="px-4 py-3 hidden sm:table-cell">PIN</th>
              <th className="px-4 py-3 hidden md:table-cell">المصدر</th>
              <th className="px-4 py-3">النوع</th>
              <th className="px-4 py-3">الحالة</th>
              <th className="px-4 py-3 hidden md:table-cell">القوالب</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {transfers.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-slate-500" colSpan={6}>
                  لا توجد عمليات نقل بعد.
                </td>
              </tr>
            ) : (
              transfers.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium text-slate-900">{t.employeeName}</td>
                  <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{t.pin}</td>
                  <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{t.sourceDeviceSn}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {[t.includeFinger ? "إصبع" : null, t.includeFace ? "وجه" : null].filter(Boolean).join(" + ")}
                    {t.targetMode === "ALL" ? " → الكل" : " → جهاز"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{statusLabel(t.status)}</td>
                  <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{t.templates.length}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </PageFrame>
  );
}
