/** إعدادات الحضور/الإضافي المخزّنة على الشركة — تُستخدم في التقارير والرواتب. */

export type CompanyAttendancePolicy = {
  lateGraceMinutes: number;
  punchDedupeMinutes: number;
  fridayIsWorkday: boolean;
};

export type CompanyOvertimePolicy = {
  overtimeAfterMinutes: number;
  overtimeRoundMinutes: number;
};

export function normalizeAttendancePolicy(
  row: Partial<{
    lateGraceMinutes: number | null;
    punchDedupeMinutes: number | null;
    fridayIsWorkday: boolean | null;
  }> | null,
): CompanyAttendancePolicy {
  return {
    lateGraceMinutes: Math.max(0, Math.floor(row?.lateGraceMinutes ?? 0)),
    punchDedupeMinutes: Math.max(0, Math.floor(row?.punchDedupeMinutes ?? 0)),
    fridayIsWorkday: row?.fridayIsWorkday ?? true,
  };
}

export function normalizeOvertimePolicy(
  row: Partial<{
    overtimeAfterMinutes: number | null;
    overtimeRoundMinutes: number | null;
  }> | null,
): CompanyOvertimePolicy {
  return {
    overtimeAfterMinutes: Math.max(0, Math.floor(row?.overtimeAfterMinutes ?? 0)),
    overtimeRoundMinutes: Math.max(1, Math.floor(row?.overtimeRoundMinutes ?? 15)),
  };
}

/** يطبّق عتبة «بعد كذا دقيقة» ثم تقريب لأسفل حسب خطوة الدقائق. */
export function applyCompanyOvertimeMinutes(raw: number, policy: CompanyOvertimePolicy): number {
  if (raw <= 0) return 0;
  const after = Math.max(0, policy.overtimeAfterMinutes);
  let x = Math.max(0, raw - after);
  const step = Math.max(1, policy.overtimeRoundMinutes);
  x = Math.floor(x / step) * step;
  return x;
}
