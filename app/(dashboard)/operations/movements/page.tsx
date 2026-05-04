import { PageFrame } from "@/components/page-frame";
import { firstQuery } from "@/lib/flash";
import { formatReportDateOnly, formatReportTimeOnly } from "@/lib/format";
import { normalizeAttendancePolicy } from "@/lib/company-attendance";
import { getMovements, parseRangeFromSearch } from "@/lib/reports";
import { monthRangeInputs } from "@/lib/default-range";
import { parseDateOnly } from "@/lib/day-range";
import { prisma } from "@/lib/prisma";
import {
  firstCheckInLastCheckOutOfDay,
  localDayKey,
  preparePunchesForAttendanceReport,
} from "@/lib/shift-metrics";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { requireTenantSession } from "@/lib/tenant";

export default async function MovementsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireTenantSession();
  const companyId = session.companyId;
  const sp = (await searchParams) ?? {};
  const defaults = monthRangeInputs();
  const fromStr = firstQuery(sp.from) ?? defaults.from;
  const toStr = firstQuery(sp.to) ?? defaults.to;
  const branchId = firstQuery(sp.branchId) || undefined;
  const posted = (firstQuery(sp.posted) as "all" | "yes" | "no" | undefined) ?? "all";

  const { from, to } = parseRangeFromSearch(fromStr, toStr);
  const [rows, branches, companyRow] = await Promise.all([
    getMovements({ companyId, from, to, branchId, posted }),
    prisma.branch.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
    prisma.company.findUnique({
      where: { id: companyId },
      select: { punchDedupeMinutes: true },
    }),
  ]);
  const punchWin = normalizeAttendancePolicy(companyRow).punchDedupeMinutes;

  type Row = (typeof rows)[number];
  const groupMap = new Map<string, Row[]>();
  for (const r of rows) {
    const empKey = r.employeeId ?? `__none__:${r.id}`;
    const k = `${empKey}:${localDayKey(r.at)}`;
    const arr = groupMap.get(k) ?? [];
    arr.push(r);
    groupMap.set(k, arr);
  }

  const daySummaries = [...groupMap.values()].map((list) => {
    const sorted = [...list].sort((a, b) => a.at.getTime() - b.at.getTime());
    const sample = sorted[0];
    const raw = sorted.map((x) => ({ at: x.at, kind: x.kind as string }));
    const prep = preparePunchesForAttendanceReport(raw, punchWin);
    const fl = firstCheckInLastCheckOutOfDay(prep);
    const dateKey = localDayKey(sample.at);
    return {
      key: `${sample.employeeId ?? sample.id}:${dateKey}`,
      dateKey,
      employeeName: sample.employee?.fullName ?? "—",
      branchName: sample.branch.name,
      firstIn: fl.firstIn,
      lastOut: fl.lastOut,
      allPosted: sorted.every((x) => x.isPosted),
      sourceLabel: sorted.some((x) => x.source === "MANUAL") ? "يدوي/جهاز" : "جهاز",
      deviceName: sample.device?.name ?? "—",
    };
  });
  daySummaries.sort((a, b) => {
    const dc = b.dateKey.localeCompare(a.dateKey);
    if (dc !== 0) return dc;
    return a.employeeName.localeCompare(b.employeeName, "ar");
  });

  return (
    <PageFrame
      title="عرض الحركات"
      subtitle="ملخص يومي لكل موظف: أول دخول وآخر خروج بعد دمج التكرار؛ التاريخ والأوقات بأرقام لاتينية."
    >
      <form method="get" className="grid gap-4 md:grid-cols-5">
        <div>
          <Label htmlFor="from">من تاريخ</Label>
          <input id="from" name="from" type="date" className={fieldClass} defaultValue={fromStr} />
        </div>
        <div>
          <Label htmlFor="to">إلى تاريخ</Label>
          <input id="to" name="to" type="date" className={fieldClass} defaultValue={toStr} />
        </div>
        <div>
          <Label htmlFor="branchId">الفرع</Label>
          <select id="branchId" name="branchId" className={fieldClass} defaultValue={branchId ?? ""}>
            <option value="">كل الفروع</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="posted">حالة الترحيل</Label>
          <select id="posted" name="posted" className={fieldClass} defaultValue={posted}>
            <option value="all">الكل</option>
            <option value="yes">مرحّل</option>
            <option value="no">غير مرحّل</option>
          </select>
        </div>
        <div className="flex items-end">
          <PrimaryButton type="submit">تطبيق</PrimaryButton>
        </div>
      </form>

      <div className="mt-8 rounded-xl border border-slate-200 table-container">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3">التاريخ</th>
              <th className="px-3 py-3">الموظف</th>
              <th className="px-3 py-3">الفرع</th>
              <th className="px-3 py-3">أول دخول</th>
              <th className="px-3 py-3">آخر خروج</th>
              <th className="px-3 py-3 hidden md:table-cell">المصدر</th>
              <th className="px-3 py-3 hidden md:table-cell">الجهاز</th>
              <th className="px-3 py-3">مرحّل</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {daySummaries.map((r) => (
              <tr key={r.key} className="hover:bg-slate-50/80">
                <td className="px-3 py-2 text-slate-800 tabular-nums">{formatReportDateOnly(parseDateOnly(r.dateKey))}</td>
                <td className="px-3 py-2 text-slate-800">{r.employeeName}</td>
                <td className="px-3 py-2 text-slate-600">{r.branchName}</td>
                <td className="px-3 py-2 text-slate-800 tabular-nums">{r.firstIn ? formatReportTimeOnly(r.firstIn) : "—"}</td>
                <td className="px-3 py-2 text-slate-800 tabular-nums">{r.lastOut ? formatReportTimeOnly(r.lastOut) : "—"}</td>
                <td className="px-3 py-2 text-slate-600 hidden md:table-cell">{r.sourceLabel}</td>
                <td className="px-3 py-2 text-slate-600 hidden md:table-cell">{r.deviceName}</td>
                <td className="px-3 py-2 text-slate-600">{r.allPosted ? "نعم" : "لا"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageFrame>
  );
}
