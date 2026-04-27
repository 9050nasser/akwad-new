type Tile = { label: string; value: string | number; hint?: string };

export function StatTiles({ tiles }: { tiles: Tile[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm"
        >
          <p className="text-sm text-slate-500">{t.label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{t.value}</p>
          {t.hint ? <p className="mt-2 text-xs text-slate-500">{t.hint}</p> : null}
        </div>
      ))}
    </div>
  );
}
