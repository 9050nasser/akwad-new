import type { ReactNode } from "react";
import { Label, fieldClass } from "@/components/ui-fields";
import { cn } from "@/lib/cn";
import type { ReportEmployeeFilterParams, ReportFilterDropdowns } from "@/lib/report-employee-filters";

type Defaults = ReportEmployeeFilterParams & { branchId?: string };

type Props = {
  dropdowns: ReportFilterDropdowns;
  defaults: Defaults;
  /** إن وُجد يُعرض قبل خانة الفرع (مثل من/إلى/يوم). */
  leadingSlot?: ReactNode;
  /** أعمدة الشبكة الافتراضية لحقول التصفية فقط (بدون leading). */
  filterGridClassName?: string;
  /** إخفاء شبكة الفرع/الموظف/القسم… عند الطباعة (يبقى leadingSlot مثل التاريخ/من–إلى). افتراضي: مفعّل. */
  hideFilterGridOnPrint?: boolean;
};

/**
 * حقول بحث موحّدة للتقارير (فرع، كود/اسم، قسم، مهمة، مشروع، وظيفة، دوام).
 * تُضمّن داخل `<form method="get">` مع أزرار الإرسال خارج المكوّن.
 */
export function ReportEmployeeFilterFields({
  dropdowns,
  defaults,
  leadingSlot,
  filterGridClassName = "grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  hideFilterGridOnPrint = true,
}: Props) {
  const d = defaults;
  const { branches, departments, duties, projects, jobs, schedules } = dropdowns;

  return (
    <>
      {leadingSlot}
      <div className={cn(hideFilterGridOnPrint && "print:hidden", filterGridClassName)}>
        <div>
          <Label htmlFor="branchId">الفرع</Label>
          <select id="branchId" name="branchId" className={fieldClass} defaultValue={d.branchId ?? ""}>
            <option value="">كل الفروع</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="q">كود الموظف أو الاسم</Label>
          <input id="q" name="q" type="search" className={fieldClass} placeholder="جزء من الكود أو الاسم" defaultValue={d.q ?? ""} />
        </div>
        <div>
          <Label htmlFor="departmentGroupId">القسم</Label>
          <select id="departmentGroupId" name="departmentGroupId" className={fieldClass} defaultValue={d.departmentGroupId ?? ""}>
            <option value="">الكل</option>
            {departments.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="workDutyId">المهمة</Label>
          <select id="workDutyId" name="workDutyId" className={fieldClass} defaultValue={d.workDutyId ?? ""}>
            <option value="">الكل</option>
            {duties.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="projectId">المشروع</Label>
          <select id="projectId" name="projectId" className={fieldClass} defaultValue={d.projectId ?? ""}>
            <option value="">الكل</option>
            {projects.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="jobTitleId">الوظيفة</Label>
          <select id="jobTitleId" name="jobTitleId" className={fieldClass} defaultValue={d.jobTitleId ?? ""}>
            <option value="">الكل</option>
            {jobs.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="workScheduleId">الدوام</Label>
          <select id="workScheduleId" name="workScheduleId" className={fieldClass} defaultValue={d.workScheduleId ?? ""}>
            <option value="">الكل</option>
            {schedules.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}
