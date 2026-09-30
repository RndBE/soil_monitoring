"use client"

import { useMemo, useState } from "react"
import {
  ActivityIcon,
  BatteryMediumIcon,
  BoxIcon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  DownloadIcon,
  GaugeIcon,
  RadioTowerIcon,
  RefreshCwIcon,
  TargetIcon,
  WavesIcon,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

import {
  WT_BANDS,
  WT_LINES,
  axisProps,
  bandProps,
  gridProps,
  lineProps,
  tooltipStyle,
  withUnit,
  type Threshold,
} from "@/components/peatland/chart-theme"
import { OpenInTwin } from "@/components/peatland/open-in-twin"
import { Panel, PanelHeader, TableScroll, ViewAll, tableRow, tableTd, tableTh } from "@/components/peatland/panel"
import { PeatShell } from "@/components/peatland/peat-shell"
import { StatTile } from "@/components/peatland/stat-tile"
import { EwsPill, StatusDot, levelColor, type Tone } from "@/components/peatland/status"
import {
  EWS_META,
  SCENARIO_PRESETS,
  TWIN_BLOCKS,
  TWIN_STREAMS,
  WT_COMPLIANCE,
  WT_TARGET,
  buildHistoryFrames,
  ewsFromWaterTable,
  getBlockBaseline,
  simulateScenario,
  summarizeFrame,
  type EwsLevel,
} from "@/lib/peatland/digital-twin"
import { useDashboardFilters } from "@/lib/peatland/filters"
import { ALL_BLOCKS, DATE_RANGE_OPTIONS, matchesBlock, scaleNumber, sliceSeries } from "@/lib/peatland/filter-logic"
import { waterTableTrend } from "@/lib/peatland/mock-data"
import { stationsOfType, type StationLevel, type StationSignal } from "@/lib/peatland/stations"
import { cn } from "@/lib/utils"

const round1 = (v: number) => Math.round(v * 10) / 10
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
/** Angka dengan minus tipografis, mis. "−37" / "−38.1". */
const fmtNum = (v: number) => `${v < 0 ? "−" : ""}${Math.abs(round1(v))}`

// Histori 4–10 Sep (frame terakhir = live 10 Sep) + prakiraan twin 11–15 Sep.
const HISTORY_DAYS = waterTableTrend.map((t) => t.day)
const LIVE_TREND = waterTableTrend[waterTableTrend.length - 1].value
const FORECAST_DAYS = 5
const BASELINE_PRESET = SCENARIO_PRESETS.find((p) => p.key === "baseline") ?? SCENARIO_PRESETS[0]
const NETWORK = TWIN_STREAMS.find((s) => s.label === "Borehole Network")?.value ?? "—"

const TARGET_LINE: Threshold = { level: "normal", y: WT_TARGET, label: "Target · −30 cm" }
const Y_TICKS = [-70, -60, -50, -40, -30, -20, -10, 0]

const SIGNAL_TONE: Record<StationSignal, Tone> = {
  Good: "normal",
  Fair: "warning",
  Weak: "critical",
  "No signal": "offline",
}

type BoreholeRow = {
  code: string
  block: string
  value: number | null
  level: StationLevel
  battery: number
  signal: StationSignal
  lastSeen: string
  /** Muka air harian 4–10 Sep (cm), berakhir di bacaan live. */
  trend: number[]
}

type LiveRow = BoreholeRow & { value: number }
const hasValue = (r: BoreholeRow): r is LiveRow => r.value != null
const isAlarm = (l: StationLevel) => l === "siaga" || l === "awas"

// Riak kecil deterministik per stasiun (−1…+1 cm) supaya tren tiap borehole tidak identik.
function wobble(code: string, i: number): number {
  const seed = [...code].reduce((a, c) => a + c.charCodeAt(0), 0)
  return ((seed * (i + 3)) % 3) - 1
}

// Tren 7 hari mengikuti bentuk tren estate (sama seperti replay twin), berakhir tepat di bacaan live.
function stationTrend(code: string, value: number): number[] {
  return waterTableTrend.map((t, i) =>
    i === waterTableTrend.length - 1 ? value : Math.round((value * t.value) / LIVE_TREND) + wobble(code, i)
  )
}

// Baris tabel dari registri stasiun; muka air ikut faktor estate seperti baseline twin.
function buildRows(estate: string): BoreholeRow[] {
  return stationsOfType("borehole").map((s) => {
    const value = s.value == null ? null : scaleNumber(s.value, estate)
    return {
      code: s.code,
      block: s.block,
      value,
      level: value == null ? "offline" : ewsFromWaterTable(value),
      battery: s.battery,
      signal: s.signal,
      lastSeen: s.lastSeen,
      trend: value == null ? [] : stationTrend(s.code, value),
    }
  })
}

type Forecast = { day: string; value: number }

// Chip ringkas kapan rata-rata muka air menembus −40 cm (PP 57/2016) menurut prakiraan twin.
function forecastChip(last: number, forecast: Forecast[]): { level: EwsLevel; text: string } {
  const end = forecast[forecast.length - 1]
  if (!end) return { level: ewsFromWaterTable(last), text: "Prakiraan twin tidak tersedia" }
  if (last <= WT_COMPLIANCE) {
    return {
      level: ewsFromWaterTable(end.value),
      text: `Prakiraan twin: sudah di bawah −40 cm · ${fmtNum(end.value)} cm pada ${end.day}`,
    }
  }
  const i = forecast.findIndex((f) => f.value <= WT_COMPLIANCE)
  if (i >= 0) return { level: "siaga", text: `Prakiraan twin: −40 cm dalam ~${i + 1} hari (${forecast[i].day})` }
  return {
    level: ewsFromWaterTable(end.value),
    text: `Prakiraan twin: tetap di atas −40 cm s/d ${end.day} (${fmtNum(end.value)} cm)`,
  }
}

/** Garis tren mini untuk kolom tabel. */
function Spark({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return <span className="text-[11px] text-white/50">—</span>
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const w = 56
  const h = 18
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ")
  return (
    <svg width={w} height={h} className="overflow-visible" aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Pemilih rentang tanggal — tersambung ke filter global header. */
function RangeMenu({ value, onSelect }: { value: string; onSelect: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12.5px] font-medium text-white/75 transition-colors hover:border-white/20"
      >
        <CalendarIcon className="size-3.5" />
        {value}
        <ChevronDownIcon className="size-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="listbox"
            className="absolute z-50 mt-1 min-w-full overflow-hidden rounded-lg border border-white/10 bg-[#10201a] py-1 shadow-xl"
          >
            {DATE_RANGE_OPTIONS.map((o) => (
              <button
                key={o}
                type="button"
                role="option"
                aria-selected={o === value}
                onClick={() => {
                  onSelect(o)
                  setOpen(false)
                }}
                className={cn(
                  "block w-full whitespace-nowrap px-3 py-2 text-left text-[12.5px] hover:bg-white/5",
                  o === value ? "text-emerald-300" : "text-white/75"
                )}
              >
                {o}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

type StatusFilter = "all" | StationLevel

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "normal", label: "Normal" },
  { key: "waspada", label: "Waspada" },
  { key: "siaga", label: "Siaga" },
  { key: "awas", label: "Awas" },
]

type TrendPoint = { day: string; value?: number; forecast?: number }

export default function BoreholeMonitoringPage() {
  const { estate, division, dateRange, setDateRange } = useDashboardFilters()
  const [showTargets, setShowTargets] = useState(true)
  const [filter, setFilter] = useState<StatusFilter>("all")
  const [acked, setAcked] = useState<string[]>([])

  const rows = useMemo(() => buildRows(estate), [estate])
  const divisionRows = useMemo(() => rows.filter((r) => matchesBlock(r.block, division)), [rows, division])
  const visibleRows = useMemo(
    () => divisionRows.filter((r) => filter === "all" || r.level === filter),
    [divisionRows, filter]
  )
  const liveRows = useMemo(() => divisionRows.filter(hasValue), [divisionRows])

  // Rata-rata muka air borehole (histori) + lanjutan prakiraan twin skenario Baseline.
  const trend = useMemo(() => {
    const history = HISTORY_DAYS.map((day, i) => ({ day, value: round1(avg(liveRows.map((r) => r.trend[i]))) }))
    const last = history[history.length - 1].value
    const blocks = TWIN_BLOCKS.filter((b) => matchesBlock(b, division))
    const baseline = getBlockBaseline(estate)
    const frames = buildHistoryFrames(baseline)
    const liveWt = summarizeFrame(frames[frames.length - 1], baseline, blocks).waterTable
    // Twin memberi perubahan relatif terhadap live; ditempel ke rata-rata borehole agar garis menyambung.
    const forecast: Forecast[] = simulateScenario(baseline, { ...BASELINE_PRESET.scenario, days: FORECAST_DAYS }).map(
      (f) => ({ day: f.label, value: round1(last + summarizeFrame(f, baseline, blocks).waterTable - liveWt) })
    )
    return { history, forecast, last }
  }, [liveRows, division, estate])

  const shown = sliceSeries(trend.history, dateRange)
  const chartData: TrendPoint[] = [
    ...shown.map((p, i) => (i === shown.length - 1 ? { ...p, forecast: p.value } : p)),
    ...trend.forecast.map((f) => ({ day: f.day, forecast: f.value })),
  ]
  const span =
    shown.length > 1 ? `${shown[0].day.replace(" Sep", "")}–${shown[shown.length - 1].day}` : shown[0]?.day ?? "—"
  const chip = forecastChip(trend.last, trend.forecast)
  const chipColor = EWS_META[chip.level].color

  const stats = useMemo(() => {
    const values = liveRows.map((r) => r.value)
    const avgWt = Math.round(avg(values))
    const alarm = liveRows.filter((r) => isAlarm(r.level))
    const awas = alarm.filter((r) => r.level === "awas").length
    const deepest = liveRows.reduce<LiveRow | null>((a, b) => (!a || b.value < a.value ? b : a), null)
    const inTarget = liveRows.filter((r) => r.value >= WT_TARGET).length
    const lowBattery = divisionRows.reduce<BoreholeRow | null>((a, b) => (!a || b.battery < a.battery ? b : a), null)
    return {
      avgWt,
      avgLevel: ewsFromWaterTable(avgWt),
      alarm,
      awas,
      alarmSpark: HISTORY_DAYS.map((_, i) => liveRows.filter((r) => isAlarm(ewsFromWaterTable(r.trend[i]))).length),
      deepest,
      inTarget,
      inTargetPct: liveRows.length ? Math.round((inTarget / liveRows.length) * 100) : 0,
      battery: Math.round(avg(divisionRows.map((r) => r.battery))),
      lowBattery,
    }
  }, [liveRows, divisionRows])

  const wtDelta = round1(trend.history[trend.history.length - 1].value - trend.history[trend.history.length - 2].value)
  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = { all: divisionRows.length }
    for (const r of divisionRows) counts[r.level] = (counts[r.level] ?? 0) + 1
    return counts
  }, [divisionRows])

  function refresh() {
    const id = toast.loading("Memuat telemetri terbaru…")
    setTimeout(() => toast.success("Telemetri diperbarui", { id }), 900)
  }

  function exportReport() {
    const id = toast.loading("Membuat laporan…")
    setTimeout(() => toast.success("Laporan siap diunduh", { id }), 900)
  }

  // Ack hanya menandai sudah ditindaklanjuti; level EWS tetap mengikuti bacaan.
  function acknowledge(code: string, level: StationLevel) {
    setAcked((prev) => (prev.includes(code) ? prev : [...prev, code]))
    toast.success(`${code} ditindaklanjuti`, {
      description: `Status EWS tetap ${level === "offline" ? "Offline" : EWS_META[level].label} sampai bacaan membaik`,
    })
  }

  const inTargetTone: Tone = stats.inTargetPct >= 80 ? "normal" : stats.inTargetPct >= 40 ? "warning" : "critical"

  return (
    <PeatShell title="Borehole Monitoring" subtitle="Groundwater & Water Table Network">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <RangeMenu value={dateRange} onSelect={setDateRange} />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12.5px] font-medium text-white/75 transition-colors hover:border-white/20"
          >
            <RefreshCwIcon className="size-3.5" />
            Refresh
          </button>
          <button
            type="button"
            onClick={exportReport}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-[12.5px] font-medium text-emerald-400 ring-1 ring-emerald-500/30 transition-colors hover:bg-emerald-500/25"
          >
            <DownloadIcon className="size-3.5" />
            Export
          </button>
          <OpenInTwin layer="waterTable" block={division === ALL_BLOCKS ? undefined : division} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile
          label="Avg Water Table"
          value={fmtNum(stats.avgWt)}
          unit="cm"
          tone={stats.avgLevel}
          icon={WavesIcon}
          status={`${EWS_META[stats.avgLevel].label} · target ≥ −30 cm`}
          spark={trend.history.map((p) => p.value)}
          delta={
            wtDelta !== 0
              ? { text: `${Math.abs(wtDelta)} cm`, dir: wtDelta < 0 ? "down" : "up", good: wtDelta > 0, vs: "vs yesterday" }
              : undefined
          }
          foot={wtDelta === 0 ? "Stable vs yesterday" : undefined}
        />
        <StatTile
          label="Boreholes Siaga/Awas"
          value={String(stats.alarm.length)}
          unit="stations"
          tone={stats.awas > 0 ? "awas" : stats.alarm.length > 0 ? "siaga" : "normal"}
          icon={ActivityIcon}
          status={stats.alarm.length ? stats.alarm.map((r) => r.code).join(" · ") : "None"}
          spark={stats.alarmSpark}
          foot={`${stats.awas} Awas · ${stats.alarm.length - stats.awas} Siaga · threshold −40 cm`}
        />
        <StatTile
          label="Deepest"
          value={stats.deepest ? fmtNum(stats.deepest.value) : "—"}
          unit="cm"
          tone={stats.deepest?.level ?? "offline"}
          icon={GaugeIcon}
          status={stats.deepest ? `${stats.deepest.code} · ${stats.deepest.block}` : undefined}
          spark={stats.deepest?.trend}
          foot="Awas below −60 cm"
        />
        <StatTile
          label="Within Target"
          value={String(stats.inTargetPct)}
          unit="%"
          tone={inTargetTone}
          icon={TargetIcon}
          foot={`${stats.inTarget} of ${liveRows.length} boreholes ≥ −30 cm`}
        />
        <StatTile
          label="Active Boreholes"
          value={`${liveRows.length}/${divisionRows.length}`}
          tone="info"
          icon={RadioTowerIcon}
          status="Reporting in table"
          foot={`Network ${NETWORK} online · LoRaWAN`}
        />
        <StatTile
          label="Avg Battery"
          value={String(stats.battery)}
          unit="%"
          tone={stats.battery >= 70 ? "normal" : "warning"}
          icon={BatteryMediumIcon}
          foot={stats.lowBattery ? `Lowest ${stats.lowBattery.code} · ${stats.lowBattery.battery}%` : undefined}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel className="h-full">
          <PanelHeader
            kicker="EWS · MUKA AIR"
            title={`Water Table Trend (${span})`}
            subtitle={`${division === ALL_BLOCKS ? "All boreholes" : division} average (cm below surface) · twin forecast to ${trend.forecast[trend.forecast.length - 1]?.day ?? "—"}`}
            action={
              <button
                type="button"
                aria-pressed={showTargets}
                onClick={() => setShowTargets((s) => !s)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11.5px] font-medium transition-colors",
                  showTargets
                    ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                    : "border border-white/10 text-white/55 hover:border-white/20"
                )}
              >
                <TargetIcon className="size-3.5" />
                Target Lines
              </button>
            }
          />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 pb-1">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium"
              style={{
                color: chipColor,
                borderColor: `color-mix(in srgb, ${chipColor} 40%, transparent)`,
                background: `color-mix(in srgb, ${chipColor} 10%, transparent)`,
              }}
            >
              <BoxIcon className="size-3.5" />
              {chip.text}
            </span>
            <span className="flex items-center gap-3 text-[10.5px] text-white/55">
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-3.5 rounded-full bg-sky-400" />
                Observed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 border-t-2 border-dashed border-sky-300/80" />
                Twin forecast (Baseline)
              </span>
            </span>
          </div>
          <div className="h-[220px] px-1 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="day" {...axisProps} />
                <YAxis
                  domain={[-70, 0]}
                  ticks={Y_TICKS}
                  tickFormatter={(v: number) => `${v} cm`}
                  {...axisProps}
                  width={50}
                />
                {showTargets && WT_BANDS.map((b) => <ReferenceArea key={b.level} {...bandProps(b)} />)}
                {showTargets && <ReferenceLine {...lineProps(TARGET_LINE)} />}
                {showTargets && WT_LINES.map((t) => <ReferenceLine key={t.y} {...lineProps(t)} />)}
                <ReferenceLine
                  x={HISTORY_DAYS[HISTORY_DAYS.length - 1]}
                  stroke="rgba(255,255,255,0.3)"
                  strokeDasharray="2 3"
                  label={{ value: "Live", position: "insideTopRight", fontSize: 9, fill: "rgba(255,255,255,0.6)" }}
                />
                <Tooltip {...tooltipStyle} formatter={withUnit("cm")} />
                <Line
                  dataKey="value"
                  name="Water Table"
                  type="monotone"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#38bdf8" }}
                  activeDot={{ r: 4 }}
                />
                <Line
                  dataKey="forecast"
                  name="Twin forecast"
                  type="monotone"
                  stroke="#7dd3fc"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={{ r: 2.5, fill: "#04120b", stroke: "#7dd3fc" }}
                  activeDot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="h-full">
          <PanelHeader
            kicker="EWS · PER STASIUN"
            title="Water Level by Borehole (cm)"
            subtitle={`Latest reading per station · 10 Sep 09:37${division === ALL_BLOCKS ? "" : ` · ${division}`}`}
          />
          <div className="h-[220px] px-1 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={liveRows} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="code" {...axisProps} interval={0} />
                <YAxis
                  domain={[-70, 0]}
                  ticks={Y_TICKS}
                  tickFormatter={(v: number) => `${v} cm`}
                  {...axisProps}
                  width={50}
                />
                <ReferenceLine {...lineProps(TARGET_LINE)} />
                {WT_LINES.map((t) => (
                  <ReferenceLine key={t.y} {...lineProps(t)} />
                ))}
                <Tooltip {...tooltipStyle} formatter={withUnit("cm")} />
                <Bar dataKey="value" name="Water Level" radius={[0, 0, 3, 3]} maxBarSize={26}>
                  {liveRows.map((r) => (
                    <Cell key={r.code} fill={levelColor(r.level)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          kicker="TELEMETRI · LORAWAN"
          title="Borehole Status"
          subtitle={`Live 10 Sep 09:37 · ${visibleRows.length} of ${divisionRows.length} stations${division === ALL_BLOCKS ? "" : ` in ${division}`} · network ${NETWORK}`}
          action={<ViewAll href="/map-view" label="View on Map" />}
        />
        <div className="flex flex-wrap items-center gap-1.5 px-4 pb-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-[11.5px] font-medium transition-colors",
                filter === f.key
                  ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                  : "text-white/55 hover:text-white/80"
              )}
            >
              {f.label}
              <span className="ml-1 font-mono text-[10px] text-white/50">{levelCounts[f.key] ?? 0}</span>
            </button>
          ))}
        </div>
        <TableScroll>
          <table className="w-full min-w-[860px] text-left">
            <thead>
              <tr>
                <th className={tableTh}>ID</th>
                <th className={tableTh}>Block</th>
                <th className={cn(tableTh, "text-right")}>Water Level</th>
                <th className={cn(tableTh, "text-right")}>Battery</th>
                <th className={tableTh}>Signal</th>
                <th className={tableTh}>Last Seen</th>
                <th className={tableTh}>Status</th>
                <th className={cn(tableTh, "text-right")}>Trend (7D)</th>
                <th className={cn(tableTh, "text-right")}>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 && (
                <tr className={tableRow}>
                  <td className={cn(tableTd, "text-center text-white/50")} colSpan={9}>
                    Tidak ada borehole dengan status ini{division === ALL_BLOCKS ? "" : ` di ${division}`}
                  </td>
                </tr>
              )}
              {visibleRows.map((r) => {
                const isAcked = acked.includes(r.code)
                const needsAck = r.level !== "normal" && r.level !== "offline"
                return (
                  <tr key={r.code} className={tableRow}>
                    <td className={cn(tableTd, "font-mono font-medium text-white/85")}>{r.code}</td>
                    <td className={cn(tableTd, "text-white/60")}>{r.block}</td>
                    <td className={cn(tableTd, "text-right font-medium tabular-nums")} style={{ color: levelColor(r.level) }}>
                      {r.value == null ? "OFFLINE" : `${fmtNum(r.value)} cm`}
                    </td>
                    <td className={cn(tableTd, "text-right tabular-nums")}>
                      <span className={cn("font-medium", r.battery < 60 ? "text-amber-400" : "text-white/70")}>{r.battery}%</span>
                    </td>
                    <td className={tableTd}>
                      <StatusDot tone={SIGNAL_TONE[r.signal]} label={r.signal} />
                    </td>
                    <td className={cn(tableTd, "font-mono text-white/60")}>{r.lastSeen}</td>
                    <td className={tableTd}>
                      <span className="inline-flex flex-wrap items-center gap-1.5">
                        <EwsPill level={r.level} pulse={r.level === "awas"} />
                        {isAcked && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.04] px-2 py-[2px] text-[10px] font-medium text-white/70">
                            <CheckIcon className="size-3" />
                            Acknowledged
                          </span>
                        )}
                      </span>
                    </td>
                    <td className={cn(tableTd, "text-right")}>
                      <span className="inline-flex justify-end">
                        <Spark data={r.trend} color={levelColor(r.level)} />
                      </span>
                    </td>
                    <td className={cn(tableTd, "text-right")}>
                      <span className="inline-flex items-center justify-end gap-1.5">
                        {needsAck && !isAcked && (
                          <button
                            type="button"
                            onClick={() => acknowledge(r.code, r.level)}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-1 text-[11px] font-medium text-emerald-400 ring-1 ring-emerald-500/30 transition-colors hover:bg-emerald-500/25"
                          >
                            <CheckIcon className="size-3" />
                            Ack
                          </button>
                        )}
                        <OpenInTwin variant="icon" asset={r.code} layer="waterTable" />
                      </span>
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
