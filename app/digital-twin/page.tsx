"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { JetBrains_Mono } from "next/font/google"
import {
  ActivityIcon,
  ArrowUpRightIcon,
  CheckIcon,
  ClockIcon,
  CloudDrizzleIcon,
  CloudRainIcon,
  DropletsIcon,
  FlameIcon,
  LayersIcon,
  LinkIcon,
  MapIcon,
  MapPinIcon,
  PauseIcon,
  PlayIcon,
  RadioTowerIcon,
  RotateCcwIcon,
  Rotate3dIcon,
  SatelliteIcon,
  SparklesIcon,
  SunIcon,
  TagIcon,
  TriangleAlertIcon,
  WavesIcon,
  type LucideIcon,
} from "lucide-react"
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { toast } from "sonner"

import { Panel } from "@/components/peatland/panel"
import { PeatShell } from "@/components/peatland/peat-shell"
import type {
  TwinCallout,
  TwinOverlays,
  TwinView,
  TwinWeather,
} from "@/components/peatland/digital-twin-scene"
import {
  ASSET_LAYER_LABEL,
  ASSET_TYPE_META,
  BLOCK_COLOR,
  EWS_LEVELS,
  EWS_META,
  SCENARIO_PRESETS,
  TWIN_ASSETS,
  TWIN_BLOCKS,
  TWIN_LAYERS,
  TWIN_STREAMS,
  WT_COMPLIANCE,
  WT_CRITICAL,
  WT_FLOOD,
  areaBelowCompliance,
  assetReading,
  buildHistoryFrames,
  co2Emission,
  ewsFromWaterTable,
  fireRiskTone,
  frameAt,
  getBlockBaseline,
  recommendGateOpening,
  simulateScenario,
  summarizeFrame,
  waterTableTone,
  weatherLabel,
  type BlockSnapshot,
  type EwsLevel,
  type Scenario,
  type StatusTone,
  type TwinAsset,
  type TwinFrame,
  type TwinLayer,
} from "@/lib/peatland/digital-twin"
import { matchesBlock } from "@/lib/peatland/filter-logic"
import { useDashboardFilters } from "@/lib/peatland/filters"
import { STATIONS } from "@/lib/peatland/stations"
import { alerts, stations } from "@/lib/peatland/mock-data"
import { cn } from "@/lib/utils"

const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] })

const DigitalTwinScene = dynamic(() => import("@/components/peatland/digital-twin-scene"), {
  ssr: false,
  loading: () => (
    <div className={cn(mono.className, "flex h-full w-full items-center justify-center text-[12px] tracking-wide text-white/40")}>
      Memuat model digital twin…
    </div>
  ),
})

type Tone = StatusTone | "info"
type Level = EwsLevel | "offline"

const valueTone: Record<Tone, string> = {
  normal: "text-emerald-400",
  warning: "text-amber-400",
  critical: "text-red-400",
  info: "text-sky-400",
  offline: "text-white/45",
}

const statusDot: Record<Tone, string> = {
  normal: "bg-emerald-500",
  warning: "bg-amber-500",
  critical: "bg-red-500",
  info: "bg-sky-500",
  offline: "bg-slate-500",
}

const statusLabel: Record<Tone, string> = {
  normal: "Normal",
  warning: "Warning",
  critical: "Critical",
  info: "Info",
  offline: "Offline",
}

const axisProps = {
  tick: { fontSize: 10, fill: "rgba(255,255,255,0.4)" },
  axisLine: { stroke: "rgba(255,255,255,0.12)" },
  tickLine: false as const,
}

const tooltipStyle = {
  contentStyle: {
    background: "#10201a",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 8,
    fontSize: 12,
  },
  labelStyle: { color: "rgba(255,255,255,0.6)" },
}

const blockColor = BLOCK_COLOR

// Halaman monitoring tiap jenis aset (tautan balik dari kartu sensor).
const ASSET_PAGE: Record<TwinAsset["layer"], { href: string; label: string }> = {
  borehole: { href: "/borehole-monitoring", label: "Borehole" },
  "water-station": { href: "/borehole-monitoring", label: "Muka air" },
  "rain-gauge": { href: "/weather-rainfall", label: "Curah hujan" },
  "water-gate": { href: "/map-view", label: "Pintu air" },
  "peat-station": { href: "/peat-monitoring", label: "Stasiun gambut" },
  "fire-hotspot": { href: "/fire-risk", label: "Fire risk" },
}

const OFFLINE_COLOR = "#64748b"
const ACCENT = "#34d399"

// Pill status (mengikuti .pill--green/amber/danger referensi).
const PILL: Record<Level, { text: string; bg: string; border: string }> = {
  normal: { text: "#5ce0a0", bg: "rgba(40,200,130,0.14)", border: "rgba(40,200,130,0.32)" },
  waspada: { text: "#ffd27a", bg: "rgba(255,210,122,0.12)", border: "rgba(255,210,122,0.32)" },
  siaga: { text: "#ffb454", bg: "rgba(232,160,50,0.14)", border: "rgba(232,160,50,0.34)" },
  awas: { text: "#ff7a66", bg: "rgba(232,86,58,0.16)", border: "rgba(232,86,58,0.38)" },
  offline: { text: "#94a3b8", bg: "rgba(100,116,139,0.14)", border: "rgba(100,116,139,0.34)" },
}

const SIM_TITLE: Record<TwinAsset["layer"], string> = {
  borehole: "Simulasi muka air",
  "water-station": "Simulasi muka air",
  "rain-gauge": "Simulasi curah hujan",
  "water-gate": "Simulasi pintu air",
  "peat-station": "Simulasi kelembapan tanah",
  "fire-hotspot": "Simulasi risiko api",
}

// Ambang yang digambar di sparkline, per jenis aset.
const THRESHOLDS: Partial<Record<TwinAsset["layer"], { siaga: number; awas: number; unit: string }>> = {
  borehole: { siaga: WT_COMPLIANCE, awas: WT_CRITICAL, unit: "cm" },
  "water-station": { siaga: WT_COMPLIANCE, awas: WT_CRITICAL, unit: "cm" },
  "peat-station": { siaga: 35, awas: 25, unit: "%" },
}

const LAYER_TOGGLES: { key: keyof TwinOverlays; label: string; icon: LucideIcon }[] = [
  { key: "imagery", label: "Citra", icon: SatelliteIcon },
  { key: "canals", label: "Sungai & parit", icon: WavesIcon },
  { key: "zones", label: "Zona kritis", icon: TriangleAlertIcon },
  { key: "theme", label: "Tema data", icon: LayersIcon },
  { key: "rain", label: "Hujan", icon: CloudRainIcon },
  { key: "links", label: "Link data", icon: LinkIcon },
  { key: "labels", label: "Label", icon: TagIcon },
  { key: "bloom", label: "Glow", icon: SparklesIcon },
]

const LEGEND_TYPES: (keyof typeof ASSET_TYPE_META)[] = [
  "borehole",
  "water-station",
  "rain-gauge",
  "water-gate",
  "peat-station",
  "fire-hotspot",
]

const HORIZONS = [3, 7, 14]

const th = "whitespace-nowrap px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-white/35"
const td = "whitespace-nowrap px-3 py-2 text-[12px]"

// Kaca HUD di atas model (pola .twin-chips / .twin-tool referensi). Sengaja tanpa
// backdrop-blur: blur di atas canvas WebGL yang terus bergerak membuat animasi tersendat.
const glass = "border border-[var(--tw-line)] bg-[rgba(4,16,11,0.86)]"

// Mode tampilan: tiap mode menyalakan layer yang relevan & menyaring label sensor,
// supaya model tidak ramai. Toggle layer detail tetap bisa diubah setelahnya.
type TwinMode = "monitoring" | "hidrologi" | "kebakaran" | "jaringan"
const MODES: { key: TwinMode; label: string; icon: LucideIcon; hint: string }[] = [
  { key: "monitoring", label: "Monitoring", icon: ActivityIcon, hint: "Zona kritis · label sensor Siaga/Awas/offline" },
  { key: "hidrologi", label: "Hidrologi", icon: DropletsIcon, hint: "Tema muka air · kanal · borehole, WTS, pintu air" },
  { key: "kebakaran", label: "Kebakaran", icon: FlameIcon, hint: "Tema risiko api · hotspot · hujan · stasiun gambut" },
  { key: "jaringan", label: "Jaringan", icon: RadioTowerIcon, hint: "Link data · stasiun offline · baterai & sinyal" },
]
const MODE_PRESET: Record<TwinMode, { overlays: Partial<TwinOverlays>; layer?: TwinLayer }> = {
  monitoring: { overlays: { canals: true, zones: true, theme: false, rain: true, links: false, labels: true } },
  hidrologi: { overlays: { canals: true, zones: false, theme: true, rain: true, links: false, labels: true }, layer: "waterTable" },
  kebakaran: { overlays: { canals: false, zones: false, theme: true, rain: true, links: false, labels: true }, layer: "fireRisk" },
  jaringan: { overlays: { canals: true, zones: false, theme: false, rain: false, links: true, labels: true } },
}
const MODE_TYPES: Partial<Record<TwinMode, TwinAsset["layer"][]>> = {
  hidrologi: ["borehole", "water-station", "water-gate"],
  kebakaran: ["fire-hotspot", "peat-station", "rain-gauge"],
}
const cardCls =
  "rounded-2xl border border-[var(--tw-line)] bg-gradient-to-b from-white/[0.043] to-white/[0.016] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_14px_34px_rgba(2,8,24,0.22)] backdrop-blur-[8px] transition-colors hover:border-[var(--tw-line-strong)]"
const labelCls = cn(mono.className, "text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--tw-ink-mute)]")

function formatWt(v: number) {
  return `${v > 0 ? "+" : ""}${v} cm`
}

function offsetLabel(offset: number) {
  if (Math.abs(offset) < 1e-6) return "kini"
  const abs = Math.abs(offset)
  return `${offset > 0 ? "+" : "−"}${Number.isInteger(abs) ? abs : abs.toFixed(2).replace(/0$/, "")}h`
}

/** Rentang hari pecahan sebagai teks, mis. 2.25 → "2 hari 6 jam". */
function spanLabel(days: number) {
  const d = Math.floor(days + 1e-6)
  const h = Math.round((days - d) * 24)
  return [d ? `${d} hari` : "", h ? `${h} jam` : ""].filter(Boolean).join(" ") || "0 jam"
}

function levelColor(level: Level) {
  return level === "offline" ? OFFLINE_COLOR : EWS_META[level].color
}

/** Lebar elemen (px) untuk SVG yang digambar pada ukuran sebenarnya. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

const JAKARTA = { timeZone: "Asia/Jakarta" }

/** Waktu sekarang, diperbarui tiap detik; null sebelum mount (hindari mismatch SSR). */
function useNow() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function hhmmOf(now: Date | null) {
  return now ? now.toLocaleTimeString("en-GB", { ...JAKARTA, hour: "2-digit", minute: "2-digit", hour12: false }) : "--:--"
}

function LiveClock() {
  const now = useNow()
  const date = now
    ? now.toLocaleDateString("id-ID", { ...JAKARTA, day: "numeric", month: "short", year: "numeric" }).replace(".", "")
    : ""
  return (
    <span className={cn(mono.className, "ml-auto whitespace-nowrap text-[13px] tracking-[0.06em] text-[var(--tw-ink-soft)]")}>
      <b className="mr-2 font-bold text-[var(--tw-ink)]">
        {hhmmOf(now)}
        <span className="opacity-50">:{now ? String(now.getSeconds()).padStart(2, "0") : "--"}</span> WIB
      </b>
      {date}
    </span>
  )
}

function LastSync() {
  const now = useNow()
  return <StripKv k="Last sync" v={now ? `${(now.getSeconds() % 5) + 1}s ago` : "—"} />
}

function NowHhmm() {
  return <>{hhmmOf(useNow()).replace(":", ".")}</>
}

function Pill({ level, children, live = false, className }: { level: Level; children?: React.ReactNode; live?: boolean; className?: string }) {
  const p = PILL[level]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase",
        live && "twin-ews-live",
        className
      )}
      style={{ color: p.text, background: p.bg, borderColor: p.border }}
    >
      <span className="size-[7px] rounded-full" style={{ background: p.text, boxShadow: `0 0 8px ${p.text}` }} />
      {children ?? (level === "offline" ? "Offline" : EWS_META[level].label)}
    </span>
  )
}

function StripKv({ k, v, tone }: { k: string; v: React.ReactNode; tone?: "danger" | "ok" }) {
  return (
    <div className={cn(mono.className, "flex flex-col gap-px whitespace-nowrap")}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--tw-ink-mute)]">{k}</span>
      <span
        className={cn(
          "text-[15px] font-semibold",
          tone === "danger" ? "text-[var(--tw-danger)]" : tone === "ok" ? "text-[var(--tw-ok)]" : "text-[var(--tw-ink)]"
        )}
      >
        {v}
      </span>
    </div>
  )
}

function StatusPill({ tone, label }: { tone: Tone; label?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11.5px] font-medium", valueTone[tone])}>
      <span className={cn("size-1.5 rounded-full", statusDot[tone])} />
      {label ?? statusLabel[tone]}
    </span>
  )
}

function ToggleRow({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex cursor-pointer items-center gap-2 text-left text-[11px] text-white/70 transition-colors hover:text-white/90"
    >
      <span
        className={cn(
          "flex size-3.5 shrink-0 items-center justify-center rounded-[4px] border",
          on ? "border-emerald-500 bg-emerald-500" : "border-white/30"
        )}
      >
        {on && <CheckIcon className="size-2.5 text-white" strokeWidth={3} />}
      </span>
      {label}
    </button>
  )
}

function ThemeLegend({ layer }: { layer: TwinLayer }) {
  const meta = TWIN_LAYERS.find((l) => l.key === layer) ?? TWIN_LAYERS[0]
  const first = meta.stops[0][0]
  const last = meta.stops[meta.stops.length - 1][0]
  const gradient = meta.stops.map(([v, c]) => `${c} ${Math.round(((v - first) / (last - first)) * 100)}%`).join(", ")
  return (
    <div>
      <div className="h-1.5 rounded-full" style={{ background: `linear-gradient(90deg, ${gradient})` }} />
      <div className={cn(mono.className, "mt-1 flex justify-between text-[9px] text-[var(--tw-ink-mute)]")}>
        <span>{first}</span>
        <span>{meta.unit}</span>
        <span>{last}</span>
      </div>
    </div>
  )
}

type SeriesPoint = { value: number | null }

/** Sparkline aset: area + garis, ambang putus-putus, penanda posisi timeline, tick waktu. */
function AssetSpark({
  series,
  index,
  current,
  color,
  threshold,
  ticks,
  liveIndex,
}: {
  series: SeriesPoint[]
  index: number
  current: number | null
  color: string
  threshold?: { siaga: number; awas: number }
  ticks: number[]
  liveIndex: number
}) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const h = 86
  const x0 = 4
  const x1 = Math.max(x0 + 1, w - 4)
  const vals = series.map((s) => s.value).filter((v): v is number => v != null)
  const lo = Math.min(...vals, threshold?.awas ?? Infinity) - 4
  const hi = Math.max(...vals, threshold?.siaga ?? -Infinity) + 4
  const x = (i: number) => x0 + (i / Math.max(1, series.length - 1)) * (x1 - x0)
  const y = (v: number) => 66 - ((v - lo) / (hi - lo || 1)) * 60
  const pts = series.map((s, i) => (s.value == null ? null : `${x(i).toFixed(1)} ${y(s.value).toFixed(1)}`)).filter(Boolean)
  const line = `M${pts.join(" L")}`
  return (
    <div ref={ref} className="h-[86px] w-full">
      {w > 0 && vals.length > 1 && (
        <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="block overflow-visible">
          <defs>
            <linearGradient id="twin-asset-spark" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={`${line} L${x1} 70 L${x0} 70 Z`} fill="url(#twin-asset-spark)" />
          <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
          {threshold &&
            (
              [
                [threshold.awas, "var(--tw-danger)", `AWAS ${threshold.awas}`],
                [threshold.siaga, "var(--tw-warn)", `SIAGA ${threshold.siaga}`],
              ] as const
            ).map(([v, c, text]) => (
              <g key={text}>
                <line x1={x0} x2={x1} y1={y(v)} y2={y(v)} stroke={c} strokeDasharray="4 4" strokeWidth={1} />
                <text x={x1} y={y(v) - 3} textAnchor="end" fontSize={9} fontWeight={700} fill={c} className={mono.className}>
                  {text}
                </text>
              </g>
            ))}
          <line x1={x(index)} x2={x(index)} y1={4} y2={70} stroke="#ecf6f0" strokeWidth={1} opacity={0.7} />
          {current != null && (
            <circle cx={x(index)} cy={y(current)} r={3.5} fill="#04120b" stroke="#ecf6f0" strokeWidth={1.5} />
          )}
          {ticks.map((o, i) => (
            <text
              key={o}
              x={x(liveIndex + o)}
              y={83}
              fontSize={9}
              fill={o === 0 ? ACCENT : "var(--tw-ink-mute)"}
              textAnchor={i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle"}
              className={mono.className}
            >
              {offsetLabel(o)}
            </text>
          ))}
        </svg>
      )}
    </div>
  )
}

/** Sparkline di belakang slider timeline (lebar mengikuti track; thumb 14px). */
function TimelineSpark({
  series,
  index,
  current,
  color,
  awas,
}: {
  series: SeriesPoint[]
  index: number
  current: number | null
  color: string
  awas?: number
}) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const vals = series.map((s) => s.value).filter((v): v is number => v != null)
  const lo = Math.min(...vals, awas ?? Infinity) - 3
  const hi = Math.max(...vals) + 3
  const x0 = 7
  const x1 = Math.max(x0 + 1, w - 7)
  const x = (i: number) => x0 + (i / Math.max(1, series.length - 1)) * (x1 - x0)
  const y = (v: number) => 28 - ((v - lo) / (hi - lo || 1)) * 24
  const pts = series.map((s, i) => (s.value == null ? null : `${x(i).toFixed(1)} ${y(s.value).toFixed(1)}`)).filter(Boolean)
  const line = `M${pts.join(" L")}`
  return (
    <div ref={ref} className="pointer-events-none absolute inset-0">
      {w > 0 && vals.length > 1 && (
        <svg viewBox={`0 0 ${w} 34`} width={w} height={34} className="block overflow-visible">
          <defs>
            <linearGradient id="twin-tl-spark" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={`${line} L${x1} 30 L${x0} 30 Z`} fill="url(#twin-tl-spark)" />
          <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
          {awas != null && <line x1={x0} x2={x1} y1={y(awas)} y2={y(awas)} stroke="var(--tw-danger)" strokeDasharray="4 4" />}
          <line x1={x(index)} x2={x(index)} y1={0} y2={30} stroke="#ecf6f0" strokeWidth={1} opacity={0.7} />
          {current != null && <circle cx={x(index)} cy={y(current)} r={3.5} fill="#04120b" stroke="#ecf6f0" strokeWidth={1.5} />}
        </svg>
      )}
    </div>
  )
}

/** Penampang tanah gambut: profil permukaan + kanal, zona jenuh, ambang, dan pipa ukur. */
function PeatSection({ snap, waterTable }: { snap: BlockSnapshot; waterTable: number }) {
  const top = 34
  const y = (depthCm: number) => top + depthCm * 1.13
  const wtY = y(clamp(-waterTable, -20, 140))
  const ground = `M0 190 L0 ${top} L244 ${top} L258 ${y(24)} L272 ${y(104)} L304 ${y(104)} L318 ${y(24)} L330 ${top} L340 ${top} L340 190 Z`
  const wave = Array.from({ length: 13 }, (_, i) => `Q ${-30 + i * 40} -3 ${-20 + i * 40} 0 T ${i * 40} 0`).join(" ")
  return (
    <svg viewBox="0 0 340 190" role="img" aria-label={`Muka air ${waterTable} cm`} className="block h-auto w-full">
      <defs>
        <linearGradient id="twin-sec-water" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#5fd8ff" stopOpacity={0.85} />
          <stop offset="100%" stopColor="#0c3f8a" stopOpacity={0.9} />
        </linearGradient>
        <linearGradient id="twin-sec-peat" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#4a3524" />
          <stop offset="100%" stopColor="#140d08" />
        </linearGradient>
        <pattern id="twin-sec-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(110,231,183,0.1)" strokeWidth="2" />
        </pattern>
        <clipPath id="twin-sec-ground">
          <path d={ground} />
        </clipPath>
      </defs>
      {/* Air kanal */}
      <rect x={250} y={y(80)} width={70} height={190 - y(80)} fill="url(#twin-sec-water)" />
      <path d={ground} fill="url(#twin-sec-peat)" stroke="#6b8f7c" strokeWidth={1.4} />
      <path d={ground} fill="url(#twin-sec-hatch)" />
      {/* Zona jenuh di dalam gambut */}
      <g clipPath="url(#twin-sec-ground)">
        <rect
          x={0}
          y={wtY}
          width={340}
          height={190 - wtY}
          fill="url(#twin-sec-water)"
          opacity={0.42}
          style={{ transition: "y .6s ease, height .6s ease" }}
        />
        <g style={{ transform: `translateY(${wtY}px)`, transition: "transform .6s ease" }}>
          <path className="twin-wave" d={`M-40 0 ${wave}`} fill="none" stroke="#5fd8ff" strokeWidth={1.6} opacity={0.9} />
        </g>
      </g>
      {/* Ambang EWS */}
      {(
        [
          [60, "var(--tw-danger)", "AWAS −60"],
          [40, "var(--tw-warn)", "SIAGA −40"],
        ] as const
      ).map(([d, c, text]) => (
        <g key={text}>
          <line x1={10} x2={236} y1={y(d)} y2={y(d)} stroke={c} strokeDasharray="5 4" strokeWidth={1.2} />
          <text x={236} y={y(d) - 3} textAnchor="end" fontSize={9} fontWeight={700} fill={c} className={mono.className}>
            {text}
          </text>
        </g>
      ))}
      <text x={6} y={top - 8} fontSize={9} fill="var(--tw-ink-mute)" className={mono.className}>
        Permukaan gambut · 0 cm
      </text>
      <text x={6} y={184} fontSize={9} fill="var(--tw-ink-mute)" className={mono.className}>
        Gambut {snap.peatDepth} cm ↓
      </text>
      <text x={287} y={y(104) + 12} fontSize={8.5} textAnchor="middle" fill="#93a89c" className={mono.className}>
        Kanal
      </text>
      {/* Pipa ukur (piezometer) */}
      <line x1={196} x2={196} y1={top - 6} y2={y(120)} stroke="#c7d8cf" strokeWidth={1.5} opacity={0.7} />
      {[0, 20, 40, 60, 80, 100, 120].map((d) => (
        <g key={d}>
          <line x1={192} x2={200} y1={y(d)} y2={y(d)} stroke="#c7d8cf" strokeWidth={1.2} opacity={0.7} />
          <text x={204} y={y(d) + 3} fontSize={8.5} fill="#93a89c" className={mono.className}>
            {d === 0 ? "0" : `−${d}`}
          </text>
        </g>
      ))}
      <rect x={140} y={wtY - 8} width={48} height={16} rx={4} fill="#04120b" stroke="#5fd8ff" style={{ transition: "y .6s ease" }} />
      <text
        x={164}
        y={wtY + 3.5}
        textAnchor="middle"
        fontSize={9.5}
        fontWeight={700}
        fill="#ecf6f0"
        className={mono.className}
        style={{ transition: "y .6s ease" }}
      >
        {formatWt(waterTable)}
      </text>
    </svg>
  )
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

export default function DigitalTwinPage() {
  const { estate, division, setDivision } = useDashboardFilters()

  const baseline = useMemo(() => getBlockBaseline(estate), [estate])
  const history = useMemo(() => buildHistoryFrames(baseline), [baseline])
  const liveIndex = history.length - 1
  const liveFrame = history[liveIndex]

  const [preset, setPreset] = useState<string>("baseline")
  const [scenario, setScenario] = useState<Scenario>({ ...SCENARIO_PRESETS[0].scenario, days: 7 })
  const forecast = useMemo(() => simulateScenario(baseline, scenario), [baseline, scenario])
  const baselineForecast = useMemo(
    () => simulateScenario(baseline, { ...SCENARIO_PRESETS[0].scenario, days: scenario.days }),
    [baseline, scenario.days]
  )
  const recommendation = useMemo(() => recommendGateOpening(baseline, scenario), [baseline, scenario])
  const frames = useMemo(() => [...history, ...forecast], [history, forecast])

  // Posisi timeline pecahan (langkah 0,25 hari) — frame diinterpolasi agar mulus.
  const [timePos, setTimePos] = useState(liveIndex)
  const [playing, setPlaying] = useState(false)
  const pos = Math.min(timePos, frames.length - 1)
  const frame = useMemo(() => frameAt(frames, pos, liveIndex), [frames, pos, liveIndex])
  const offset = pos - liveIndex

  const [layer, setLayer] = useState<TwinLayer>("waterTable")
  const [overlays, setOverlays] = useState<TwinOverlays>({
    imagery: true,
    canals: true,
    zones: true,
    theme: false,
    rain: true,
    links: false,
    labels: true,
    bloom: true,
  })
  const [mode, setMode] = useState<TwinMode>("monitoring")
  const [layerOpen, setLayerOpen] = useState(false)
  const [night, setNight] = useState(false)
  const [autoRotate, setAutoRotate] = useState(true)
  const [view, setView] = useState<TwinView>({ mode: "reset", nonce: 0 })
  const [selectedId, setSelectedId] = useState<string>("m5")
  const needleRef = useRef<HTMLSpanElement>(null)
  const [tiles, setTiles] = useState({ loaded: 0, total: 0 })

  // Division di header memfokuskan kartu sensor ke aset pertama block tersebut.
  useEffect(() => {
    if (!TWIN_BLOCKS.includes(division)) return
    setSelectedId((cur) => {
      const current = TWIN_ASSETS.find((a) => a.id === cur)
      if (current && current.block === division) return cur
      const inBlock = TWIN_ASSETS.filter((a) => a.block === division)
      return (inBlock.find((a) => a.layer === "borehole") ?? inBlock[0])?.id ?? cur
    })
  }, [division])

  useEffect(() => {
    if (!playing) return
    const id = setInterval(
      () => setTimePos((p) => Math.min(frames.length - 1, Math.round((p + 0.25) * 4) / 4)),
      175
    )
    return () => clearInterval(id)
  }, [playing, frames.length])

  // Berhenti otomatis di ujung prakiraan.
  useEffect(() => {
    if (playing && pos >= frames.length - 1) setPlaying(false)
  }, [playing, pos, frames.length])

  const selected = TWIN_ASSETS.find((a) => a.id === selectedId) ?? TWIN_ASSETS[0]
  const reading = assetReading(selected, frame, liveFrame)
  const typeMeta = ASSET_TYPE_META[selected.layer]
  const threshold = THRESHOLDS[selected.layer]
  const series = useMemo(() => {
    const asset = TWIN_ASSETS.find((a) => a.id === selectedId) ?? TWIN_ASSETS[0]
    return frames.map((f) => ({ value: assetReading(asset, f, liveFrame).value }))
  }, [frames, selectedId, liveFrame])

  const callouts = useMemo(() => {
    const out: Record<string, TwinCallout> = {}
    const estimated = frame.kind === "forecast"
    for (const a of TWIN_ASSETS) {
      const r = assetReading(a, frame, liveFrame)
      if (mode === "jaringan" && a.layer !== "fire-hotspot") {
        // Kesehatan perangkat dari registri stasiun (baterai & sinyal).
        const st = STATIONS.find((x) => x.twinId === a.id)
        if (a.status === "offline" || !st) {
          out[a.id] = { text: a.status === "offline" ? "OFFLINE" : "—", level: "offline", value: r.value }
        } else {
          const lv: EwsLevel = st.battery < 25 || st.signal === "Weak" ? "siaga" : st.battery < 50 || st.signal === "Fair" ? "waspada" : "normal"
          out[a.id] = { text: `${st.battery}% · ${st.signal}`, level: lv, value: r.value }
        }
        continue
      }
      out[a.id] = { text: estimated && r.value != null ? `≈ ${r.text}` : r.text, level: r.level, value: r.value }
    }
    return out
  }, [frame, liveFrame, mode])

  // Label yang tampil per mode (sensor terpilih selalu tampil).
  const labelIds = useMemo(() => {
    // Jaringan: hanya perangkat (hotspot VIIRS bukan perangkat lapangan).
    if (mode === "jaringan") return TWIN_ASSETS.filter((a) => a.layer !== "fire-hotspot").map((a) => a.id)
    const types = MODE_TYPES[mode]
    if (types) return TWIN_ASSETS.filter((a) => types.includes(a.layer)).map((a) => a.id)
    return TWIN_ASSETS.filter((a) => {
      const lv = callouts[a.id]?.level
      return lv === "siaga" || lv === "awas" || lv === "offline"
    }).map((a) => a.id)
  }, [mode, callouts])

  function applyMode(m: TwinMode) {
    const preset = MODE_PRESET[m]
    setMode(m)
    setOverlays((o) => ({ ...o, ...preset.overlays }))
    if (preset.layer) setLayer(preset.layer)
  }

  // Cuaca tiap penakar hujan untuk sel hujan di model: cerah / gerimis / deras.
  const weather = useMemo(() => {
    const out: Record<string, TwinWeather> = {}
    for (const a of TWIN_ASSETS) {
      if (a.layer !== "rain-gauge") continue
      const mm = assetReading(a, frame, liveFrame).value ?? 0
      out[a.id] = mm >= 25 ? "alarm" : mm > 0.5 ? "warn" : "ok"
    }
    return out
  }, [frame, liveFrame])

  const scopeBlocks = useMemo(() => TWIN_BLOCKS.filter((b) => matchesBlock(b, division)), [division])
  const endFrame = forecast[forecast.length - 1]
  const baselineEnd = baselineForecast[baselineForecast.length - 1]

  const projection = useMemo(() => {
    return [liveFrame, ...forecast].map((f, i) => {
      const s = summarizeFrame(f, baseline, scopeBlocks)
      const b = i === 0 ? s : summarizeFrame(baselineForecast[i - 1], baseline, scopeBlocks)
      return {
        label: f.label,
        ...Object.fromEntries(TWIN_BLOCKS.map((blk) => [blk, f.blocks[blk].waterTable])),
        scenario: s.waterTable,
        baseline: b.waterTable,
        fireScenario: s.fireRisk,
        fireBaseline: b.fireRisk,
      }
    })
  }, [liveFrame, forecast, baselineForecast, baseline, scopeBlocks])

  // Dampak: luas di bawah -40 cm, emisi, level EWS terburuk & waktu menuju AWAS.
  const impact = useMemo(() => {
    const rows = baseline
      .filter((b) => scopeBlocks.includes(b.block))
      .map((b) => {
        const wt = frame.blocks[b.block].waterTable
        return { block: b.block, area: b.area, below: areaBelowCompliance(b.area, wt), level: ewsFromWaterTable(wt) }
      })
    const worst = rows.reduce<EwsLevel>(
      (acc, r) => (EWS_LEVELS.indexOf(r.level) > EWS_LEVELS.indexOf(acc) ? r.level : acc),
      "normal"
    )
    const hasAwas = (f: TwinFrame) => scopeBlocks.some((b) => ewsFromWaterTable(f.blocks[b].waterTable) === "awas")
    let awasIn: number | null = null
    if (hasAwas(frame)) awasIn = 0
    else {
      for (let i = Math.ceil(pos); i < frames.length; i += 1) {
        if (hasAwas(frames[i])) {
          awasIn = i - pos
          break
        }
      }
    }
    const totalArea = rows.reduce((a, r) => a + r.area, 0) || 1
    const summary = summarizeFrame(frame, baseline, scopeBlocks)
    return {
      rows,
      worst,
      awasIn,
      totalArea,
      below: rows.reduce((a, r) => a + r.below, 0),
      maxBelow: Math.max(1, ...rows.map((r) => r.below)),
      summary,
      // Emisi relatif terhadap drainase -80 cm di seluruh area (batas atas wajar).
      co2Share: summary.co2 / (totalArea * 0.91 * 80),
    }
  }, [baseline, scopeBlocks, frame, frames, pos])

  const rainChips = ["RG-01", "RG-04"]
    .map((code) => TWIN_ASSETS.find((a) => a.code === code))
    .filter((a): a is TwinAsset => a != null)
    .map((a) => {
      const mm = assetReading(a, frame, liveFrame).value ?? 0
      return { code: a.code, text: weatherLabel(mm), wet: mm > 0.5, heavy: mm >= 25 }
    })

  const timeLabel =
    offset === 0 ? (
      <>
        Kini · <NowHhmm /> WIB
      </>
    ) : (
      `${offset > 0 ? "+" : "−"}${spanLabel(Math.abs(offset))} · ${frame.label}`
    )
  const whenLabel = offset === 0 ? "live" : offset > 0 ? `prakiraan ${offsetLabel(offset)}` : `replay ${offsetLabel(offset)}`

  const ticks = [-liveIndex, -3, 0, Math.round(scenario.days / 2), scenario.days].filter(
    (o, i, arr) => arr.indexOf(o) === i && liveIndex + o >= 0 && liveIndex + o < frames.length
  )
  const sparkColor = reading.level === "offline" ? OFFLINE_COLOR : reading.level === "normal" ? ACCENT : levelColor(reading.level)

  const onAzimuth = (deg: number) => {
    if (needleRef.current) needleRef.current.style.transform = `rotate(${deg}deg)`
  }

  function goLive() {
    setPlaying(false)
    setTimePos(liveIndex)
  }

  // Tautan dari halaman lain, mis. /digital-twin?asset=m5, ?block=Block C&layer=fireRisk,
  // ?scenario=dry. Dibaca sekali saat halaman dibuka.
  useEffect(() => {
    // Preferensi dari Settings → Digital Twin (localStorage); parameter URL di bawah menimpanya.
    try {
      const raw = window.localStorage.getItem("peatland.twin-settings")
      const p = raw ? (JSON.parse(raw) as Record<string, unknown>) : null
      if (p) {
        if (TWIN_LAYERS.some((l) => l.key === p.layer)) setLayer(p.layer as TwinLayer)
        const days = Number(p.horizon)
        if (HORIZONS.includes(days)) setScenario((s) => ({ ...s, days }))
        if (typeof p.autoRotate === "boolean") setAutoRotate(p.autoRotate)
        if (typeof p.labels === "boolean") {
          const labels = p.labels
          setOverlays((o) => ({ ...o, labels }))
        }
      }
    } catch {
      // storage tidak tersedia (mode privat) — pakai bawaan
    }
    const q = new URLSearchParams(window.location.search)
    const asset = q.get("asset")
    const block = q.get("block")
    const lay = q.get("layer")
    const sc = SCENARIO_PRESETS.find((p) => p.key === q.get("scenario"))
    if (block && TWIN_BLOCKS.includes(block)) setDivision(block)
    if (lay && TWIN_LAYERS.some((l) => l.key === lay)) {
      const m: TwinMode = lay === "fireRisk" ? "kebakaran" : "hidrologi"
      setMode(m)
      setOverlays((o) => ({ ...o, ...MODE_PRESET[m].overlays, theme: true }))
      setLayer(lay as TwinLayer)
    }
    if (sc) {
      setPreset(sc.key)
      setScenario((s) => ({ ...s, ...sc.scenario }))
    }
    if (asset && TWIN_ASSETS.some((a) => a.id === asset)) {
      setSelectedId(asset)
      setAutoRotate(false)
      setView((v) => ({ mode: "focus", id: asset, nonce: v.nonce + 1 }))
    } else if (block && TWIN_BLOCKS.includes(block)) {
      setAutoRotate(false)
      setView((v) => ({ mode: "block", id: block, nonce: v.nonce + 1 }))
    }
  }, [setDivision])

  function applyPreset(key: string) {
    const p = SCENARIO_PRESETS.find((s) => s.key === key)
    if (!p) return
    setPreset(key)
    setScenario((s) => ({ ...s, ...p.scenario }))
    toast(`Skenario: ${p.label}`)
  }

  function updateScenario(patch: Partial<Scenario>) {
    setPreset("custom")
    setScenario((s) => ({ ...s, ...patch }))
  }

  // Grafik proyeksi tidak bergantung posisi timeline: di-memo agar tidak ikut
  // dirender ulang tiap tick pemutaran (175 ms).
  const projectionPanel = useMemo(
    () => (
          <Panel className="h-full">
            <div className="flex flex-wrap items-start justify-between gap-2 px-4 pb-1 pt-3.5">
              <div>
                <h3 className="text-[14px] font-semibold text-white">Projected Water Table &amp; Fire Risk</h3>
                <p className="text-[11px] text-white/40">
                  Live {liveFrame.label} → {endFrame?.label} • skenario vs baseline (tanpa tindakan)
                </p>
              </div>
              <button
                onClick={() => {
                  setPlaying(false)
                  setTimePos(frames.length - 1)
                }}
                className="rounded-lg border border-white/10 px-2.5 py-1 text-[11.5px] font-medium text-white/60 transition-colors hover:border-white/20"
              >
                Lihat di model 3D
              </button>
            </div>
            <div className="grid gap-2 px-1 pb-2 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <div className="h-[230px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={projection} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                      <XAxis dataKey="label" {...axisProps} />
                      <YAxis domain={[-90, 10]} {...axisProps} width={34} />
                      <ReferenceLine y={WT_COMPLIANCE} stroke="#f59e0b" strokeDasharray="4 3" strokeOpacity={0.7} label={{ value: "PP 57 (-40 cm)", position: "insideTopLeft", fontSize: 9, fill: "#fbbf24" }} />
                      <ReferenceLine y={WT_CRITICAL} stroke="#ef4444" strokeDasharray="4 3" strokeOpacity={0.6} label={{ value: "Awas (-60 cm)", position: "insideTopLeft", fontSize: 9, fill: "#f87171" }} />
                      <Tooltip {...tooltipStyle} />
                      {scopeBlocks.map((b) => (
                        <Line key={b} dataKey={b} type="monotone" stroke={blockColor[b]} strokeWidth={1.5} dot={false} strokeOpacity={0.85} />
                      ))}
                      <Line dataKey="baseline" name="Estate (baseline)" type="monotone" stroke="rgba(255,255,255,0.45)" strokeDasharray="5 4" strokeWidth={2} dot={false} />
                      <Line dataKey="scenario" name="Estate (scenario)" type="monotone" stroke="#ffffff" strokeWidth={2.5} dot={{ r: 2.5, fill: "#ffffff" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap items-center gap-3 px-3 text-[10.5px] text-white/50">
                  {scopeBlocks.map((b) => (
                    <span key={b} className="inline-flex items-center gap-1.5">
                      <span className="h-0.5 w-3 rounded" style={{ background: blockColor[b] }} />
                      {b}
                    </span>
                  ))}
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-0.5 w-3 rounded bg-white" /> Scenario
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-0.5 w-3 rounded border-t border-dashed border-white/50" /> Baseline
                  </span>
                </div>
              </div>
              <div>
                <div className="h-[230px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={projection} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                      <defs>
                        <linearGradient id="twin-fire" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity={0.45} />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                      <XAxis dataKey="label" {...axisProps} />
                      <YAxis domain={[0, 100]} {...axisProps} width={30} />
                      <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="4 3" strokeOpacity={0.5} label={{ value: "High", position: "insideTopLeft", fontSize: 9, fill: "#f87171" }} />
                      <Tooltip {...tooltipStyle} />
                      <Area dataKey="fireScenario" name="Fire risk (scenario)" type="monotone" stroke="#f87171" strokeWidth={2} fill="url(#twin-fire)" />
                      <Line dataKey="fireBaseline" name="Fire risk (baseline)" type="monotone" stroke="rgba(255,255,255,0.45)" strokeDasharray="5 4" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-between px-3 text-[11px]">
                  <span className="text-white/45">Akhir horizon</span>
                  <span>
                    <span className={cn("font-semibold", valueTone[fireRiskTone(summarizeFrame(endFrame, baseline, scopeBlocks).fireRisk)])}>
                      {summarizeFrame(endFrame, baseline, scopeBlocks).fireRisk}
                    </span>
                    <span className="text-white/40"> vs baseline {summarizeFrame(baselineEnd, baseline, scopeBlocks).fireRisk}</span>
                  </span>
                </div>
              </div>
            </div>
          </Panel>
    ),
    [liveFrame, endFrame, frames.length, projection, scopeBlocks, baseline, baselineEnd]
  )

  const railHeight = "xl:h-[calc(100vh-180px)] xl:min-h-[640px]"
  const sectionWt =
    (selected.layer === "borehole" || selected.layer === "water-station") && reading.value != null
      ? reading.value
      : frame.blocks[selected.block].waterTable
  const toCompliance = sectionWt - WT_COMPLIANCE
  const toAwas = sectionWt - WT_CRITICAL

  return (
    <PeatShell title="Digital Twin" subtitle="3D Estate Model • Hydrology Simulation">
      <div className="twin-page flex flex-col gap-[14px]">
        {/* Strip status sistem (cc-topbar) */}
        <div className="flex min-w-0 items-center gap-[22px] overflow-hidden rounded-[14px] border border-[var(--tw-line)] bg-white/[0.035] px-[18px] py-3">
          <span className={cn(mono.className, "inline-flex items-center gap-2.5 whitespace-nowrap text-[13px] font-bold uppercase tracking-[0.16em] text-[var(--tw-ink)]")}>
            <span className="twin-live-dot size-2" />
            System online · {estate}
          </span>
          <span className="h-6 w-px shrink-0 bg-[var(--tw-line-strong)]" />
          <StripKv k="Sensor aktif" v={`${stations.online} / ${stations.total}`} />
          <LastSync />
          <StripKv k="Alarm aktif" v={alerts.length} tone="danger" />
          <div className="hidden 2xl:block">
            <StripKv k="Notifikasi 24h" v="42" />
          </div>
          <StripKv k="Uptime 30d" v="99.4%" tone="ok" />
          <LiveClock />
        </div>

        <div className="grid gap-[14px] xl:grid-cols-[minmax(0,1fr)_350px]">
          {/* Panggung 3D */}
          <section
            className={cn(
              "relative h-[560px] overflow-hidden rounded-2xl border shadow-[0_20px_50px_rgba(2,8,24,0.35)] transition-[border-color,box-shadow] duration-300 sm:h-[680px]",
              offset > 0
                ? "border-sky-400/50 shadow-[0_0_0_1px_rgba(56,189,248,0.25),0_20px_50px_rgba(2,8,24,0.35)]"
                : offset < 0
                  ? "border-amber-300/40"
                  : "border-[var(--tw-line)]",
              railHeight
            )}
            style={{ background: night ? "#030712" : "var(--tw-bg)" }}
          >
            <div className="absolute inset-0">
              <DigitalTwinScene
                frame={frame}
                layer={layer}
                overlays={overlays}
                night={night}
                division={division}
                selectedId={selectedId}
                autoRotate={autoRotate}
                view={view}
                callouts={callouts}
                monoFont={mono.style.fontFamily}
                onSelect={setSelectedId}
                onAzimuth={onAzimuth}
                onTiles={(loaded, total) => setTiles({ loaded, total })}
                weather={weather}
                labelIds={labelIds}
                onUserOrbit={() => setAutoRotate(false)}
              />
            </div>
            {/* Gradasi atas & vignette */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-[4] h-[150px] bg-gradient-to-b from-[rgba(4,13,9,0.78)] to-transparent" />
            <div
              className={cn(
                "pointer-events-none absolute inset-0 z-[2]",
                night
                  ? "bg-[radial-gradient(120%_90%_at_50%_45%,transparent_55%,rgba(2,6,4,0.55)_100%)]"
                  : "bg-[radial-gradient(130%_100%_at_50%_45%,transparent_65%,rgba(2,6,4,0.32)_100%)]"
              )}
            />
            {/* Prakiraan: rona biru di tepi panggung supaya tidak dikira data live. */}
            {offset > 0 && (
              <div className="pointer-events-none absolute inset-0 z-[3] bg-[radial-gradient(130%_100%_at_50%_50%,transparent_60%,rgba(56,189,248,0.14)_100%)]" />
            )}

            {/* Progres tile citra (hilang setelah semua termuat) */}
            {tiles.total > 0 && tiles.loaded < tiles.total && (
              <div
                className={cn(
                  glass,
                  mono.className,
                  "pointer-events-none absolute left-1/2 z-[6] inline-flex -translate-x-1/2 items-center gap-2 rounded-full px-3 py-[5px] text-[10px] tracking-[0.06em] text-[var(--tw-ink-soft)]",
                  "top-4"
                )}
              >
                <span className="twin-spinner" />
                MEMUAT CITRA SATELIT · {tiles.loaded}/{tiles.total}
              </div>
            )}

            {/* HUD kiri atas */}
            <div className="pointer-events-none absolute left-[18px] top-4 z-[5] flex max-w-[calc(100%-200px)] flex-col gap-[5px]">
              <span className={cn(mono.className, "inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.16em] text-[#6ee7b7] [text-shadow:0_1px_8px_rgba(0,0,0,0.8)]")}>
                <span className="twin-live-dot" />
                DIGITAL TWIN<span className="hidden sm:inline"> · KHG GIAM SIAK KECIL</span>
              </span>
              <h2 className="m-0 hidden text-[22px] font-extrabold tracking-[-0.02em] text-[var(--tw-ink)] [text-shadow:0_2px_16px_rgba(0,0,0,0.7)] sm:block">
                Model 3D Lahan Gambut &amp; Tata Air
              </h2>
              <span className={cn(mono.className, "hidden text-[11px] text-[var(--tw-ink-soft)] [text-shadow:0_1px_8px_rgba(0,0,0,0.8)] sm:block")}>
                {MODES.find((m) => m.key === mode)?.hint} · {TWIN_ASSETS.length} node · prakiraan {scenario.days} hari
              </span>
              <div className={cn(glass, "pointer-events-auto mt-1.5 flex w-fit gap-[3px] rounded-xl p-[3px]")} role="group" aria-label="Mode tampilan">
                {MODES.map(({ key, label, icon: Icon, hint }) => (
                  <button
                    key={key}
                    aria-pressed={mode === key}
                    title={hint}
                    onClick={() => applyMode(key)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-[9px] border px-2.5 py-[5px] text-[11.5px] font-semibold transition-colors",
                      mode === key
                        ? "border-[rgba(52,211,153,0.45)] bg-[rgba(16,185,129,0.34)] text-[#ecfdf5]"
                        : "border-transparent text-[var(--tw-ink-soft)] hover:text-[var(--tw-ink)]"
                    )}
                  >
                    <Icon className="size-3.5 shrink-0" />
                    {/* Di HP cukup ikon (nama mode ada di title/aria). */}
                    <span className="sr-only sm:not-sr-only">{label}</span>
                  </button>
                ))}
              </div>
              {offset !== 0 && (
                <div
                  className={cn(
                    mono.className,
                    "mt-1 inline-flex w-fit flex-wrap items-center gap-x-2 gap-y-0.5 rounded-full border px-3 py-[5px] text-[10.5px] font-bold tracking-[0.1em] shadow-[0_8px_24px_rgba(0,0,0,0.4)]",
                    offset > 0
                      ? "border-sky-300/50 bg-[rgba(8,30,48,0.9)] text-sky-200"
                      : "border-amber-300/45 bg-[rgba(40,28,6,0.88)] text-amber-100"
                  )}
                >
                  <span className={cn("size-1.5 rounded-full", offset > 0 ? "bg-sky-300" : "bg-amber-300")} />
                  {offset > 0 ? "PRAKIRAAN" : "REPLAY"} · {offset > 0 ? "+" : "−"}
                  {spanLabel(Math.abs(offset))} · {frame.label}
                  {offset > 0 && ` · ${SCENARIO_PRESETS.find((p) => p.key === preset)?.label ?? "Kustom"}`}
                  {offset > 0 && <span className="font-medium text-sky-200/70">· nilai ≈ hasil model</span>}
                </div>
              )}
            </div>

            {/* HUD kanan atas: alat kamera + layer */}
            <div className="absolute right-[14px] top-[14px] z-[5] flex flex-col items-end gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setAutoRotate((a) => !a)}
                  title="Rotasi otomatis"
                  aria-pressed={autoRotate}
                  className={cn(
                    glass,
                    "grid size-9 place-items-center rounded-[10px] transition-colors",
                    autoRotate
                      ? "border-[rgba(52,211,153,0.45)] bg-[rgba(16,185,129,0.32)] text-[#d1fae5]"
                      : "text-[var(--tw-ink-soft)] hover:border-[rgba(52,211,153,0.45)] hover:bg-[rgba(16,185,129,0.32)] hover:text-[#d1fae5]"
                  )}
                >
                  <Rotate3dIcon className="size-4" />
                </button>
                <button
                  onClick={() => setView((v) => ({ mode: "reset", nonce: v.nonce + 1 }))}
                  title="Reset kamera"
                  className={cn(glass, "grid size-9 place-items-center rounded-[10px] text-[var(--tw-ink-soft)] transition-colors hover:border-[rgba(52,211,153,0.45)] hover:bg-[rgba(16,185,129,0.32)] hover:text-[#d1fae5]")}
                >
                  <RotateCcwIcon className="size-4" />
                </button>
                <button
                  onClick={() => setLayerOpen((o) => !o)}
                  title="Detail layer"
                  aria-expanded={layerOpen}
                  className={cn(
                    glass,
                    "grid size-9 place-items-center rounded-[10px] transition-colors",
                    layerOpen
                      ? "border-[rgba(52,211,153,0.45)] bg-[rgba(16,185,129,0.32)] text-[#d1fae5]"
                      : "text-[var(--tw-ink-soft)] hover:border-[rgba(52,211,153,0.45)] hover:text-[#d1fae5]"
                  )}
                >
                  <LayersIcon className="size-4" />
                </button>
                <button
                  onClick={() => setView((v) => ({ mode: "north", nonce: v.nonce + 1 }))}
                  title="Arah utara"
                  className="relative grid size-10 place-items-center rounded-full border border-[rgba(110,231,183,0.28)] bg-[rgba(4,16,11,0.7)]"
                >
                  <span ref={needleRef} className="relative grid size-full place-items-center">
                    <b className={cn(mono.className, "absolute left-1/2 top-px -translate-x-1/2 text-[8px] font-extrabold text-[var(--tw-ink)]")}>U</b>
                    <svg viewBox="0 0 24 24" className="size-[18px]">
                      <polygon points="12,3 15.5,12 12,10.5 8.5,12" fill="#ff7a66" />
                      <polygon points="12,21 8.5,12 12,13.5 15.5,12" fill="#6f8579" />
                    </svg>
                  </span>
                </button>
              </div>
              <div className={cn(glass, "w-[140px] flex-col items-stretch gap-[3px] rounded-xl p-1.5", layerOpen ? "flex" : "hidden")} role="group" aria-label="Detail layer model">
                <span className={cn(mono.className, "px-1.5 pb-1 pt-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--tw-ink-mute)]")}>
                  Detail layer
                </span>
                {LAYER_TOGGLES.map(({ key, label, icon: Icon }) => {
                  const on = overlays[key]
                  return (
                    <button
                      key={key}
                      aria-pressed={on}
                      onClick={() => setOverlays((s) => ({ ...s, [key]: !s[key] }))}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition-colors",
                        on
                          ? "border-[rgba(52,211,153,0.35)] bg-[rgba(16,185,129,0.28)] text-[#d1fae5]"
                          : "border-transparent text-[var(--tw-ink-mute)] hover:text-[var(--tw-ink)]"
                      )}
                    >
                      <Icon className="size-3.5 shrink-0" />
                      <span>{label}</span>
                    </button>
                  )
                })}
                <div className="mt-1 grid grid-cols-2 gap-[3px] rounded-[9px] border border-[var(--tw-line)] bg-[rgba(2,8,5,0.5)] p-[3px]" role="group" aria-label="Gaya citra">
                  {[
                    { on: !night, label: "Natural", set: false },
                    { on: night, label: "Malam", set: true },
                  ].map((o) => (
                    <button
                      key={o.label}
                      aria-pressed={o.on}
                      onClick={() => setNight(o.set)}
                      className={cn(
                        mono.className,
                        "rounded-[7px] border px-1 py-[5px] text-[10.5px] font-bold transition-colors",
                        o.on ? "border-[rgba(52,211,153,0.35)] bg-[rgba(16,185,129,0.32)] text-[#d1fae5]" : "border-transparent text-[var(--tw-ink-mute)]"
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              {overlays.theme && layerOpen && (
                <div className={cn(glass, "grid w-[140px] gap-1.5 rounded-xl p-2")}>
                  <span className={cn(mono.className, "text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--tw-ink-mute)]")}>Tema data</span>
                  <div className="flex flex-wrap gap-1">
                    {TWIN_LAYERS.map((l) => (
                      <button
                        key={l.key}
                        onClick={() => setLayer(l.key)}
                        className={cn(
                          "rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition-colors",
                          layer === l.key ? "bg-[rgba(16,185,129,0.3)] text-[#d1fae5]" : "text-[var(--tw-ink-mute)] hover:text-[var(--tw-ink)]"
                        )}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                  <ThemeLegend layer={layer} />
                </div>
              )}
            </div>

            {/* Bawah: legenda, atribusi, timeline simulasi */}
            <div className="pointer-events-none absolute inset-x-[14px] bottom-[14px] z-[5] flex flex-col gap-2">
              {overlays.theme && (
                <div className={cn(glass, "pointer-events-auto w-[210px] rounded-[10px] px-2.5 py-2")}>
                  <span className={cn(mono.className, "mb-1.5 block text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--tw-ink-mute)]")}>
                    Tema · {TWIN_LAYERS.find((l) => l.key === layer)?.label}
                  </span>
                  <ThemeLegend layer={layer} />
                </div>
              )}
              <div className="flex items-end justify-between gap-3">
                <div className={cn(glass, mono.className, "pointer-events-auto hidden flex-wrap gap-2.5 rounded-[10px] px-2.5 py-1.5 text-[10px] tracking-[0.06em] text-[var(--tw-ink-soft)] md:flex")}>
                  {LEGEND_TYPES.map((t) => (
                    <span key={t} className="inline-flex items-center gap-[5px]">
                      <i className="size-2 rounded-full" style={{ background: ASSET_TYPE_META[t].color }} />
                      {ASSET_TYPE_META[t].short}
                    </span>
                  ))}
                  <span className="inline-flex items-center gap-[5px]">
                    <i className="w-3.5 border-t-2 border-[#5eead4] shadow-[0_0_6px_#2dd4bf]" />
                    KHG
                  </span>
                  {overlays.canals && (
                    <span className="inline-flex items-center gap-[5px]">
                      <i className="w-3.5 border-t-2 border-[#38bdf8]" />
                      SUNGAI
                      <i className="ml-1 w-3.5 border-t border-[#7dd3fc]/70" />
                      PARIT
                    </span>
                  )}
                  {overlays.links && (
                    <>
                      <span className="inline-flex items-center gap-[5px]">
                        <i className="w-3.5 border-t-2 border-[#5eead4] shadow-[0_0_6px_#2dd4bf]" />
                        LINK DATA
                      </span>
                      <span className="inline-flex items-center gap-[5px]">
                        <i className="size-2.5 rounded-full border-2 border-[#fb7185] shadow-[0_0_6px_#fb7185]" />
                        OFFLINE
                      </span>
                    </>
                  )}
                </div>
                <div className={cn(mono.className, "max-w-[55%] text-right text-[9px] leading-[1.4] text-[rgba(147,168,156,0.8)] [text-shadow:0_1px_4px_rgba(0,0,0,0.9)]")}>
                  Citra © Esri, Maxar, Earthstar Geographics · Batas & sungai © OpenStreetMap contributors
                </div>
              </div>

              <div className="pointer-events-auto flex items-center gap-[14px] rounded-[14px] border border-[var(--tw-line)] bg-[rgba(4,16,11,0.9)] px-[14px] pb-2 pt-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
                <button
                  onClick={() => {
                    if (!playing && pos >= frames.length - 1) setTimePos(0)
                    setPlaying((p) => !p)
                  }}
                  aria-label={playing ? "Jeda simulasi" : "Putar simulasi"}
                  className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#059669] to-[#14b8a6] text-white shadow-[0_6px_18px_rgba(16,185,129,0.45)] transition-transform hover:scale-105"
                >
                  {playing ? <PauseIcon className="size-[18px]" /> : <PlayIcon className="size-[18px] translate-x-px" />}
                </button>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex min-w-0 flex-col gap-[3px]">
                      <span className={cn(mono.className, "inline-flex items-center gap-1.5 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--tw-ink-mute)]")}>
                        <ClockIcon className="size-3" />
                        {SIM_TITLE[selected.layer]} · {selected.code}
                      </span>
                      <span className={cn(mono.className, "whitespace-nowrap text-[13px] font-bold text-[var(--tw-ink)]")}>
                        {timeLabel}{" "}
                        {threshold && (
                          <span className="ml-1 hidden items-center gap-1.5 text-[10px] font-semibold tracking-[0.04em] text-[var(--tw-danger)] sm:inline-flex">
                            <i className="w-4 border-t-[1.5px] border-dashed border-[var(--tw-danger)]" />
                            AWAS {threshold.awas} {threshold.unit}
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                      {rainChips.map((c) => (
                        <span
                          key={c.code}
                          className={cn(mono.className, "hidden items-center gap-1.5 whitespace-nowrap rounded-full border px-[9px] py-1 text-[10.5px] font-bold transition-colors lg:inline-flex")}
                          style={
                            c.heavy
                              ? { color: "#ffa596", background: "rgba(255,122,102,0.12)", borderColor: "rgba(255,122,102,0.5)" }
                              : c.wet
                                ? { color: "#8fd3ff", background: "rgba(40,118,232,0.12)", borderColor: "rgba(60,195,242,0.38)" }
                                : { color: "#ffd98a", background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,210,122,0.3)" }
                          }
                          title={`Cuaca di ${c.code}`}
                        >
                          {c.wet ? <CloudDrizzleIcon className="size-3.5" /> : <SunIcon className="size-3.5" />}
                          {c.code} · {c.text}
                        </span>
                      ))}
                      <span className="hidden sm:inline-flex">
                        <Pill level={reading.level} live>
                          EWS · {reading.level === "offline" ? "Offline" : EWS_META[reading.level].label}
                        </Pill>
                      </span>
                      <button
                        onClick={goLive}
                        disabled={offset === 0}
                        className={cn(mono.className, "shrink-0 rounded-[10px] border border-[var(--tw-line)] bg-white/[0.04] px-3 py-2 text-[12px] font-bold text-[var(--tw-ink-2)] disabled:cursor-default disabled:opacity-40")}
                      >
                        Kini
                      </button>
                    </div>
                  </div>
                  <div className="relative h-[34px]">
                    <TimelineSpark series={series} index={pos} current={reading.value} color={sparkColor} awas={threshold?.awas} />
                    <input
                      type="range"
                      min={0}
                      max={frames.length - 1}
                      step={0.25}
                      value={pos}
                      onChange={(e) => {
                        setPlaying(false)
                        setTimePos(Number(e.target.value))
                      }}
                      aria-label="Timeline twin"
                      className="twin-range"
                    />
                  </div>
                  <div className={cn(mono.className, "relative h-[13px] text-[9.5px] text-[var(--tw-ink-mute)]")} aria-hidden>
                    {ticks.map((o, i) => {
                      const p = (liveIndex + o) / (frames.length - 1)
                      const first = i === 0
                      const last = i === ticks.length - 1
                      return (
                        <span
                          key={o}
                          className={cn("absolute top-0 whitespace-nowrap", o === 0 && "font-semibold text-[var(--tw-accent)]")}
                          style={{
                            left: `calc(${p * 100}% + ${7 - 14 * p}px)`,
                            transform: first ? "translateX(-7px)" : last ? "translateX(calc(-100% + 7px))" : "translateX(-50%)",
                          }}
                        >
                          {offsetLabel(o)}
                        </span>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Kolom kanan */}
          <aside className={cn("flex min-h-0 flex-col gap-3 xl:overflow-y-auto xl:pr-0.5", railHeight)}>
            {/* Kartu aset terpilih */}
            <div className={cardCls}>
              <div className="mb-2.5 flex items-center justify-between">
                <span
                  className={cn(mono.className, "rounded-md border px-2 py-1 text-[10px] font-extrabold tracking-[0.14em]")}
                  style={{
                    color: typeMeta.color,
                    borderColor: `color-mix(in srgb, ${typeMeta.color} 42%, transparent)`,
                    background: `color-mix(in srgb, ${typeMeta.color} 16%, transparent)`,
                  }}
                  title={ASSET_LAYER_LABEL[selected.layer]}
                >
                  {typeMeta.short}
                </span>
                <Pill level={reading.level} />
              </div>
              <div className={cn(mono.className, "text-[12px] tracking-[0.08em] text-[var(--tw-ink-mute)]")}>{selected.code}</div>
              <div className="mb-2.5 mt-0.5 text-[16px] font-bold text-[var(--tw-ink)]">
                {ASSET_LAYER_LABEL[selected.layer]} · {selected.block}
              </div>
              <div className="mb-2.5 flex items-baseline gap-1.5">
                <b className={cn(mono.className, "text-[34px] font-semibold leading-none tracking-[-0.02em] text-[var(--tw-ink)]")}>
                  {reading.value == null ? "—" : reading.text.replace(/\s?(cm|mm|MW|%)$/, "")}
                </b>
                <small className="text-[14px] text-[var(--tw-ink-soft)]">{reading.unit}</small>
                <span className={cn(mono.className, "ml-auto text-[10px] uppercase tracking-[0.1em]", offset === 0 ? "text-[#6ee7b7]" : offset > 0 ? "text-[#8fd3ff]" : "text-[var(--tw-ink-soft)]")}>
                  {whenLabel}
                </span>
              </div>
              {reading.value == null ? (
                <div className={cn(mono.className, "flex h-[86px] items-center justify-center rounded-[10px] border border-dashed border-[var(--tw-line)] text-[11px] text-[var(--tw-ink-mute)]")}>
                  Sensor offline sejak {selected.lastSeen} · tidak ada data
                </div>
              ) : (
                <AssetSpark
                  series={series}
                  index={pos}
                  current={reading.value}
                  color={sparkColor}
                  threshold={threshold}
                  ticks={ticks}
                  liveIndex={liveIndex}
                />
              )}
              <div className={cn(mono.className, "mt-3 flex justify-between gap-2 text-[11px] text-[var(--tw-ink-mute)]")}>
                <span className="inline-flex items-center gap-[5px]">
                  <MapPinIcon className="size-3" />
                  {selected.lat.toFixed(3)}, {selected.lng.toFixed(3)}
                </span>
                <span className="inline-flex items-center gap-3">
                  <Link href="/map-view" className="inline-flex items-center gap-[5px] text-[#6ee7b7] hover:text-white">
                    <MapIcon className="size-3" />
                    Peta
                  </Link>
                  <Link href={ASSET_PAGE[selected.layer].href} className="inline-flex items-center gap-[5px] text-[#6ee7b7] hover:text-white">
                    <ArrowUpRightIcon className="size-3" />
                    {ASSET_PAGE[selected.layer].label}
                  </Link>
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-[5px] border-t border-[var(--tw-line)] pt-3" role="group" aria-label="Pilih aset">
                {TWIN_ASSETS.filter((a) => matchesBlock(a.block, division)).map((a) => {
                  const on = a.id === selectedId
                  const c = ASSET_TYPE_META[a.layer].color
                  const lv = callouts[a.id]?.level ?? "normal"
                  return (
                    <button
                      key={a.id}
                      onClick={() => setSelectedId(a.id)}
                      title={`${ASSET_LAYER_LABEL[a.layer]} · ${a.block}`}
                      className={cn(
                        mono.className,
                        "inline-flex items-center gap-[5px] rounded-[7px] border px-[7px] py-1 text-[10px] font-bold transition-colors",
                        on ? "text-white" : "border-[var(--tw-line)] bg-[var(--tw-surface-2)] text-[var(--tw-ink-soft)] hover:border-[var(--tw-line-strong)] hover:text-[var(--tw-ink)]"
                      )}
                      style={on ? { borderColor: c, background: `color-mix(in srgb, ${c} 22%, transparent)` } : undefined}
                    >
                      <span className="size-1.5 rounded-full" style={{ background: levelColor(lv) }} />
                      {a.code}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Twin penampang */}
            <div className={cardCls}>
              <div className="mb-3.5 flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className={labelCls}>Twin penampang · {selected.code}</span>
                  <span className={cn(mono.className, "text-[11px] text-[var(--tw-ink-mute)]")}>
                    {selected.block} · {estate} · {offset === 0 ? "Kini" : offsetLabel(offset)}
                  </span>
                </div>
                <Pill level={ewsFromWaterTable(sectionWt)} />
              </div>
              <PeatSection snap={frame.blocks[selected.block]} waterTable={sectionWt} />
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[
                  { k: "Muka air", v: formatWt(sectionWt), neg: false },
                  { k: "Ke −40 cm", v: `${toCompliance > 0 ? "+" : ""}${toCompliance} cm`, neg: toCompliance < 0 },
                  { k: "Ke awas", v: `${toAwas > 0 ? "+" : ""}${toAwas} cm`, neg: toAwas <= 0 },
                ].map((s) => (
                  <div key={s.k} className="flex flex-col gap-0.5 rounded-[9px] border border-[var(--tw-line)] bg-[var(--tw-surface-2)] px-2.5 py-2">
                    <span className={cn(mono.className, "text-[9.5px] uppercase tracking-[0.1em] text-[var(--tw-ink-mute)]")}>{s.k}</span>
                    <b className={cn(mono.className, "text-[14px]", s.neg ? "text-[var(--tw-danger)]" : "text-[var(--tw-ink)]")}>{s.v}</b>
                  </div>
                ))}
              </div>
            </div>

            {/* Dampak simulasi */}
            <div className={cardCls}>
              <div className="mb-3.5 flex items-center justify-between">
                <span className={labelCls}>Dampak simulasi · {offset === 0 ? "kini" : offsetLabel(offset)}</span>
                <span
                  className={cn(mono.className, "whitespace-nowrap text-[11px] font-bold", impact.awasIn == null ? "text-[var(--tw-ok)]" : "text-[var(--tw-danger)]")}
                >
                  {impact.awasIn == null ? "TERKENDALI" : impact.awasIn === 0 ? "AWAS · KINI" : `AWAS ${offsetLabel(impact.awasIn)}`}
                </span>
              </div>
              <div className="mb-3 grid grid-cols-2 gap-2.5">
                {[
                  { k: "Area < −40 cm", v: impact.below.toLocaleString("id-ID"), unit: "ha", share: impact.below / impact.totalArea, amber: false },
                  { k: "Emisi CO₂", v: (impact.summary.co2 / 1000).toFixed(1), unit: "kt/th", share: impact.co2Share, amber: true },
                ].map((kpi) => (
                  <div key={kpi.k} className="flex flex-col gap-1.5 rounded-[10px] border border-[var(--tw-line)] bg-[var(--tw-surface-2)] px-3 py-2.5">
                    <span className={cn(mono.className, "text-[9.5px] uppercase tracking-[0.1em] text-[var(--tw-ink-mute)]")}>{kpi.k}</span>
                    <b className={cn(mono.className, "text-[22px] font-bold leading-none text-[var(--tw-ink)]")}>
                      {kpi.v}
                      <small className="ml-[3px] text-[11px] font-medium text-[var(--tw-ink-mute)]">{kpi.unit}</small>
                    </b>
                    <i className="block h-1 overflow-hidden rounded-sm bg-[rgba(110,231,183,0.12)]">
                      <i
                        className={cn(
                          "block h-full rounded-sm transition-[width] duration-500",
                          kpi.amber ? "bg-gradient-to-r from-[#d98220] to-[#ffb454]" : "bg-gradient-to-r from-[#059669] to-[#34d399]"
                        )}
                        style={{ width: `${clamp(kpi.share, 0, 1) * 100}%` }}
                      />
                    </i>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                {impact.rows.map((r) => (
                  <div
                    key={r.block}
                    className={cn("grid grid-cols-[72px_1fr_70px] items-center gap-2.5 text-[12.5px] text-[var(--tw-ink-2)] transition-opacity", r.below === 0 && "opacity-45")}
                  >
                    <span>{r.block}</span>
                    <i className="block h-1 overflow-hidden rounded-sm bg-[rgba(110,231,183,0.12)]">
                      <i
                        className="block h-full rounded-sm transition-[width] duration-500"
                        style={{
                          width: `${(r.below / impact.maxBelow) * 100}%`,
                          background: `linear-gradient(90deg, color-mix(in srgb, ${EWS_META[r.level].color} 55%, transparent), ${EWS_META[r.level].color})`,
                        }}
                      />
                    </i>
                    <b className={cn(mono.className, "text-right text-[11.5px] text-[var(--tw-ink)]")}>{r.below.toLocaleString("id-ID")} ha</b>
                  </div>
                ))}
              </div>
              <div className="twin-ews mt-3">
                {EWS_LEVELS.map((l, i) => {
                  const active = EWS_LEVELS.indexOf(impact.worst)
                  return (
                    <div
                      key={l}
                      className={cn("twin-ews__step", i <= active && "is-reached", i === active && "is-active")}
                      style={{ "--ews-c": EWS_META[l].color, "--i": i } as React.CSSProperties}
                    >
                      <span className="twin-ews__bar" />
                      <span className={cn(mono.className, "twin-ews__label")}>{EWS_META[l].label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </aside>
        </div>

        {/* Simulator skenario + proyeksi */}
        <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
          <Panel className="h-full">
            <div className="px-4 pb-1 pt-3.5">
              <h3 className="text-[14px] font-semibold text-white">Scenario Simulator</h3>
              <p className="text-[11px] text-white/40">What-if pengelolaan air • model neraca air harian</p>
            </div>
            <div className="flex flex-col gap-4 px-4 pb-4 pt-2">
              <div className="flex flex-wrap gap-1.5">
                {SCENARIO_PRESETS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => applyPreset(p.key)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-[11.5px] font-medium transition-colors",
                      preset === p.key
                        ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                        : "border border-white/10 text-white/55 hover:border-white/20"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <label className="grid gap-1.5">
                <span className="flex justify-between text-[12px]">
                  <span className="text-white/60">Rainfall forecast</span>
                  <span className="font-semibold text-white/85">{scenario.rainfall} mm/day</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={60}
                  step={1}
                  value={scenario.rainfall}
                  onChange={(e) => updateScenario({ rainfall: Number(e.target.value) })}
                  className="w-full accent-sky-500"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="flex justify-between text-[12px]">
                  <span className="text-white/60">Water gate opening (WTG-01…03)</span>
                  <span className="font-semibold text-white/85">{scenario.gateOpening}%</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={scenario.gateOpening}
                  onChange={(e) => updateScenario({ gateOpening: Number(e.target.value) })}
                  className="w-full accent-emerald-500"
                />
              </label>

              <div className="flex items-center justify-between gap-3">
                <span className="text-[12px] text-white/60">Horizon</span>
                <div className="flex gap-1">
                  {HORIZONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setScenario((s) => ({ ...s, days: d }))}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-[11.5px] font-medium transition-colors",
                        scenario.days === d
                          ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                          : "border border-white/10 text-white/55 hover:border-white/20"
                      )}
                    >
                      {d} days
                    </button>
                  ))}
                </div>
              </div>

              <ToggleRow
                on={scenario.canalBlocking}
                label="Canal blocking & rewetting (sekat kanal)"
                onClick={() => updateScenario({ canalBlocking: !scenario.canalBlocking })}
              />

              <div
                className={cn(
                  "rounded-lg border p-3 text-[12px] leading-relaxed",
                  recommendation.feasible ? "border-emerald-500/25 bg-emerald-500/[0.06]" : "border-amber-500/25 bg-amber-500/[0.06]"
                )}
              >
                <p className={cn("mb-1 flex items-center gap-1.5 font-semibold", recommendation.feasible ? "text-emerald-400" : "text-amber-400")}>
                  <SparklesIcon className="size-3.5" /> Twin Recommendation
                </p>
                {recommendation.feasible ? (
                  <p className="text-white/65">
                    Setel bukaan pintu air ke <b className="text-white">{recommendation.gateOpening}%</b> untuk menjaga semua block di
                    antara −40 dan −10 cm hingga {endFrame?.label}.
                  </p>
                ) : (
                  <p className="text-white/65">
                    Pintu air saja tidak cukup: <b className="text-white">{recommendation.worstBlock}</b> diproyeksikan{" "}
                    {formatWt(recommendation.worstLevel)} pada {endFrame?.label}
                    {recommendation.worstLevel > WT_FLOOD ? " (tergenang)" : ""}. Kompromi terbaik{" "}
                    <b className="text-white">{recommendation.gateOpening}%</b>
                    {recommendation.worstLevel > WT_FLOOD
                      ? "; siagakan pompa & periksa tanggul kanal."
                      : scenario.canalBlocking
                        ? "; tambah patroli api & pembasahan sumur bor."
                        : "; aktifkan sekat kanal & patroli api."}
                  </p>
                )}
                {recommendation.gateOpening !== scenario.gateOpening && (
                  <button
                    onClick={() => {
                      updateScenario({ gateOpening: recommendation.gateOpening })
                      setTimePos(frames.length - 1)
                      toast.success(`Bukaan pintu air disimulasikan ${recommendation.gateOpening}%`)
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-emerald-500/15 px-2.5 py-1 text-[11.5px] font-medium text-emerald-400 ring-1 ring-emerald-500/30 transition-colors hover:bg-emerald-500/25"
                  >
                    <CheckIcon className="size-3" /> Apply to scenario
                  </button>
                )}
              </div>
            </div>
          </Panel>

          {projectionPanel}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_350px]">
          <Panel>
            <div className="px-4 pb-1 pt-3.5">
              <h3 className="text-[14px] font-semibold text-white">Block Twin State</h3>
              <p className="text-[11px] text-white/40">
                {offset === 0 ? "Live" : offset > 0 ? "Forecast" : "Replay"} {frame.label} • proyeksi {endFrame?.label}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr>
                    <th className={th}>Block</th>
                    <th className={cn(th, "text-right")}>Area</th>
                    <th className={cn(th, "text-right")}>Water Table</th>
                    <th className={cn(th, "text-right")}>Projected</th>
                    <th className={cn(th, "text-right")}>Fire Risk</th>
                    <th className={cn(th, "text-right")}>Moisture</th>
                    <th className={cn(th, "text-right")}>NDVI</th>
                    <th className={cn(th, "text-right")}>CO₂ (t/yr)</th>
                    <th className={th}>PP 57</th>
                    <th className={th}>EWS</th>
                  </tr>
                </thead>
                <tbody>
                  {baseline
                    .filter((b) => matchesBlock(b.block, division))
                    .map((b) => {
                      const s = frame.blocks[b.block]
                      const end = endFrame?.blocks[b.block] ?? s
                      return (
                        <tr key={b.block} className="border-t border-white/5 hover:bg-white/[0.03]">
                          <td className={cn(td, "font-medium text-white/85")}>
                            <span className="inline-flex items-center gap-2">
                              <span className="size-2 rounded-full" style={{ background: blockColor[b.block] }} />
                              {b.block}
                            </span>
                          </td>
                          <td className={cn(td, "text-right text-white/55")}>{b.area.toLocaleString("id-ID")} ha</td>
                          <td className={cn(td, "text-right font-medium", valueTone[waterTableTone(s.waterTable)])}>{formatWt(s.waterTable)}</td>
                          <td className={cn(td, "text-right font-medium", valueTone[waterTableTone(end.waterTable)])}>{formatWt(end.waterTable)}</td>
                          <td className={cn(td, "text-right font-medium", valueTone[fireRiskTone(s.fireRisk)])}>{s.fireRisk}</td>
                          <td className={cn(td, "text-right text-white/70")}>{s.soilMoisture}%</td>
                          <td className={cn(td, "text-right text-white/70")}>{s.ndvi.toFixed(2)}</td>
                          <td className={cn(td, "text-right text-white/70")}>
                            {Math.round(co2Emission(b.area, s.waterTable)).toLocaleString("id-ID")}
                          </td>
                          <td className={td}>
                            {s.waterTable >= WT_COMPLIANCE ? <StatusPill tone="normal" label="Comply" /> : <StatusPill tone="critical" label="Breach" />}
                          </td>
                          <td className={td}>
                            <Pill level={ewsFromWaterTable(s.waterTable)} className="px-2 py-0.5 text-[10px]" />
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel className="h-full">
            <div className="px-4 pb-1 pt-3.5">
              <h3 className="text-[14px] font-semibold text-white">Twin Data Streams</h3>
              <p className="text-[11px] text-white/40">Sumber data yang menyinkronkan model</p>
            </div>
            <div className="grid gap-0.5 px-2 pb-3 pt-1">
              {TWIN_STREAMS.map((s) => (
                <div key={s.label} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.03]">
                  <span className={cn("size-2 shrink-0 rounded-full", statusDot[s.status])} />
                  <div className="grid flex-1 leading-tight">
                    <span className="text-[12px] font-medium text-white/85">{s.label}</span>
                    <span className="text-[10.5px] text-white/40">
                      {s.source} • latency {s.latency}
                    </span>
                  </div>
                  <span className={cn("text-[12px] font-semibold", valueTone[s.status])}>{s.value}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </PeatShell>
  )
}
