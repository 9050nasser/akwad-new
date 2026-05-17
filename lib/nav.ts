import type { NavLabelKey } from "@/lib/i18n/messages";
import { uiMessages } from "@/lib/i18n/messages";
import type { NavIconKey } from "@/lib/nav-icon-registry";
import type { UiLocale } from "@/lib/ui/prefs";

export type NavItem = {
  href: string;
  label: string;
  iconKey: NavIconKey;
};

export type NavSection = {
  id: string;
  title: string;
  items: NavItem[];
};

type NavItemDef = { key: NavLabelKey; href: string; iconKey: NavIconKey };
type NavSectionDef = { id: string; sectionKey: NavLabelKey; items: NavItemDef[] };

const NAV_STRUCTURE: NavSectionDef[] = [
  {
    id: "dashboard",
    sectionKey: "section_dashboard",
    items: [{ key: "summaries", href: "/dashboard", iconKey: "gauge" }],
  },
  {
    id: "master",
    sectionKey: "section_master",
    items: [
      { key: "branches", href: "/master/branches", iconKey: "building2" },
      { key: "devices", href: "/master/devices", iconKey: "monitorSmartphone" },
      { key: "jobs", href: "/master/jobs", iconKey: "clipboardList" },
      { key: "projects", href: "/master/projects", iconKey: "folderKanban" },
      { key: "nationalities", href: "/master/nationalities", iconKey: "globe2" },
      { key: "duties", href: "/master/duties", iconKey: "listChecks" },
      { key: "schedules", href: "/master/schedules", iconKey: "clock3" },
      { key: "groups", href: "/master/groups", iconKey: "usersRound" },
      { key: "employees", href: "/master/employees", iconKey: "users" },
      { key: "leave_types", href: "/master/leave-types", iconKey: "plane" },
      { key: "holidays", href: "/master/holidays", iconKey: "flag" },
      { key: "unregistered", href: "/master/unregistered", iconKey: "userPlus" },
    ],
  },
  {
    id: "operations",
    sectionKey: "section_operations",
    items: [
      { key: "pull", href: "/operations/pull", iconKey: "logIn" },
      { key: "movements", href: "/operations/movements", iconKey: "listTree" },
      { key: "permission", href: "/operations/permission", iconKey: "activity" },
      { key: "leave", href: "/operations/leave", iconKey: "calendarDays" },
      { key: "post", href: "/operations/post", iconKey: "fileBarChart2" },
      { key: "unpost", href: "/operations/unpost", iconKey: "logOut" },
      { key: "edit_movements", href: "/operations/edit-movements", iconKey: "monitorSmartphone" },
    ],
  },
  {
    id: "reports",
    sectionKey: "section_reports",
    items: [
      { key: "reports_hub", href: "/reports", iconKey: "fileBarChart2" },
      { key: "daily_status", href: "/reports/daily-status", iconKey: "gauge" },
      { key: "employees_detail", href: "/reports/employees-detail", iconKey: "users" },
      { key: "employee", href: "/reports/employee", iconKey: "userCircle2" },
      { key: "employees_summary", href: "/reports/employees-summary", iconKey: "usersRound" },
      { key: "absence", href: "/reports/absence", iconKey: "userPlus" },
      { key: "delays", href: "/reports/delays", iconKey: "clock3" },
      { key: "incomplete", href: "/reports/incomplete", iconKey: "listTree" },
      { key: "early_in", href: "/reports/early-in", iconKey: "logIn" },
      { key: "attendance_summary", href: "/reports/attendance-summary", iconKey: "clipboardList" },
      { key: "attendance_all_branches", href: "/reports/attendance-all-branches", iconKey: "building2" },
      { key: "overtime", href: "/reports/overtime", iconKey: "activity" },
      { key: "leaves", href: "/reports/leaves", iconKey: "plane" },
      { key: "permissions", href: "/reports/permissions", iconKey: "calendarDays" },
      { key: "late_early_out", href: "/reports/late-early-out", iconKey: "logOut" },
      { key: "total_absence", href: "/reports/total-absence", iconKey: "flag" },
      { key: "total_delays", href: "/reports/total-delays", iconKey: "clock3" },
      { key: "employee_grouped", href: "/reports/employee-grouped", iconKey: "clock3" },
    ],
  },
  {
    id: "payroll",
    sectionKey: "section_payroll",
    items: [
      { key: "payroll", href: "/reports/payroll", iconKey: "wallet" },
      { key: "payroll_vacations", href: "/reports/payroll/vacations", iconKey: "calendarRange" },
      { key: "payroll_vacations_report", href: "/reports/payroll/vacations/report", iconKey: "users" },
      { key: "payroll_deductions", href: "/reports/payroll/deductions", iconKey: "minusCircle" },
      { key: "payroll_bonuses", href: "/reports/payroll/bonuses", iconKey: "plusCircle" },
    ],
  },
  {
    id: "settings",
    sectionKey: "section_settings",
    items: [
      { key: "perm_settings", href: "/settings/permissions", iconKey: "shield" },
      { key: "users", href: "/settings/users", iconKey: "users" },
      { key: "company", href: "/settings/company", iconKey: "building2" },
      { key: "backup", href: "/settings/backup", iconKey: "database" },
      { key: "general", href: "/settings/general", iconKey: "cog" },
    ],
  },
];

export function buildMainNav(locale: UiLocale): NavSection[] {
  const n = uiMessages(locale).nav;
  return NAV_STRUCTURE.map((s) => ({
    id: s.id,
    title: n[s.sectionKey],
    items: s.items.map((it) => ({
      href: it.href,
      iconKey: it.iconKey,
      label: n[it.key],
    })),
  }));
}

/** للتوافق مع كود قديم يفترض قائمة عربية ثابتة */
export const mainNav: NavSection[] = buildMainNav("ar");
