import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant";

export default async function ReportsLayout({ children }: { children: React.ReactNode }) {
  const session = await requireTenantSession();
  const company = await prisma.company.findUnique({
    where: { id: session.companyId },
    select: { name: true, shellShortName: true, logoPath: true },
  });
  const displayName = company?.shellShortName?.trim() || company?.name || "";
  const showBand = Boolean(displayName || company?.logoPath);

  return (
    <div className="space-y-4">
      {showBand ? (
        <div className="flex flex-wrap items-center justify-center gap-4 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 print:justify-between print:border-slate-300">
          {company?.logoPath ? (
            <img
              src={company.logoPath}
              alt=""
              className="h-14 max-h-16 w-auto max-w-[220px] object-contain"
            />
          ) : null}
          {displayName ? (
            <span className="text-center text-lg font-bold text-slate-900 print:text-start">{displayName}</span>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
