import { redirect } from "next/navigation";

/** المسار القديم؛ أجهزة البصمة أصبحت ضمن التجهيز (`/master/devices`). */
export default async function LegacyDevicesRedirectPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const qs = new URLSearchParams();
  for (const [key, val] of Object.entries(sp)) {
    if (val === undefined) continue;
    if (Array.isArray(val)) {
      for (const item of val) qs.append(key, item);
    } else {
      qs.append(key, val);
    }
  }
  const tail = qs.toString();
  redirect(tail ? `/master/devices?${tail}` : "/master/devices");
}
