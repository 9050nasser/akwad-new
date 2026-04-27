import type { UiTheme } from "@/lib/ui/prefs";

/** ألوان/أسطح صفحات المنصة حسب ثيم «العميل الفاتح» أو «الإدارة الداكن». */
export function platformSurface(theme: UiTheme) {
  const L = theme === "tenant";
  return {
    pageTitle: L ? "text-2xl font-semibold text-slate-900" : "text-2xl font-semibold text-white",
    subtitle: L ? "mt-1 text-sm text-slate-600" : "mt-1 text-sm text-slate-400",
    card: L ? "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" : "rounded-2xl border border-slate-800 bg-slate-900/60 p-5",
    cardAmber: L
      ? "rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm"
      : "rounded-2xl border border-amber-900/50 bg-amber-950/30 p-5",
    cardRose: L
      ? "rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
      : "rounded-2xl border border-rose-900/40 bg-rose-950/20 px-4 py-3 text-sm text-rose-100/90",
    tableWrap: L ? "overflow-hidden rounded-2xl border border-slate-200 shadow-sm" : "overflow-hidden rounded-2xl border border-slate-800",
    tableHead: L ? "bg-slate-100 text-xs uppercase tracking-wide text-slate-600" : "bg-slate-900 text-xs uppercase tracking-wide text-slate-500",
    tableBody: L ? "divide-y divide-slate-200 bg-white" : "divide-y divide-slate-800 bg-slate-900/40",
    rowText: L ? "text-slate-800" : "text-slate-200",
    cellStrong: L ? "px-4 py-3 font-medium text-slate-900" : "px-4 py-3 font-medium text-white",
    cellMuted: L ? "px-4 py-3 text-slate-600" : "px-4 py-3 text-slate-400",
    cellMono: L ? "px-4 py-3 font-mono text-xs text-slate-500" : "px-4 py-3 font-mono text-xs text-slate-400",
    link: L ? "text-teal-700 hover:text-teal-600" : "text-amber-500 hover:text-amber-400",
    formCard: L ? "grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" : "grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6",
    emptyBox: L ? "rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-slate-600" : "rounded-2xl border border-slate-800 bg-slate-900/40 px-6 py-10 text-center text-slate-400",
    footerNote: L ? "text-center text-xs text-slate-500" : "text-center text-xs text-slate-600",
    labelOnForm: L ? "text-sm text-slate-700" : "text-sm text-slate-300",
    hr: L ? "border-slate-200" : "border-slate-800",
    noticeMuted: L ? "text-xs font-medium text-slate-500" : "text-xs font-medium text-slate-500",
    amberList: L ? "mt-3 space-y-2 text-sm text-amber-900" : "mt-3 space-y-2 text-sm text-amber-50/90",
    amberStat: L ? "mt-2 text-2xl font-bold text-amber-900" : "mt-2 text-2xl font-bold text-amber-100",
    amberLabel: L ? "text-xs font-medium text-amber-800/90" : "text-xs font-medium text-amber-200/80",
    statLabel: L ? "text-xs font-medium text-slate-500" : "text-xs font-medium text-slate-500",
    statValue: L ? "mt-2 text-3xl font-bold text-slate-900" : "mt-2 text-3xl font-bold text-white",
    addButton: L
      ? "rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
      : "rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400",
    linkHoldCard: L
      ? "rounded-2xl border border-rose-200 bg-rose-50 p-5 transition hover:bg-rose-100/80"
      : "rounded-2xl border border-rose-900/50 bg-rose-950/30 p-5 transition hover:bg-rose-950/45",
    holdCardTitle: L ? "text-xs font-medium text-rose-800/90" : "text-xs font-medium text-rose-200/80",
    holdCardValue: L ? "mt-2 text-3xl font-bold text-rose-900" : "mt-2 text-3xl font-bold text-rose-100",
    holdCardHint: L ? "mt-2 text-xs text-rose-800/80" : "mt-2 text-xs text-rose-200/70",
    sectionHeading: L ? "mb-3 text-sm font-semibold text-slate-700" : "mb-3 text-sm font-semibold text-slate-300",
    emptyHint: L ? "mt-2 text-sm text-slate-500" : "mt-2 text-sm text-slate-500",
    dash: L ? "text-slate-400" : "text-slate-600",
    holdNeutral: L ? "text-slate-400" : "text-slate-600",
    holdBadge: L
      ? "rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800 ring-1 ring-rose-200"
      : "rounded-full bg-rose-950/80 px-2 py-0.5 text-xs font-semibold text-rose-200 ring-1 ring-rose-800/80",
  };
}
