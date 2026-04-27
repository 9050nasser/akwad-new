import { cn } from "@/lib/cn";

/** الاسم + لاحقة «Pro/برو» بنفس سُمك الخط (bold) وحجم أصغر؛ بدون proMark يعرض الاسم فقط. */
export function BrandWithPro({
  name,
  proMark,
  className,
  nameClassName,
  proClassName,
}: {
  name: string;
  proMark?: string;
  className?: string;
  nameClassName?: string;
  proClassName?: string;
}) {
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-1 gap-y-0", className)}>
      <span className={nameClassName}>{name}</span>
      {proMark ? <span className={cn("font-bold", proClassName)}>{proMark}</span> : null}
    </span>
  );
}
