import type { UiLocale } from "@/lib/ui/prefs";

/** مفاتيح عناصر القائمة الجانبية + عناوين الأقسام */
export type NavLabelKey =
  | "section_dashboard"
  | "section_master"
  | "section_operations"
  | "section_reports"
  | "section_payroll"
  | "section_settings"
  | "summaries"
  | "branches"
  | "jobs"
  | "projects"
  | "nationalities"
  | "duties"
  | "schedules"
  | "employees"
  | "groups"
  | "leave_types"
  | "holidays"
  | "unregistered"
  | "pull"
  | "movements"
  | "permission"
  | "leave"
  | "post"
  | "unpost"
  | "edit_movements"
  | "reports_hub"
  | "daily_status"
  | "employees_detail"
  | "employee"
  | "employees_summary"
  | "absence"
  | "delays"
  | "incomplete"
  | "early_in"
  | "attendance_summary"
  | "attendance_all_branches"
  | "overtime"
  | "leaves"
  | "permissions"
  | "late_early_out"
  | "total_absence"
  | "total_delays"
  | "payroll"
  | "payroll_vacations"
  | "payroll_vacations_report"
  | "payroll_deductions"
  | "payroll_bonuses"
  | "devices"
  | "perm_settings"
  | "users"
  | "company"
  | "backup"
  | "general"
  | "employee_grouped";

export type UiMessages = {
  nav: Record<NavLabelKey, string>;
  brand: { name: string; /** يظهر بجانب الاسم بالإنجليزي بحجم أصغر (مثل Pro) */ proMark?: string; tagline: string };
  shell: {
    licensedFor: string;
    employees: string;
    devices: string;
    licenseEnd: string;
    logout: string;
    undated: string;
  };
  login: {
    title: string;
    subtitle: string;
    company: string;
    username: string;
    password: string;
    submit: string;
  };
  loginErrors: Record<string, string>;
  toolbar: {
    language: string;
    theme: string;
    themeTenant: string;
    themePlatform: string;
    langAr: string;
    langEn: string;
  };
  platform: {
    title: string;
    logout: string;
    nav: {
      dashboard: string;
      companies: string;
      addCompany: string;
      onHoldReport: string;
      password: string;
    };
  };
  reportsHub: {
    title: string;
    subtitle: string;
    payrollDisabled: string;
  };
};

const AR: UiMessages = {
  nav: {
    section_dashboard: "لوحة التحكم",
    section_master: "التجهيز",
    section_operations: "الإجراءات",
    section_reports: "التقارير",
    section_payroll: "الرواتب",
    section_settings: "الإعدادات",
    summaries: "الملخصات",
    branches: "الفروع",
    jobs: "الوظائف",
    projects: "المشاريع",
    nationalities: "الجنسيات",
    duties: "المهام",
    schedules: "أوقات العمل",
    employees: "الموظفين",
    groups: "الأقسام",
    leave_types: "أنواع الإجازات",
    holidays: "العطلات الرسمية",
    unregistered: "موظفين غير مسجلين",
    pull: "سحب حركات الفروع",
    movements: "عرض الحركات",
    permission: "إضافة إذن",
    leave: "إضافة إجازة",
    post: "ترحيل الحركات",
    unpost: "إلغاء ترحيل حركات",
    edit_movements: "إضافة / تعديل حركات",
    reports_hub: "كل التقارير",
    daily_status: "حالة اليوم",
    employees_detail: "الحضور والانصراف تفصيلي",
    employee: "تقرير موظف",
    employees_summary: "الإجمالي للموظفين",
    absence: "الغياب التفصيلي للموظفين",
    delays: "ملخص التأخير والانصراف المبكر",
    incomplete: "الحركات غير المكتملة",
    early_in: "الحضور المبكر",
    attendance_summary: "ملخص تقرير الحضور",
    attendance_all_branches: "الحضور الكلي لكل الفروع",
    overtime: "تقرير الإضافي",
    leaves: "تقرير الإجازات",
    permissions: "تقرير الأذونات",
    late_early_out: "تفصيل التأخير والانصراف المبكر (الشفتات)",
    total_absence: "إجمالي الغياب",
    total_delays: "إجمالي التأخير",
    payroll: "تقرير الرواتب",
    payroll_vacations: "تسجيل إجازات",
    payroll_vacations_report: "تقرير إجازات الموظفين",
    payroll_deductions: "خصومات يدوية",
    payroll_bonuses: "إضافات يدوية",
    devices: "أجهزة البصمة",
    perm_settings: "الصلاحيات",
    users: "بيانات المستخدمين",
    company: "بيانات الشركة",
    backup: "نسخ احتياطي للبيانات",
    general: "الإعدادات العامة",
    employee_grouped: "تقرير مجمّع للطباعة",
  },
  brand: { name: "أكواد", proMark: "برو", tagline: "منصة الحضور والانصراف" },
  shell: {
    licensedFor: "هذه النسخة مرخصة لشركة",
    employees: "الموظفين",
    devices: "أجهزة البصمة",
    licenseEnd: "انتهاء الترخيص",
    logout: "خروج",
    undated: "غير محدد",
  },
  login: {
    title: "أكواد برو",
    subtitle: "تسجيل الدخول",
    company: "اسم الشركة",
    username: "اسم المستخدم",
    password: "كلمة المرور",
    submit: "دخول",
  },
  loginErrors: {
    invalid: "اسم المستخدم أو كلمة المرور غير صحيحة.",
    no_password: "هذا الحساب بدون كلمة مرور.",
    session: "انتهت الجلسة. سجّل الدخول مرة أخرى.",
    config: "المفتاح AUTH_SECRET غير مضبوط في ملف البيئة (16 حرفاً على الأقل).",
    required: "أدخل اسم الشركة واسم المستخدم وكلمة المرور.",
    unknown_company: "اسم الشركة غير معروف.",
    license_expired: "انتهى ترخيص هذه الشركة.",
    account_on_hold:
      "تم إيقاف حساب هذه الشركة مؤقتاً (هولد). تواصل مع إدارة المنصة لإعادة التفعيل بعد السداد.",
  },
  toolbar: {
    language: "اللغة",
    theme: "المظهر",
    themeTenant: "واجهة العميل (فاتح)",
    themePlatform: "واجهة الإدارة (داكن)",
    langAr: "عربي",
    langEn: "English",
  },
  platform: {
    title: "إدارة المنصة",
    logout: "خروج",
    nav: {
      dashboard: "لوحة التحكم",
      companies: "العملاء",
      addCompany: "إضافة عميل",
      onHoldReport: "تقرير عملاء الهولد",
      password: "كلمة مرور أدمن المنصة",
    },
  },
  reportsHub: {
    title: "التقارير",
    subtitle:
      "اختر تقريراً للانتقال إلى شاشته. جميع التقارير تُبنى على الحركات المرحّلة والإجازات والأذونات.",
    payrollDisabled:
      "تقرير الرواتب غير مفعّل لهذه الشركة. يمكن لمسؤول المنصة تفعيله من إدارة العملاء.",
  },
};

const EN: UiMessages = {
  nav: {
    section_dashboard: "Dashboard",
    section_master: "Setup",
    section_operations: "Operations",
    section_reports: "Reports",
    section_payroll: "Payroll",
    section_settings: "Settings",
    summaries: "Overview",
    branches: "Branches",
    jobs: "Job titles",
    projects: "Projects",
    nationalities: "Nationalities",
    duties: "Duties",
    schedules: "Work schedules",
    employees: "Employees",
    groups: "Departments",
    leave_types: "Leave types",
    holidays: "Public holidays",
    unregistered: "Unregistered on devices",
    pull: "Pull branch punches",
    movements: "View movements",
    permission: "Add permission",
    leave: "Add leave",
    post: "Post movements",
    unpost: "Unpost movements",
    edit_movements: "Add / edit movements",
    reports_hub: "All reports",
    daily_status: "Today’s status",
    employees_detail: "Attendance in/out (detail)",
    employee: "Employee report",
    employees_summary: "Employees (summary)",
    absence: "Employee absence (detail)",
    delays: "Delays & early leave (summary)",
    incomplete: "Incomplete punches",
    early_in: "Early check-in",
    attendance_summary: "Attendance summary",
    attendance_all_branches: "Attendance (all branches)",
    overtime: "Overtime",
    leaves: "Leaves",
    permissions: "Permissions",
    late_early_out: "Late / early per shift (detail)",
    total_absence: "Total absence",
    total_delays: "Total delays",
    payroll: "Payroll report",
    payroll_vacations: "Record payroll leave",
    payroll_vacations_report: "Employees on leave (report)",
    payroll_deductions: "Manual deductions",
    payroll_bonuses: "Manual bonuses",
    devices: "Fingerprint devices",
    perm_settings: "Permissions",
    users: "Users",
    company: "Company profile",
    backup: "Database backup",
    general: "General settings",
    employee_grouped: "Grouped Report (Print)"
  },
  brand: { name: "AQWAD", proMark: "Pro", tagline: "Attendance & time tracking" },
  shell: {
    licensedFor: "Licensed for",
    employees: "Employees",
    devices: "Fingerprint devices",
    licenseEnd: "License ends",
    logout: "Log out",
    undated: "Not set",
  },
  login: {
    title: "AQWAD",
    subtitle: "Sign in",
    company: "Company name",
    username: "Username",
    password: "Password",
    submit: "Sign in",
  },
  loginErrors: {
    invalid: "Invalid username or password.",
    no_password: "This account has no password set.",
    session: "Your session expired. Please sign in again.",
    config: "AUTH_SECRET is missing or too short in the environment file (min 16 characters).",
    required: "Enter company name, username, and password.",
    unknown_company: "Unknown company name.",
    license_expired: "This company’s license has expired.",
    account_on_hold:
      "This company account is on hold. Contact platform support after payment to reactivate.",
  },
  toolbar: {
    language: "Language",
    theme: "Theme",
    themeTenant: "Client UI (light)",
    themePlatform: "Admin UI (dark)",
    langAr: "العربية",
    langEn: "English",
  },
  platform: {
    title: "Platform admin",
    logout: "Log out",
    nav: {
      dashboard: "Dashboard",
      companies: "Customers",
      addCompany: "Add customer",
      onHoldReport: "On-hold customers report",
      password: "Platform admin password",
    },
  },
  reportsHub: {
    title: "Reports",
    subtitle: "Pick a report to open. All reports use posted movements, leaves, and permissions.",
    payrollDisabled: "Payroll report is disabled for this company. Ask the platform admin to enable it.",
  },
};

export function uiMessages(locale: UiLocale): UiMessages {
  return locale === "en" ? EN : AR;
}
