"use client"

import { useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  ChevronDownIcon,
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
import { toast } from "sonner"

import { Panel, ViewAll } from "@/components/peatland/panel"
import { PeatShell } from "@/components/peatland/peat-shell"
import { useDashboardFilters } from "@/lib/peatland/filters"
import { matchesBlock, scaleNumber, scaleNumericString } from "@/lib/peatland/filter-logic"
import { cn } from "@/lib/utils"

type Tone = "normal" | "warning" | "critical" | "info"

const valueTone: Record<Tone, string> = {
  normal: "text-emerald-400",
  warning: "text-amber-400",
  critical: "text-red-400",
  info: "text-sky-400",
}

const iconTone: Record<Tone, string> = {
  normal: "bg-emerald-500/12 text-emerald-400 ring-emerald-500/20",
  warning: "bg-amber-500/12 text-amber-400 ring-amber-500/20",
  critical: "bg-red-500/12 text-red-400 ring-red-500/20",
  info: "bg-sky-500/12 text-sky-400 ring-sky-500/20",
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

const th = "px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-white/35"
const td = "px-3 py-2 text-[12px]"

function StatTile({
  label,
  value,
  unit,
  icon: Icon,
  tone,
  delta,
  deltaUp,
}: {
  label: string
  value: string
  unit?: string
  icon: LucideIcon
  tone: Tone
  delta?: string
  deltaUp?: boolean
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/8 bg-gradient-to-b from-white/[0.04] to-transparent p-4 ring-1 ring-white/5 transition-colors hover:border-white/15">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10.5px] font-semibold uppercase tracking-wide text-white/45">{label}</span>
        <span className={cn("inline-flex size-8 items-center justify-center rounded-lg ring-1", iconTone[tone])}>
          <Icon className="size-4" />
        </span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={cn("text-[28px] font-bold leading-none tracking-tight", valueTone[tone])}>{value}</span>
        {unit && <span className="text-[13px] font-medium text-white/40">{unit}</span>}
      </div>
      {delta && (
        <div className="flex items-center gap-1 border-t border-white/5 pt-2 text-[11px]">
          <span className="text-white/40">vs yesterday</span>
          <span className={cn("font-semibold", deltaUp ? "text-sky-400" : "text-white/50")}>
            {deltaUp ? "+" : ""}
            {delta}
          </span>
        </div>
      )}
    </div>
  )
}

const rainfall7d = [
  { day: "Mon", mm: 38 },
  { day: "Tue", mm: 6 },
  { day: "Wed", mm: 12 },
  { day: "Thu", mm: 60 },
  { day: "Fri", mm: 30 },
  { day: "Sat", mm: 5 },
  { day: "Sun", mm: 4 },
]

const RANGE_OPTIONS = ["7 Hari", "14 Hari", "30 Hari"] as const

const tempHumidity = [
  { t: "00", temp: 23, hum: 88 },
  { t: "03", temp: 23, hum: 90 },
  { t: "06", temp: 24, hum: 86 },
  { t: "09", temp: 27, hum: 80 },
  { t: "12", temp: 30, hum: 72 },
  { t: "15", temp: 31, hum: 70 },
  { t: "18", temp: 28, hum: 78 },
  { t: "21", temp: 25, hum: 84 },
]

type ForecastDay = {
  day: string
  icon: LucideIcon
  cond: string
  hi: number
  lo: number
  rainMm: number
  rainPct: number
  tone: Tone
}

const forecast: ForecastDay[] = [
  { day: "Wed", icon: CloudRainIcon, cond: "Heavy Rain", hi: 29, lo: 23, rainMm: 42, rainPct: 90, tone: "info" },
  { day: "Thu", icon: CloudRainIcon, cond: "Showers", hi: 30, lo: 24, rainMm: 18, rainPct: 70, tone: "info" },
  { day: "Fri", icon: CloudIcon, cond: "Cloudy", hi: 31, lo: 24, rainMm: 6, rainPct: 40, tone: "normal" },
  { day: "Sat", icon: SunMediumIcon, cond: "Partly Sunny", hi: 32, lo: 23, rainMm: 2, rainPct: 20, tone: "warning" },
  { day: "Sun", icon: SunIcon, cond: "Sunny", hi: 33, lo: 23, rainMm: 0, rainPct: 5, tone: "warning" },
]

type Intensity = "Light" | "Moderate" | "Heavy" | "None"

const intensityStyle: Record<Intensity, { text: string; dot: string }> = {
  Light: { text: "text-sky-400", dot: "bg-sky-500" },
  Moderate: { text: "text-lime-400", dot: "bg-lime-500" },
  Heavy: { text: "text-emerald-400", dot: "bg-emerald-500" },
  None: { text: "text-amber-400", dot: "bg-amber-500" },
}

type GaugeStatus = "normal" | "warning" | "critical"

type GaugeRow = {
  gauge: string
  block: string
  // Division yang dipakai filter global (selaras dengan DIVISION_OPTIONS).
  division: string
  d24: number
  d7: number
  intensity: Intensity
  status: GaugeStatus
  alert?: boolean
}

const initialGauges: GaugeRow[] = [
  { gauge: "RG-01", block: "Blok A2", division: "Block A", d24: 22.4, d7: 96.0, intensity: "Moderate", status: "normal" },
  { gauge: "RG-02", block: "Blok B1", division: "Block B", d24: 38.6, d7: 142.8, intensity: "Heavy", status: "normal" },
  { gauge: "RG-03", block: "Blok C4", division: "Block C", d24: 8.2, d7: 54.5, intensity: "Light", status: "normal" },
  { gauge: "RG-04", block: "Blok D3", division: "Block D", d24: 0.0, d7: 0.0, intensity: "None", status: "critical", alert: true },
  { gauge: "RG-05", block: "Blok E2", division: "Block E", d24: 14.0, d7: 71.2, intensity: "Moderate", status: "normal" },
  { gauge: "RG-06", block: "Blok F1", division: "Block A", d24: 3.4, d7: 19.6, intensity: "Light", status: "warning" },
]

const statusStyle: Record<GaugeStatus, { text: string; dot: string; label: string }> = {
  normal: { text: "text-emerald-400", dot: "bg-emerald-500", label: "Normal" },
  warning: { text: "text-amber-400", dot: "bg-amber-500", label: "Low Signal" },
  critical: { text: "text-red-400", dot: "bg-red-500", label: "No Rainfall" },
}

export default function WeatherRainfallPage() {
  const { estate, division } = useDashboardFilters()
  const [range, setRange] = useState<(typeof RANGE_OPTIONS)[number]>(RANGE_OPTIONS[0])
  const [rangeOpen, setRangeOpen] = useState(false)
  const [unit, setUnit] = useState<"C" | "F">("C")
  const [gaugeRows] = useState<GaugeRow[]>(initialGauges)

  const toF = (c: number) => Math.round(c * 1.8 + 32)
  const fmtTemp = (c: number) => (unit === "C" ? `${c}°` : `${toF(c)}°`)

  // ESTATE: skala angka headline KPI (suhu, hujan, kelembapan, dll) per estate.
  const kpis = useMemo(
    () => [
      { label: "Temperature", value: scaleNumericString("24", estate) + "°C", unit: undefined, icon: ThermometerIcon, tone: "normal" as Tone, delta: "1.2°C", deltaUp: true },
      { label: "Rainfall 24h", value: scaleNumericString("18.6", estate), unit: "mm", icon: CloudRainIcon, tone: "info" as Tone, delta: "6.4 mm", deltaUp: true },
      { label: "Humidity", value: scaleNumericString("82%", estate), unit: undefined, icon: DropletsIcon, tone: "info" as Tone, delta: "3%", deltaUp: false },
      { label: "Wind", value: scaleNumericString("9", estate), unit: "km/h NE", icon: WindIcon, tone: "normal" as Tone, delta: "2 km/h", deltaUp: true },
      { label: "Solar Radiation", value: scaleNumericString("412", estate), unit: "W/m²", icon: SunIcon, tone: "warning" as Tone, delta: "48 W/m²", deltaUp: true },
      { label: "Evapotranspiration", value: scaleNumericString("3.1", estate), unit: "mm", icon: GaugeIcon, tone: "warning" as Tone, delta: "0.4 mm", deltaUp: true },
    ],
    [estate]
  )

  // ESTATE: skala deret hujan 7 hari agar grafik ikut berubah per estate.
  // Reflect the selected range by trimming/extending the rendered bar series.
  const rainfallData = useMemo(() => {
    const scaled = rainfall7d.map((d) => ({ day: d.day, mm: scaleNumber(d.mm, estate) }))
    if (range === "7 Hari") return scaled
    const reps = range === "14 Hari" ? 2 : 4
    return Array.from({ length: reps }).flatMap((_, r) =>
      scaled.map((d) => ({ day: `${d.day}${r > 0 ? `·${r + 1}` : ""}`, mm: d.mm }))
    )
  }, [range, estate])

  // DIVISION + ESTATE: saring rain gauge per block; skala nilai mm per estate.
  const filteredGauges = useMemo(
    () =>
      gaugeRows
        .filter((g) => matchesBlock(g.division, division))
        .map((g) => ({
          ...g,
          d24: scaleNumber(g.d24, estate, 1),
          d7: scaleNumber(g.d7, estate, 1),
        })),
    [gaugeRows, division, estate]
  )

  return (
    <PeatShell title="Weather & Rainfall" subtitle="Meteorological Monitoring">
      {/* KPI ROW */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <StatTile
            key={k.label}
            label={k.label}
            value={k.value}
            unit={k.unit}
            icon={k.icon}
            tone={k.tone}
            delta={k.delta}
            deltaUp={k.deltaUp}
          />
        ))}
      </div>

      {/* CHARTS ROW */}
      <div className="grid gap-4 md:grid-cols-2">
        <Panel className="h-full">
          <div className="flex items-center justify-between px-4 pb-1 pt-3.5">
            <div>
              <h3 className="text-[14px] font-semibold text-white">Rainfall — Last 7 Days (mm)</h3>
              <p className="text-[11px] text-white/40">Estate-wide daily accumulation</p>
            </div>
            <div className="relative">
              <button
                onClick={() => setRangeOpen((o) => !o)}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11.5px] font-medium text-white/70 transition-colors hover:border-white/20"
              >
                {range} <ChevronDownIcon className="size-3.5" />
              </button>
              {rangeOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setRangeOpen(false)} />
                  <div className="absolute right-0 z-50 mt-1 min-w-full overflow-hidden rounded-lg border border-white/10 bg-[#10201a] py-1 shadow-xl">
                    {RANGE_OPTIONS.map((o) => (
                      <button
                        key={o}
                        onClick={() => {
                          setRange(o)
                          setRangeOpen(false)
                          toast("Rentang: " + o)
                        }}
                        className="block w-full px-3 py-2 text-left text-[12.5px] text-white/75 hover:bg-white/5"
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="h-[200px] px-1 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rainfallData} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                <XAxis dataKey="day" {...axisProps} />
                <YAxis {...axisProps} width={30} />
                <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="mm" name="Rainfall (mm)" fill="#38bdf8" radius={[3, 3, 0, 0]} barSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="h-full">
          <div className="flex items-center justify-between px-4 pb-1 pt-3.5">
            <div>
              <h3 className="text-[14px] font-semibold text-white">Temperature &amp; Humidity (24h)</h3>
              <p className="text-[11px] text-white/40">3-hourly readings</p>
            </div>
          </div>
          <div className="flex items-center gap-4 px-4 pb-1">
            <span className="flex items-center gap-1.5 text-[10.5px] text-white/55">
              <span className="h-0.5 w-3.5 rounded-full" style={{ background: "#fb923c" }} />
              Temperature (°C)
            </span>
            <span className="flex items-center gap-1.5 text-[10.5px] text-white/55">
              <span className="h-0.5 w-3.5 rounded-full" style={{ background: "#38bdf8" }} />
              Humidity (%)
            </span>
          </div>
          <div className="h-[200px] px-1 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={tempHumidity} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                <XAxis dataKey="t" {...axisProps} />
                <YAxis yAxisId="left" domain={[20, 35]} {...axisProps} width={28} />
                <YAxis yAxisId="right" orientation="right" domain={[60, 100]} {...axisProps} width={30} />
                <Tooltip {...tooltipStyle} />
                <Line
                  yAxisId="left"
                  dataKey="temp"
                  name="Temperature (°C)"
                  type="monotone"
                  stroke="#fb923c"
                  strokeWidth={2.5}
                  dot={{ r: 2.5, fill: "#fb923c" }}
                  activeDot={{ r: 4 }}
                />
                <Line
                  yAxisId="right"
                  dataKey="hum"
                  name="Humidity (%)"
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

      {/* FORECAST */}
      <Panel>
        <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
          <div>
            <h3 className="text-[14px] font-semibold text-white">5-Day Forecast</h3>
            <p className="text-[11px] text-white/40">Sei Galuh Estate — Riau</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex overflow-hidden rounded-lg border border-white/10">
              {(["C", "F"] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => {
                    setUnit(u)
                    toast("Satuan suhu: °" + u)
                  }}
                  className={cn(
                    "px-2.5 py-1 text-[11.5px] font-medium transition-colors",
                    unit === u
                      ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                      : "text-white/45 hover:text-white/70"
                  )}
                >
                  °{u}
                </button>
              ))}
            </div>
            <ViewAll />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 px-4 pb-4 sm:grid-cols-3 lg:grid-cols-5">
          {forecast.map((f) => {
            const Icon = f.icon
            return (
              <div
                key={f.day}
                onClick={() =>
                  toast.info(`${f.day}: ${f.cond}`, {
                    description: `${fmtTemp(f.hi)} / ${fmtTemp(f.lo)} · ${f.rainMm} mm (${f.rainPct}%)`,
                  })
                }
                className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-white/8 bg-white/[0.02] p-3 ring-1 ring-white/5 transition-colors hover:border-white/15"
              >
                <span className="text-[11px] font-semibold uppercase tracking-wide text-white/55">{f.day}</span>
                <span className={cn("inline-flex size-9 items-center justify-center rounded-lg ring-1", iconTone[f.tone])}>
                  <Icon className="size-5" />
                </span>
                <span className="text-[10.5px] text-white/45">{f.cond}</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[16px] font-bold text-white">{fmtTemp(f.hi)}</span>
                  <span className="text-[12px] text-white/40">{fmtTemp(f.lo)}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-sky-400">
                  <DropletsIcon className="size-3" />
                  <span className="font-medium">{f.rainMm} mm</span>
                  <span className="text-white/40">· {f.rainPct}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </Panel>

      {/* RAIN GAUGES TABLE */}
      <Panel>
        <div className="flex items-center justify-between px-4 pb-1 pt-3.5">
          <div>
            <h3 className="text-[14px] font-semibold text-white">Rain Gauges</h3>
            <p className="text-[11px] text-white/40">6 tipping-bucket stations</p>
          </div>
          <button
            onClick={() => {
              const id = toast.loading("Mengekspor data hujan…")
              setTimeout(() => toast.success("Data siap diunduh (CSV)", { id }), 900)
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11.5px] font-medium text-white/70 transition-colors hover:border-white/20"
          >
            <DownloadIcon className="size-3.5" />
            Export
          </button>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className={th}>Gauge</th>
              <th className={th}>Block</th>
              <th className={th}>24h (mm)</th>
              <th className={th}>7-Day (mm)</th>
              <th className={th}>Intensity</th>
              <th className={cn(th, "text-right")}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredGauges.length === 0 && (
              <tr className="border-t border-white/5">
                <td className={cn(td, "text-center text-white/40")} colSpan={6}>
                  Tidak ada rain gauge untuk division ini.
                </td>
              </tr>
            )}
            {filteredGauges.map((g) => {
              const ints = intensityStyle[g.intensity]
              const st = statusStyle[g.status]
              return (
                <tr
                  key={g.gauge}
                  onClick={() =>
                    toast.info(`${g.gauge} · ${g.block}`, {
                      description: `24 jam: ${g.d24.toFixed(1)} mm · 7 hari: ${g.d7.toFixed(1)} mm · ${st.label}`,
                    })
                  }
                  className={cn(
                    "cursor-pointer border-t border-white/5 hover:bg-white/[0.03]",
                    g.alert && "bg-red-500/[0.05]"
                  )}
                >
                  <td className={cn(td, "font-medium text-white/85")}>{g.gauge}</td>
                  <td className={cn(td, "text-white/55")}>{g.block}</td>
                  <td className={cn(td, "font-medium", g.d24 === 0 ? "text-amber-400" : "text-white/75")}>
                    {g.d24.toFixed(1)}
                  </td>
                  <td className={cn(td, "text-white/70")}>{g.d7.toFixed(1)}</td>
                  <td className={td}>
                    <span className={cn("inline-flex items-center gap-1.5 text-[11.5px] font-medium", ints.text)}>
                      <span className={cn("size-1.5 rounded-full", ints.dot)} />
                      {g.intensity}
                    </span>
                  </td>
                  <td className={cn(td, "text-right")}>
                    <span className={cn("inline-flex items-center gap-1.5 text-[11.5px] font-medium", st.text)}>
                      <span className={cn("size-1.5 rounded-full", st.dot)} />
                      {st.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="mx-4 mb-4 mt-3 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.07] px-3 py-2">
          <CloudIcon className="size-4 shrink-0 text-amber-400" />
          <span className="text-[12px] text-amber-300/90">
            <span className="font-semibold text-amber-400">RG-04 (Blok D3):</span> No rainfall recorded for 7 days —
            elevated dryness; verify gauge and raise fire-risk watch.
          </span>
        </div>
      </Panel>
    </PeatShell>
  )
}
