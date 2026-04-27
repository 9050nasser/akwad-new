import Link from "next/link";
import { FlashBanner } from "@/components/flash-banner";
import { Label, PrimaryButton, fieldClass } from "@/components/ui-fields";
import { updatePlatformAdminPassword } from "@/app/actions/platform";
import { firstQuery, formatFlash } from "@/lib/flash";
import { platformSurface } from "@/lib/platform-surface";
import { getUiLocale, getUiThemeForPlatform } from "@/lib/ui/prefs";
import { requirePlatformSession } from "@/lib/tenant";
import { cn } from "@/lib/cn";

export default async function PlatformPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePlatformSession();
  const [theme, locale] = await Promise.all([getUiThemeForPlatform(), getUiLocale()]);
  const s = platformSurface(theme);

  const sp = (await searchParams) ?? {};
  const flash = formatFlash(sp);
  const invalidMsg =
    locale === "en"
      ? "Check the current password and ensure the new passwords match (min 8 characters)."
      : "تحقق من كلمة المرور الحالية وتطابق الجديدة (٨ أحرف على الأقل).";
  const error = flash.error ?? (firstQuery(sp.err) === "invalid" ? invalidMsg : undefined);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <Link href="/platform/dashboard" className={cn("text-sm", s.link)}>
          ← لوحة التحكم
        </Link>
        <h1 className={cn("mt-3", s.pageTitle)}>تغيير كلمة مرور أدمن المنصة</h1>
        <p className={s.subtitle}>يخص حساب الدخول بمفتاح default فقط.</p>
      </div>

      <FlashBanner notice={flash.notice} error={error} />

      <form action={updatePlatformAdminPassword} className={s.formCard}>
        <div>
          <Label htmlFor="currentPassword">كلمة المرور الحالية</Label>
          <input id="currentPassword" name="currentPassword" type="password" className={fieldClass} required autoComplete="current-password" />
        </div>
        <div>
          <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            className={fieldClass}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <div>
          <Label htmlFor="confirmPassword">تأكيد الجديدة</Label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            className={fieldClass}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <PrimaryButton className="w-full">تحديث كلمة المرور</PrimaryButton>
      </form>
    </div>
  );
}
