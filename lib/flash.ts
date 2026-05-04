export function firstQuery(v?: string | string[]) {
  if (Array.isArray(v)) return v[0];
  return v;
}

const ERR: Record<string, string> = {
  required: "يرجى تعبئة الحقول المطلوبة.",
  date: "التاريخ غير صالح.",
  range: "نطاق التاريخ غير صالح.",
  days: "أضف يوماً واحداً على الأقل في جدول الدوام.",
  times:
    "أوقات غير صالحة: في الدوام العادي يجب أن تكون نهاية الدوام بعد البداية في نفس اليوم. فعّل «دوام ممتد» لدوام يعبر منتصف الليل (مثال ٢٢:٠٠ → ٠٦:٠٠).",
  open_hours: "أدخل عدد ساعات صالحاً للدوام المفتوح (أكبر من صفر حتى ٢٤ ساعة).",
  in_use: "لا يمكن الحذف لوجود بيانات مرتبطة.",
  delete: "تعذر الحذف.",
  license_employees: "تم بلوغ الحد الأقصى للموظفين حسب الترخيص.",
  license_devices: "تم بلوغ الحد الأقصى لأجهزة البصمة حسب الترخيص.",
  device_id: "رقم المستخدم على الجهاز غير صالح.",
  employee_branch: "الموظف لا ينتمي لنفس فرع الحركة أو السجل غير المطابق.",
  missing: "السجل غير موجود.",
  not_found: "الدوام غير موجود.",
  email: "البريد الإلكتروني مستخدم مسبقاً.",
  password_short: "كلمة المرور أقصر من الحد الأدنى المعرّف في الإعدادات العامة (لا يقل عن 6).",
  self_delete: "لا يمكنك حذف المستخدم الحالي وهو مسجّل الدخول.",
  catalog_bad: "أحد الخيارات (وظيفة، مشروع، جنسية، مهمة) لا يخص شركتك.",
  department_bad: "القسم المختار غير صالح أو لا يخص شركتك.",
  employee_invalid: "الموظف المختار غير موجود أو لا يخص شركتك.",
  vacation_range: "تاريخ نهاية الإجازة يجب أن يكون بعد أو يساوي تاريخ البداية.",
  deduction_amount: "أدخل مبلغ خصم صالحاً (أكبر من صفر).",
  bonus_amount: "أدخل مبلغ إضافة صالحاً (أكبر من صفر).",
  deduction_month: "شهر الخصم غير صالح (استخدم شكلاً مثل ٢٠٢٦-٠٤).",
  bonus_month: "شهر الإضافة غير صالح (استخدم شكلاً مثل ٢٠٢٦-٠٤).",
  payroll_disabled: "موديول الرواتب غير مفعّل لهذه الشركة.",
  forbidden: "ليست لديك صلاحية لهذه الشاشة أو العملية. راجع مدير النظام.",
  role_exists: "يوجد بالفعل دور بنفس الاسم لهذه الشركة.",
  role_name: "اسم الدور يجب أن يكون حرفين على الأقل.",
  logo_invalid: "الملف ليس صورة PNG أو JPEG أو WebP صالحة.",
  logo_large: "حجم الشعار كبير جداً (الحد ٢ ميجابايت).",
  restore_confirm: "اكتب كلمة «استعادة» في حقل التأكيد كما هو مطلوب.",
  restore_bad_file: "الملف ليس نسخة SQLite صالحة أو فارغ.",
  restore_too_large: "ملف النسخة أكبر من الحد المسموح.",
  restore_failed: "تعذر استعادة الملف. حاول مرة أخرى أو استعد يدوياً من نسخة .pre-restore-* إن وُجدت.",
  password_mismatch: "كلمة المرور الجديدة وتأكيدها غير متطابقين.",
};

export function formatFlash(sp: Record<string, string | string[] | undefined>) {
  const errKey = firstQuery(sp.err);
  const noticeKey = firstQuery(sp.notice);
  const n = firstQuery(sp.n);

  if (errKey) {
    return { error: ERR[errKey] ?? errKey, notice: undefined as string | undefined };
  }

  if (noticeKey === "1") {
    return { notice: "تم تنفيذ العملية بنجاح.", error: undefined as string | undefined };
  }
  if (noticeKey === "role") {
    return {
      notice: "تم إنشاء الدور. اضبط صلاحياته من الجدول أدناه ثم احفظ.",
      error: undefined as string | undefined,
    };
  }
  if (noticeKey === "edit") {
    return { notice: "تم تحديث الدوام بنجاح.", error: undefined as string | undefined };
  }
  if (noticeKey === "posted") {
    return { notice: `تم ترحيل ${n ?? "0"} حركة.`, error: undefined as string | undefined };
  }
  if (noticeKey === "unposted") {
    return { notice: `تم إلغاء ترحيل ${n ?? "0"} حركة.`, error: undefined as string | undefined };
  }
  if (noticeKey === "logo") {
    return { notice: "تم تحديث شعار الشركة.", error: undefined as string | undefined };
  }
  if (noticeKey === "logo_removed") {
    return { notice: "تم إزالة شعار الشركة.", error: undefined as string | undefined };
  }
  if (noticeKey === "restored") {
    return {
      notice:
        "تم استبدال قاعدة البيانات من النسخة المرفوعة. إن لاحظت تعارضاً أعد تشغيل السيرفر. تُحفظ نسخة قبل الاستعادة بجانب ملف القاعدة (.pre-restore-…).",
      error: undefined as string | undefined,
    };
  }
  if (noticeKey === "user") {
    return { notice: "تم تحديث بيانات مستخدم الدخول.", error: undefined as string | undefined };
  }

  return { notice: undefined as string | undefined, error: undefined as string | undefined };
}
