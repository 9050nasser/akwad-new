/** إجراءات CRUD الموحّدة في قاعدة البيانات والواجهة. */
export const PERMISSION_ACTIONS = ["view", "create", "update", "delete"] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export type ScreenResource = {
  id: string;
  labelAr: string;
  /** إن كان false تُخفى أعمدة إضافة/تعديل/حذف في شاشة الصلاحيات (تقارير عرض فقط). */
  crud?: boolean;
};

/** كل الشاشات القابلة للصلاحية (مفتاح مستقر يُخزَّن في RolePermission.resource). */
export const SCREEN_RESOURCES: ScreenResource[] = [
  { id: "dashboard", labelAr: "لوحة الملخصات", crud: false },
  { id: "master.branches", labelAr: "الفروع" },
  { id: "master.devices", labelAr: "أجهزة البصمة (التجهيز)" },
  { id: "master.jobs", labelAr: "المسميات الوظيفية" },
  { id: "master.projects", labelAr: "المشاريع" },
  { id: "master.nationalities", labelAr: "الجنسيات" },
  { id: "master.duties", labelAr: "المهام" },
  { id: "master.schedules", labelAr: "جداول الدوام" },
  { id: "master.groups", labelAr: "مجموعات الموظفين" },
  { id: "master.employees", labelAr: "الموظفون" },
  { id: "master.leave_types", labelAr: "أنواع الإجازات" },
  { id: "master.holidays", labelAr: "العطلات الرسمية" },
  { id: "master.unregistered", labelAr: "بصمات غير مسجّلة" },
  { id: "operations.pull", labelAr: "سحب حركات الفروع", crud: false },
  { id: "operations.movements", labelAr: "الحركات الخام", crud: false },
  { id: "operations.permission", labelAr: "إضافة إذن" },
  { id: "operations.leave", labelAr: "تسجيل إجازة" },
  { id: "operations.post", labelAr: "ترحيل الحركات" },
  { id: "operations.unpost", labelAr: "إلغاء الترحيل" },
  { id: "operations.edit_movements", labelAr: "تعديل الحركات" },
  { id: "reports", labelAr: "تقارير — الرئيسية", crud: false },
  { id: "reports.daily_status", labelAr: "تقرير الحالة اليومية", crud: false },
  { id: "reports.employees_detail", labelAr: "تقرير الموظفين (تفصيلي)", crud: false },
  { id: "reports.employee", labelAr: "تقرير موظف واحد", crud: false },
  { id: "reports.employees_summary", labelAr: "تقرير ملخص الموظفين", crud: false },
  { id: "reports.absence", labelAr: "تقرير الغياب", crud: false },
  { id: "reports.delays", labelAr: "تقرير التأخيرات", crud: false },
  { id: "reports.incomplete", labelAr: "تقرير الحركات الناقصة", crud: false },
  { id: "reports.early_in", labelAr: "تقرير الدخول المبكر", crud: false },
  { id: "reports.attendance_summary", labelAr: "تقرير ملخص الحضور", crud: false },
  { id: "reports.attendance_all_branches", labelAr: "تقرير الحضور لكل الفروع", crud: false },
  { id: "reports.overtime", labelAr: "تقرير العمل الإضافي", crud: false },
  { id: "reports.leaves", labelAr: "تقرير الإجازات", crud: false },
  { id: "reports.permissions", labelAr: "تقرير الأذونات", crud: false },
  { id: "reports.late_early_out", labelAr: "تقرير التأخير والخروج المبكر", crud: false },
  { id: "reports.total_absence", labelAr: "تقرير إجمالي الغياب", crud: false },
  { id: "reports.total_delays", labelAr: "تقرير إجمالي التأخيرات", crud: false },
  { id: "reports.payroll", labelAr: "الرواتب — الرئيسية", crud: false },
  { id: "reports.payroll.vacations", labelAr: "إجازات الرواتب", crud: false },
  { id: "reports.payroll.vacations_report", labelAr: "تقرير إجازات الرواتب", crud: false },
  { id: "reports.payroll.deductions", labelAr: "خصومات يدوية", crud: false },
  { id: "reports.payroll.bonuses", labelAr: "مكافآت يدوية", crud: false },
  { id: "reports.payroll.slip", labelAr: "قسيمة راتب", crud: false },
  { id: "settings.permissions", labelAr: "إعدادات — الصلاحيات" },
  { id: "settings.users", labelAr: "إعدادات — المستخدمون" },
  { id: "settings.company", labelAr: "إعدادات — بيانات الشركة" },
  { id: "settings.general", labelAr: "إعدادات — عام" },
];

const PATH_RULES: Array<{ prefix: string; resource: string; action?: PermissionAction }> = [
  { prefix: "/reports/payroll/vacations/report", resource: "reports.payroll.vacations_report" },
  { prefix: "/reports/payroll/vacations", resource: "reports.payroll.vacations" },
  { prefix: "/reports/payroll/deductions", resource: "reports.payroll.deductions" },
  { prefix: "/reports/payroll/bonuses", resource: "reports.payroll.bonuses" },
  { prefix: "/reports/payroll", resource: "reports.payroll" },
  { prefix: "/reports/daily-status", resource: "reports.daily_status" },
  { prefix: "/reports/employees-detail", resource: "reports.employees_detail" },
  { prefix: "/reports/employees-summary", resource: "reports.employees_summary" },
  { prefix: "/reports/attendance-all-branches", resource: "reports.attendance_all_branches" },
  { prefix: "/reports/attendance-summary", resource: "reports.attendance_summary" },
  { prefix: "/reports/late-early-out", resource: "reports.late_early_out" },
  { prefix: "/reports/total-absence", resource: "reports.total_absence" },
  { prefix: "/reports/total-delays", resource: "reports.total_delays" },
  { prefix: "/reports/early-in", resource: "reports.early_in" },
  { prefix: "/reports/incomplete", resource: "reports.incomplete" },
  { prefix: "/reports/permissions", resource: "reports.permissions" },
  { prefix: "/reports/employees-summary", resource: "reports.employees_summary" },
  { prefix: "/reports/employee", resource: "reports.employee" },
  { prefix: "/reports/absence", resource: "reports.absence" },
  { prefix: "/reports/delays", resource: "reports.delays" },
  { prefix: "/reports/leaves", resource: "reports.leaves" },
  { prefix: "/reports/overtime", resource: "reports.overtime" },
  { prefix: "/reports", resource: "reports" },
  { prefix: "/settings/permissions", resource: "settings.permissions" },
  { prefix: "/settings/users", resource: "settings.users" },
  { prefix: "/settings/backup", resource: "settings.company" },
  { prefix: "/settings/company", resource: "settings.company" },
  { prefix: "/settings/general", resource: "settings.general" },
  { prefix: "/settings/devices", resource: "master.devices" },
  { prefix: "/operations/edit-movements", resource: "operations.edit_movements" },
  { prefix: "/operations/permission", resource: "operations.permission" },
  { prefix: "/operations/movements", resource: "operations.movements" },
  { prefix: "/operations/unpost", resource: "operations.unpost" },
  { prefix: "/operations/post", resource: "operations.post" },
  { prefix: "/operations/leave", resource: "operations.leave" },
  { prefix: "/operations/pull", resource: "operations.pull" },
  { prefix: "/master/leave-types", resource: "master.leave_types" },
  { prefix: "/master/nationalities", resource: "master.nationalities" },
  { prefix: "/master/unregistered", resource: "master.unregistered" },
  { prefix: "/master/employees", resource: "master.employees" },
  { prefix: "/master/schedules", resource: "master.schedules" },
  { prefix: "/master/groups", resource: "master.groups" },
  { prefix: "/master/holidays", resource: "master.holidays" },
  { prefix: "/master/projects", resource: "master.projects" },
  { prefix: "/master/duties", resource: "master.duties" },
  { prefix: "/master/devices", resource: "master.devices" },
  { prefix: "/master/branches", resource: "master.branches" },
  { prefix: "/master/jobs", resource: "master.jobs" },
  { prefix: "/dashboard", resource: "dashboard" },
];

const sortedPathRules = [...PATH_RULES].sort((a, b) => b.prefix.length - a.prefix.length);

/** يحدد المورد والإجراء المطلوب لفتح المسار الحالي. */
export function resolvePathPermission(pathname: string): { resource: string; action: PermissionAction } {
  const path = (pathname.replace(/\/$/, "") || "/").toLowerCase();

  if (path === "/" || path === "") {
    return { resource: "dashboard", action: "view" };
  }

  const scheduleEdit = /^\/master\/schedules\/[^/]+\/edit$/i;
  if (scheduleEdit.test(path)) {
    return { resource: "master.schedules", action: "update" };
  }

  const slip = /^\/reports\/payroll\/[^/]+\/slip$/i;
  if (slip.test(path)) {
    return { resource: "reports.payroll.slip", action: "view" };
  }

  for (const rule of sortedPathRules) {
    const p = rule.prefix.toLowerCase();
    if (path === p || path.startsWith(`${p}/`)) {
      return { resource: rule.resource, action: rule.action ?? "view" };
    }
  }

  return { resource: "dashboard", action: "view" };
}

const NAV_HREF_TO_RESOURCE: Record<string, string> = {
  "/dashboard": "dashboard",
  "/master/branches": "master.branches",
  "/master/devices": "master.devices",
  "/master/jobs": "master.jobs",
  "/master/projects": "master.projects",
  "/master/nationalities": "master.nationalities",
  "/master/duties": "master.duties",
  "/master/schedules": "master.schedules",
  "/master/groups": "master.groups",
  "/master/employees": "master.employees",
  "/master/leave-types": "master.leave_types",
  "/master/holidays": "master.holidays",
  "/master/unregistered": "master.unregistered",
  "/operations/pull": "operations.pull",
  "/operations/movements": "operations.movements",
  "/operations/permission": "operations.permission",
  "/operations/leave": "operations.leave",
  "/operations/post": "operations.post",
  "/operations/unpost": "operations.unpost",
  "/operations/edit-movements": "operations.edit_movements",
  "/reports": "reports",
  "/reports/daily-status": "reports.daily_status",
  "/reports/employees-detail": "reports.employees_detail",
  "/reports/employee": "reports.employee",
  "/reports/employees-summary": "reports.employees_summary",
  "/reports/absence": "reports.absence",
  "/reports/delays": "reports.delays",
  "/reports/incomplete": "reports.incomplete",
  "/reports/early-in": "reports.early_in",
  "/reports/attendance-summary": "reports.attendance_summary",
  "/reports/attendance-all-branches": "reports.attendance_all_branches",
  "/reports/overtime": "reports.overtime",
  "/reports/leaves": "reports.leaves",
  "/reports/permissions": "reports.permissions",
  "/reports/late-early-out": "reports.late_early_out",
  "/reports/total-absence": "reports.total_absence",
  "/reports/total-delays": "reports.total_delays",
  "/reports/payroll": "reports.payroll",
  "/reports/payroll/vacations": "reports.payroll.vacations",
  "/reports/payroll/vacations/report": "reports.payroll.vacations_report",
  "/reports/payroll/deductions": "reports.payroll.deductions",
  "/reports/payroll/bonuses": "reports.payroll.bonuses",
  "/settings/permissions": "settings.permissions",
  "/settings/users": "settings.users",
  "/settings/company": "settings.company",
  "/settings/backup": "settings.company",
  "/settings/general": "settings.general",
};

export function resourceForNavHref(href: string): string | null {
  return NAV_HREF_TO_RESOURCE[href] ?? null;
}
