"use client"

// Detail satu block (setara "detail 1 cluster" referensi): tabel sector S1–S5
// (luas, jumlah sensor, level terburuk), komponen terpasang per jenis vs desain
// referensi, dan kartu jenis sensor. Klik sector = fokus peta / twin ke sector itu.
// `variant="compact"` untuk kolom kanan Digital Twin (tanpa kartu jenis).

import { ASSET_TYPE_META, BLOCK_COLOR, EWS_META, type EwsLevel } from "@/lib/peatland/digital-twin"
import { blockZone } from "@/lib/peatland/block-zones"
import type { MarkerLayer } from "@/lib/peatland/map-points"
import { STATIONS, STATION_TYPE_LABEL, sectorSummaries } from "@/lib/peatland/stations"
import { cn } from "@/lib/utils"
import { SensorIcon } from "./sensor-icon"

// Urutan & desain referensi per cluster (jumlah per ±10.000 ha, "Komponen utama / cluster").
const COMPONENTS: { type: MarkerLayer; design: string; spec: string }[] = [
  { type: "borehole", design: "10–15", spec: "Pressure transducer · log 5 menit · LoRaWAN" },
  { type: "water-station", design: "—", spec: "Muka air tanah & kanal · ultrasonik" },
  { type: "peat-station", design: "8–12", spec: "Kelembapan & suhu gambut · 3 kedalaman" },
  { type: "rain-gauge", design: "3–5", spec: "Tipping bucket 0,2 mm · GSM" },
  { type: "water-gate", design: "sesuai lokasi", spec: "Aktuator pintu · SCADA · mode auto" },
  { type: "gateway", design: "4–6", spec: "LoRaWAN 923 MHz · mast 6–12 m · 4G/satelit" },
  { type: "cctv", design: "opsional", spec: "Kamera PTZ 1080p · lokasi kritis · 4G" },
  { type: "aws", design: "1 (shared)", spec: "Suhu, RH, angin, tekanan, radiasi" },
  { type: "fire-hotspot", design: "satelit", spec: "Deteksi VIIRS NOAA-20 · 375 m" },
]

function LevelDot({ level, className }: { level: EwsLevel; className?: string }) {
  const c = EWS_META[level].color
  return <span className={cn("size-2 shrink-0 rounded-full", className)} style={{ background: c, boxShadow: `0 0 6px ${c}` }} />
}

export function BlockDetail({
  block,
  level,
  selectedSector,
  onSelectSector,
  variant = "full",
  className,
}: {
  block: string
  /** Level EWS block (tile status). */
  level: EwsLevel
  selectedSector: string | null
  /** Klik baris sector; dipanggil dengan id yang sama untuk membatalkan. */
  onSelectSector: (id: string | null) => void
  variant?: "full" | "compact"
  className?: string
}) {
  const zone = blockZone(block)
  if (!zone) return null
  const sectors = sectorSummaries(block)
  const stations = STATIONS.filter((s) => s.block === block)
  // AWS dipakai bersama: tampil di semua block walau fisiknya di satu block.
  const shared = STATIONS.filter((s) => s.type === "aws" && s.block !== block)
  const scope = selectedSector ? stations.filter((s) => s.sector === selectedSector) : stations
  const rows = COMPONENTS.map((c) => {
    const own = scope.filter((s) => s.type === c.type)
    const extra = c.type === "aws" && !selectedSector ? shared.length : 0
    return { ...c, total: own.length, offline: own.filter((s) => s.level === "offline").length, shared: extra }
  }).filter((r) => r.total > 0 || r.shared > 0 || variant === "full")
  const compact = variant === "compact"

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className={cn("grid gap-3", !compact && "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]")}>
        {/* Sector */}
        <div className="min-w-0 rounded-[11px] border border-white/[0.07] bg-black/20">
          <div className="flex items-center justify-between px-3 pb-1.5 pt-2.5">
            <span className="kicker text-white/50">Sector · {zone.sectors.length}</span>
            <span className="text-[10.5px] text-white/45">{selectedSector ? "klik lagi untuk seluruh block" : "klik sector untuk fokus"}</span>
          </div>
          <div className="flex flex-col px-1.5 pb-1.5" role="group" aria-label={`Sector ${block}`}>
            {sectors.map((s) => {
              const on = s.id === selectedSector
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectSector(on ? null : s.id)}
                  aria-pressed={on}
                  className={cn(
                    "grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors",
                    on ? "bg-white/[0.08] ring-1 ring-white/30" : "hover:bg-white/[0.04]"
                  )}
                >
                  <span
                    className="rounded-md py-0.5 text-center font-mono text-[11px] font-bold text-white"
                    style={{ background: `color-mix(in srgb, ${BLOCK_COLOR[block]} 55%, #04100b)` }}
                  >
                    {s.id}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-[11px] tabular-nums text-white/80">
                      {s.areaHa.toLocaleString("id-ID")} ha · {s.stations.length} sensor
                    </span>
                    <span className="flex flex-wrap gap-1 pt-0.5">
                      {COMPONENTS.filter((c) => s.stations.some((x) => x.type === c.type)).map((c) => (
                        <span key={c.type} className="inline-flex items-center gap-0.5 text-[9.5px] tabular-nums text-white/55" title={STATION_TYPE_LABEL[c.type]}>
                          <SensorIcon type={c.type} className="size-2.5" style={{ color: ASSET_TYPE_META[c.type].color }} />
                          {s.stations.filter((x) => x.type === c.type).length}
                        </span>
                      ))}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-0.5">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: EWS_META[s.level].color }}>
                      <LevelDot level={s.level} />
                      {EWS_META[s.level].label}
                    </span>
                    {s.offline > 0 && <span className="text-[9.5px] text-white/45">{s.offline} offline</span>}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Komponen terpasang */}
        <div className="min-w-0 rounded-[11px] border border-white/[0.07] bg-black/20">
          <div className="flex items-center justify-between px-3 pb-1.5 pt-2.5">
            <span className="kicker text-white/50">Komponen · {selectedSector ?? "seluruh block"}</span>
            <span className="inline-flex items-center gap-1.5 text-[10.5px] text-white/45">
              <LevelDot level={level} />
              Block {EWS_META[level].label}
            </span>
          </div>
          <table className="w-full text-left text-[11.5px]">
            <thead>
              <tr className="text-[9.5px] uppercase tracking-[0.08em] text-white/40">
                <th className="px-3 pb-1 font-medium">Jenis</th>
                <th className="px-2 pb-1 text-right font-medium">Terpasang</th>
                {!compact && <th className="px-2 pb-1 text-right font-medium">Online</th>}
                <th className="px-3 pb-1 text-right font-medium">Desain ref.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.type} className={cn("border-t border-white/[0.05]", r.total + r.shared === 0 && "opacity-40")}>
                  <td className="px-3 py-1">
                    <span className="flex min-w-0 items-center gap-2 text-white/80">
                      <SensorIcon type={r.type} style={{ color: ASSET_TYPE_META[r.type].color }} />
                      <span className="truncate">{STATION_TYPE_LABEL[r.type]}</span>
                    </span>
                  </td>
                  <td className="px-2 py-1 text-right font-mono font-semibold tabular-nums text-white/90">
                    {r.total}
                    {r.shared > 0 && <span className="font-normal text-white/45"> +{r.shared} shared</span>}
                    {compact && r.offline > 0 && <span className="ml-1 font-normal text-[#94a3b8]">({r.offline} off)</span>}
                  </td>
                  {!compact && (
                    <td className="px-2 py-1 text-right font-mono tabular-nums text-white/70">
                      {r.total - r.offline}
                      {r.offline > 0 && <span className="text-[#94a3b8]"> · {r.offline} off</span>}
                    </td>
                  )}
                  <td className="px-3 py-1 text-right text-[11px] text-white/50">{r.design}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-white/[0.05] px-3 py-1.5 text-[10px] text-white/40">
            Desain ref. = jumlah per cluster ±10.000 ha (reference design). Block ini {zone.areaHa.toLocaleString("id-ID")} ha.
          </p>
        </div>
      </div>

      {/* Kartu jenis sensor (ilustrasi; foto asli bisa menyusul) */}
      {!compact && (
        <div className="peat-scroll flex gap-2 overflow-x-auto pb-1">
          {COMPONENTS.filter((c) => stations.some((s) => s.type === c.type) || (c.type === "aws" && shared.length)).map((c) => {
            const color = ASSET_TYPE_META[c.type].color
            const n = stations.filter((s) => s.type === c.type).length
            return (
              <div
                key={c.type}
                className="flex w-[150px] shrink-0 flex-col gap-2 rounded-[11px] border p-2.5"
                style={{ borderColor: `color-mix(in srgb, ${color} 28%, transparent)`, background: `linear-gradient(180deg, color-mix(in srgb, ${color} 12%, transparent), transparent)` }}
              >
                <span
                  className="grid h-[64px] place-items-center rounded-lg"
                  style={{ background: `radial-gradient(circle at 50% 40%, color-mix(in srgb, ${color} 30%, transparent), rgba(4,16,11,0.6) 70%)` }}
                >
                  <SensorIcon type={c.type} className="size-9" style={{ color, filter: `drop-shadow(0 0 8px ${color})` }} />
                </span>
                <span className="text-[11.5px] font-semibold leading-tight text-white/90">{STATION_TYPE_LABEL[c.type]}</span>
                <span className="text-[10px] leading-snug text-white/50">{c.spec}</span>
                <span className="mt-auto font-mono text-[10.5px] tabular-nums text-white/70">
                  {n ? `${n} unit di block` : "shared · block lain"}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
