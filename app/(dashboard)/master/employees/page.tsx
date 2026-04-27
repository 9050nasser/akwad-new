import Link from "next/link";
import { ConfirmServerActionForm } from "@/components/confirm-server-action-form";
import { FlashBanner } from "@/components/flash-banner";
import { GhostButton, Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { PageFrame } from "@/components/page-frame";
import { EmployeePayrollPackageFields } from "@/components/employee-payroll-package-fields";
import { createEmployee, deactivateEmployee, updateEmployee } from "@/app/actions/employees";
import { firstQuery, formatFlash } from "@/lib/flash";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/tenant";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireTenantSession();
  const companyId = session.companyId;
  const sp = (await searchParams) ?? {};
  const flash = formatFlash(sp);
  const editId = firstQuery(sp.edit);

  const [branches, jobs, projects, nationalities, duties, schedules, departments, employees, company] =
    await Promise.all([
      prisma.branch.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
      prisma.jobTitle.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
      prisma.project.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
      prisma.nationality.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
      prisma.workDuty.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
      prisma.workSchedule.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
      prisma.employeeGroup.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
      prisma.employee.findMany({
        where: { branch: { companyId } },
        orderBy: { fullName: "asc" },
        include: { branch: true, jobTitle: true, workSchedule: true, departmentGroup: true },
      }),
      prisma.company.findUnique({ where: { id: companyId }, select: { enablePayroll: true } }),
    ]);

  const payrollEnabled = company?.enablePayroll ?? false;

  const editing = editId ? employees.find((e) => e.id === editId) ?? null : null;

  const selectValue = (current?: string | null) => current ?? "";

  return (
    <PageFrame
      title="الموظفين"
      subtitle={
        payrollEnabled
          ? "بيانات الموظفين، القسم (من الأقسام)، الوظيفة، ZK، الفرع، أوقات الدوام، والراتب والبدلات لحساب الرواتب والتقارير."
          : "بيانات الموظفين، القسم، الوظيفة، ZK، الفرع، وأوقات الدوام. موديول الرواتب غير مفعّل — عند التفعيل من المنصة تظهر حقول الراتب والبدلات هنا."
      }
    >
      <FlashBanner notice={flash.notice} error={flash.error} />

      <p className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link href="/master/groups" className="font-medium text-teal-700 hover:text-teal-900">
          الأقسام
        </Link>
      </p>

      {branches.length === 0 ? (
        <p className="text-sm text-rose-700">أضف فرعاً أولاً من شاشة الفروع.</p>
      ) : editing ? (
        <form action={updateEmployee} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="id" value={editing.id} />
          <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">تعديل: {editing.fullName}</h2>
            <Link href="/master/employees" className="text-sm text-teal-800 hover:underline">
              إلغاء التعديل
            </Link>
          </div>
          <div>
            <Label htmlFor="fullName">الاسم الكامل</Label>
            <input id="fullName" name="fullName" className={fieldClass} required defaultValue={editing.fullName} />
          </div>
          <div>
            <Label htmlFor="employeeCode">الكود الوظيفي</Label>
            <input
              id="employeeCode"
              name="employeeCode"
              className={fieldClass}
              defaultValue={editing.employeeCode ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="deviceUserId">رقم المستخدم على ZK</Label>
            <input
              id="deviceUserId"
              name="deviceUserId"
              className={fieldClass}
              defaultValue={editing.deviceUserId ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="branchId">الفرع</Label>
            <select id="branchId" name="branchId" className={fieldClass} required defaultValue={editing.branchId}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="jobTitleId">الوظيفة</Label>
            <select id="jobTitleId" name="jobTitleId" className={fieldClass} defaultValue={selectValue(editing.jobTitleId)}>
              <option value="">—</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="departmentGroupId">القسم</Label>
            <select
              id="departmentGroupId"
              name="departmentGroupId"
              className={fieldClass}
              defaultValue={selectValue(editing.departmentGroupId)}
            >
              <option value="">—</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="projectId">المشروع</Label>
            <select id="projectId" name="projectId" className={fieldClass} defaultValue={selectValue(editing.projectId)}>
              <option value="">—</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="nationalityId">الجنسية</Label>
            <select
              id="nationalityId"
              name="nationalityId"
              className={fieldClass}
              defaultValue={selectValue(editing.nationalityId)}
            >
              <option value="">—</option>
              {nationalities.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="workDutyId">المهمة</Label>
            <select id="workDutyId" name="workDutyId" className={fieldClass} defaultValue={selectValue(editing.workDutyId)}>
              <option value="">—</option>
              {duties.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="workScheduleId">أوقات الدوام</Label>
            <select
              id="workScheduleId"
              name="workScheduleId"
              className={fieldClass}
              defaultValue={selectValue(editing.workScheduleId)}
            >
              <option value="">—</option>
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          {payrollEnabled ? (
            <EmployeePayrollPackageFields
              formKey={editing.id}
              defaultBase={editing.baseSalaryMonthly != null ? String(editing.baseSalaryMonthly) : ""}
              defaultHousing={editing.allowanceHousingMonthly != null ? String(editing.allowanceHousingMonthly) : ""}
              defaultTransport={editing.allowanceTransportMonthly != null ? String(editing.allowanceTransportMonthly) : ""}
            />
          ) : null}
          <div>
            <Label htmlFor="active">الحالة</Label>
            <select id="active" name="active" className={fieldClass} defaultValue={editing.active ? "on" : "off"}>
              <option value="on">نشط</option>
              <option value="off">موقوف</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <PrimaryButton>حفظ التعديلات</PrimaryButton>
          </div>
        </form>
      ) : (
        <form action={createEmployee} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <h2 className="text-sm font-semibold text-slate-900">إضافة موظف</h2>
          </div>
          <div>
            <Label htmlFor="fullName">الاسم الكامل</Label>
            <input id="fullName" name="fullName" className={fieldClass} required />
          </div>
          <div>
            <Label htmlFor="employeeCode">الكود الوظيفي</Label>
            <input id="employeeCode" name="employeeCode" className={fieldClass} />
          </div>
          <div>
            <Label htmlFor="deviceUserId">رقم المستخدم على ZK</Label>
            <input id="deviceUserId" name="deviceUserId" className={fieldClass} />
          </div>
          <div>
            <Label htmlFor="branchId">الفرع</Label>
            <select id="branchId" name="branchId" className={fieldClass} required defaultValue={branches[0]?.id}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="jobTitleId">الوظيفة</Label>
            <select id="jobTitleId" name="jobTitleId" className={fieldClass} defaultValue="">
              <option value="">—</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="departmentGroupId">القسم</Label>
            <select id="departmentGroupId" name="departmentGroupId" className={fieldClass} defaultValue="">
              <option value="">—</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="projectId">المشروع</Label>
            <select id="projectId" name="projectId" className={fieldClass} defaultValue="">
              <option value="">—</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="nationalityId">الجنسية</Label>
            <select id="nationalityId" name="nationalityId" className={fieldClass} defaultValue="">
              <option value="">—</option>
              {nationalities.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="workDutyId">المهمة</Label>
            <select id="workDutyId" name="workDutyId" className={fieldClass} defaultValue="">
              <option value="">—</option>
              {duties.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="workScheduleId">أوقات الدوام</Label>
            <select id="workScheduleId" name="workScheduleId" className={fieldClass} defaultValue="">
              <option value="">—</option>
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          {payrollEnabled ? <EmployeePayrollPackageFields formKey="create" /> : null}
          <div className="md:col-span-2">
            <PrimaryButton>حفظ الموظف</PrimaryButton>
          </div>
        </form>
      )}

      <div className="mt-10 table-container rounded-xl border border-slate-200 table-container">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-16 px-4 py-3">المسلسل</th>
              <th className="px-4 py-3">الاسم</th>
              <th className="px-4 py-3">الفرع</th>
              <th className="px-4 py-3 hidden sm:table-cell">ZK</th>
              <th className="px-4 py-3">الوظيفة</th>
              <th className="px-4 py-3 hidden sm:table-cell">القسم</th>
              <th className="px-4 py-3">الحالة</th>
              <th className="px-4 py-3 w-52">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {employees.map((e, i) => (
              <tr key={e.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 text-slate-500 tabular-nums">{i + 1}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{e.fullName}</td>
                <td className="px-4 py-3 text-slate-600">{e.branch.name}</td>
                <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{e.deviceUserId ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{e.jobTitle?.name ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{e.departmentGroup?.name ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{e.active ? "نشط" : "موقوف"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/master/employees?edit=${e.id}`}
                      className="inline-flex items-center rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50"
                    >
                      تعديل
                    </Link>
                    {e.active ? (
                      <ConfirmServerActionForm
                        action={deactivateEmployee}
                        confirmMessage="إيقاف هذا الموظف؟"
                        className="inline"
                      >
                        <input type="hidden" name="id" value={e.id} />
                        <GhostButton>إيقاف</GhostButton>
                      </ConfirmServerActionForm>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageFrame>
  );
}
