import Link from "next/link";
import { ConfirmServerActionForm } from "@/components/confirm-server-action-form";
import { FlashBanner } from "@/components/flash-banner";
import { DangerButton, Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { PageFrame } from "@/components/page-frame";
import { createDevice, deleteDevice, updateDevice } from "@/app/actions/devices";
import { firstQuery, formatFlash } from "@/lib/flash";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant";

const DEVICES_PATH = "/master/devices";

export default async function DevicesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireTenantSession();
  const companyId = session.companyId;
  const sp = (await searchParams) ?? {};
  const flash = formatFlash(sp);
  const editId = firstQuery(sp.edit);

  const [devices, branches] = await Promise.all([
    prisma.fingerprintDevice.findMany({
      where: { branch: { companyId } },
      include: { branch: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.branch.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
  ]);

  const editing = editId ? devices.find((d) => d.id === editId) ?? null : null;

  return (
    <PageFrame
      title="أجهزة البصمة"
      subtitle="إدارة أجهزة ZK المرتبطة بكل فرع مع عنوان IP والمنفذ وحالة المزامنة."
    >
      <FlashBanner notice={flash.notice} error={flash.error} />

      {branches.length === 0 ? (
        <p className="text-sm text-rose-700">أضف فرعاً أولاً.</p>
      ) : editing ? (
        <form action={updateDevice} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="id" value={editing.id} />
          <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">تعديل: {editing.name}</h2>
            <Link href={DEVICES_PATH} className="text-sm text-teal-800 hover:underline">
              إلغاء التعديل
            </Link>
          </div>
          <div>
            <Label htmlFor="name">اسم الجهاز</Label>
            <input id="name" name="name" className={fieldClass} required defaultValue={editing.name} />
          </div>
          <div>
            <Label htmlFor="model">الموديل</Label>
            <input id="model" name="model" className={fieldClass} defaultValue={editing.model} />
          </div>
          <div>
            <Label htmlFor="ip">عنوان IP</Label>
            <input id="ip" name="ip" className={fieldClass} required defaultValue={editing.ip} />
          </div>
          <div>
            <Label htmlFor="port">المنفذ</Label>
            <input id="port" name="port" type="number" className={fieldClass} defaultValue={editing.port} />
          </div>
          <div>
            <Label htmlFor="serialNumber">السيريال (SN)</Label>
            <input id="serialNumber" name="serialNumber" className={fieldClass} defaultValue={editing.serialNumber ?? ""} />
            <p className="mt-1 text-xs text-slate-500">
              لإرسال الجهاز للسيرفر (ZK Push) يجب أن يطابق هذا الحقل قيمة <strong>SN</strong> على الجهاز — لكل جهاز سيريال مختلف.
            </p>
          </div>
          <div>
            <Label htmlFor="branchId">الفرع</Label>
            <select id="branchId" name="branchId" className={fieldClass} required defaultValue={editing.branchId}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 flex items-center gap-2">
            <input type="hidden" name="enabled" value="off" />
            <input id="enabled" name="enabled" type="checkbox" defaultChecked={editing.enabled} value="on" className="h-4 w-4" />
            <Label htmlFor="enabled">مفعّل</Label>
          </div>
          <div className="md:col-span-2">
            <PrimaryButton>حفظ التعديلات</PrimaryButton>
          </div>
        </form>
      ) : (
        <form action={createDevice} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <h2 className="text-sm font-semibold text-slate-900">إضافة جهاز</h2>
          </div>
          <div>
            <Label htmlFor="name">اسم الجهاز</Label>
            <input id="name" name="name" className={fieldClass} required />
          </div>
          <div>
            <Label htmlFor="model">الموديل</Label>
            <input id="model" name="model" className={fieldClass} defaultValue="ZK" />
          </div>
          <div>
            <Label htmlFor="ip">عنوان IP</Label>
            <input id="ip" name="ip" className={fieldClass} required />
          </div>
          <div>
            <Label htmlFor="port">المنفذ</Label>
            <input id="port" name="port" type="number" className={fieldClass} defaultValue={4370} />
          </div>
          <div>
            <Label htmlFor="serialNumber">السيريال (SN)</Label>
            <input id="serialNumber" name="serialNumber" className={fieldClass} />
            <p className="mt-1 text-xs text-slate-500">
              لإرسال الجهاز للسيرفر (ZK Push) يجب أن يطابق هذا الحقل قيمة <strong>SN</strong> على الجهاز — يمكنك تسجيل أجهزة كثيرة، كل واحد بسيريال مختلف.
            </p>
          </div>
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
          <div className="md:col-span-2 flex items-center gap-2">
            <input type="hidden" name="enabled" value="off" />
            <input id="enabled" name="enabled" type="checkbox" defaultChecked className="h-4 w-4" value="on" />
            <Label htmlFor="enabled">مفعّل</Label>
          </div>
          <div className="md:col-span-2">
            <PrimaryButton>حفظ الجهاز</PrimaryButton>
          </div>
        </form>
      )}

      <div className="mt-10 table-container rounded-xl border border-slate-200">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">الاسم</th>
              <th className="px-4 py-3">الفرع</th>
              <th className="px-4 py-3">IP</th>
              <th className="px-4 py-3 hidden sm:table-cell">الموديل</th>
              <th className="px-4 py-3 hidden sm:table-cell">آخر مزامنة</th>
              <th className="px-4 py-3 w-44">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {devices.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 font-medium text-slate-900">{d.name}</td>
                <td className="px-4 py-3 text-slate-600">{d.branch.name}</td>
                <td className="px-4 py-3 text-slate-600">
                  {d.ip}:{d.port}
                </td>
                <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{d.model}</td>
                <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{d.lastSyncAt ? formatDateTime(d.lastSyncAt) : "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`${DEVICES_PATH}?edit=${d.id}`}
                      className="inline-flex items-center rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50"
                    >
                      تعديل
                    </Link>
                    <ConfirmServerActionForm action={deleteDevice} confirmMessage="حذف الجهاز؟" className="inline">
                      <input type="hidden" name="id" value={d.id} />
                      <DangerButton>حذف</DangerButton>
                    </ConfirmServerActionForm>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageFrame>
  );
}
