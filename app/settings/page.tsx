"use client"

import { useEffect, useMemo, useState } from "react"
import {
  BellIcon,
  CheckIcon,
  CloudRainIcon,
  DropletIcon,
  FlameIcon,
  LayersIcon,
  MailIcon,
  MessageSquareIcon,
  PlugIcon,
  RotateCcwIcon,
  RotateCwIcon,
  SatelliteIcon,
  SaveIcon,
  ServerIcon,
  ShieldAlertIcon,
  TagIcon,
  WavesIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

import { OpenInTwin } from "@/components/peatland/open-in-twin"
import { Panel, PanelHeader, TableScroll, ViewAll, tableRow, tableTd, tableTh } from "@/components/peatland/panel"
import { PeatShell } from "@/components/peatland/peat-shell"
import { EwsPill, EwsScale, StatusDot, type Tone } from "@/components/peatland/status"
import { useSession } from "@/components/session-provider"
import {
  EWS_META,
  TWIN_BLOCKS,
  TWIN_LAYERS,
  TWIN_STREAMS,
  buildHistoryFrames,
  getBlockBaseline,
  summarizeFrame,
  type EwsLevel,
  type TwinLayer,
} from "@/lib/peatland/digital-twin"
import { useDashboardFilters } from "@/lib/peatland/filters"
import { dashboardMeta } from "@/lib/peatland/mock-data"
import { stationsOfType, type Station } from "@/lib/peatland/stations"
import { cn } from "@/lib/utils"

const fieldLabel = "text-[10.5px] font-semibold uppercase tracking-wide text-white/55"

// ---------------------------------------------------------------------------
// Kontrol form kecil

function Field({
  id,
  label,
  value,
  icon: Icon,
  type = "text",
  autoComplete,
  readOnly,
  onChange,
}: {
  id: string
  label: string
  value: string
  icon?: LucideIcon
  type?: "text" | "email"
  autoComplete?: string
  readOnly?: boolean
  onChange?: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={fieldLabel}>
        {label}
      </label>
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border px-3 transition-colors",
          readOnly
            ? "border-dashed border-white/10 bg-transparent"
            : "border-white/10 bg-white/[0.03] focus-within:border-emerald-400/50 focus-within:ring-2 focus-within:ring-emerald-400/25"
        )}
      >
        {Icon && <Icon className="size-3.5 shrink-0 text-white/50" aria-hidden />}
        <input
          id={id}
          type={type}
          value={value}
          readOnly={readOnly}
          autoComplete={autoComplete}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          className={cn(
            "h-9 w-full min-w-0 bg-transparent text-[12.5px] font-medium outline-none",
            readOnly ? "text-white/60" : "text-white/85"
          )}
        />
      </div>
    </div>
  )
}

/** Sakelar on/off yang dapat diakses (role="switch"), dilabeli lewat id teks di sebelahnya. */
function Switch({
  checked,
  onChange,
  labelledBy,
  describedBy,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  labelledBy: string
  describedBy?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full ring-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400/70",
        checked ? "bg-emerald-500/80 ring-emerald-400/40" : "bg-white/10 ring-white/15"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block size-3.5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-[3px]"
        )}
      />
    </button>
  )
}

type SwitchTone = "emerald" | "sky" | "amber"

const SWITCH_ICON_TONE: Record<SwitchTone, string> = {
  emerald: "bg-emerald-500/12 text-emerald-400 ring-emerald-500/20",
  sky: "bg-sky-500/12 text-sky-400 ring-sky-500/20",
  amber: "bg-amber-500/12 text-amber-400 ring-amber-500/20",
}

function SwitchRow({
  id,
  label,
  description,
  checked,
  icon: Icon,
  tone = "emerald",
  onChange,
}: {
  id: string
  label: string
  description?: string
  checked: boolean
  icon?: LucideIcon
  tone?: SwitchTone
  onChange: (next: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-4 py-2.5 first:border-t-0">
      <div className="flex min-w-0 items-center gap-2.5">
        {Icon && (
          <span
            className={cn(
              "inline-flex size-8 shrink-0 items-center justify-center rounded-lg ring-1",
              checked ? SWITCH_ICON_TONE[tone] : "bg-white/5 text-white/50 ring-white/10"
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
        )}
        <div className="min-w-0">
          <div id={`${id}-label`} className="text-[12.5px] font-medium text-white/85">
            {label}
          </div>
          {description && (
            <div id={`${id}-desc`} className="text-[11px] text-white/50">
              {description}
            </div>
          )}
        </div>
      </div>
      <Switch
        checked={checked}
        onChange={onChange}
        labelledBy={`${id}-label`}
        describedBy={description ? `${id}-desc` : undefined}
      />
    </div>
  )
}

/** Pilihan tunggal berbentuk chip; radio native supaya panah & label bekerja. */
function ChoiceGroup<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  hint,
}: {
  legend: string
  name: string
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  hint?: string
}) {
  return (
    <fieldset>
      <legend className={cn(fieldLabel, "mb-1.5")}>{legend}</legend>
      <div className="flex flex-wrap items-center gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              "cursor-pointer rounded-lg px-3 py-1.5 text-[12px] font-medium ring-1 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-emerald-400/70",
              o.value === value
                ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                : "bg-white/[0.03] text-white/60 ring-white/10 hover:text-white/85"
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={o.value === value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
      {hint && <p className="mt-1.5 text-[11px] text-white/50">{hint}</p>}
    </fieldset>
  )
}

// ---------------------------------------------------------------------------
// Ambang EWS (Normal / Waspada / Siaga / Awas) — default = ladder digital twin

type MetricKey = "waterTable" | "fireRisk" | "soilMoisture" | "rainfall"
type AlertLevel = Exclude<EwsLevel, "normal">
type Op = "<" | "≤" | "≥"
type LadderValues = Partial<Record<AlertLevel, string>>

const ALERT_LEVELS: AlertLevel[] = ["waspada", "siaga", "awas"]
const NEGATE: Record<Op, string> = { "<": "≥", "≤": ">", "≥": "<" }

type Ladder = {
  key: MetricKey
  label: string
  /** Satuan di belakang input ("/100" untuk indeks). */
  unit: string
  unitWord: string
  icon: LucideIcon
  /** "down" = makin kecil makin berbahaya (muka air, kelembapan). */
  worse: "down" | "up"
  /** Operator pemicu tiap level; level tanpa operator tidak dipakai. */
  ops: Partial<Record<AlertLevel, Op>>
  defaults: Partial<Record<AlertLevel, number>>
  min: number
  max: number
  note: string
}

const LADDERS: Ladder[] = [
  {
    key: "waterTable",
    label: "Water Table",
    unit: "cm",
    unitWord: "centimetres",
    icon: WavesIcon,
    worse: "down",
    ops: { waspada: "<", siaga: "≤", awas: "≤" },
    defaults: { waspada: -30, siaga: -40, awas: -60 },
    min: -150,
    max: 0,
    note: "PP 57/2016: peat water table must stay above −40 cm (0.4 m) at compliance points — Siaga starts at that limit.",
  },
  {
    key: "fireRisk",
    label: "Fire Risk Index",
    unit: "/100",
    unitWord: "index 0 to 100",
    icon: FlameIcon,
    worse: "up",
    ops: { waspada: "≥", siaga: "≥", awas: "≥" },
    defaults: { waspada: 50, siaga: 70, awas: 85 },
    min: 0,
    max: 100,
    note: "Index 0–100 from water table depth and 3-day rainfall (twin model).",
  },
  {
    key: "soilMoisture",
    label: "Soil Moisture",
    unit: "%",
    unitWord: "percent",
    icon: DropletIcon,
    worse: "down",
    ops: { waspada: "<", siaga: "<", awas: "<" },
    defaults: { waspada: 45, siaga: 35, awas: 25 },
    min: 0,
    max: 100,
    note: "Peat monitoring stations (PMS), volumetric soil moisture.",
  },
  {
    key: "rainfall",
    label: "Rainfall 24h",
    unit: "mm",
    unitWord: "millimetres",
    icon: CloudRainIcon,
    worse: "up",
    ops: { waspada: "≥", siaga: "≥" },
    defaults: { waspada: 30, siaga: 50 },
    min: 0,
    max: 500,
    note: "Rain gauges (RG), 24-hour total · rainfall has no Awas level.",
  },
]

const defaultValues = (): Record<MetricKey, LadderValues> =>
  Object.fromEntries(
    LADDERS.map((l) => [l.key, Object.fromEntries(Object.entries(l.defaults).map(([k, v]) => [k, String(v)]))])
  ) as Record<MetricKey, LadderValues>

const fmtNum = (v: number) => `${v < 0 ? "−" : ""}${Math.abs(Math.round(v * 10) / 10)}`
const withUnit = (text: string, unit: string) => (unit === "%" ? `${text}%` : unit === "/100" ? text : `${text} ${unit}`)

function usedLevels(l: Ladder): AlertLevel[] {
  return ALERT_LEVELS.filter((lvl) => l.ops[lvl])
}

function parseLadder(l: Ladder, values: LadderValues): Partial<Record<AlertLevel, number>> | null {
  const out: Partial<Record<AlertLevel, number>> = {}
  for (const lvl of usedLevels(l)) {
    const raw = values[lvl]?.trim() ?? ""
    const n = Number(raw)
    if (raw === "" || !Number.isFinite(n) || n < l.min || n > l.max) return null
    out[lvl] = n
  }
  return out
}

function ladderError(l: Ladder, values: LadderValues): string | null {
  const t = parseLadder(l, values)
  if (!t) return `Enter numbers between ${fmtNum(l.min)} and ${fmtNum(l.max)} ${l.unit === "/100" ? "" : l.unit}`.trim()
  const levels = usedLevels(l)
  for (let i = 1; i < levels.length; i += 1) {
    const prev = t[levels[i - 1]] as number
    const cur = t[levels[i]] as number
    if (l.worse === "down" ? cur >= prev : cur <= prev) {
      return `Limits must ${l.worse === "down" ? "decrease" : "increase"} from Waspada to ${EWS_META[levels[levels.length - 1]].label}`
    }
  }
  return null
}

function levelFor(l: Ladder, value: number, t: Partial<Record<AlertLevel, number>>): EwsLevel {
  let level: EwsLevel = "normal"
  for (const lvl of usedLevels(l)) {
    const op = l.ops[lvl] as Op
    const th = t[lvl] as number
    const hit = op === "<" ? value < th : op === "≤" ? value <= th : value >= th
    if (hit) level = lvl
  }
  return level
}

function rangesFor(l: Ladder, t: Partial<Record<AlertLevel, number>>): Partial<Record<EwsLevel, string>> {
  const levels = usedLevels(l)
  const out: Partial<Record<EwsLevel, string>> = {
    normal: withUnit(`${NEGATE[l.ops[levels[0]] as Op]} ${fmtNum(t[levels[0]] as number)}`, l.unit),
  }
  levels.forEach((lvl, i) => {
    const next = levels[i + 1]
    out[lvl] = next
      ? withUnit(`${fmtNum(t[lvl] as number)} … ${fmtNum(t[next] as number)}`, l.unit)
      : withUnit(`${l.ops[lvl]} ${fmtNum(t[lvl] as number)}`, l.unit)
  })
  for (const lvl of ALERT_LEVELS) if (!l.ops[lvl]) out[lvl] = "Not used"
  return out
}

type LiveRef = { label: string; value: number }

/** Stasiun online dengan bacaan paling ekstrem (terendah / tertinggi). */
function extreme(list: Station[], pick: "min" | "max"): LiveRef {
  let best: LiveRef | null = null
  for (const s of list) {
    if (s.value == null) continue
    if (!best || (pick === "min" ? s.value < best.value : s.value > best.value)) best = { label: s.code, value: s.value }
  }
  return best ?? { label: "—", value: 0 }
}

// ---------------------------------------------------------------------------
// Preferensi tampilan digital twin (disimpan di localStorage browser ini)

type Horizon = "3" | "7" | "14"
type TwinPrefs = { layer: TwinLayer; horizon: Horizon; autoRotate: boolean; labels: boolean }

const TWIN_PREFS_KEY = "peatland.twin-settings"
const DEFAULT_TWIN_PREFS: TwinPrefs = { layer: "waterTable", horizon: "7", autoRotate: true, labels: true }
const HORIZONS: { value: Horizon; label: string }[] = [
  { value: "3", label: "3 days" },
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
]
const LAYER_OPTIONS = TWIN_LAYERS.map((l) => ({ value: l.key, label: l.label }))

function loadTwinPrefs(): TwinPrefs {
  try {
    const raw = window.localStorage.getItem(TWIN_PREFS_KEY)
    if (!raw) return DEFAULT_TWIN_PREFS
    const p = JSON.parse(raw) as Partial<Record<keyof TwinPrefs, unknown>>
    return {
      layer: LAYER_OPTIONS.some((o) => o.value === p.layer) ? (p.layer as TwinLayer) : DEFAULT_TWIN_PREFS.layer,
      horizon: HORIZONS.some((o) => o.value === String(p.horizon)) ? (String(p.horizon) as Horizon) : DEFAULT_TWIN_PREFS.horizon,
      autoRotate: typeof p.autoRotate === "boolean" ? p.autoRotate : DEFAULT_TWIN_PREFS.autoRotate,
      labels: typeof p.labels === "boolean" ? p.labels : DEFAULT_TWIN_PREFS.labels,
    }
  } catch {
    return DEFAULT_TWIN_PREFS
  }
}

function saveTwinPrefs(prefs: TwinPrefs): boolean {
  try {
    window.localStorage.setItem(TWIN_PREFS_KEY, JSON.stringify(prefs))
    return true
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Integrasi & telemetri twin

type Integration = { name: string; desc: string; icon: LucideIcon; connected: boolean }

const INITIAL_INTEGRATIONS: Integration[] = [
  { name: "BMKG Weather API", desc: "Forecast & rainfall feed", icon: CloudRainIcon, connected: true },
  { name: "VIIRS / FIRMS", desc: "Satellite hotspot detection", icon: SatelliteIcon, connected: true },
  { name: "WhatsApp Gateway", desc: "Field team alerts", icon: MessageSquareIcon, connected: true },
  { name: "SCADA", desc: "Water gate automation (WTG-01…03)", icon: ServerIcon, connected: true },
]

// Stream twin yang datang lewat integrasi di atas: integrasi diputus → stream offline.
const STREAM_INTEGRATION: Record<string, string> = {
  "Water Gates": "SCADA",
  "Hotspot (VIIRS)": "VIIRS / FIRMS",
}

type StreamStatus = (typeof TWIN_STREAMS)[number]["status"]
const STREAM_STATUS_LABEL: Record<StreamStatus, string> = {
  normal: "Healthy",
  warning: "Degraded",
  critical: "Critical",
  offline: "Offline",
}

// ---------------------------------------------------------------------------
// Tim — anggota lapangan = penanggung jawab alert di halaman Alerts

type TeamStatus = "active" | "away" | "offline"

const TEAM_STATUS: Record<TeamStatus, { tone: Tone; label: string }> = {
  active: { tone: "normal", label: "Active" },
  away: { tone: "warning", label: "Away" },
  offline: { tone: "offline", label: "Offline" },
}

type Member = { name: string; role: string; focus: string; lastActive: string; status: TeamStatus; self?: boolean }

const FIELD_TEAM: Member[] = [
  { name: "Andi Saputra", role: "Hydrology Field Officer", focus: "Water level", lastActive: "5 min ago", status: "active" },
  { name: "Rina Wati", role: "Sensor & Telemetry Technician", focus: "Sensors & gateway", lastActive: "18 min ago", status: "active" },
  { name: "Budi Hartono", role: "Estate Manager", focus: "Weather & estate", lastActive: "42 min ago", status: "away" },
  { name: "Dewi Lestari", role: "Fire Response Lead", focus: "Fire & hotspots", lastActive: "2 hours ago", status: "away" },
]

const initialsOf = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

type NotifKey = "critical" | "dailyEmail" | "fireSms" | "weekly" | "maintenance"

const NOTIFICATIONS: { key: NotifKey; label: string; description: string; icon: LucideIcon; tone: SwitchTone }[] = [
  { key: "critical", label: "Critical Alerts", description: "Real-time push for Siaga & Awas events", icon: ShieldAlertIcon, tone: "amber" },
  { key: "dailyEmail", label: "Daily Summary Email", description: "Sent every day at 07:00 WIB", icon: MailIcon, tone: "sky" },
  { key: "fireSms", label: "Fire Hotspot SMS", description: "VIIRS hotspot within the estate", icon: FlameIcon, tone: "amber" },
  { key: "weekly", label: "Weekly Report", description: "Compiled hydrology report", icon: BellIcon, tone: "emerald" },
  { key: "maintenance", label: "Maintenance Reminders", description: "Sensor & borehole servicing", icon: WrenchIcon, tone: "emerald" },
]

// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const session = useSession()
  const { estate } = useDashboardFilters()

  const [profile, setProfile] = useState(() => ({
    fullName: session?.name ?? dashboardMeta.user.name,
    email: session ? `${session.username}@beacon-engineering.id` : "operator@beacon-engineering.id",
    estate: dashboardMeta.estate,
    role: session?.role ?? dashboardMeta.user.role,
  }))

  const [thresholds, setThresholds] = useState<Record<MetricKey, LadderValues>>(defaultValues)

  const [notifications, setNotifications] = useState<Record<NotifKey, boolean>>({
    critical: true,
    dailyEmail: true,
    fireSms: true,
    weekly: false,
    maintenance: true,
  })

  const [integrations, setIntegrations] = useState<Integration[]>(INITIAL_INTEGRATIONS)

  const [twinPrefs, setTwinPrefs] = useState<TwinPrefs>(DEFAULT_TWIN_PREFS)
  const [prefsStored, setPrefsStored] = useState<boolean | null>(null)

  // Muat preferensi twin setelah mount (localStorage tidak ada saat render server).
  useEffect(() => {
    setTwinPrefs(loadTwinPrefs())
  }, [])

  // Bacaan live pembanding ambang: rata-rata estate dari twin + stasiun terburuk.
  const live = useMemo(() => {
    const baseline = getBlockBaseline(estate)
    const history = buildHistoryFrames(baseline)
    const frame = history[history.length - 1]
    const summary = summarizeFrame(frame, baseline, TWIN_BLOCKS)
    const hottest = TWIN_BLOCKS.reduce((a, b) => (frame.blocks[b].fireRisk > frame.blocks[a].fireRisk ? b : a))
    const gauges = stationsOfType("rain-gauge").filter((s) => s.value != null)
    const rainAvg = gauges.reduce((acc, s) => acc + (s.value as number), 0) / (gauges.length || 1)
    const refs: Record<MetricKey, { avg: LiveRef; worst: LiveRef }> = {
      waterTable: {
        avg: { label: "estate avg", value: summary.waterTable },
        worst: extreme([...stationsOfType("borehole"), ...stationsOfType("water-station")], "min"),
      },
      fireRisk: {
        avg: { label: "estate avg", value: summary.fireRisk },
        worst: { label: hottest, value: frame.blocks[hottest].fireRisk },
      },
      soilMoisture: {
        avg: { label: "estate avg", value: summary.soilMoisture },
        worst: extreme(stationsOfType("peat-station"), "min"),
      },
      rainfall: {
        avg: { label: `${gauges.length}-gauge avg`, value: Math.round(rainAvg * 10) / 10 },
        worst: extreme(stationsOfType("rain-gauge"), "max"),
      },
    }
    return refs
  }, [estate])

  const errors = Object.fromEntries(LADDERS.map((l) => [l.key, ladderError(l, thresholds[l.key])])) as Record<
    MetricKey,
    string | null
  >
  const thresholdsValid = LADDERS.every((l) => !errors[l.key])

  const displayName = profile.fullName.trim() || session?.name || dashboardMeta.user.name
  const team: Member[] = [
    {
      name: session?.name ?? dashboardMeta.user.name,
      role: session?.role ?? dashboardMeta.user.role,
      focus: "All categories",
      lastActive: "Just now",
      status: "active",
      self: true,
    },
    ...FIELD_TEAM,
  ]

  const updateThreshold = (key: MetricKey, level: AlertLevel, value: string) =>
    setThresholds((prev) => ({ ...prev, [key]: { ...prev[key], [level]: value } }))

  const saveThresholds = () => {
    if (!thresholdsValid) return
    toast.success("Thresholds saved", {
      description: LADDERS.map(
        (l) => `${l.label} ${withUnit(usedLevels(l).map((lvl) => fmtNum(Number(thresholds[l.key][lvl]))).join("/"), l.unit)}`
      ).join(" · "),
    })
  }

  const resetThresholds = () => {
    setThresholds(defaultValues())
    toast("Thresholds reset to the Digital Twin EWS defaults")
  }

  const toggleNotification = (key: NotifKey, label: string, next: boolean) => {
    setNotifications((prev) => ({ ...prev, [key]: next }))
    toast(next ? `${label} enabled` : `${label} disabled`)
  }

  const toggleIntegration = (name: string) => {
    const target = integrations.find((i) => i.name === name)
    if (!target) return
    const next = !target.connected
    setIntegrations((prev) => prev.map((i) => (i.name === name ? { ...i, connected: next } : i)))
    toast.success(next ? `${name} connected` : `${name} disconnected`)
  }

  const updateTwinPrefs = (patch: Partial<TwinPrefs>) => {
    const next = { ...twinPrefs, ...patch }
    setTwinPrefs(next)
    setPrefsStored(saveTwinPrefs(next))
  }

  const connectedNames = new Set(integrations.filter((i) => i.connected).map((i) => i.name))
  const streams = TWIN_STREAMS.map((s) => {
    const via = STREAM_INTEGRATION[s.label]
    return via && !connectedNames.has(via) ? { ...s, status: "offline" as const, value: "—" } : s
  })
  const horizonDays = Number(twinPrefs.horizon)
  const layerLabel = TWIN_LAYERS.find((l) => l.key === twinPrefs.layer)?.label ?? "Water Table"

  return (
    <PeatShell title="Settings" subtitle="System Configuration">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Profile */}
        <Panel>
          <PanelHeader
            kicker="Account"
            title="Profile"
            subtitle="Signed-in user & estate assignment"
            action={
              <button
                type="button"
                onClick={() => toast.success("Profile saved", { description: `${displayName} · ${profile.role}` })}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/90 px-3 py-1.5 text-[11.5px] font-semibold text-[#06120c] ring-1 ring-emerald-400/40 transition-colors hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
              >
                <SaveIcon className="size-3.5" />
                Save
              </button>
            }
          />
          <div className="px-4 pb-4">
            <div className="mb-4 flex items-center gap-3">
              <span
                aria-hidden
                className="inline-flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/30 to-sky-500/20 text-[15px] font-bold text-emerald-300 ring-1 ring-emerald-500/30"
              >
                {initialsOf(displayName)}
              </span>
              <div className="min-w-0">
                <div className="truncate text-[14px] font-semibold text-white">{displayName}</div>
                <div className="truncate text-[11.5px] text-white/55">
                  {profile.role} · {profile.estate}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                id="profile-name"
                label="Full Name"
                value={profile.fullName}
                autoComplete="name"
                onChange={(v) => setProfile((p) => ({ ...p, fullName: v }))}
              />
              <Field
                id="profile-email"
                label="Email"
                type="email"
                value={profile.email}
                icon={MailIcon}
                autoComplete="email"
                onChange={(v) => setProfile((p) => ({ ...p, email: v }))}
              />
              <Field id="profile-estate" label="Estate" value={profile.estate} onChange={(v) => setProfile((p) => ({ ...p, estate: v }))} />
              <Field id="profile-role" label="Role" value={profile.role} onChange={(v) => setProfile((p) => ({ ...p, role: v }))} />
              <Field id="profile-username" label="Username" value={session?.username ?? "—"} readOnly />
              <Field id="profile-access" label="Access Level" value={session?.access ?? "—"} readOnly />
            </div>
          </div>
        </Panel>

        {/* Threshold Settings */}
        <Panel className="lg:row-span-2">
          <PanelHeader
            kicker="EWS · Thresholds"
            title="Threshold Settings"
            subtitle="Alert trigger limits · Normal / Waspada / Siaga / Awas · same ladder as the Digital Twin"
            action={
              <button
                type="button"
                onClick={resetThresholds}
                className="inline-flex items-center gap-1 text-[11.5px] font-medium text-emerald-400 transition-colors hover:text-emerald-300"
              >
                <RotateCcwIcon className="size-3.5" />
                Reset
              </button>
            }
          />
          <div className="flex flex-col">
            {LADDERS.map((l) => {
              const Icon = l.icon
              const values = thresholds[l.key]
              const error = errors[l.key]
              const parsed = parseLadder(l, values)
              // Saat input belum valid, skala tetap memakai nilai default agar tidak kosong.
              const active = parsed && !error ? parsed : l.defaults
              const ref = live[l.key]
              const avgLevel = levelFor(l, ref.avg.value, active)
              const worstLevel = levelFor(l, ref.worst.value, active)
              const errorId = `threshold-${l.key}-error`
              return (
                <fieldset key={l.key} className="flex flex-col gap-2.5 border-t border-white/[0.06] px-4 py-3 first:border-t-0">
                  <legend className="sr-only">{l.label} thresholds</legend>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/12 text-emerald-400 ring-1 ring-emerald-500/20">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-semibold text-white/90">
                          {l.label} <span className="font-normal text-white/50">· {l.unit === "/100" ? "index" : l.unit}</span>
                        </div>
                        <div className="text-[11px] text-white/55">
                          Live {ref.avg.label} {withUnit(fmtNum(ref.avg.value), l.unit)} · worst {ref.worst.label}{" "}
                          {withUnit(fmtNum(ref.worst.value), l.unit)}{" "}
                          <span style={{ color: EWS_META[worstLevel].color }}>({EWS_META[worstLevel].label})</span>
                        </div>
                      </div>
                    </div>
                    <EwsPill level={avgLevel} label={`Live · ${EWS_META[avgLevel].label}`} />
                  </div>

                  <EwsScale active={avgLevel} ranges={rangesFor(l, active)} />

                  <div className="grid grid-cols-3 gap-2">
                    {ALERT_LEVELS.map((lvl) => {
                      const op = l.ops[lvl]
                      if (!op) {
                        return (
                          <div
                            key={lvl}
                            className="flex flex-col justify-end gap-1 rounded-lg border border-dashed border-white/10 px-2.5 py-1.5 text-[11px] text-white/50"
                          >
                            <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.1em]" style={{ color: EWS_META[lvl].color }}>
                              {EWS_META[lvl].label}
                            </span>
                            Not used
                          </div>
                        )
                      }
                      const id = `threshold-${l.key}-${lvl}`
                      return (
                        <div key={lvl} className="flex min-w-0 flex-col gap-1">
                          <label
                            htmlFor={id}
                            className="font-mono text-[9.5px] font-bold uppercase tracking-[0.1em]"
                            style={{ color: EWS_META[lvl].color }}
                          >
                            {EWS_META[lvl].label} {op}
                            <span className="sr-only"> ({l.unitWord})</span>
                          </label>
                          <div
                            className={cn(
                              "flex items-center rounded-lg border bg-white/[0.03] transition-colors focus-within:ring-2",
                              error
                                ? "border-red-400/60 focus-within:ring-red-400/25"
                                : "border-white/10 focus-within:border-emerald-400/50 focus-within:ring-emerald-400/25"
                            )}
                          >
                            <input
                              id={id}
                              type="number"
                              inputMode="decimal"
                              step={1}
                              min={l.min}
                              max={l.max}
                              value={values[lvl] ?? ""}
                              onChange={(e) => updateThreshold(l.key, lvl, e.target.value)}
                              aria-invalid={Boolean(error)}
                              aria-describedby={error ? errorId : undefined}
                              className="h-8 w-full min-w-0 bg-transparent pl-2.5 text-[12.5px] tabular-nums text-white/85 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                            <span aria-hidden className="shrink-0 pr-2.5 text-[11px] text-white/50">
                              {l.unit}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {error && (
                    <p id={errorId} role="alert" className="text-[11px] font-medium text-red-300">
                      {error}
                    </p>
                  )}
                  <p className="text-[11px] text-white/50">{l.note}</p>
                </fieldset>
              )
            })}
          </div>
          <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-white/[0.06] px-4 py-3">
            <button
              type="button"
              onClick={saveThresholds}
              disabled={!thresholdsValid}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/90 px-3.5 py-2 text-[12.5px] font-semibold text-[#06120c] ring-1 ring-emerald-400/40 transition-colors hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <SaveIcon className="size-3.5" />
              Save Changes
            </button>
            <span className="text-[11px] text-white/50">
              {thresholdsValid ? "Applies to alerts, station tables and the twin EWS chips" : "Fix the highlighted limits to save"}
            </span>
          </div>
        </Panel>

        {/* Notifications */}
        <Panel>
          <PanelHeader
            kicker="Alerts · Delivery"
            title="Notifications"
            subtitle="Delivery channels for EWS alerts"
            action={<ViewAll href="/alerts" label="View alerts" />}
          />
          <div className="pb-2">
            {NOTIFICATIONS.map((n) => (
              <SwitchRow
                key={n.key}
                id={`notif-${n.key}`}
                label={n.label}
                description={n.description}
                checked={notifications[n.key]}
                icon={n.icon}
                tone={n.tone}
                onChange={(next) => toggleNotification(n.key, n.label, next)}
              />
            ))}
          </div>
        </Panel>

        {/* Integrations */}
        <Panel>
          <PanelHeader kicker="Data Sources" title="Integrations" subtitle="Connected services & digital twin telemetry" />
          <div className="grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-2">
            {integrations.map((i) => {
              const Icon = i.icon
              return (
                <div
                  key={i.name}
                  className="flex flex-col gap-2 rounded-lg border border-white/8 bg-white/[0.03] p-3 ring-1 ring-white/5 transition-colors hover:border-white/15"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={cn(
                        "inline-flex size-8 items-center justify-center rounded-lg ring-1",
                        i.connected ? "bg-emerald-500/12 text-emerald-400 ring-emerald-500/20" : "bg-white/5 text-white/50 ring-white/10"
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    {i.connected ? (
                      <CheckIcon className="size-4 text-emerald-400" aria-hidden />
                    ) : (
                      <PlugIcon className="size-4 text-white/50" aria-hidden />
                    )}
                  </div>
                  <div>
                    <div className="text-[12.5px] font-semibold text-white/85">{i.name}</div>
                    <div className="text-[11px] text-white/50">{i.desc}</div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <StatusDot tone={i.connected ? "normal" : "offline"} label={i.connected ? "Connected" : "Disconnected"} />
                    <button
                      type="button"
                      onClick={() => toggleIntegration(i.name)}
                      aria-label={`${i.connected ? "Disconnect" : "Connect"} ${i.name}`}
                      className={cn(
                        "rounded-md px-2 py-1 text-[10.5px] font-semibold ring-1 transition-colors",
                        i.connected
                          ? "bg-white/5 text-white/60 ring-white/10 hover:bg-white/10"
                          : "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30 hover:bg-emerald-500/25"
                      )}
                    >
                      {i.connected ? "Disconnect" : "Connect"}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="border-t border-white/[0.06]">
            <TableScroll className="px-1 pb-2 pt-1">
              <table className="w-full min-w-[460px] text-left">
                <caption className="sr-only">Digital twin data streams</caption>
                <thead>
                  <tr>
                    <th className={tableTh}>Stream</th>
                    <th className={tableTh}>Source</th>
                    <th className={cn(tableTh, "text-right")}>Online</th>
                    <th className={cn(tableTh, "text-right")}>Latency</th>
                    <th className={cn(tableTh, "text-right")}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {streams.map((s) => (
                    <tr key={s.label} className={tableRow}>
                      <td className={cn(tableTd, "font-medium text-white/85")}>{s.label}</td>
                      <td className={cn(tableTd, "text-white/60")}>{s.source}</td>
                      <td className={cn(tableTd, "text-right font-mono tabular-nums text-white/75")}>{s.value}</td>
                      <td className={cn(tableTd, "text-right tabular-nums text-white/60")}>{s.latency}</td>
                      <td className={cn(tableTd, "text-right")}>
                        <StatusDot tone={s.status} label={STREAM_STATUS_LABEL[s.status]} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          </div>
        </Panel>

        {/* Digital Twin */}
        <Panel>
          <PanelHeader
            kicker="Digital Twin · View"
            icon={LayersIcon}
            title="Digital Twin"
            subtitle="Default 3D view & forecast · saved in this browser"
            action={<OpenInTwin layer={twinPrefs.layer} label="Open in Twin" />}
          />
          <div className="flex flex-col gap-4 px-4 pb-3">
            <ChoiceGroup
              legend="Default layer"
              name="twin-layer"
              options={LAYER_OPTIONS}
              value={twinPrefs.layer}
              onChange={(layer) => updateTwinPrefs({ layer })}
              hint={`“Open in Twin” above opens the 3D view on ${layerLabel}.`}
            />
            <ChoiceGroup
              legend="Forecast horizon"
              name="twin-horizon"
              options={HORIZONS}
              value={twinPrefs.horizon}
              onChange={(horizon) => updateTwinPrefs({ horizon })}
              hint={`Scenario forecast 11–${10 + horizonDays} Sep 2024 (from live 10 Sep).`}
            />
          </div>
          <div className="border-t border-white/[0.06]">
            <SwitchRow
              id="twin-rotate"
              label="Auto-rotate camera"
              description="Slowly orbit the estate until you interact"
              checked={twinPrefs.autoRotate}
              icon={RotateCwIcon}
              onChange={(autoRotate) => updateTwinPrefs({ autoRotate })}
            />
            <SwitchRow
              id="twin-labels"
              label="Sensor & block labels"
              description="Show reading callouts on sensors and block names"
              checked={twinPrefs.labels}
              icon={TagIcon}
              tone="sky"
              onChange={(labels) => updateTwinPrefs({ labels })}
            />
          </div>
          <p
            className={cn(
              "mt-auto border-t border-white/[0.06] px-4 py-2.5 text-[11px]",
              prefsStored === false ? "text-amber-300/90" : "text-white/50"
            )}
            role={prefsStored === false ? "alert" : undefined}
          >
            {prefsStored === false
              ? "Browser storage is unavailable — these settings apply to this session only."
              : `Saved in this browser · ${layerLabel} · ${horizonDays}-day forecast · rotate ${twinPrefs.autoRotate ? "on" : "off"} · labels ${twinPrefs.labels ? "on" : "off"}`}
          </p>
        </Panel>
      </div>

      {/* Team Members */}
      <Panel>
        <PanelHeader
          kicker="Team · Alert Assignees"
          title="Team Members"
          subtitle={`${profile.estate} · ${team.length} members · field members are assigned on the Alerts page`}
          action={<ViewAll href="/alerts" label="View alerts" />}
        />
        <TableScroll>
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr>
                <th className={tableTh}>Name</th>
                <th className={tableTh}>Role</th>
                <th className={tableTh}>Alert Focus</th>
                <th className={tableTh}>Last Active</th>
                <th className={cn(tableTh, "text-right")}>Status</th>
              </tr>
            </thead>
            <tbody>
              {team.map((m) => {
                const s = TEAM_STATUS[m.status]
                return (
                  <tr key={m.name} className={tableRow}>
                    <td className={tableTd}>
                      <div className="flex items-center gap-2.5">
                        <span
                          aria-hidden
                          className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-white/8 text-[10.5px] font-bold text-white/75 ring-1 ring-white/10"
                        >
                          {initialsOf(m.name)}
                        </span>
                        <span className="font-medium text-white/85">{m.name}</span>
                        {m.self && (
                          <span className="rounded bg-emerald-500/15 px-1.5 py-px text-[9.5px] font-bold uppercase tracking-wide text-emerald-300">
                            You
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={cn(tableTd, "text-white/60")}>{m.role}</td>
                    <td className={cn(tableTd, "text-white/60")}>{m.focus}</td>
                    <td className={cn(tableTd, "whitespace-nowrap text-white/60")}>{m.lastActive}</td>
                    <td className={cn(tableTd, "text-right")}>
                      <StatusDot tone={s.tone} label={s.label} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </TableScroll>
      </Panel>
    </PeatShell>
  )
}
