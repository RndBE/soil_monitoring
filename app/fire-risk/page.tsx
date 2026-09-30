"use client"

import { useMemo, useState } from "react"
import {
  BoxIcon,
  ChevronDownIcon,
  CloudRainIcon,
  FlameIcon,
  GaugeIcon,
  MapPinIcon,
  ShieldCheckIcon,
  SunIcon,
  WavesIcon,
} from "lucide-react"
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { toast } from "sonner"

import { PeatShell } from "@/components/peatland/peat-shell"
import { Panel, PanelHeader, TableScroll, ViewAll, tableRow, tableTd, tableTh } from "@/components/peatland/panel"
import { StatTile } from "@/components/peatland/stat-tile"
import { EwsPill, EwsScale, StatusDot, type Tone } from "@/components/peatland/status"
import {
  FIRE_BANDS,
  FIRE_LINES,
  axisProps,
  bandProps,
  gridProps,
  lineProps,
  tooltipStyle,
} from "@/components/peatland/chart-theme"
import { OpenInTwin } from "@/components/peatland/open-in-twin"
import {
  EWS_LEVELS,
  EWS_META,
  SCENARIO_PRESETS,
  TWIN_BLOCKS,
  TWIN_LAYERS,
  buildHistoryFrames,
  ewsFromFireRisk,
  ewsFromWaterTable,
  getBlockBaseline,
  rampColor,
  simulateScenario,
  summarizeFrame,
  type EwsLevel,
} from "@/lib/peatland/digital-twin"
import { fireRiskTrend, waterTableTrend } from "@/lib/peatland/mock-data"
import { formatLatLng, stationsOfType, type Station } from "@/lib/peatland/stations"
import { useDashboardFilters } from "@/lib/peatland/filters"
import { ALL_BLOCKS, matchesBlock, scaleNumber } from "@/lib/peatland/filter-logic"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Tanggal & tren indeks

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** Label "28 Aug" untuk `offset` hari dari 4 Sep 2024 (awal histori telemetri). */
function dayLabel(offset: number): string {
  const d = new Date(Date.UTC(2024, 8, 4 + offset))
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
}

// Arsip indeks harian sebelum 4 Sep (rekap harian, estimasi) — deterministik.
function archiveRisk(daysBefore: number): number {
  return Math.round(64 - daysBefore * 0.95 + 3 * Math.sin(daysBefore * 1.3))
}

const TREND_RANGES = [
  { key: "7 Days", days: 7 },
  { key: "14 Days", days: 14 },
  { key: "30 Days", days: 30 },
] as const
type TrendKey = (typeof TREND_RANGES)[number]["key"]

type TrendPoint = { day: string; value: number; archive: boolean }

/** Deret indeks berakhir 10 Sep: 4–10 Sep dari telemetri, sebelumnya dari arsip. */
function buildTrend(days: number, estate: string): TrendPoint[] {
  const scale = (v: number) => Math.min(100, scaleNumber(v, estate))
  const extra = Math.max(0, days - fireRiskTrend.length)
  const archive = Array.from({ length: extra }, (_, i) => {
    const back = extra - i
    return { day: dayLabel(-back), value: scale(archiveRisk(back)), archive: true }
  })
  return [...archive, ...fireRiskTrend.map((d) => ({ day: d.day, value: scale(d.value), archive: false }))]
}

/** Tanggal pertama level EWS terakhir berlaku tanpa putus. */
function levelSince(series: TrendPoint[]): string {
  const lvl = ewsFromFireRisk(series[series.length - 1].value)
  let i = series.length - 1
  while (i > 0 && ewsFromFireRisk(series[i - 1].value) === lvl) i -= 1
  return series[i].day
}

const FIRE_RANGE: Record<EwsLevel, string> = { normal: "0–49", waspada: "50–69", siaga: "70–84", awas: "85–100" }

const ADVICE: Record<EwsLevel, string> = {
  normal: "Routine patrols. Hot-work allowed with standard precautions; keep canal blocks closed.",
  waspada: "Increase patrols in dry blocks, check canal blocks and water gates, brief fire crews.",
  siaga:
    "Hot-work permits suspended. Increase patrol frequency and pre-position suppression units near active blocks.",
  awas: "Extreme danger. Fire crews on 24h standby, suppression units deployed to hotspots, notify BPBD.",
}

const fmtSigned = (v: number) => `${v < 0 ? "−" : ""}${Math.abs(v)}`

/** Warna ramp twin (sRGB 0–1) → CSS rgb dengan alpha opsional. */
function rampCss(v: number, alpha = 1): string {
  const [r, g, b] = rampColor("fireRisk", v).map((c) => Math.round(c * 255))
  return alpha < 1 ? `rgb(${r} ${g} ${b} / ${alpha})` : `rgb(${r} ${g} ${b})`
}

const FIRE_RAMP_CSS = `linear-gradient(90deg, ${(TWIN_LAYERS.find((l) => l.key === "fireRisk")?.stops ?? [])
  .map(([v, c]) => `${c} ${v}%`)
  .join(", ")})`

// ---------------------------------------------------------------------------
// Komponen FWI (Canadian FWI System). Tiap kode punya skala sendiri; batas kelas
// CFFDRS High / Very High / Extreme dipetakan ke Waspada / Siaga / Awas.

type FwiComponent = { code: string; name: string; value: number; max: number; th: [number, number, number] }

const FWI_COMPONENTS: FwiComponent[] = [
  { code: "FFMC", name: "Fine Fuel Moisture Code", value: 88, max: 101, th: [85, 89, 92] },
  { code: "DMC", name: "Duff Moisture Code", value: 64, max: 100, th: [28, 41, 61] },
  { code: "ISI", name: "Initial Spread Index", value: 12, max: 25, th: [5, 10, 15] },
  { code: "BUI", name: "Buildup Index", value: 70, max: 120, th: [34, 54, 77] },
  { code: "FWI", name: "Fire Weather Index", value: 38, max: 50, th: [11, 19, 30] },
]

function fwiLevel(c: FwiComponent, v: number): EwsLevel {
  if (v >= c.th[2]) return "awas"
  if (v >= c.th[1]) return "siaga"
  if (v >= c.th[0]) return "waspada"
  return "normal"
}

function FwiRow({ c, value }: { c: FwiComponent; value: number }) {
  const lvl = fwiLevel(c, value)
  const edges = [0, ...c.th, c.max]
  const color = EWS_META[lvl].color
  return (
    <div className="grid grid-cols-[minmax(0,118px)_minmax(0,1fr)_64px] items-center gap-3">
      <div className="min-w-0">
        <span className="block font-mono text-[11.5px] font-bold text-white/85">{c.code}</span>
        <span className="block truncate text-[10px] text-white/50">{c.name}</span>
      </div>
      <div
        className="relative h-2.5"
        role="img"
        aria-label={`${c.code} ${value} pada skala 0–${c.max}, ${EWS_META[lvl].label}`}
      >
        <div className="absolute inset-0 flex overflow-hidden rounded-full">
          {EWS_LEVELS.map((l, i) => (
            <div
              key={l}
              className="h-full"
              style={{
                width: `${((edges[i + 1] - edges[i]) / c.max) * 100}%`,
                background: EWS_META[l].color,
                opacity: l === lvl ? 0.85 : 0.2,
              }}
            />
          ))}
        </div>
        <span
          className="absolute -top-1 h-[18px] w-[3px] -translate-x-1/2 rounded-full bg-white shadow-[0_0_0_1.5px_rgba(4,16,11,0.9)]"
          style={{ left: `${Math.min(100, (value / c.max) * 100)}%` }}
        />
      </div>
      <div className="text-right">
        <span className="block text-[14px] font-bold leading-tight tabular-nums" style={{ color }}>
          {value}
          <span className="ml-0.5 text-[10px] font-medium text-white/50">/{c.max}</span>
        </span>
        <span className="block font-mono text-[9.5px] font-bold uppercase tracking-[0.1em]" style={{ color }}>
          {EWS_META[lvl].label}
        </span>
      </div>
    </div>
  )
}

/** Bar EWS tersegmentasi (0/50/70/85/100) dengan penanda nilai — tanpa isi penuh. */
function RiskBar({ value, level }: { value: number; level: EwsLevel }) {
  return (
    <div className="relative pb-4 pt-1.5" role="img" aria-label={`Indeks ${value} dari 100, level ${EWS_META[level].label}`}>
      <div className="flex h-3 overflow-hidden rounded-full">
        {FIRE_BANDS.map((b) => (
          <div
            key={b.level}
            className="h-full border-l-2 border-[rgba(4,16,11,0.9)] first:border-l-0"
            style={{ width: `${b.y2 - b.y1}%`, background: EWS_META[b.level].color, opacity: b.level === level ? 0.9 : 0.25 }}
          />
        ))}
      </div>
      <span
        className="absolute top-0 h-[22px] w-1 -translate-x-1/2 rounded-full bg-white shadow-[0_0_0_2px_rgba(4,16,11,0.9)]"
        style={{ left: `${value}%` }}
      />
      {[0, 50, 70, 85, 100].map((t) => (
        <span
          key={t}
          className={cn(
            "absolute bottom-0 font-mono text-[9.5px] text-white/50",
            t === 0 ? "" : t === 100 ? "-translate-x-full" : "-translate-x-1/2"
          )}
          style={{ left: `${t}%` }}
        >
          {t}
        </span>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Hotspot VIIRS — dari registri stasiun (HS-01..04)

type HotspotStatus = "Investigating" | "Confirmed" | "Extinguished" | "False positive"
type Confidence = "High" | "Nominal" | "Low"

const CONFIDENCE_FILTERS = ["All", "High", "Nominal", "Low"] as const
type ConfFilter = (typeof CONFIDENCE_FILTERS)[number]

const isActive = (s: HotspotStatus) => s === "Investigating" || s === "Confirmed"

const STATUS_TONE: Record<HotspotStatus, Tone> = {
  Investigating: "warning",
  Confirmed: "critical",
  Extinguished: "normal",
  "False positive": "offline",
}
const CONF_TONE: Record<Confidence, Tone> = { High: "critical", Nominal: "warning", Low: "info" }

const STATUS_MSG: Record<HotspotStatus, string> = {
  Investigating: "dikembalikan ke investigasi",
  Confirmed: "dikonfirmasi sebagai titik api",
  Extinguished: "ditandai padam",
  "False positive": "ditandai positif palsu",
}

// Aksi yang tersedia per status (selalu ada jalan balik).
const ACTIONS: Record<HotspotStatus, { to: HotspotStatus; label: string; kind: "danger" | "ok" | "muted" }[]> = {
  Investigating: [
    { to: "Confirmed", label: "Confirm", kind: "danger" },
    { to: "False positive", label: "False positive", kind: "muted" },
  ],
  Confirmed: [
    { to: "Extinguished", label: "Extinguished", kind: "ok" },
    { to: "Investigating", label: "Undo confirm", kind: "muted" },
  ],
  Extinguished: [{ to: "Confirmed", label: "Reopen", kind: "muted" }],
  "False positive": [{ to: "Investigating", label: "Reopen", kind: "muted" }],
}

const actionClass: Record<"danger" | "ok" | "muted", string> = {
  danger: "text-red-300 ring-red-400/30 hover:bg-red-500/15",
  ok: "text-emerald-300 ring-emerald-400/30 hover:bg-emerald-500/15",
  muted: "text-white/65 ring-white/12 hover:bg-white/[0.06]",
}

// Confidence VIIRS & status verifikasi awal (sesuai catatan registri).
const HOTSPOT_META: Record<string, { confidence: Confidence; status: HotspotStatus }> = {
  "HS-01": { confidence: "Nominal", status: "Investigating" },
  "HS-02": { confidence: "High", status: "Confirmed" },
  "HS-03": { confidence: "High", status: "Extinguished" },
  "HS-04": { confidence: "Low", status: "False positive" },
}

type Hotspot = {
  code: string
  block: string
  coords: string
  twinId: string | null
  frp: number
  detected: string
  confidence: Confidence
  level: EwsLevel
}

const HOTSPOTS: Hotspot[] = stationsOfType("fire-hotspot").map((s) => ({
  code: s.code,
  block: s.block,
  coords: formatLatLng(s.lat, s.lng),
  twinId: s.twinId,
  frp: s.value ?? 0,
  detected: /Sep/.test(s.lastSeen) ? s.lastSeen : `10 Sep ${s.lastSeen}`,
  confidence: HOTSPOT_META[s.code]?.confidence ?? "Nominal",
  level: s.level === "offline" ? "normal" : s.level,
}))

const INITIAL_STATUS: Record<string, HotspotStatus> = Object.fromEntries(
  HOTSPOTS.map((h) => [h.code, HOTSPOT_META[h.code]?.status ?? "Investigating"])
)

const RAIN_GAUGES = stationsOfType("rain-gauge")
const dryDaysOf = (g: Station) => Number(g.note?.match(/(\d+) hari tanpa hujan/)?.[1] ?? 0)

const LEVEL_RANK: Record<EwsLevel, number> = { normal: 0, waspada: 1, siaga: 2, awas: 3 }

export default function FireRiskPage() {
  const { estate, division } = useDashboardFilters()

  const [trendRange, setTrendRange] = useState<TrendKey>("7 Days")
  const [rangeOpen, setRangeOpen] = useState(false)
  const [statuses, setStatuses] = useState<Record<string, HotspotStatus>>(INITIAL_STATUS)
  const [confFilter, setConfFilter] = useState<ConfFilter>("All")
  const [dispatched, setDispatched] = useState(0)

  // Indeks komposit estate (7 hari telemetri) + deret sesuai rentang grafik.
  const week = useMemo(() => buildTrend(7, estate), [estate])
  const trendDays = TREND_RANGES.find((r) => r.key === trendRange)?.days ?? 7
  const trend = useMemo(() => buildTrend(trendDays, estate), [trendDays, estate])
  const archiveEnd = [...trend].reverse().find((d) => d.archive)?.day

  const riskScore = week[week.length - 1].value
  const riskDelta = riskScore - week[week.length - 2].value
  const level = ewsFromFireRisk(riskScore)
  const since = levelSince(week)

  // FWI per estate; tiap komponen dibatasi skala maksimumnya.
  const fwi = useMemo(
    () => FWI_COMPONENTS.map((c) => ({ c, value: Math.min(c.max, scaleNumber(c.value, estate)) })),
    [estate]
  )
  const fwiMain = fwi.find((f) => f.c.code === "FWI") ?? fwi[fwi.length - 1]
  const fwiMainLevel = fwiLevel(fwiMain.c, fwiMain.value)

  // Twin: frame live per block + proyeksi kemarau 7 hari (preset "dry").
  const twin = useMemo(() => {
    const baseline = getBlockBaseline(estate)
    const history = buildHistoryFrames(baseline)
    const live = history[history.length - 1]
    const dry = SCENARIO_PRESETS.find((p) => p.key === "dry") ?? SCENARIO_PRESETS[0]
    const frames = simulateScenario(baseline, { ...dry.scenario, days: 7 })
    return { baseline, history, live, dry, end: frames[frames.length - 1] }
  }, [estate])

  const scopeBlocks = TWIN_BLOCKS.filter((b) => matchesBlock(b, division))
  const twinNow = summarizeFrame(twin.live, twin.baseline, scopeBlocks).fireRisk
  const twinDry = summarizeFrame(twin.end, twin.baseline, scopeBlocks).fireRisk

  // Hotspot + status verifikasi (state) → KPI, pin per block, tabel.
  const hotspots = HOTSPOTS.map((h) => ({ ...h, status: statuses[h.code] }))
  const inDivision = hotspots.filter((h) => matchesBlock(h.block, division))
  const activeHs = inDivision.filter((h) => isActive(h.status))
  const visibleHs = inDivision.filter((h) => confFilter === "All" || h.confidence === confFilter)
  const hsTone: Tone = activeHs.length
    ? activeHs.reduce<EwsLevel>((acc, h) => (LEVEL_RANK[h.level] > LEVEL_RANK[acc] ? h.level : acc), "normal")
    : "normal"
  const activeBlocks = [...new Set(activeHs.map((h) => h.block))]

  const blockRisk = TWIN_BLOCKS.map((block) => {
    const index = twin.live.blocks[block].fireRisk
    return {
      block,
      index,
      dry: twin.end.blocks[block].fireRisk,
      wt: twin.live.blocks[block].waterTable,
      level: ewsFromFireRisk(index),
      pins: hotspots.filter((h) => h.block === block && isActive(h.status)).length,
      dim: !matchesBlock(block, division),
    }
  })
  const worst = [...blockRisk].filter((b) => !b.dim).sort((a, b) => b.index - a.index)[0]
  const dryAwas = blockRisk.filter((b) => !b.dim && ewsFromFireRisk(b.dry) === "awas").length

  // Hari tanpa hujan dari penakar (RG-04: 7 hari) — konsisten dengan hujan 24 jam.
  const gauges = RAIN_GAUGES.filter((g) => matchesBlock(g.block, division))
  const driest = gauges.reduce<Station | undefined>((best, g) => (!best || dryDaysOf(g) > dryDaysOf(best) ? g : best), undefined)
  const dryDays = driest ? dryDaysOf(driest) : 0
  const rainAvg = gauges.length
    ? Math.round((gauges.reduce((a, g) => a + scaleNumber(g.value ?? 0, estate, 1), 0) / gauges.length) * 10) / 10
    : 0

  // Muka air: rata-rata estate (tren) atau block terpilih (frame twin).
  const inTwin = TWIN_BLOCKS.includes(division)
  const gwSeries = inTwin
    ? twin.history.map((f) => f.blocks[division].waterTable)
    : waterTableTrend.map((t) => scaleNumber(t.value, estate))
  const gwNow = gwSeries[gwSeries.length - 1]
  const gwDelta = gwNow - gwSeries[gwSeries.length - 2]
  const gwLevel = ewsFromWaterTable(gwNow)

  const patrols = scaleNumber(6, estate) + dispatched

  function setHotspotStatus(code: string, to: HotspotStatus) {
    const prev = statuses[code]
    setStatuses((s) => ({ ...s, [code]: to }))
    toast.success(`${code} ${STATUS_MSG[to]}`, {
      action: { label: "Undo", onClick: () => setStatuses((s) => ({ ...s, [code]: prev })) },
    })
  }

  function dispatchPatrol() {
    const target = activeBlocks.length ? activeBlocks.join(", ") : (worst?.block ?? "block risiko tertinggi")
    const id = toast.loading("Mengirim tim patroli…")
    setTimeout(() => {
      setDispatched((n) => n + 1)
      toast.success(`Tim patroli dikirim ke ${target}`, { id })
    }, 900)
  }

  return (
    <PeatShell title="Fire Risk" subtitle="Fire Danger & Hotspot Monitoring">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile
          label="Fire Risk Index"
          value={String(riskScore)}
          unit="/ 100"
          tone={level}
          icon={FlameIcon}
          status={`${EWS_META[level].label} · ${FIRE_RANGE[level]}`}
          delta={{ text: `${Math.abs(riskDelta)} pts`, dir: riskDelta >= 0 ? "up" : "down", good: riskDelta <= 0, vs: "vs 9 Sep" }}
          spark={week.map((d) => d.value)}
        />
        <StatTile
          label="Active Hotspots"
          value={String(activeHs.length)}
          tone={hsTone}
          icon={MapPinIcon}
          status={activeHs.length ? `In ${activeBlocks.join(", ")}` : "No active detections"}
          foot={`${inDivision.filter((h) => h.status === "Extinguished").length} extinguished · ${inDivision.filter((h) => h.status === "False positive").length} false positive`}
        />
        <StatTile
          label={dryDays > 0 && driest ? `Dry Days · ${driest.code}` : "Dry Days"}
          value={String(dryDays)}
          unit="days"
          tone={dryDays > 0 && driest ? driest.level : "normal"}
          icon={CloudRainIcon}
          status={dryDays > 0 && driest ? `${driest.block} · no rain ${dryDays} days` : "Rain in last 24h"}
          foot={`Avg ${rainAvg} mm / 24h · ${gauges.length} gauges`}
          href="/weather-rainfall"
        />
        <StatTile
          label="FDRS Level"
          value={EWS_META[level].label}
          tone={level}
          icon={GaugeIcon}
          status={`Level ${EWS_LEVELS.indexOf(level) + 1} of 4 · index ${FIRE_RANGE[level]}`}
          foot={`${EWS_META[level].label} since ${since}`}
        />
        <StatTile
          label={inTwin ? `Ground Water · ${division}` : "Ground Water (Avg)"}
          value={fmtSigned(gwNow)}
          unit="cm"
          tone={gwLevel}
          icon={WavesIcon}
          status={`${EWS_META[gwLevel].label} · target ≥ −30 cm`}
          delta={{ text: `${Math.abs(gwDelta)} cm`, dir: gwDelta < 0 ? "down" : "up", good: gwDelta === 0 ? null : gwDelta > 0, vs: "vs 9 Sep" }}
          spark={gwSeries}
          href="/borehole-monitoring"
        />
        <StatTile
          label="Patrols Active"
          value={String(patrols)}
          unit="teams"
          tone="normal"
          icon={ShieldCheckIcon}
          status="On duty"
          foot={dispatched ? `${dispatched} dispatched from this page` : `Covering ${activeBlocks.length ? activeBlocks.join(", ") : "all blocks"}`}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel className="h-full">
          <PanelHeader
            kicker="EWS · INDEKS RISIKO API"
            icon={FlameIcon}
            title={`Fire Risk Trend (${trendRange})`}
            subtitle={`Composite index 0–100 · ${trend[0].day} – ${trend[trend.length - 1].day} 2024${archiveEnd ? " · before 4 Sep: daily archive (est.)" : ""}`}
            action={
              <div className="relative">
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={rangeOpen}
                  onClick={() => setRangeOpen((o) => !o)}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11.5px] font-medium text-white/70 transition-colors hover:border-white/20"
                >
                  {trendRange} <ChevronDownIcon className="size-3.5" />
                </button>
                {rangeOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setRangeOpen(false)} />
                    <div
                      role="listbox"
                      className="absolute right-0 z-50 mt-1 min-w-full overflow-hidden rounded-lg border border-white/10 bg-[#10201a] py-1 shadow-xl"
                    >
                      {TREND_RANGES.map((o) => (
                        <button
                          key={o.key}
                          type="button"
                          role="option"
                          aria-selected={trendRange === o.key}
                          onClick={() => {
                            setTrendRange(o.key)
                            setRangeOpen(false)
                          }}
                          className={cn(
                            "block w-full whitespace-nowrap px-3 py-2 text-left text-[12.5px] hover:bg-white/5",
                            trendRange === o.key ? "text-emerald-300" : "text-white/75"
                          )}
                        >
                          {o.key}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            }
          />
          <div className="h-[220px] px-1 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trend} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                <defs>
                  <linearGradient id="frGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                {FIRE_BANDS.map((b) => (
                  <ReferenceArea key={b.level} {...bandProps(b)} />
                ))}
                {archiveEnd && (
                  <ReferenceArea
                    x1={trend[0].day}
                    x2={archiveEnd}
                    fill="#ffffff"
                    fillOpacity={0.035}
                    ifOverflow="hidden"
                    label={{ value: "Archive · est.", position: "insideTopRight", fontSize: 9, fill: "rgba(255,255,255,0.5)" }}
                  />
                )}
                {FIRE_LINES.map((t) => (
                  <ReferenceLine key={t.y} {...lineProps(t)} />
                ))}
                <XAxis dataKey="day" {...axisProps} minTickGap={14} />
                <YAxis domain={[0, 100]} ticks={[0, 50, 70, 85, 100]} {...axisProps} width={30} />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v) => {
                    const n = Number(v)
                    return [`${n} · ${EWS_META[ewsFromFireRisk(n)].label}`, "Risk Index"]
                  }}
                  labelFormatter={(l, p) => (p?.[0]?.payload?.archive ? `${l} 2024 · archive (est.)` : `${l} 2024`)}
                />
                <Area dataKey="value" type="monotone" stroke="none" fill="url(#frGrad)" tooltipType="none" />
                <Line
                  dataKey="value"
                  name="Risk Index"
                  type="monotone"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  dot={trend.length <= 14 ? { r: 2.5, fill: "#ef4444", strokeWidth: 0 } : false}
                  activeDot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="h-full">
          <PanelHeader
            kicker="FWI · CUACA KEBAKARAN"
            icon={SunIcon}
            title="Fire Weather Index Components"
            subtitle="Canadian FWI System · today · each code on its own scale"
            action={<EwsPill level={fwiMainLevel} label={`FWI ${fwiMain.value} · ${EWS_META[fwiMainLevel].label}`} />}
          />
          <div className="flex flex-1 flex-col justify-center gap-3.5 px-4 pb-3 pt-1">
            {fwi.map(({ c, value }) => (
              <FwiRow key={c.code} c={c} value={value} />
            ))}
          </div>
          <p className="border-t border-white/[0.06] px-4 py-2 text-[10.5px] text-white/50">
            Bands per code (CFFDRS): Normal = Low–Moderate · Waspada = High · Siaga = Very High · Awas = Extreme
          </p>
        </Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel>
          <PanelHeader
            kicker="EWS · STATUS ESTATE"
            icon={GaugeIcon}
            title="Risk Level"
            subtitle={`Composite index · ${estate} · live 10 Sep 09:37`}
            action={<EwsPill level={level} pulse={level === "awas"} />}
          />
          <div className="flex flex-col gap-3 px-4 pb-4 pt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-[40px] font-bold leading-none tabular-nums" style={{ color: EWS_META[level].color }}>
                {riskScore}
              </span>
              <span className="text-[13px] font-medium text-white/50">/ 100</span>
              <span className="ml-auto text-[11px] text-white/55">
                {riskDelta >= 0 ? "+" : "−"}
                {Math.abs(riskDelta)} pts vs 9 Sep · {EWS_META[level].label} since {since}
              </span>
            </div>
            <RiskBar value={riskScore} level={level} />
            <EwsScale active={level} ranges={FIRE_RANGE} />
            <p className="border-t border-white/[0.06] pt-3 text-[11.5px] leading-relaxed text-white/60">{ADVICE[level]}</p>
            {worst && (
              <p className="text-[11px] text-white/55">
                Highest block (twin model): <span className="font-semibold text-white/80">{worst.block}</span> ·{" "}
                {worst.index} {EWS_META[worst.level].label}
                {activeBlocks.length > 0 && <> · active hotspots in {activeBlocks.join(", ")}</>}
              </p>
            )}
            <button
              type="button"
              onClick={dispatchPatrol}
              className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-2 text-[12px] font-semibold text-emerald-300 ring-1 ring-emerald-500/30 transition-colors hover:bg-emerald-500/25"
            >
              <ShieldCheckIcon className="size-4" />
              Dispatch Patrol
            </button>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            kicker="TWIN · LAYER FIRE RISK"
            icon={BoxIcon}
            title="Peta risiko per block"
            subtitle="Twin model · water table + 3-day rain · live 10 Sep"
            action={<OpenInTwin layer="fireRisk" asset="m15" label="Lihat di Twin" />}
          />
          <div className="flex flex-col gap-1.5 px-4 pb-2">
            {blockRisk.map((b) => (
              <div
                key={b.block}
                className={cn(
                  "grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border px-2.5 py-2 transition-opacity",
                  b.dim && "opacity-40"
                )}
                style={{ borderColor: rampCss(b.index, 0.45), background: rampCss(b.index, 0.12) }}
              >
                <div className="min-w-0">
                  <span className="block text-[12px] font-semibold text-white">{b.block}</span>
                  <span className="block font-mono text-[10px] text-white/55">WT {fmtSigned(b.wt)} cm</span>
                </div>
                <div
                  className="relative h-2 rounded-full bg-white/[0.08]"
                  role="img"
                  aria-label={`${b.block}: indeks ${b.index}, kemarau +7 hari ${b.dry}`}
                >
                  <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${b.index}%`, background: rampCss(b.index) }} />
                  {[50, 70, 85].map((t) => (
                    <span key={t} className="absolute -inset-y-0.5 w-px bg-white/30" style={{ left: `${t}%` }} />
                  ))}
                  <span
                    title={`Kemarau +7 hari: ${b.dry}`}
                    className="absolute -top-1 h-4 w-[3px] -translate-x-1/2 rounded-full bg-white/85 shadow-[0_0_0_1px_rgba(4,16,11,0.8)]"
                    style={{ left: `${Math.min(99, b.dry)}%` }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-7 text-right font-mono text-[13px] font-bold tabular-nums" style={{ color: EWS_META[b.level].color }}>
                    {b.index}
                  </span>
                  <span className="w-[82px]">
                    <EwsPill level={b.level} />
                  </span>
                  <span
                    title={`${b.pins} hotspot aktif`}
                    className={cn("inline-flex w-7 items-center gap-0.5 text-[11px] font-semibold", b.pins ? "text-rose-300" : "text-white/50")}
                  >
                    <MapPinIcon className="size-3" />
                    {b.pins}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 px-4 pb-3 text-[10px] text-white/50">
            <span>0</span>
            <span className="h-1.5 flex-1 rounded-full" style={{ background: FIRE_RAMP_CSS }} />
            <span>100</span>
            <span className="ml-2 inline-flex items-center gap-1">
              <span className="h-3 w-[3px] rounded-full bg-white/85" /> kemarau +7 hari
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPinIcon className="size-3 text-rose-300" /> hotspot aktif
            </span>
          </div>
          <div className="mx-4 mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-2.5">
            <div className="min-w-0">
              <span className="kicker block text-white/55">Kemarau +7 hari · {twin.end.label}</span>
              <span className="flex items-baseline gap-1.5">
                <span className="font-mono text-[13px] text-white/60">{twinNow}</span>
                <span className="text-white/50">→</span>
                <span className="text-[22px] font-bold leading-none tabular-nums" style={{ color: EWS_META[ewsFromFireRisk(twinDry)].color }}>
                  {twinDry}
                </span>
                <EwsPill level={ewsFromFireRisk(twinDry)} />
              </span>
            </div>
            <p className="min-w-[180px] flex-1 text-[11px] leading-snug text-white/55">
              {twin.dry.label}: rain 0 mm/day, gates {twin.dry.scenario.gateOpening}% · {dryAwas}/{scopeBlocks.length} block Awas
              {division !== ALL_BLOCKS ? ` · ${division}` : " · area-weighted"}
            </p>
            <OpenInTwin scenario="dry" layer="fireRisk" variant="link" label="Jalankan di Twin" />
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          kicker="VIIRS · NOAA-20"
          icon={FlameIcon}
          title="VIIRS Hotspots (72h)"
          subtitle={`Satellite thermal anomalies 8–10 Sep · ${activeHs.length} active · WGS84`}
          action={<ViewAll href="/map-view" label="View on Map" />}
        />
        <div className="flex flex-wrap items-center gap-1.5 px-4 pb-2 pt-1" role="group" aria-label="Filter confidence">
          {CONFIDENCE_FILTERS.map((f) => {
            const count = f === "All" ? inDivision.length : inDivision.filter((h) => h.confidence === f).length
            return (
              <button
                key={f}
                type="button"
                aria-pressed={confFilter === f}
                onClick={() => setConfFilter(f)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors",
                  confFilter === f
                    ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                    : "text-white/55 ring-1 ring-white/[0.08] hover:text-white/80"
                )}
              >
                {f}
                <span className="font-mono text-[10px] text-white/50">{count}</span>
              </button>
            )
          })}
        </div>
        <TableScroll className="pb-2">
          <table className="w-full min-w-[1000px] text-left">
            <thead>
              <tr>
                <th className={tableTh}>ID</th>
                <th className={tableTh}>Block</th>
                <th className={tableTh}>Coordinates</th>
                <th className={tableTh}>Confidence</th>
                <th className={cn(tableTh, "text-right")}>FRP (MW)</th>
                <th className={tableTh}>Detected</th>
                <th className={tableTh}>Status</th>
                <th className={tableTh}>EWS</th>
                <th className={cn(tableTh, "text-right")}>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleHs.map((r) => {
                const active = isActive(r.status)
                return (
                  <tr key={r.code} className={tableRow}>
                    <td className={tableTd}>
                      <button
                        type="button"
                        onClick={() => toast(`${r.code} · ${r.block} · FRP ${r.frp.toFixed(1)} MW · ${r.coords}`)}
                        className="font-mono font-semibold text-white/85 underline-offset-2 hover:text-emerald-300 hover:underline"
                      >
                        {r.code}
                      </button>
                    </td>
                    <td className={cn(tableTd, "whitespace-nowrap text-white/70")}>{r.block}</td>
                    <td className={cn(tableTd, "whitespace-nowrap font-mono text-[11px] text-white/60")}>{r.coords}</td>
                    <td className={tableTd}>
                      <StatusDot tone={CONF_TONE[r.confidence]} label={r.confidence} />
                    </td>
                    <td className={cn(tableTd, "text-right font-mono font-medium tabular-nums", active ? "text-white/85" : "text-white/50")}>
                      {r.frp.toFixed(1)}
                    </td>
                    <td className={cn(tableTd, "whitespace-nowrap text-white/60")}>{r.detected}</td>
                    <td className={cn(tableTd, "whitespace-nowrap")}>
                      <StatusDot tone={STATUS_TONE[r.status]} label={r.status} />
                    </td>
                    <td className={tableTd}>
                      <EwsPill level={active ? r.level : "normal"} pulse={active && r.level === "awas"} />
                    </td>
                    <td className={cn(tableTd, "text-right")}>
                      <div className="flex items-center justify-end gap-1.5">
                        {ACTIONS[r.status].map((a) => (
                          <button
                            key={a.to}
                            type="button"
                            onClick={() => setHotspotStatus(r.code, a.to)}
                            className={cn(
                              "h-7 whitespace-nowrap rounded-md px-2.5 text-[11.5px] font-medium ring-1 transition-colors",
                              actionClass[a.kind]
                            )}
                          >
                            {a.label}
                          </button>
                        ))}
                        {r.twinId ? (
                          <OpenInTwin variant="icon" asset={r.twinId} layer="fireRisk" label={`Buka ${r.code} di Twin`} />
                        ) : (
                          <span className="inline-block size-7" aria-hidden />
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {visibleHs.length === 0 && (
                <tr className={tableRow}>
                  <td className={cn(tableTd, "text-center text-white/50")} colSpan={9}>
                    {division === ALL_BLOCKS ? "Tidak ada titik panas untuk filter ini" : `Tidak ada titik panas di ${division}`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableScroll>
      </Panel>
    </PeatShell>
  )
}
