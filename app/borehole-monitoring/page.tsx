"use client"

import { useMemo, useState } from "react"
import {
  ActivityIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  BatteryMediumIcon,
  CheckIcon,
  ChevronDownIcon,
  DownloadIcon,
  GaugeIcon,
  RadioTowerIcon,
  RefreshCwIcon,
  TargetIcon,
  WavesIcon,
  type LucideIcon,
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

import { Panel, ViewAll } from "@/components/peatland/panel"
import { PeatShell } from "@/components/peatland/peat-shell"
import { cn } from "@/lib/utils"

type Tone = "normal" | "warning" | "critical" | "info" | "offline"

const valueTone: Record<Tone, string> = {
  normal: "text-emerald-400",
  warning: "text-amber-400",
  critical: "text-red-400",
  info: "text-sky-400",
  offline: "text-white/45",
}

const iconTone: Record<Tone, string> = {
  normal: "bg-emerald-500/12 text-emerald-400 ring-emerald-500/20",
  warning: "bg-amber-500/12 text-amber-400 ring-amber-500/20",
  critical: "bg-red-500/12 text-red-400 ring-red-500/20",
  info: "bg-sky-500/12 text-sky-400 ring-sky-500/20",
  offline: "bg-slate-500/12 text-white/50 ring-slate-500/20",
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
  const DeltaIcon = deltaDir === "up" ? ArrowUpIcon : ArrowDownIcon
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
        <div className="flex items-center gap-1.5 border-t border-white/5 pt-2 text-[11px]">
          <span className={cn("size-1.5 rounded-full", statusDot[tone])} />
          <span className="font-medium text-white/55">{statusLabel[tone]}</span>
        </div>
      )}
    </div>
  )
}

function StatusPill({ tone }: { tone: Tone }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11.5px] font-medium", valueTone[tone])}>
      <span className={cn("size-1.5 rounded-full", statusDot[tone])} />
      {statusLabel[tone]}
    </span>
  )
}

function Spark({ data, color }: { data: number[]; color: string }) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const w = 56
  const h = 18
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ")
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const signalTone: Record<string, string> = {
  Good: "text-emerald-400",
  Fair: "text-amber-400",
  Weak: "text-red-400",
}

const waterTableTrend = [
  { day: "Mon", value: -27 },
  { day: "Tue", value: -29 },
  { day: "Wed", value: -28 },
  { day: "Thu", value: -32 },
  { day: "Fri", value: -31 },
  { day: "Sat", value: -34 },
  { day: "Sun", value: -35 },
]

const levelByBorehole = [
  { id: "BH-07", level: -62, tone: "critical" as Tone },
  { id: "BH-12", level: -42, tone: "warning" as Tone },
  { id: "BH-03", level: -28, tone: "normal" as Tone },
  { id: "BH-01", level: -31, tone: "warning" as Tone },
  { id: "BH-09", level: -25, tone: "normal" as Tone },
  { id: "BH-15", level: -38, tone: "warning" as Tone },
]

const barColor: Record<Tone, string> = {
  normal: "#22c55e",
  warning: "#f59e0b",
  critical: "#ef4444",
  info: "#38bdf8",
  offline: "#64748b",
}

const sparkColor: Record<Tone, string> = {
  normal: "#22c55e",
  warning: "#f59e0b",
  critical: "#ef4444",
  info: "#38bdf8",
  offline: "#64748b",
}

type Borehole = {
  id: string
  block: string
  level: number
  battery: number
  signal: string
  status: Tone
  trend: number[]
}

const initialBoreholes: Borehole[] = [
  { id: "BH-01", block: "Block A-12", level: -31, battery: 92, signal: "Good", status: "warning", trend: [-28, -30, -31] },
  { id: "BH-02", block: "Block A-14", level: -26, battery: 88, signal: "Good", status: "normal", trend: [-24, -25, -26] },
  { id: "BH-03", block: "Block B-03", level: -28, battery: 95, signal: "Good", status: "normal", trend: [-27, -28, -28] },
  { id: "BH-04", block: "Block B-07", level: -33, battery: 71, signal: "Fair", status: "warning", trend: [-30, -32, -33] },
  { id: "BH-05", block: "Block C-01", level: -24, battery: 90, signal: "Good", status: "normal", trend: [-23, -24, -24] },
  { id: "BH-07", block: "Block C-09", level: -62, battery: 58, signal: "Weak", status: "critical", trend: [-54, -58, -62] },
  { id: "BH-09", block: "Block D-04", level: -25, battery: 96, signal: "Good", status: "normal", trend: [-26, -25, -25] },
  { id: "BH-12", block: "Block D-11", level: -42, battery: 64, signal: "Fair", status: "warning", trend: [-38, -40, -42] },
]

const th = "px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-white/35"
const td = "px-3 py-2 text-[12px]"

const RANGE_OPTIONS = ["Last 7 Days", "Last 14 Days", "Last 30 Days", "This Season"]

type StatusFilter = "all" | "normal" | "warning" | "critical"

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "normal", label: "Normal" },
  { key: "warning", label: "Warning" },
  { key: "critical", label: "Critical" },
]

export default function BoreholeMonitoringPage() {
  const [range, setRange] = useState(RANGE_OPTIONS[0])
  const [rangeOpen, setRangeOpen] = useState(false)
  const [showTargets, setShowTargets] = useState(true)
  const [filter, setFilter] = useState<StatusFilter>("all")
  const [rows, setRows] = useState<Borehole[]>(initialBoreholes)

  const visibleRows = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.status === filter)),
    [filter, rows]
  )

  function refresh() {
    const id = toast.loading("Memuat telemetri terbaru…")
    setTimeout(() => toast.success("Telemetri diperbarui", { id }), 900)
  }

  function exportReport() {
    const id = toast.loading("Membuat laporan…")
    setTimeout(() => toast.success("Laporan siap diunduh", { id }), 900)
  }

  function acknowledge(id: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "normal" } : r)))
    toast.success(`${id} ditindaklanjuti`)
  }

  return (
    <PeatShell title="Borehole Monitoring" subtitle="Groundwater & Water Table Network">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative">
          <button
            onClick={() => setRangeOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12.5px] font-medium text-white/75 transition-colors hover:border-white/20"
          >
            {range}
            <ChevronDownIcon className="size-3.5" />
          </button>
          {rangeOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setRangeOpen(false)} />
              <div className="absolute z-50 mt-1 min-w-full overflow-hidden rounded-lg border border-white/10 bg-[#10201a] py-1 shadow-xl">
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
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12.5px] font-medium text-white/75 transition-colors hover:border-white/20"
          >
            <RefreshCwIcon className="size-3.5" />
            Refresh
          </button>
          <button
            onClick={exportReport}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-[12.5px] font-medium text-emerald-400 ring-1 ring-emerald-500/30 transition-colors hover:bg-emerald-500/25"
          >
            <DownloadIcon className="size-3.5" />
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Avg Water Table" value="-35" unit="cm" tone="warning" icon={WavesIcon} delta="3 cm" deltaDir="down" deltaTone="bad" />
        <StatTile label="Boreholes Critical" value="3" tone="critical" icon={ActivityIcon} delta="1" deltaDir="up" deltaTone="bad" />
        <StatTile label="Deepest" value="-62" unit="cm" tone="critical" icon={GaugeIcon} />
        <StatTile label="Within Target" value="64" unit="%" tone="warning" icon={TargetIcon} delta="5%" deltaDir="down" deltaTone="bad" />
        <StatTile label="Active Boreholes" value="48/52" tone="info" icon={RadioTowerIcon} delta="2" deltaDir="up" deltaTone="good" />
        <StatTile label="Avg Battery" value="87" unit="%" tone="normal" icon={BatteryMediumIcon} delta="1%" deltaDir="down" deltaTone="neutral" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel className="h-full">
          <div className="flex items-start justify-between px-4 pb-1 pt-3.5">
            <div>
              <h3 className="text-[14px] font-semibold text-white">Water Table Trend (7 Days)</h3>
              <p className="text-[11px] text-white/40">All Borehole Average (cm below surface)</p>
            </div>
            <button
              onClick={() => {
                setShowTargets((s) => {
                  const next = !s
                  toast(next ? "Garis target ditampilkan" : "Garis target disembunyikan")
                  return next
                })
              }}
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
          </div>
          <div className="h-[200px] px-1 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={waterTableTrend} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                <XAxis dataKey="day" {...axisProps} />
                <YAxis domain={[-60, -10]} {...axisProps} width={34} />
                {showTargets && (
                  <>
                    <ReferenceArea y1={-30} y2={-10} fill="#22c55e" fillOpacity={0.06} />
                    <ReferenceArea y1={-40} y2={-30} fill="#f59e0b" fillOpacity={0.06} />
                    <ReferenceArea y1={-60} y2={-40} fill="#ef4444" fillOpacity={0.07} />
                    <ReferenceLine y={-30} stroke="#22c55e" strokeDasharray="4 3" strokeOpacity={0.6} label={{ value: "Target (-30 cm)", position: "insideTopLeft", fontSize: 9, fill: "#34d399" }} />
                    <ReferenceLine y={-40} stroke="#f59e0b" strokeDasharray="4 3" strokeOpacity={0.6} label={{ value: "Warning (-40 cm)", position: "insideTopLeft", fontSize: 9, fill: "#fbbf24" }} />
                    <ReferenceLine y={-60} stroke="#ef4444" strokeDasharray="4 3" strokeOpacity={0.6} label={{ value: "Critical (-60 cm)", position: "insideTopLeft", fontSize: 9, fill: "#f87171" }} />
                  </>
                )}
                <Tooltip {...tooltipStyle} />
                <Line dataKey="value" name="Water Table" type="monotone" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 3, fill: "#38bdf8" }} activeDot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="h-full">
          <div className="px-4 pb-1 pt-3.5">
            <h3 className="text-[14px] font-semibold text-white">Water Level by Borehole (cm)</h3>
            <p className="text-[11px] text-white/40">Latest reading per station</p>
          </div>
          <div className="h-[200px] px-1 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={levelByBorehole} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                <XAxis dataKey="id" {...axisProps} />
                <YAxis domain={[-70, 0]} {...axisProps} width={34} />
                <ReferenceLine y={-30} stroke="#22c55e" strokeDasharray="4 3" strokeOpacity={0.5} />
                <ReferenceLine y={-40} stroke="#f59e0b" strokeDasharray="4 3" strokeOpacity={0.5} />
                <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="level" name="Water Level (cm)" radius={[0, 0, 3, 3]} barSize={26}>
                  {levelByBorehole.map((b) => (
                    <Cell key={b.id} fill={barColor[b.tone]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4">
        <Panel>
          <div className="flex items-center justify-between px-4 pb-1 pt-3.5">
            <div>
              <h3 className="text-[14px] font-semibold text-white">Borehole Status</h3>
              <p className="text-[11px] text-white/40">Live network telemetry • {visibleRows.length} of 52 stations</p>
            </div>
            <ViewAll />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 px-4 pb-2 pt-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-[11.5px] font-medium transition-colors",
                  filter === f.key
                    ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                    : "text-white/45 hover:text-white/70"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className={th}>ID</th>
                <th className={th}>Location</th>
                <th className={cn(th, "text-right")}>Water Level</th>
                <th className={cn(th, "text-right")}>Battery</th>
                <th className={th}>Signal</th>
                <th className={th}>Status</th>
                <th className={cn(th, "text-right")}>Trend (3D)</th>
                <th className={cn(th, "text-right")}>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => toast(`${r.id} • ${r.level} cm • ${statusLabel[r.status]}`)}
                  className="cursor-pointer border-t border-white/5 hover:bg-white/[0.03]"
                >
                  <td className={cn(td, "font-medium text-white/85")}>{r.id}</td>
                  <td className={cn(td, "text-white/55")}>{r.block}</td>
                  <td className={cn(td, valueTone[r.status], "text-right font-medium")}>{r.level} cm</td>
                  <td className={cn(td, "text-right")}>
                    <span className={cn("font-medium", r.battery < 60 ? "text-amber-400" : "text-white/70")}>{r.battery}%</span>
                  </td>
                  <td className={cn(td, "font-medium", signalTone[r.signal])}>{r.signal}</td>
                  <td className={td}>
                    <StatusPill tone={r.status} />
                  </td>
                  <td className={cn(td, "text-right")}>
                    <span className="inline-flex justify-end">
                      <Spark data={r.trend} color={sparkColor[r.status]} />
                    </span>
                  </td>
                  <td className={cn(td, "text-right")}>
                    {r.status === "warning" || r.status === "critical" ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          acknowledge(r.id)
                        }}
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-1 text-[11px] font-medium text-emerald-400 ring-1 ring-emerald-500/30 transition-colors hover:bg-emerald-500/25"
                      >
                        <CheckIcon className="size-3" />
                        Ack
                      </button>
                    ) : (
                      <span className="text-[11px] text-white/30">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </PeatShell>
  )
}
