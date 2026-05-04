import { ReportExportToolbar } from "@/components/report-export-toolbar";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant";

export type PageFrameProps = {
  title: string;
  /** يُعرض تحت العنوان في وضع التصدير وبدونه. */
  subtitle?: string;
  children?: React.ReactNode;
  /** يفعّل شريط طباعة / Excel / PDF ويضمّن العنوان والمحتوى في منطقة التصدير */
  exportFileSlug?: string;
};

export async function PageFrame({
  title,
  subtitle,
  children,
  exportFileSlug,
}: PageFrameProps) {
  let printCompany: { nameAr: string; nameEn: string | null; logoPath: string | null } | undefined;
  if (exportFileSlug) {
    const session = await requireTenantSession();
    const c = await prisma.company.findUnique({
      where: { id: session.companyId },
      select: { name: true, nameEnglish: true, logoPath: true },
    });
    if (c) {
      printCompany = {
        nameAr: c.name,
        nameEn: c.nameEnglish?.trim() || null,
        logoPath: c.logoPath,
      };
    }
  }

  if (exportFileSlug) {
    return (
      <div
        id="report-export-root"
        className="space-y-6 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-sm print:rounded-none print:border-0 print:shadow-none"
      >
        {printCompany ? (
          <div className="hidden print:block">
            <div className="flex flex-row flex-wrap items-center justify-between gap-4 border-b-2 border-slate-900 pb-4">
              <div className="min-w-0 flex-1 text-end text-base font-bold leading-snug text-slate-900 sm:text-lg">
                {printCompany.nameAr}
              </div>
              <div className="flex shrink-0 justify-center px-2">
                {printCompany.logoPath ? (
                  <img
                    src={printCompany.logoPath}
                    alt=""
                    className="h-14 max-h-20 w-auto max-w-[200px] object-contain sm:h-16"
                  />
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </div>
              <div
                className="min-w-0 flex-1 text-start text-base font-semibold leading-snug text-slate-800 sm:text-lg"
                dir="ltr"
              >
                {printCompany.nameEn ?? "—"}
              </div>
            </div>
          </div>
        ) : null}
        <header className="space-y-1 border-b border-slate-100 pb-4 text-center print:border-slate-200 print:pb-3 print:pt-2 sm:text-start">
          <h1 className="min-w-0 break-words text-2xl font-semibold tracking-tight text-slate-900 text-pretty print:text-xl">
            {title}
          </h1>
          {subtitle ? <p className="mx-auto max-w-3xl text-sm leading-relaxed text-slate-600 sm:mx-0">{subtitle}</p> : null}
        </header>
        <div className="print:hidden" data-html2canvas-ignore="true">
          <ReportExportToolbar fileSlug={exportFileSlug} reportTitle={title} />
        </div>
        {children}
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
