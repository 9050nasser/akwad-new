/** مجموعات أعمدة قابلة للإظهار/الإخفاء لكل تقرير (معرفات إنجليزية للكوكي). */

export type ReportColumnGroup = {
  id: string;
  /** عنوان في قائمة «أعمدة التقرير» */
  label: string;
  /** لا يمكن إخفاؤه */
  required?: boolean;
  /** رأس جدول على صفين (دخول / خروج) */
  isSplitPair?: boolean;
};

export const DAILY_STATUS_COLUMN_GROUPS: ReportColumnGroup[] = [
  { id: "code", label: "كود الموظف", required: true },
  { id: "name", label: "اسم الموظف", required: true },
  { id: "branch", label: "الفرع" },
  { id: "schedule", label: "الدوام" },
  { id: "shift1", label: "الدوام الأول — دخول وخروج", isSplitPair: true },
  { id: "shift2", label: "الدوام الثاني — دخول وخروج", isSplitPair: true },
  { id: "late", label: "التأخير (دقيقة)" },
  { id: "overtime", label: "الإضافي (دقيقة)" },
  { id: "work", label: "ساعات العمل" },
  { id: "dayStatus", label: "حالة اليوم" },
];

export const EMPLOYEES_SUMMARY_COLUMN_GROUPS: ReportColumnGroup[] = [
  { id: "code", label: "كود الموظف", required: true },
  { id: "name", label: "اسم الموظف", required: true },
  { id: "schedule", label: "الدوام" },
  { id: "scheduleHours", label: "ساعات الدوام" },
  { id: "late", label: "التأخير" },
  { id: "absence", label: "الغياب" },
  { id: "leave", label: "الإجازات" },
  { id: "overtime", label: "الإضافي" },
  { id: "work", label: "ساعات العمل الفعلية" },
];

/** تقرير إجمالي الغياب (صف لكل موظف) */
export const ABSENCE_SUMMARY_COLUMN_GROUPS: ReportColumnGroup[] = [
  { id: "name", label: "الموظف", required: true },
  { id: "branch", label: "الفرع" },
  { id: "absentDays", label: "إجمالي أيام الغياب" },
];

/** الغياب التفصيلي (صف لكل يوم) */
export const ABSENCE_DETAIL_COLUMN_GROUPS: ReportColumnGroup[] = [
  { id: "weekday", label: "اليوم" },
  { id: "date", label: "التاريخ" },
  { id: "absentPanel", label: "عدد الغائبين والتفاصيل", required: true },
];

export const DELAYS_COLUMN_GROUPS: ReportColumnGroup[] = [
  { id: "period", label: "التاريخ" },
  { id: "code", label: "كود الموظف" },
  { id: "name", label: "الموظف", required: true },
  { id: "branch", label: "الفرع" },
  { id: "lateShifts", label: "شفتات متأخرة" },
  { id: "delayMinutes", label: "إجمالي التأخير" },
  { id: "earlyLeaveMinutes", label: "إجمالي الانصراف المبكر" },
];

export const ATTENDANCE_ALL_BRANCHES_COLUMN_GROUPS: ReportColumnGroup[] = [
  { id: "branch", label: "الفرع", required: true },
  { id: "postedCheckIns", label: "دخول مرحّل" },
];

export const EARLY_IN_COLUMN_GROUPS: ReportColumnGroup[] = [
  { id: "name", label: "الموظف", required: true },
  { id: "branch", label: "الفرع" },
  { id: "earlyShifts", label: "شفتات مبكرة" },
  { id: "earlyMinutes", label: "دقائق تبكير" },
];

export const INCOMPLETE_COLUMN_GROUPS: ReportColumnGroup[] = [
  { id: "name", label: "الموظف", required: true },
  { id: "branch", label: "الفرع" },
  { id: "day", label: "التاريخ" },
  { id: "issue", label: "نوع النقص", required: true },
  { id: "checkIn", label: "عدد الدخول" },
  { id: "checkOut", label: "عدد الخروج" },
];

export const LATE_EARLY_OUT_COLUMN_GROUPS: ReportColumnGroup[] = [
  { id: "name", label: "الموظف", required: true },
  { id: "branch", label: "الفرع" },
  { id: "lateShifts", label: "شفتات متأخرة" },
  { id: "lateMinutes", label: "دقائق تأخير" },
  { id: "earlyArrivalShifts", label: "شفتات تبكير دخول" },
  { id: "earlyArrivalMinutes", label: "دقائق تبكير" },
  { id: "earlyLeaveShifts", label: "شفتات خروج مبكر" },
  { id: "earlyLeaveMinutes", label: "دقائق خروج مبكر" },
  { id: "workedMinutes", label: "إجمالي دقائق عمل (شفتات)" },
];

export const LEAVES_COLUMN_GROUPS: ReportColumnGroup[] = [
  { id: "name", label: "الموظف", required: true },
  { id: "branch", label: "الفرع" },
  { id: "type", label: "النوع" },
  { id: "start", label: "من" },
  { id: "end", label: "إلى" },
];

export const PERMISSIONS_COLUMN_GROUPS: ReportColumnGroup[] = [
  { id: "name", label: "الموظف", required: true },
  { id: "branch", label: "الفرع" },
  { id: "day", label: "اليوم" },
  { id: "start", label: "من" },
  { id: "end", label: "إلى" },
  { id: "reason", label: "السبب" },
];

export const OVERTIME_OPEN_COLUMN_GROUPS: ReportColumnGroup[] = [
  { id: "name", label: "الموظف", required: true },
  { id: "branch", label: "الفرع" },
  { id: "shortage", label: "دقائق نقص" },
  { id: "netOvertime", label: "دقائق إضافي صافي" },
];

export const OVERTIME_OUTS_COLUMN_GROUPS: ReportColumnGroup[] = [
  { id: "at", label: "الوقت" },
  { id: "name", label: "الموظف", required: true },
  { id: "branch", label: "الفرع" },
];

export const PAYROLL_COLUMN_GROUPS: ReportColumnGroup[] = [
  { id: "employee", label: "الموظف", required: true },
  { id: "branch", label: "الفرع" },
  { id: "base", label: "أساسي" },
  { id: "housing", label: "سكن" },
  { id: "transport", label: "مواصلات" },
  { id: "gross", label: "إجمالي ثابت" },
  { id: "vacation", label: "إجازة" },
  { id: "addition", label: "إضافي" },
  { id: "dedAttendance", label: "خصم حضور" },
  { id: "dedManual", label: "خصم يدوي" },
  { id: "addManual", label: "إضافة يدوية" },
  { id: "net", label: "الصافي" },
  { id: "slip", label: "قسيمة" },
];

/** إضافات/خصومات يدوية — نفس هيكل الأعمدة */
export const PAYROLL_MANUAL_ENTRY_COLUMN_GROUPS: ReportColumnGroup[] = [
  { id: "employee", label: "الموظف", required: true },
  { id: "branch", label: "الفرع" },
  { id: "month", label: "الشهر" },
  { id: "amount", label: "المبلغ" },
  { id: "reason", label: "السبب" },
  { id: "actions", label: "إجراء" },
];

export const PAYROLL_VACATIONS_REGISTER_COLUMN_GROUPS: ReportColumnGroup[] = [
  { id: "employee", label: "الموظف", required: true },
  { id: "branch", label: "الفرع" },
  { id: "start", label: "من" },
  { id: "end", label: "إلى" },
  { id: "note", label: "ملاحظة" },
  { id: "actions", label: "إجراء" },
];

export const PAYROLL_VACATIONS_REPORT_COLUMN_GROUPS: ReportColumnGroup[] = [
  { id: "employee", label: "الموظف", required: true },
  { id: "branch", label: "الفرع" },
  { id: "start", label: "بداية الإجازة" },
  { id: "end", label: "نهاية الإجازة" },
  { id: "note", label: "ملاحظة" },
];

export const EMPLOYEES_DETAIL_COLUMN_GROUPS: ReportColumnGroup[] = [
  { id: "date", label: "التاريخ" },
  { id: "code", label: "كود الموظف" },
  { id: "name", label: "اسم الموظف", required: true },
  { id: "checkIn", label: "وقت الحضور" },
  { id: "checkOut", label: "وقت الانصراف" },
  { id: "overtime", label: "الإضافي" },
  { id: "late", label: "التأخير" },
  { id: "expectedWork", label: "ساعات العمل الافتراضي" },
  { id: "actualWork", label: "ساعات العمل الحقيقي" },
  { id: "diff", label: "الفرق" },
  { id: "note", label: "ملاحظات" },
];

export const EMPLOYEE_MOVEMENTS_COLUMN_GROUPS: ReportColumnGroup[] = [
  { id: "date", label: "التاريخ", required: true },
  { id: "firstIn", label: "أول دخول" },
  { id: "lastOut", label: "آخر خروج" },
  { id: "posted", label: "مرحّل" },
];

export const EMPLOYEE_LEAVES_COLUMN_GROUPS: ReportColumnGroup[] = [
  { id: "type", label: "النوع", required: true },
  { id: "start", label: "من" },
  { id: "end", label: "إلى" },
];

export const EMPLOYEE_PERMISSIONS_COLUMN_GROUPS: ReportColumnGroup[] = [
  { id: "day", label: "اليوم", required: true },
  { id: "start", label: "من" },
  { id: "end", label: "إلى" },
  { id: "reason", label: "السبب" },
];

export const REPORT_COLUMN_GROUPS_BY_SLUG: Record<string, ReportColumnGroup[]> = {
  "daily-status": DAILY_STATUS_COLUMN_GROUPS,
  "employees-summary": EMPLOYEES_SUMMARY_COLUMN_GROUPS,
  absence: ABSENCE_DETAIL_COLUMN_GROUPS,
  "total-absence": ABSENCE_SUMMARY_COLUMN_GROUPS,
  delays: DELAYS_COLUMN_GROUPS,
  "total-delays": DELAYS_COLUMN_GROUPS,
  "attendance-all-branches": ATTENDANCE_ALL_BRANCHES_COLUMN_GROUPS,
  "early-in": EARLY_IN_COLUMN_GROUPS,
  incomplete: INCOMPLETE_COLUMN_GROUPS,
  "late-early-out": LATE_EARLY_OUT_COLUMN_GROUPS,
  leaves: LEAVES_COLUMN_GROUPS,
  permissions: PERMISSIONS_COLUMN_GROUPS,
  "overtime-open": OVERTIME_OPEN_COLUMN_GROUPS,
  "overtime-outs": OVERTIME_OUTS_COLUMN_GROUPS,
  payroll: PAYROLL_COLUMN_GROUPS,
  "payroll-bonuses": PAYROLL_MANUAL_ENTRY_COLUMN_GROUPS,
  "payroll-deductions": PAYROLL_MANUAL_ENTRY_COLUMN_GROUPS,
  "payroll-vacations-register": PAYROLL_VACATIONS_REGISTER_COLUMN_GROUPS,
  "payroll-vacations-report": PAYROLL_VACATIONS_REPORT_COLUMN_GROUPS,
  "employees-detail": EMPLOYEES_DETAIL_COLUMN_GROUPS,
  "employee-movements": EMPLOYEE_MOVEMENTS_COLUMN_GROUPS,
  "employee-leaves": EMPLOYEE_LEAVES_COLUMN_GROUPS,
  "employee-permissions": EMPLOYEE_PERMISSIONS_COLUMN_GROUPS,
};

export function getReportColumnGroups(slug: string): ReportColumnGroup[] {
  return REPORT_COLUMN_GROUPS_BY_SLUG[slug] ?? [];
}

/** ترتيب العرض الثابت = ترتيب التعريف */
export function normalizeVisibleColumnGroups(slug: string, selectedIds: string[] | undefined): string[] {
  const defs = getReportColumnGroups(slug);
  if (defs.length === 0) return [];
  const allowed = new Set(defs.map((d) => d.id));
  const required = new Set(defs.filter((d) => d.required).map((d) => d.id));

  let picked: string[];
  if (!selectedIds?.length) {
    picked = defs.map((d) => d.id);
  } else {
    picked = selectedIds.filter((id) => allowed.has(id));
    for (const id of required) {
      if (!picked.includes(id)) picked.push(id);
    }
    picked = defs.map((d) => d.id).filter((id) => picked.includes(id));
  }
  return picked;
}

export function visibleColumnGroupSet(slug: string, cookieBySlug: Record<string, string[]> | undefined): Set<string> {
  const saved = cookieBySlug?.[slug];
  return new Set(normalizeVisibleColumnGroups(slug, saved));
}
