"use client"

import {
  ActivityIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  DropletsIcon,
  FactoryIcon,
  LayersIcon,
  RadioTowerIcon,
  ThermometerIcon,
  type LucideIcon,
} from "lucide-react"
import { useMemo, useState } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { toast } from "sonner"

import { Panel, PanelHeader, ViewAll } from "@/components/peatland/panel"
import { PeatShell } from "@/components/peatland/peat-shell"
import { cn } from "@/lib/utils"

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

function StatTile({
  label,
  value,
  unit,
  tone,
  icon: Icon,
  delta,
  deltaDir,
  deltaTone,
}: {
  label: string
  value: string
  unit?: string
  tone: Tone
  icon: LucideIcon
  delta?: string
  deltaDir?: "up" | "down"
  deltaTone?: "good" | "bad" | "neutral"
}) {
  const DeltaIcon = deltaDir === "down" ? ArrowDownIcon : ArrowUpIcon
  const deltaColor =
    deltaTone === "good" ? "text-emerald-400" : deltaTone === "bad" ? "text-red-400" : "text-white/50"
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
      {delta ? (
        <div className="flex items-center gap-1 border-t border-white/5 pt-2 text-[11px]">
          <span className="text-white/40">vs yesterday</span>
          <DeltaIcon className={cn("size-3", deltaColor)} />
          <span className={cn("font-semibold", deltaColor)}>{delta}</span>
        </div>
      ) : (
        <div className="h-[1px] border-t border-white/5" />
      )}
    </div>
  )
}

const statusStyle = {
  normal: { text: "text-emerald-400", dot: "bg-emerald-500", label: "Normal" },
  warning: { text: "text-amber-400", dot: "bg-amber-500", label: "Warning" },
} as const

function StatusPill({ status }: { status: keyof typeof statusStyle }) {
  const s = statusStyle[status]
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11.5px] font-medium", s.text)}>
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  )
}

const moistureTrendByRange: Record<string, { day: string; value: number }[]> = {
  "7 Hari": [
    { day: "May 28", value: 64 },
    { day: "May 29", value: 62 },
    { day: "May 30", value: 59 },
    { day: "May 31", value: 58 },
    { day: "Jun 1", value: 61 },
    { day: "Jun 2", value: 65 },
    { day: "Jun 3", value: 68 },
  ],
  "14 Hari": [
    { day: "May 21", value: 60 },
    { day: "May 23", value: 57 },
    { day: "May 25", value: 55 },
    { day: "May 27", value: 61 },
    { day: "May 29", value: 62 },
    { day: "May 31", value: 58 },
    { day: "Jun 2", value: 65 },
    { day: "Jun 3", value: 68 },
  ],
  "30 Hari": [
    { day: "May 5", value: 52 },
    { day: "May 10", value: 49 },
    { day: "May 15", value: 54 },
    { day: "May 20", value: 60 },
    { day: "May 25", value: 55 },
    { day: "May 30", value: 59 },
    { day: "Jun 3", value: 68 },
  ],
}
const moistureRanges = Object.keys(moistureTrendByRange)

const peatDepthByBlock = [
  { block: "Block A", depth: 322 },
  { block: "Block B", depth: 305 },
  { block: "Block C", depth: 289 },
  { block: "Block D", depth: 310 },
  { block: "Block E", depth: 298 },
]

const soilTemp24h = [
  { t: "00:00", temp: 27.2 },
  { t: "03:00", temp: 26.9 },
  { t: "06:00", temp: 27.1 },
  { t: "09:00", temp: 28.4 },
  { t: "12:00", temp: 29.8 },
  { t: "15:00", temp: 30.1 },
  { t: "18:00", temp: 29.2 },
  { t: "21:00", temp: 28.0 },
]

const co2ByBlock = [
  { block: "Block A", flux: 5.2 },
  { block: "Block B", flux: 4.6 },
  { block: "Block C", flux: 6.1 },
  { block: "Block D", flux: 4.1 },
  { block: "Block E", flux: 4.9 },
]

const co2Color = (v: number) => (v >= 6 ? "#ef4444" : v >= 5 ? "#fb923c" : "#84cc16")

const initialStations = [
  { station: "PMS-01", block: "Block A", depth: 322, moisture: 66, temp: 28.1, co2: 5.2, status: "normal" as const },
  { station: "PMS-02", block: "Block A", depth: 318, moisture: 63, temp: 28.4, co2: 5.0, status: "normal" as const },
  { station: "PMS-03", block: "Block B", depth: 305, moisture: 61, temp: 28.0, co2: 4.6, status: "normal" as const },
  { station: "PMS-04", block: "Block C", depth: 289, moisture: 47, temp: 29.6, co2: 6.1, status: "warning" as const },
  { station: "PMS-05", block: "Block C", depth: 292, moisture: 58, temp: 28.9, co2: 5.7, status: "normal" as const },
  { station: "PMS-06", block: "Block D", depth: 310, moisture: 64, temp: 27.8, co2: 4.1, status: "normal" as const },
  { station: "PMS-07", block: "Block D", depth: 308, moisture: 44, temp: 30.2, co2: 5.5, status: "warning" as const },
  { station: "PMS-08", block: "Block E", depth: 298, moisture: 60, temp: 28.3, co2: 4.9, status: "normal" as const },
]

const blockFilters = ["Semua", "Block A", "Block B", "Block C", "Block D", "Block E"]

const th = "px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-white/35"
const td = "px-3 py-2 text-[12px]"

export default function PeatMonitoringPage() {
  const [moistureRange, setMoistureRange] = useState(moistureRanges[0])
  const [rangeOpen, setRangeOpen] = useState(false)
  const [activeBlock, setActiveBlock] = useState(blockFilters[0])
  const [stations] = useState(initialStations)

  const visibleStations = useMemo(
    () => (activeBlock === "Semua" ? stations : stations.filter((s) => s.block === activeBlock)),
    [activeBlock, stations],
  )

  return (
    <PeatShell title="Peat Monitoring" subtitle="Soil & Peat Condition — Stations Overview">
      {/* KPI ROW */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Avg Peat Depth" value="305" unit="cm" tone="normal" icon={LayersIcon} delta="3 cm" deltaDir="up" deltaTone="good" />
        <StatTile label="Avg Soil Moisture" value="61" unit="%" tone="normal" icon={DropletsIcon} delta="2%" deltaDir="up" deltaTone="good" />
        <StatTile label="Avg Soil Temp" value="28.3" unit="°C" tone="info" icon={ThermometerIcon} delta="0.4°C" deltaDir="up" deltaTone="neutral" />
        <StatTile label="Stations Reporting" value="42/45" tone="warning" icon={RadioTowerIcon} delta="1" deltaDir="down" deltaTone="bad" />
        <StatTile label="CO2 Flux" value="4.8" unit="t/ha/yr" tone="warning" icon={FactoryIcon} delta="0.2" deltaDir="up" deltaTone="bad" />
        <StatTile label="GHG Status" value="Moderate" tone="warning" icon={ActivityIcon} />
      </div>

      {/* ROW 1: Moisture trend + Peat depth by block */}
      <div className="grid gap-4 md:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Soil Moisture Trend"
            subtitle="All Stations Average"
            action={
              <div className="relative">
                <button
                  onClick={() => setRangeOpen((o) => !o)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11.5px] font-medium text-white/70 transition-colors hover:border-white/20"
                >
                  {moistureRange}
                  <ChevronDownIcon className="size-3.5" />
                </button>
                {rangeOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setRangeOpen(false)} />
                    <div className="absolute right-0 z-50 mt-1 min-w-full overflow-hidden rounded-lg border border-white/10 bg-[#10201a] py-1 shadow-xl">
                      {moistureRanges.map((o) => (
                        <button
                          key={o}
                          onClick={() => {
                            setMoistureRange(o)
                            setRangeOpen(false)
                            toast("Rentang waktu: " + o)
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
            }
          />
          <div className="h-[200px] px-1 pb-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={moistureTrendByRange[moistureRange]} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                <XAxis dataKey="day" {...axisProps} />
                <YAxis domain={[30, 75]} {...axisProps} width={32} />
                <ReferenceLine
                  y={40}
                  stroke="#f59e0b"
                  strokeDasharray="4 3"
                  strokeOpacity={0.7}
                  label={{ value: "Min Threshold", position: "insideBottomLeft", fontSize: 9, fill: "#fbbf24" }}
                />
                <Tooltip {...tooltipStyle} />
                <Line
                  dataKey="value"
                  name="Soil Moisture (%)"
                  type="monotone"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#38bdf8" }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Peat Depth by Block" subtitle="Current avg depth (cm)" action={<ViewAll />} />
          <div className="h-[200px] px-1 pb-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peatDepthByBlock} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                <XAxis dataKey="block" {...axisProps} />
                <YAxis domain={[0, 360]} {...axisProps} width={34} />
                <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="depth" name="Peat Depth (cm)" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={34} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* ROW 2: Soil temp area + CO2 flux bar */}
      <div className="grid gap-4 md:grid-cols-2">
        <Panel>
          <PanelHeader title="Soil Temperature (24h)" subtitle="Hourly station average (°C)" action={<ViewAll />} />
          <div className="h-[200px] px-1 pb-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={soilTemp24h} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                <defs>
                  <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb923c" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#fb923c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                <XAxis dataKey="t" {...axisProps} />
                <YAxis domain={[25, 32]} {...axisProps} width={32} />
                <Tooltip {...tooltipStyle} />
                <Area
                  dataKey="temp"
                  name="Soil Temp (°C)"
                  type="monotone"
                  stroke="#fb923c"
                  strokeWidth={2.5}
                  fill="url(#tempGrad)"
                  dot={{ r: 2.5, fill: "#fb923c" }}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="CO2 Flux by Block" subtitle="Emission rate (t/ha/yr)" action={<ViewAll />} />
          <div className="h-[200px] px-1 pb-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={co2ByBlock} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                <XAxis dataKey="block" {...axisProps} />
                <YAxis domain={[0, 7]} {...axisProps} width={28} />
                <ReferenceLine
                  y={5}
                  stroke="#f59e0b"
                  strokeDasharray="4 3"
                  strokeOpacity={0.7}
                  label={{ value: "Target 5.0", position: "insideTopRight", fontSize: 9, fill: "#fbbf24" }}
                />
                <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="flux" name="CO2 Flux (t/ha/yr)" radius={[4, 4, 0, 0]} barSize={34}>
                  {co2ByBlock.map((b) => (
                    <Cell key={b.block} fill={co2Color(b.flux)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* BOTTOM: Stations table */}
      <Panel>
        <PanelHeader title="Peat Monitoring Stations" subtitle="Latest reading per station" action={<ViewAll />} />
        <div className="flex flex-wrap gap-1.5 px-3 pb-3">
          {blockFilters.map((b) => {
            const active = b === activeBlock
            return (
              <button
                key={b}
                onClick={() => setActiveBlock(b)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors",
                  active
                    ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                    : "text-white/45 hover:text-white/70",
                )}
              >
                {b}
              </button>
            )
          })}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className={th}>Station</th>
                <th className={th}>Block</th>
                <th className={th}>Peat Depth (cm)</th>
                <th className={th}>Soil Moisture (%)</th>
                <th className={th}>Soil Temp (°C)</th>
                <th className={th}>CO2 Flux</th>
                <th className={cn(th, "text-right")}>Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleStations.map((r) => (
                <tr
                  key={r.station}
                  onClick={() =>
                    toast(`${r.station} · ${r.block}`, {
                      description: `Kedalaman ${r.depth} cm · Lembap ${r.moisture}% · ${r.temp.toFixed(1)}°C · CO2 ${r.co2.toFixed(1)} t/ha/yr`,
                    })
                  }
                  className="cursor-pointer border-t border-white/5 hover:bg-white/[0.03]"
                >
                  <td className={cn(td, "font-medium text-white/85")}>{r.station}</td>
                  <td className={cn(td, "text-white/55")}>{r.block}</td>
                  <td className={cn(td, "text-white/70")}>{r.depth}</td>
                  <td className={cn(td, "font-medium", r.moisture < 50 ? "text-amber-400" : "text-white/70")}>
                    {r.moisture}
                  </td>
                  <td className={cn(td, "text-white/70")}>{r.temp.toFixed(1)}</td>
                  <td className={cn(td, "text-white/70")}>{r.co2.toFixed(1)} t/ha/yr</td>
                  <td className={cn(td, "text-right")}>
                    <StatusPill status={r.status} />
                  </td>
                </tr>
              ))}
              {visibleStations.length === 0 && (
                <tr className="border-t border-white/5">
                  <td className={cn(td, "text-center text-white/40")} colSpan={7}>
                    Tidak ada stasiun untuk filter ini
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </PeatShell>
  )
}
