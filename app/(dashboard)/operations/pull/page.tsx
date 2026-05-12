import Link from "next/link";
import { PageFrame } from "@/components/page-frame";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant";
import PullOldLogsForm from "@/components/pull-old-logs-form";

export default async function PullMovementsPage() {
  const session = await requireTenantSession();
  const companyId = session.companyId;
  
  // بنجيب الأجهزة الخاصة بالشركة دي
  const devices = await prisma.fingerprintDevice.findMany({
    where: { branch: { companyId } },
    orderBy: { name: "asc" },
    include: { branch: true },
  });

  // بنجهز قائمة الأجهزة اللي ليها Serial Number بس عشان نبعتها لـ Form السحب اليدوي
  const validDevicesForPull = devices
    .filter((d) => d.serialNumber !== null)
    .map((d) => ({
      name: d.name,
      serialNumber: d.serialNumber as string,
    }));

  return (
    <PageFrame
      title="سحب حركات الفروع"
      subtitle="عرض أجهزة البصمة وحالة المزامنة. يدعم النظام سحبًا من الوسيط أو إرسالًا من الجهاز (ZK Push) لعدة أجهزة."
    >
      <div className="space-y-4 text-sm leading-relaxed text-slate-700">
        <p className="text-slate-600">
          <strong>إرسال من الجهاز (Push):</strong> إن كان الموديل يدعم الاتصال بالسيرفر (ADMS / Web)، عيّن عنوان السيرفر مثل{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">http://IP_السيرفر:3001/iclock/</code>{" "}
          (البورت حسب تشغيلك لـ Next). سجّل في «أجهزة البصمة» السيريال <strong>نفس SN الجهاز</strong> لكل جهاز — كل جهاز يُعرّف مرة واحدة ويُرسل تلقائيًا.
          اختياري: أمان عبر <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">ZK_ICLOCK_COMM_KEY</code> يطابق <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">pushcommkey</code> في إعدادات الجهاز.
        </p>
        <p className="text-slate-600">
          <strong>سحب من السيرفر (Pull):</strong> على السيرفر الذي يشغّل التطبيق، شغّل من مجلد المشروع:{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">npm run bridge</code>
          . الوسيط يعمل على منفذ منفصل (افتراضيًا 3090) ويقرأ IP/المنفذ من «أجهزة البصمة» ثم يستدعي واجهة الاستقبال. راجع متغيرات البيئة:{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">FINGERPRINT_BRIDGE_PORT</code>،{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">FINGERPRINT_INGEST_URL</code>،{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">ZK_INGEST_SECRET</code>.
          سحب جهاز واحد من الوسيط:{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">POST /poll?deviceId=…</code>{" "}
          (معرّف الجهاز من الجدول أدناه). دخول/خروج يُستنتج من الجهاز (حقل verify state).
        </p>
        <p className="text-slate-600">
          بعد تشغيل الوسيط، تصل الحركات تلقائياً حسب الجدولة. يمكنك متابعة وقت آخر استلام أدناه.
        </p>
        <p className="text-xs text-slate-600">
          تشغيل الوسيط تلقائياً مع تسجيل دخول Windows:{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
            .\scripts\windows\install-fingerprint-bridge-task.ps1
          </code>
        </p>
        <p className="text-xs text-slate-600">
          لإضافة الأجهزة أو تعديلها:{" "}
          <Link href="/master/devices" className="font-medium text-teal-800 hover:underline">
            أجهزة البصمة (التجهيز)
          </Link>
          .
        </p>
      </div>

      {/* الفورم الخاصة بسحب الحركات القديمة ضفناها هنا */}
      <div className="mt-8">
        <PullOldLogsForm devices={validDevicesForPull} />
      </div>

      <div className="mt-8 table-container rounded-xl border border-slate-200">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">الاسم</th>
              <th className="px-4 py-3">معرّف الجهاز في النظام</th>
              <th className="px-4 py-3">IP</th>
              <th className="px-4 py-3">الفرع</th>
              <th className="px-4 py-3">آخر مزامنة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {devices.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 font-medium text-slate-900">{d.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-700">{d.id}</td>
                <td className="px-4 py-3 text-slate-600">
                  {d.ip}:{d.port}
                </td>
                <td className="px-4 py-3 text-slate-600">{d.branch.name}</td>
                <td className="px-4 py-3 text-slate-600">
                  {d.lastSyncAt ? formatDateTime(d.lastSyncAt) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageFrame>
  );
}