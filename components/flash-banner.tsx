type FlashBannerProps = {
  notice?: string | string[];
  error?: string | string[];
};

function normalize(v?: string | string[]) {
  if (!v) return null;
  return Array.isArray(v) ? v.filter(Boolean).join(" — ") : v;
}

export function FlashBanner({ notice, error }: FlashBannerProps) {
  const ok = normalize(notice);
  const bad = normalize(error);
  if (!ok && !bad) return null;
  if (bad) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{bad}</div>
    );
  }
  return (
    <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">{ok}</div>
  );
}
