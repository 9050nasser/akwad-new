import { ReportExportToolbar } from "@/components/report-export-toolbar";

type PageFrameProps = {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  /** يفعّل شريط طباعة / Excel / PDF ويضمّن العنوان والمحتوى في منطقة التصدير */
  exportFileSlug?: string;
};

export function PageFrame({ title, subtitle, children, exportFileSlug }: PageFrameProps) {
  if (exportFileSlug) {
    return (
      <div className="space-y-6">
        <ReportExportToolbar fileSlug={exportFileSlug} reportTitle={title} />
        <div
          id="report-export-root"
          className="space-y-6 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-sm"
        >
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
            {subtitle ? (
              <p className="max-w-3xl text-sm leading-relaxed text-slate-600">{subtitle}</p>
            ) : null}
          </header>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle ? (
          <p className="max-w-3xl text-sm leading-relaxed text-slate-600">{subtitle}</p>
        ) : null}
      </header>
      {children ? <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-sm">{children}</div> : null}
    </div>
  );
}
