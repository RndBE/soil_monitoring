"use client"

import { Fragment, useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  BoxIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CloudIcon,
  CloudRainIcon,
  DownloadIcon,
  DropletsIcon,
  GaugeIcon,
  SunIcon,
  SunMediumIcon,
  ThermometerIcon,
  WindIcon,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

import { Panel, PanelHeader, TableScroll, ViewAll, tableRow, tableTd, tableTh } from "@/components/peatland/panel"
import { PeatShell } from "@/components/peatland/peat-shell"
import { StatTile } from "@/components/peatland/stat-tile"
import { EwsPill, StatusDot, type Tone } from "@/components/peatland/status"
import { WT_BANDS, WT_LINES, axisProps, bandProps, gridProps, lineProps, tooltipStyle, withUnit } from "@/components/peatland/chart-theme"
import { OpenInTwin } from "@/components/peatland/open-in-twin"
import {
  EWS_META,
  LIVE_GATE_OPENING,
  WT_COMPLIANCE,
  ewsFromWaterTable,
  getBlockBaseline,
  stepWaterTable,
} from "@/lib/peatland/digital-twin"
import { kpis as dashboardKpis, rainfallCorrelation, waterTableTrend } from "@/lib/peatland/mock-data"
import { formatLatLng, stationsOfType, type Station, type StationSignal } from "@/lib/peatland/stations"
import { useDashboardFilters } from "@/lib/peatland/filters"
import { ALL_BLOCKS, estateFactor, matchesBlock, scaleNumber } from "@/lib/peatland/filter-logic"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Tanggal

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** Label "28 Aug" untuk `offset` hari dari 4 Sep 2024 (awal histori telemetri). */
function dayLabel(offset: number): string {
  const d = new Date(Date.UTC(2024, 8, 4 + offset))
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
}

const round1 = (v: number) => Math.round(v * 10) / 10
const fmtCm = (v: number) => `${v < 0 ? "−" : ""}${Math.abs(v)}`

// ---------------------------------------------------------------------------
// Intensitas hujan (ambang sama dengan weatherLabel twin: 0.5 / 10 / 25 mm)

type Intensity = "None" | "Light" | "Moderate" | "Heavy"

function intensityOf(mm: number): Intensity {
  if (mm <= 0.5) return "None"
  if (mm < 10) return "Light"
  if (mm < 25) return "Moderate"
  return "Heavy"
}

// Gradasi biru langit: makin lebat makin pekat.
const INTENSITY_COLOR: Record<Intensity, string> = {
  None: "#8a9a92",
  Light: "#bae6fd",
  Moderate: "#38bdf8",
  Heavy: "#3b82f6",
}

function IntensityDot({ mm }: { mm: number }) {
  const i = intensityOf(mm)
  const c = INTENSITY_COLOR[i]
  return (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium" style={{ color: c }}>
      <span className="size-1.5 rounded-full" style={{ background: c }} />
      {i}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Penakar hujan dari registri. Deret harian per penakar: 4–9 Sep = hujan harian
// estate × faktor sebaran penakar, 10 Sep = bacaan 24 jam registri. Faktor
// dinormalisasi (rata-rata 1) sehingga rata-rata penakar = deret estate, dan
// RG-04 (7 hari tanpa hujan) bernilai 0 sepanjang minggu.

const GAUGES = stationsOfType("rain-gauge")
const AVG_24H = GAUGES.reduce((a, g) => a + (g.value ?? 0), 0) / GAUGES.length
const RAW_FACTOR = GAUGES.map((g) => ((g.value ?? 0) > 0 ? 0.5 + (0.5 * (g.value ?? 0)) / AVG_24H : 0))
const FACTOR_NORM = GAUGES.length / RAW_FACTOR.reduce((a, b) => a + b, 0)
const GAUGE_FACTOR: Record<string, number> = Object.fromEntries(GAUGES.map((g, i) => [g.code, RAW_FACTOR[i] * FACTOR_NORM]))

const WEEK_DAYS = rainfallCorrelation.map((r) => r.day)

// Arsip hujan harian estate sebelum 4 Sep (rekap, estimasi) — deterministik.
function archiveRain(daysBefore: number): number {
  return Math.max(0, Math.round(16 + 20 * Math.sin(daysBefore * 2.1) + 9 * Math.sin(daysBefore * 0.7)))
}

/** Hujan harian (mm) satu penakar untuk `days` hari berakhir 10 Sep. */
function gaugeDaily(g: Station, days: number, k: number): number[] {
  const f = GAUGE_FACTOR[g.code] ?? 0
  const extra = Math.max(0, days - WEEK_DAYS.length)
  const archive = Array.from({ length: extra }, (_, i) => archiveRain(extra - i) * f)
  const week = rainfallCorrelation.map((r, i) => (i === rainfallCorrelation.length - 1 ? (g.value ?? 0) : r.rainfall * f))
  return [...archive, ...week].map((v) => round1(v * k))
}

const SIGNAL_TONE: Record<StationSignal, Tone> = { Good: "normal", Fair: "info", Weak: "warning", "No signal": "offline" }

const dryDaysOf = (g: Station) => Number(g.note?.match(/(\d+) hari tanpa hujan/)?.[1] ?? 0)

const RANGE_OPTIONS = [
  { key: "7 Days", days: 7 },
  { key: "14 Days", days: 14 },
  { key: "30 Days", days: 30 },
] as const
type RangeKey = (typeof RANGE_OPTIONS)[number]["key"]

// ---------------------------------------------------------------------------
// Cuaca AWS estate: 24 jam terakhir (3-jam-an), berakhir pada bacaan 10 Sep 09:00.

const TEMP_HUMIDITY = [
  { label: "9 Sep 12:00", temp: 30, hum: 72 },
  { label: "9 Sep 15:00", temp: 31, hum: 70 },
  { label: "9 Sep 18:00", temp: 28, hum: 78 },
  { label: "9 Sep 21:00", temp: 25, hum: 84 },
  { label: "10 Sep 00:00", temp: 23, hum: 88 },
  { label: "10 Sep 03:00", temp: 23, hum: 90 },
  { label: "10 Sep 06:00", temp: 23, hum: 86 },
  { label: "10 Sep 09:00", temp: 24, hum: 82 },
]

type ForecastDay = {
  key: string
  dow: string
  icon: LucideIcon
  cond: string
  hi: number
  lo: number
  rainMm: number
  rainPct: number
}

// Prakiraan 11–15 Sep 2024 (Rab–Min).
const FORECAST: ForecastDay[] = [
  { key: "11 Sep", dow: "Wed", icon: CloudRainIcon, cond: "Heavy Rain", hi: 29, lo: 23, rainMm: 42, rainPct: 90 },
  { key: "12 Sep", dow: "Thu", icon: CloudRainIcon, cond: "Showers", hi: 30, lo: 24, rainMm: 18, rainPct: 70 },
  { key: "13 Sep", dow: "Fri", icon: CloudIcon, cond: "Cloudy", hi: 31, lo: 24, rainMm: 6, rainPct: 40 },
  { key: "14 Sep", dow: "Sat", icon: SunMediumIcon, cond: "Partly Sunny", hi: 32, lo: 23, rainMm: 2, rainPct: 20 },
  { key: "15 Sep", dow: "Sun", icon: SunIcon, cond: "Sunny", hi: 33, lo: 23, rainMm: 0, rainPct: 5 },
]

const RAIN_KPI = dashboardKpis.find((k) => k.key === "rainfall")

export default function WeatherRainfallPage() {
  const { estate, division } = useDashboardFilters()
  const [range, setRange] = useState<RangeKey>("7 Days")
  const [rangeOpen, setRangeOpen] = useState(false)
  const [unit, setUnit] = useState<"C" | "F">("C")
  const [selDay, setSelDay] = useState(FORECAST[0].key)
  const [openGauge, setOpenGauge] = useState<string | null>(null)

  const k = estateFactor(estate)
  // Offset suhu per estate (±1 °C) — kelembapan bergerak berlawanan.
  const tOff = Math.round((k - 1) * 10)
  const hOff = -tOff * 3

  // Satuan suhu berlaku untuk seluruh halaman (KPI, grafik, prakiraan).
  const toUnit = (c: number) => (unit === "C" ? c : Math.round(c * 1.8 + 32))
  const fmtTemp = (c: number) => `${toUnit(c)}°`

  const days = RANGE_OPTIONS.find((r) => r.key === range)?.days ?? 7
  const scopeGauges = useMemo(() => GAUGES.filter((g) => matchesBlock(g.block, division)), [division])
  const scopeLabel = division === ALL_BLOCKS ? "Estate" : division

  // Deret hujan harian = rata-rata penakar di cakupan filter.
  const rainfallData = useMemo(() => {
    const series = scopeGauges.map((g) => gaugeDaily(g, days, k))
    const extra = Math.max(0, days - WEEK_DAYS.length)
    return Array.from({ length: days }, (_, i) => {
      const mm = series.length ? round1(series.reduce((a, s) => a + s[i], 0) / series.length) : 0
      return { day: i < extra ? dayLabel(i - extra) : WEEK_DAYS[i - extra], mm, archive: i < extra }
    })
  }, [scopeGauges, days, k])
  const archiveEnd = [...rainfallData].reverse().find((d) => d.archive)?.day

  const gaugeRows = useMemo(
    () =>
      scopeGauges.map((g) => {
        const daily = gaugeDaily(g, 7, k)
        return { g, d24: daily[daily.length - 1], d7: round1(daily.reduce((a, b) => a + b, 0)), daily }
      }),
    [scopeGauges, k]
  )
  const rain24 = gaugeRows.length ? round1(gaugeRows.reduce((a, r) => a + r.d24, 0) / gaugeRows.length) : 0
  const dryGauges = scopeGauges.filter((g) => dryDaysOf(g) > 0)

  const tempSeries = TEMP_HUMIDITY.map((d) => ({ label: d.label, temp: toUnit(d.temp + tOff), hum: d.hum + hOff }))
  const tempNow = TEMP_HUMIDITY[TEMP_HUMIDITY.length - 1].temp + tOff
  const humNow = TEMP_HUMIDITY[TEMP_HUMIDITY.length - 1].hum + hOff

  const forecast = FORECAST.map((f) => ({ ...f, hi: f.hi + tOff, lo: f.lo + tOff, rainMm: round1(f.rainMm * k) }))

  // Proyeksi muka air 5 hari: model bucket twin, mulai dari muka air live.
  const projection = useMemo(() => {
    const block = getBlockBaseline(estate).find((b) => b.block === division)
    const start = block ? block.waterTable : scaleNumber(waterTableTrend[waterTableTrend.length - 1].value, estate)
    let wt = start
    const rows: { day: string; wt: number; rain: number | null }[] = [{ day: "10 Sep", wt: start, rain: null }]
    for (const f of FORECAST) {
      wt = stepWaterTable(wt, round1(f.rainMm * k), LIVE_GATE_OPENING)
      rows.push({ day: f.key, wt: Math.round(wt), rain: round1(f.rainMm * k) })
    }
    return rows
  }, [estate, division, k])
  const projStart = projection[0].wt
  const projEnd = projection[projection.length - 1]
  const projPeak = projection.slice(1).reduce((a, r) => (r.wt > a.wt ? r : a), projection[1])
  const projBreach = projection.slice(1).find((r) => r.wt < WT_COMPLIANCE)
  const projLevel = ewsFromWaterTable(projEnd.wt)
  const twinScenario = projEnd.wt >= projStart ? "wet" : "dry"
  const wtLo = Math.min(-70, Math.floor((Math.min(...projection.map((r) => r.wt)) - 8) / 10) * 10)
  const rainHi = Math.max(50, Math.ceil(Math.max(...projection.map((r) => r.rain ?? 0)) / 10) * 10)

  const sel = forecast.find((f) => f.key === selDay) ?? forecast[0]
  const selProj = projection.find((r) => r.day === sel.key)

  const kpiTiles = [
    {
      label: "Temperature",
      value: String(toUnit(tempNow)),
      unit: `°${unit}`,
      icon: ThermometerIcon,
      tone: "normal" as Tone,
      status: "AWS estate office · 09:00",
      delta: { text: unit === "C" ? "1.2 °C" : "2.2 °F", dir: "up" as const, good: null },
      spark: tempSeries.map((d) => d.temp),
    },
    {
      label: "Rainfall 24h",
      value: rain24.toFixed(1),
      unit: "mm",
      icon: CloudRainIcon,
      tone: "info" as Tone,
      status: `${scopeLabel} avg · ${scopeGauges.length} gauges · ${intensityOf(rain24)}`,
      delta:
        division === ALL_BLOCKS && RAIN_KPI
          ? { text: RAIN_KPI.delta, dir: RAIN_KPI.deltaDir, good: null }
          : undefined,
      foot: division === ALL_BLOCKS ? undefined : "Filtered by block",
      spark: rainfallData.slice(-7).map((d) => d.mm),
    },
    {
      label: "Humidity",
      value: String(humNow),
      unit: "%",
      icon: DropletsIcon,
      tone: "info" as Tone,
      status: "Relative humidity",
      delta: { text: "3%", dir: "down" as const, good: null },
      spark: tempSeries.map((d) => d.hum),
    },
    {
      label: "Wind",
      value: String(scaleNumber(9, estate)),
      unit: "km/h",
      icon: WindIcon,
      tone: "normal" as Tone,
      status: "From NE",
      delta: { text: "2 km/h", dir: "up" as const, good: null },
    },
    {
      label: "Solar Radiation",
      value: String(scaleNumber(412, estate)),
      unit: "W/m²",
      icon: SunIcon,
      tone: "warning" as Tone,
      status: "Mean 06:00–09:00",
      delta: { text: "48 W/m²", dir: "up" as const, good: null },
    },
    {
      label: "Evapotranspiration",
      value: scaleNumber(3.1, estate, 1).toFixed(1),
      unit: "mm/day",
      icon: GaugeIcon,
      tone: "warning" as Tone,
      status: "Reference ET₀",
      delta: { text: "0.4 mm", dir: "up" as const, good: null },
    },
  ]

  return (
    <PeatShell title="Weather & Rainfall" subtitle="Meteorological Monitoring">
      {/* KPI ROW */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpiTiles.map((t) => (
          <StatTile key={t.label} {...t} />
        ))}
      </div>

      {/* CHARTS ROW */}
      <div className="grid gap-4 md:grid-cols-2">
        <Panel className="h-full">
          <PanelHeader
            kicker="TELEMETRI · RAIN GAUGE"
            icon={CloudRainIcon}
            title={`Rainfall — Last ${days} Days`}
            subtitle={`${scopeLabel} avg of ${scopeGauges.length} gauges · mm/day · ${rainfallData[0]?.day} – 10 Sep 2024${archiveEnd ? " · before 4 Sep: archive (est.)" : " · 10 Sep = 24h to 09:37"}`}
            action={
              <div className="relative">
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={rangeOpen}
                  onClick={() => setRangeOpen((o) => !o)}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11.5px] font-medium text-white/70 transition-colors hover:border-white/20"
                >
                  {range} <ChevronDownIcon className="size-3.5" />
                </button>
                {rangeOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setRangeOpen(false)} />
                    <div
                      role="listbox"
                      className="absolute right-0 z-50 mt-1 min-w-full overflow-hidden rounded-lg border border-white/10 bg-[#10201a] py-1 shadow-xl"
                    >
                      {RANGE_OPTIONS.map((o) => (
                        <button
                          key={o.key}
                          type="button"
                          role="option"
                          aria-selected={range === o.key}
                          onClick={() => {
                            setRange(o.key)
                            setRangeOpen(false)
                          }}
                          className={cn(
                            "block w-full whitespace-nowrap px-3 py-2 text-left text-[12.5px] hover:bg-white/5",
                            range === o.key ? "text-emerald-300" : "text-white/75"
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
          <div className="flex flex-wrap items-center gap-3 px-4 pb-1">
            {(Object.keys(INTENSITY_COLOR) as Intensity[]).map((i) => (
              <span key={i} className="flex items-center gap-1.5 text-[10.5px] text-white/55">
                <span className="size-2.5 rounded-[3px]" style={{ background: INTENSITY_COLOR[i] }} />
                {i}
              </span>
            ))}
          </div>
          <div className="h-[220px] px-1 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rainfallData} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                <CartesianGrid {...gridProps} />
                {archiveEnd && (
                  <ReferenceArea
                    x1={rainfallData[0].day}
                    x2={archiveEnd}
                    fill="#ffffff"
                    fillOpacity={0.03}
                    ifOverflow="hidden"
                    label={{ value: "Archive · est.", position: "insideTopRight", fontSize: 9, fill: "rgba(255,255,255,0.5)" }}
                  />
                )}
                <XAxis dataKey="day" {...axisProps} minTickGap={12} />
                <YAxis {...axisProps} width={46} tickFormatter={(v) => `${v} mm`} />
                <Tooltip
                  {...tooltipStyle}
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  formatter={(v) => [`${withUnit("mm")(v)} · ${intensityOf(Number(v))}`, "Rainfall"]}
                  labelFormatter={(l, p) =>
                    p?.[0]?.payload?.archive ? `${l} 2024 · archive (est.)` : l === "10 Sep" ? "10 Sep 2024 · 24h to 09:37" : `${l} 2024`
                  }
                />
                <Bar dataKey="mm" name="Rainfall" radius={[3, 3, 0, 0]} maxBarSize={26}>
                  {rainfallData.map((d) => (
                    <Cell key={d.day} fill={INTENSITY_COLOR[intensityOf(d.mm)]} fillOpacity={d.archive ? 0.5 : 0.95} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="h-full">
          <PanelHeader
            kicker="AWS · CUACA ESTATE"
            icon={ThermometerIcon}
            title="Temperature & Humidity (24h)"
            subtitle={`3-hourly · 9 Sep 12:00 – 10 Sep 09:00 · °${unit} left, % right`}
          />
          <div className="flex items-center gap-4 px-4 pb-1">
            <span className="flex items-center gap-1.5 text-[10.5px] text-white/55">
              <span className="h-0.5 w-3.5 rounded-full" style={{ background: "#fb923c" }} />
              Temperature (°{unit})
            </span>
            <span className="flex items-center gap-1.5 text-[10.5px] text-white/55">
              <span className="h-0.5 w-3.5 rounded-full" style={{ background: "#38bdf8" }} />
              Humidity (%)
            </span>
          </div>
          <div className="h-[220px] px-1 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={tempSeries} margin={{ left: 0, right: 4, top: 8, bottom: 4 }}>
                <CartesianGrid {...gridProps} />
                <XAxis
                  dataKey="label"
                  {...axisProps}
                  tickFormatter={(l: string) => (l.endsWith("00:00") ? l.replace(" 00:00", "") : l.slice(-5))}
                />
                <YAxis
                  yAxisId="left"
                  domain={unit === "C" ? [20, 35] : [68, 95]}
                  {...axisProps}
                  width={42}
                  tickFormatter={(v) => `${v}°${unit}`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[60, 100]}
                  {...axisProps}
                  width={38}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v, n) => [String(n).startsWith("Temp") ? `${v} °${unit}` : `${v}%`, n]}
                />
                <Line
                  yAxisId="left"
                  dataKey="temp"
                  name="Temperature"
                  type="monotone"
                  stroke="#fb923c"
                  strokeWidth={2.5}
                  dot={{ r: 2.5, fill: "#fb923c" }}
                  activeDot={{ r: 4 }}
                />
                <Line
                  yAxisId="right"
                  dataKey="hum"
                  name="Humidity"
                  type="monotone"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  dot={{ r: 2.5, fill: "#38bdf8" }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* FORECAST + PROYEKSI TWIN */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHeader
            kicker="PRAKIRAAN · 5 HARI"
            icon={CloudIcon}
            title="5-Day Forecast"
            subtitle={`${estate} — Riau · 11–15 Sep 2024`}
            action={
              <>
                <div
                  className="inline-flex overflow-hidden rounded-lg border border-white/10"
                  role="group"
                  aria-label="Satuan suhu (seluruh halaman)"
                  title="Temperature unit — applies to the whole page"
                >
                  {(["C", "F"] as const).map((u) => (
                    <button
                      key={u}
                      type="button"
                      aria-pressed={unit === u}
                      onClick={() => setUnit(u)}
                      className={cn(
                        "px-2.5 py-1 text-[11.5px] font-medium transition-colors",
                        unit === u ? "bg-emerald-500/15 text-emerald-300" : "text-white/55 hover:text-white/80"
                      )}
                    >
                      °{u}
                    </button>
                  ))}
                </div>
                <ViewAll />
              </>
            }
          />
          <div className="grid grid-cols-2 gap-2.5 px-4 pb-3 sm:grid-cols-3 lg:grid-cols-5">
            {forecast.map((f) => {
              const Icon = f.icon
              const active = f.key === selDay
              const c = f.rainMm > 0.5 ? INTENSITY_COLOR[intensityOf(f.rainMm)] : "#fbbf24"
              return (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelDay(f.key)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors focus-visible:outline-2 focus-visible:outline-emerald-400/60",
                    active
                      ? "border-emerald-400/40 bg-emerald-500/[0.08]"
                      : "border-white/[0.08] bg-white/[0.02] hover:border-white/20"
                  )}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-white/60">
                    {f.dow} · {f.key}
                  </span>
                  <span
                    className="inline-flex size-9 items-center justify-center rounded-lg ring-1"
                    style={{ color: c, background: `color-mix(in srgb, ${c} 12%, transparent)`, ["--tw-ring-color" as string]: `color-mix(in srgb, ${c} 25%, transparent)` }}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="text-[10.5px] text-white/55">{f.cond}</span>
                  <span className="flex items-baseline gap-1.5">
                    <span className="text-[16px] font-bold text-white">{fmtTemp(f.hi)}</span>
                    <span className="text-[12px] text-white/50">{fmtTemp(f.lo)}</span>
                  </span>
                  <span className="flex items-center gap-1 text-[11px]" style={{ color: INTENSITY_COLOR[intensityOf(f.rainMm)] }}>
                    <DropletsIcon className="size-3" />
                    <span className="font-medium">{f.rainMm} mm</span>
                    <span className="text-white/50">· {f.rainPct}%</span>
                  </span>
                </button>
              )
            })}
          </div>
          <p className="mx-4 mb-4 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11.5px] text-white/65" aria-live="polite">
            <span className="font-semibold text-white/85">
              {sel.dow} {sel.key} 2024
            </span>{" "}
            · {sel.cond} · {toUnit(sel.hi)}/{toUnit(sel.lo)} °{unit} · {sel.rainMm} mm ({sel.rainPct}% chance) · {intensityOf(sel.rainMm)}
            {selProj && (
              <>
                {" "}
                · projected water table <span className="font-semibold text-white/85">{fmtCm(selProj.wt)} cm</span> (
                {EWS_META[ewsFromWaterTable(selProj.wt)].label})
              </>
            )}
          </p>
        </Panel>

        <Panel>
          <PanelHeader
            kicker="TWIN · PROYEKSI MUKA AIR"
            icon={BoxIcon}
            title="Water Table Outlook (5 days)"
            subtitle={`Twin bucket model · forecast rain · gates ${LIVE_GATE_OPENING}% · start ${fmtCm(projStart)} cm (${scopeLabel})`}
            action={
              <OpenInTwin
                scenario={twinScenario}
                layer="waterTable"
                block={division === ALL_BLOCKS ? undefined : division}
                label="Jalankan di Twin"
              />
            }
          />
          <div className="h-[220px] px-1">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={projection} margin={{ left: 0, right: 4, top: 8, bottom: 4 }}>
                <CartesianGrid {...gridProps} />
                {WT_BANDS.map((b) => (
                  <ReferenceArea key={b.level} yAxisId="wt" {...bandProps(b)} />
                ))}
                {WT_LINES.map((t) => (
                  <ReferenceLine key={t.y} yAxisId="wt" {...lineProps(t)} />
                ))}
                <ReferenceLine yAxisId="wt" x={selDay} stroke="rgba(255,255,255,0.35)" strokeDasharray="2 3" />
                <XAxis dataKey="day" {...axisProps} />
                <YAxis yAxisId="wt" domain={[wtLo, 0]} {...axisProps} width={48} tickFormatter={(v) => `${fmtCm(Number(v))} cm`} />
                <YAxis
                  yAxisId="rain"
                  orientation="right"
                  domain={[0, rainHi]}
                  {...axisProps}
                  width={44}
                  tickFormatter={(v) => `${v} mm`}
                />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v, n) => (n === "Water table" ? [`${fmtCm(Number(v))} cm`, n] : [withUnit("mm")(v), n])}
                  labelFormatter={(l) => (l === "10 Sep" ? "10 Sep 2024 · live" : `${l} 2024 · forecast`)}
                />
                <Bar yAxisId="rain" dataKey="rain" name="Forecast rain" radius={[3, 3, 0, 0]} maxBarSize={18}>
                  {projection.map((r) => (
                    <Cell key={r.day} fill={INTENSITY_COLOR[intensityOf(r.rain ?? 0)]} fillOpacity={0.55} />
                  ))}
                </Bar>
                <Line
                  yAxisId="wt"
                  dataKey="wt"
                  name="Water table"
                  type="monotone"
                  stroke="#6ee7b7"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#6ee7b7", strokeWidth: 0 }}
                  activeDot={{ r: 4.5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 pb-4 pt-2 text-[11.5px] text-white/60">
            <span>
              {projEnd.day}: <span className="font-semibold text-white/85">{fmtCm(projEnd.wt)} cm</span>
            </span>
            <EwsPill level={projLevel} />
            <span>
              · peak {fmtCm(projPeak.wt)} cm ({projPeak.day})
            </span>
            <span>
              ·{" "}
              {projBreach
                ? `drops below PP 57/2016 (−40 cm) on ${projBreach.day}`
                : "stays above PP 57/2016 (−40 cm)"}
            </span>
          </div>
        </Panel>
      </div>

      {/* RAIN GAUGES TABLE */}
      <Panel>
        <PanelHeader
          kicker="TELEMETRI · GSM"
          icon={CloudRainIcon}
          title="Rain Gauges"
          subtitle={`${scopeGauges.length} tipping-bucket stations · 24h to 09:37 · 7-day 4–10 Sep`}
          action={
            <button
              type="button"
              onClick={() => {
                const id = toast.loading("Mengekspor data hujan…")
                setTimeout(() => toast.success("Data siap diunduh (CSV)", { id }), 900)
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11.5px] font-medium text-white/70 transition-colors hover:border-white/20"
            >
              <DownloadIcon className="size-3.5" />
              Export
            </button>
          }
        />
        <TableScroll>
          <table className="w-full min-w-[860px] text-left">
            <thead>
              <tr>
                <th className={tableTh}>Gauge</th>
                <th className={tableTh}>Block</th>
                <th className={cn(tableTh, "text-right")}>24h (mm)</th>
                <th className={cn(tableTh, "text-right")}>7-Day (mm)</th>
                <th className={tableTh}>Intensity</th>
                <th className={tableTh}>EWS</th>
                <th className={tableTh}>Device</th>
                <th className={cn(tableTh, "text-right")}>Twin</th>
              </tr>
            </thead>
            <tbody>
              {gaugeRows.length === 0 && (
                <tr className={tableRow}>
                  <td className={cn(tableTd, "text-center text-white/50")} colSpan={8}>
                    Tidak ada rain gauge untuk division ini.
                  </td>
                </tr>
              )}
              {gaugeRows.map(({ g, d24, d7, daily }) => {
                const open = openGauge === g.code
                const dry = dryDaysOf(g)
                const maxDaily = Math.max(1, ...daily)
                return (
                  <Fragment key={g.code}>
                    <tr className={cn(tableRow, dry > 0 && "bg-amber-400/[0.04]")}>
                      <td className={tableTd}>
                        <button
                          type="button"
                          aria-expanded={open}
                          aria-controls={`gauge-${g.code}`}
                          onClick={() => setOpenGauge(open ? null : g.code)}
                          className="inline-flex items-center gap-1 font-mono font-semibold text-white/85 hover:text-emerald-300"
                        >
                          <ChevronRightIcon className={cn("size-3.5 transition-transform", open && "rotate-90")} />
                          {g.code}
                        </button>
                      </td>
                      <td className={cn(tableTd, "whitespace-nowrap text-white/65")}>{g.block}</td>
                      <td className={cn(tableTd, "text-right font-mono font-medium tabular-nums text-white/85")}>{d24.toFixed(1)}</td>
                      <td className={cn(tableTd, "text-right font-mono tabular-nums text-white/70")}>{d7.toFixed(1)}</td>
                      <td className={tableTd}>
                        <IntensityDot mm={d24} />
                      </td>
                      <td className={tableTd}>
                        <span className="inline-flex items-center gap-2">
                          <EwsPill level={g.level} />
                          {dry > 0 && <span className="text-[11px] text-white/55">{dry} dry days</span>}
                        </span>
                      </td>
                      <td className={cn(tableTd, "whitespace-nowrap")}>
                        <StatusDot tone={g.battery < 20 ? "warning" : SIGNAL_TONE[g.signal]} label={`${g.signal} · ${g.battery}%`} />
                      </td>
                      <td className={cn(tableTd, "text-right")}>
                        <OpenInTwin variant="icon" asset={g.code} label={g.twinId ? "Buka di Twin" : "Buka block di Twin"} />
                      </td>
                    </tr>
                    {open && (
                      <tr id={`gauge-${g.code}`} className="border-t border-white/[0.04] bg-white/[0.015]">
                        <td colSpan={8} className="px-4 py-3">
                          <div className="flex flex-wrap items-end gap-6">
                            <div>
                              <span className="kicker mb-1.5 block text-white/55">Daily rainfall · 4–10 Sep</span>
                              <div className="flex h-14 items-end gap-1.5" role="img" aria-label={`Hujan harian ${g.code}: ${daily.join(", ")} mm`}>
                                {daily.map((v, i) => (
                                  <div key={WEEK_DAYS[i]} className="flex w-9 flex-col items-center gap-1">
                                    <span className="font-mono text-[9.5px] text-white/60">{v}</span>
                                    <span
                                      className="w-4 rounded-t-[2px]"
                                      style={{ height: `${Math.max(2, (v / maxDaily) * 28)}px`, background: INTENSITY_COLOR[intensityOf(v)] }}
                                    />
                                    <span className="text-[9.5px] text-white/50">{WEEK_DAYS[i].replace(" Sep", "")}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11.5px] sm:grid-cols-4">
                              <div>
                                <dt className="text-white/50">Last seen</dt>
                                <dd className="font-mono text-white/80">{g.lastSeen}</dd>
                              </div>
                              <div>
                                <dt className="text-white/50">Coordinates</dt>
                                <dd className="font-mono text-white/80">{formatLatLng(g.lat, g.lng)}</dd>
                              </div>
                              <div>
                                <dt className="text-white/50">Battery / signal</dt>
                                <dd className="text-white/80">
                                  {g.battery}% · {g.signal}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-white/50">Note</dt>
                                <dd className="text-white/80">{g.note ?? "—"}</dd>
                              </div>
                            </dl>
                            <OpenInTwin asset={g.code} variant="link" label={g.twinId ? "Buka di Twin" : `Buka ${g.block} di Twin`} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </TableScroll>
        {dryGauges.map((g) => (
          <div
            key={g.code}
            className="mx-4 mb-4 mt-3 flex items-center gap-2 rounded-lg border px-3 py-2"
            style={{ borderColor: `color-mix(in srgb, ${EWS_META.waspada.color} 25%, transparent)`, background: `color-mix(in srgb, ${EWS_META.waspada.color} 7%, transparent)` }}
          >
            <SunIcon className="size-4 shrink-0" style={{ color: EWS_META.waspada.color }} />
            <span className="text-[12px] text-white/75">
              <span className="font-semibold" style={{ color: EWS_META.waspada.color }}>
                {g.code} ({g.block}):
              </span>{" "}
              No rainfall recorded for {dryDaysOf(g)} days — elevated dryness; verify gauge and raise fire-risk watch.{" "}
              <Link href="/fire-risk" className="font-medium text-emerald-400 hover:text-emerald-300">
                Fire Risk →
              </Link>
            </span>
          </div>
        ))}
        {dryGauges.length === 0 && <div className="h-2" />}
      </Panel>
    </PeatShell>
  )
}
