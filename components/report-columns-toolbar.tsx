"use client";

import type { ReportColumnGroup } from "@/lib/report-column-config";
import { resetReportColumnGroupsAction, saveReportColumnGroupsAction } from "@/app/actions/report-columns";
import { GhostButton } from "@/components/ui-fields";
import { cn } from "@/lib/cn";

type ReportColumnsToolbarProps = {
  slug: string;
  groups: ReportColumnGroup[];
  /** ترتيب معرفات المجموعات الظاهرة حالياً */
  visibleIds: string[];
  redirectTo: string;
};

/**
 * قائمة تفعيل/إلغاء مجموعات أعمدة التقرير؛ تُحفظ في كوكي للمتصفح ثم تُعاد تحميل الصفحة.
 */
export function ReportColumnsToolbar({ slug, groups, visibleIds, redirectTo }: ReportColumnsToolbarProps) {
  if (groups.length === 0) return null;

  return (
    <details className={cn("group relative print:hidden")}>
      <summary className="cursor-pointer list-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
        أعمدة الجدول
      </summary>
      <div className="absolute end-0 z-30 mt-1 min-w-[240px] rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-lg">
        <p className="mb-2 text-xs text-slate-500">اختر الأعمدة ثم احفظ؛ يُطبَّق على الطباعة وملف PDF.</p>
        <form action={saveReportColumnGroupsAction} className="space-y-2">
          <input type="hidden" name="redirect" value={redirectTo} />
          <input type="hidden" name="slug" value={slug} />
          <div className="max-h-64 space-y-2 overflow-y-auto pe-1">
            {groups.map((g) => (
              <label key={g.id} className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-0.5 hover:bg-slate-50">
                <input
                  type="checkbox"
                  name="g"
                  value={g.id}
                  defaultChecked={visibleIds.includes(g.id)}
                  disabled={Boolean(g.required)}
                  className="mt-0.5"
                />
                <span className="leading-snug text-slate-800">{g.label}</span>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-2">
            <button
              type="submit"
              className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
            >
              حفظ
            </button>
          </div>
        </form>
        <form action={resetReportColumnGroupsAction} className="mt-2 border-t border-slate-100 pt-2">
          <input type="hidden" name="redirect" value={redirectTo} />
          <input type="hidden" name="slug" value={slug} />
          <GhostButton type="submit" className="!px-2 !py-1 text-xs">
            استعادة الافتراضي
          </GhostButton>
        </form>
      </div>
    </details>
  );
}
