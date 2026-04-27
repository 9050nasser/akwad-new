"use client";

import { useMemo, useState } from "react";
import { Label, fieldClass } from "@/components/ui-fields";

function sumMoney(base: string, housing: string, transport: string): number {
  const n = (s: string) => {
    const t = s.trim().replace(",", ".");
    if (!t) return 0;
    const x = Number(t);
    return Number.isFinite(x) && x >= 0 ? x : 0;
  };
  return Math.round((n(base) + n(housing) + n(transport)) * 100) / 100;
}

type PackageFieldsProps = {
  formKey: string;
  defaultBase?: string;
  defaultHousing?: string;
  defaultTransport?: string;
};

function EmployeePayrollPackageFieldsInner({
  formKey,
  defaultBase = "",
  defaultHousing = "",
  defaultTransport = "",
}: PackageFieldsProps) {
  const [base, setBase] = useState(defaultBase);
  const [housing, setHousing] = useState(defaultHousing);
  const [transport, setTransport] = useState(defaultTransport);

  const total = useMemo(() => sumMoney(base, housing, transport), [base, housing, transport]);

  return (
    <fieldset className="md:col-span-2 space-y-4 rounded-xl border border-teal-100 bg-teal-50/50 p-4">
      <input type="hidden" name="includePayrollFields" value="1" />
      <legend className="px-1 text-sm font-semibold text-teal-900">الراتب والبدلات الشهرية</legend>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor={`${formKey}-base`}>الراتب الأساسي</Label>
          <input
            id={`${formKey}-base`}
            name="baseSalaryMonthly"
            type="number"
            min={0}
            step="0.01"
            className={fieldClass}
            value={base}
            onChange={(e) => setBase(e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <Label htmlFor={`${formKey}-housing`}>بدل سكن</Label>
          <input
            id={`${formKey}-housing`}
            name="allowanceHousingMonthly"
            type="number"
            min={0}
            step="0.01"
            className={fieldClass}
            value={housing}
            onChange={(e) => setHousing(e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <Label htmlFor={`${formKey}-transport`}>بدل مواصلات</Label>
          <input
            id={`${formKey}-transport`}
            name="allowanceTransportMonthly"
            type="number"
            min={0}
            step="0.01"
            className={fieldClass}
            value={transport}
            onChange={(e) => setTransport(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>
      <p className="rounded-lg border border-teal-100 bg-white px-3 py-2 text-sm font-semibold text-slate-900 tabular-nums">
        المجموع الشهري:{" "}
        {total.toLocaleString("ar-EG", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </p>
      <p className="text-xs text-slate-600">
        يُحتسب تقرير الرواتب من مجموع الأساسي والبدلات لنسبة الفترة (أيام ÷ ٣٠)، وتُشتق قيمة الدقيقة من المجموع ÷ (٣٠×٨×٦٠).
      </p>
    </fieldset>
  );
}

/** الراتب الأساسي + بدلات السكن والمواصلات مع عرض المجموع الشهري مباشرة. */
export function EmployeePayrollPackageFields(props: PackageFieldsProps) {
  const { formKey, defaultBase = "", defaultHousing = "", defaultTransport = "" } = props;
  const resetKey = `${formKey}|${defaultBase}|${defaultHousing}|${defaultTransport}`;
  return <EmployeePayrollPackageFieldsInner key={resetKey} {...props} />;
}
