import { AppShell } from "@/components/app-shell";
import { getUserPermissionRows } from "@/lib/rbac/data";
import { filterNavSectionsByView } from "@/lib/rbac/nav-filter";
import { requireTenantPathPermission } from "@/lib/rbac/guards";
import { uiMessages } from "@/lib/i18n/messages";
import { buildMainNav } from "@/lib/nav";
import { prisma } from "@/lib/prisma";
import { getUiLocale, getUiThemeForTenant } from "@/lib/ui/prefs";
import { requireTenantSession } from "@/lib/tenant";
import { headers } from "next/headers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireTenantSession();
  const cid = session.companyId;
  const pathname = (await headers()).get("x-pathname") ?? "/dashboard";
  await requireTenantPathPermission(session.id, pathname);
  const permRows = await getUserPermissionRows(session.id);
  const company = await prisma.company.findUnique({ where: { id: cid } });
  const [locale, theme, employeeCount, deviceCount] = await Promise.all([
    getUiLocale(company?.defaultLocale === "en" ? "en" : "ar"),
    getUiThemeForTenant(),
    prisma.employee.count({ where: { branch: { companyId: cid } } }),
    prisma.fingerprintDevice.count({ where: { branch: { companyId: cid } } }),
  ]);
  const messages = uiMessages(locale);
  const navSections = filterNavSectionsByView(buildMainNav(locale), permRows);
  const shellTitle =
    company?.shellShortName?.trim() || company?.name || [messages.brand.name, messages.brand.proMark].filter(Boolean).join(" ");

  return (
    <AppShell
      companyName={shellTitle}
      licenseExpiresAt={company?.licenseExpiresAt ?? null}
      licensedMaxEmployees={company?.maxEmployees ?? 0}
      licensedMaxDevices={company?.maxDevices ?? 0}
      employeeCount={employeeCount}
      deviceCount={deviceCount}
      enablePayroll={company?.enablePayroll ?? false}
      currentUser={session}
      locale={locale}
      theme={theme}
      navSections={navSections}
      messages={messages}
    >
      {children}
    </AppShell>
  );
}
