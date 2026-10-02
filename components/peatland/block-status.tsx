"use client"

// Papan status block (gaya "dashboard digital twin" referensi): satu tile per block
// berwarna level EWS + ringkasan jumlah block per level dan statistik sistem.
// Klik tile = pilih block (halaman memfokuskan peta / twin ke block itu).
// Dipakai di Map View dan Digital Twin; isi saja, wadah kartu dari halaman.

import { EWS_LEVELS, EWS_META, BLOCK_COLOR, type EwsLevel } from "@/lib/peatland/digital-twin"
import { BLOCK_ZONES } from "@/lib/peatland/block-zones"
import { cn } from "@/lib/utils"

export type BlockStat = { label: string; value: string; sub?: string; color?: string }

export function BlockStatusBoard({
  levels,
  sensors,
  selected,
  onSelect,
  stats = [],
  className,
}: {
  levels: Record<string, EwsLevel>
  /** Jumlah sensor per block (opsional, tampil di tile). */
  sensors?: Record<string, number>
  /** Block terpilih (division); selain nama block = tidak ada yang terpilih. */
  selected: string
  onSelect: (block: string) => void
  /** Statistik sistem di kolom ringkasan, mis. total sensor & hotspot aktif. */
  stats?: BlockStat[]
  className?: string
}) {
  const counts = EWS_LEVELS.map((l) => ({ level: l, n: BLOCK_ZONES.filter((z) => levels[z.block] === l).length })).reverse()

  return (
    <div className={cn("grid gap-3 lg:grid-cols-[minmax(0,1fr)_264px]", className)}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5" role="group" aria-label="Status block">
        {BLOCK_ZONES.map((z) => {
          const level = levels[z.block] ?? "normal"
          const c = EWS_META[level].color
          const on = selected === z.block
          return (
            <button
              key={z.block}
              type="button"
              onClick={() => onSelect(z.block)}
              aria-pressed={on}
              title={on ? `Tampilkan semua block` : `Fokus ke ${z.block}`}
              className={cn(
                "group relative flex min-w-0 flex-col items-start gap-1 overflow-hidden rounded-[11px] border px-3 pb-2.5 pt-2 text-left transition-[transform,box-shadow,border-color] hover:-translate-y-px",
                on && "ring-2 ring-white/70 ring-offset-0"
              )}
              style={{
                borderColor: `color-mix(in srgb, ${c} ${on ? 70 : 38}%, transparent)`,
                background: `linear-gradient(160deg, color-mix(in srgb, ${c} ${on ? 26 : 17}%, transparent), color-mix(in srgb, ${c} 5%, transparent))`,
              }}
            >
              <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: BLOCK_COLOR[z.block] }} />
              <span className="flex w-full items-center justify-between gap-2">
                <span className="font-mono text-[11px] font-bold tracking-[0.06em] text-white/90">{z.block.toUpperCase()}</span>
                <span
                  className={cn("size-2 shrink-0 rounded-full", level === "awas" && "animate-pulse")}
                  style={{ background: c, boxShadow: `0 0 8px ${c}` }}
                />
              </span>
              <span className="text-[17px] font-bold leading-tight tracking-[-0.01em]" style={{ color: c }}>
                {EWS_META[level].label}
              </span>
              <span className="flex w-full flex-col font-mono text-[10.5px] leading-snug tabular-nums text-white/55">
                <span className="truncate">{z.areaHa.toLocaleString("id-ID")} ha</span>
                <span className="truncate">
                  {z.sectors.length} sector{sensors?.[z.block] != null && ` · ${sensors[z.block]} sensor`}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-[11px] border border-white/[0.07] bg-black/20 px-3 py-2.5 sm:grid-cols-4 lg:grid-cols-2">
        {stats.map((s) => (
          <div key={s.label} className="min-w-0">
            <span className="kicker block whitespace-nowrap text-white/45">{s.label}</span>
            <b className="block font-mono text-[18px] font-bold leading-tight tabular-nums" style={{ color: s.color ?? "#ecf6f0" }}>
              {s.value}
            </b>
            {s.sub && <span className="block truncate text-[10.5px] text-white/45">{s.sub}</span>}
          </div>
        ))}
        {counts.map(({ level, n }) => (
          <div key={level} className="flex items-center justify-between gap-2 text-[11.5px]">
            <span className="inline-flex items-center gap-1.5 text-white/65">
              <span className="size-2 rounded-full" style={{ background: EWS_META[level].color }} />
              Block {EWS_META[level].label}
            </span>
            <b className={cn("font-mono tabular-nums", n ? "" : "text-white/35")} style={n ? { color: EWS_META[level].color } : undefined}>
              {n}
            </b>
          </div>
        ))}
      </div>
    </div>
  )
}
