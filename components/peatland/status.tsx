// Bahasa status bersama semua halaman: EWS 4 level (Normal / Waspada / Siaga /
// Awas, lihat [[digital-twin]]) + offline untuk perangkat, plus nada lama
// (normal / warning / critical / info) untuk KPI yang bukan ambang EWS.

import { EWS_LEVELS, EWS_META, type EwsLevel } from "@/lib/peatland/digital-twin"
import type { StationLevel } from "@/lib/peatland/stations"
import { cn } from "@/lib/utils"

export type Tone = "normal" | "warning" | "critical" | "info" | "offline" | EwsLevel

export const OFFLINE_COLOR = "#8a9a92"

/** Warna hex tiap nada (dipakai teks nilai, titik status, garis grafik). */
export const TONE_COLOR: Record<Tone, string> = {
  normal: EWS_META.normal.color,
  waspada: EWS_META.waspada.color,
  siaga: EWS_META.siaga.color,
  awas: EWS_META.awas.color,
  warning: "#fbbf24",
  critical: "#f87171",
  info: "#38bdf8",
  offline: OFFLINE_COLOR,
}

export function levelColor(level: StationLevel): string {
  return level === "offline" ? OFFLINE_COLOR : EWS_META[level].color
}

export function levelLabel(level: StationLevel): string {
  return level === "offline" ? "Offline" : EWS_META[level].label
}

/** Pil status EWS: titik + label kapital mono, warna mengikuti level. */
export function EwsPill({
  level,
  label,
  className,
  pulse,
}: {
  level: StationLevel
  label?: string
  className?: string
  /** Titik berkedip (untuk Awas / offline yang perlu perhatian). */
  pulse?: boolean
}) {
  const c = levelColor(level)
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-[2px] font-mono text-[9.5px] font-bold uppercase tracking-[0.1em]",
        className
      )}
      style={{ color: c, borderColor: `color-mix(in srgb, ${c} 45%, transparent)`, background: `color-mix(in srgb, ${c} 10%, transparent)` }}
    >
      <span className={cn("size-1.5 rounded-full", pulse && "animate-pulse")} style={{ background: c, boxShadow: `0 0 6px ${c}` }} />
      {label ?? levelLabel(level)}
    </span>
  )
}

/** Titik + teks status sederhana (tabel padat). */
export function StatusDot({ tone, label, className }: { tone: Tone; label: string; className?: string }) {
  const c = TONE_COLOR[tone]
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11.5px] font-medium", className)} style={{ color: c }}>
      <span className="size-1.5 rounded-full" style={{ background: c }} />
      {label}
    </span>
  )
}

/** Skala EWS horizontal 4 langkah; `active` menyorot level saat ini. */
export function EwsScale({
  active,
  ranges,
  className,
}: {
  active?: EwsLevel
  /** Teks ambang per level, mis. { normal: "≥ −30 cm", ... }. */
  ranges?: Partial<Record<EwsLevel, string>>
  className?: string
}) {
  return (
    <div className={cn("grid grid-cols-4 gap-1", className)}>
      {EWS_LEVELS.map((l) => {
        const on = l === active
        const c = EWS_META[l].color
        return (
          <div
            key={l}
            className={cn("rounded-md border px-2 py-1.5 transition-colors", on ? "" : "opacity-60")}
            style={{
              borderColor: `color-mix(in srgb, ${c} ${on ? 60 : 25}%, transparent)`,
              background: `color-mix(in srgb, ${c} ${on ? 16 : 6}%, transparent)`,
            }}
          >
            <span className="block h-1 rounded-full" style={{ background: c }} />
            <span className="mt-1 block font-mono text-[9.5px] font-bold uppercase tracking-[0.1em]" style={{ color: c }}>
              {EWS_META[l].label}
            </span>
            {ranges?.[l] && <span className="block text-[10px] text-white/55">{ranges[l]}</span>}
          </div>
        )
      })}
    </div>
  )
}
