"use client"

import { useMemo, useState } from "react"
import {
  ChevronDownIcon,
  CloudRainIcon,
  FlameIcon,
  GaugeIcon,
  MapPinIcon,
  ShieldCheckIcon,
  WavesIcon,
} from "lucide-react"
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { toast } from "sonner"

import { PeatShell } from "@/components/peatland/peat-shell"
import { Panel, ViewAll } from "@/components/peatland/panel"
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

const dotTone: Record<Tone, string> = {
  normal: "bg-emerald-500",
  warning: "bg-amber-500",
  critical: "bg-red-500",
  info: "bg-sky-500",
}

function StatTile({
  label,
  value,
  unit,
  tone,
  icon: Icon,
  status,
  delta,
}: {
  label: string
  value: string
  unit?: string
  tone: Tone
  icon: typeof FlameIcon
  status: string
  delta?: string
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
      <div className="flex items-center gap-1.5">
        <span className={cn("size-1.5 rounded-full", dotTone[tone])} />
        <span className="text-[12px] font-medium text-white/65">{status}</span>
      </div>
      {delta && (
        <div className="flex items-center gap-1 border-t border-white/5 pt-2 text-[11px]">
          <span className="text-white/40">vs yesterday</span>
          <span className="font-semibold text-white/70">{delta}</span>
        </div>
      )}
    </div>
  )
}

const th = "px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-white/35"
const td = "px-3 py-2 text-[12px]"

const trendData: Record<string, { day: string; value: number }[]> = {
  "7 Days": [
    { day: "Mon", value: 64 },
    { day: "Tue", value: 68 },
    { day: "Wed", value: 71 },
    { day: "Thu", value: 70 },
    { day: "Fri", value: 75 },
    { day: "Sat", value: 79 },
    { day: "Sun", value: 82 },
  ],
  "14 Days": [
    { day: "W1", value: 52 },
    { day: "W1", value: 58 },
    { day: "W1", value: 61 },
    { day: "W1", value: 66 },
    { day: "W2", value: 64 },
    { day: "W2", value: 70 },
    { day: "W2", value: 75 },
    { day: "W2", value: 82 },
  ],
  "30 Days": [
    { day: "D1", value: 38 },
    { day: "D6", value: 44 },
    { day: "D12", value: 49 },
    { day: "D18", value: 57 },
    { day: "D24", value: 66 },
    { day: "D30", value: 82 },
  ],
}

const TREND_RANGES = ["7 Days", "14 Days", "30 Days"]

const fwiComponents = [
  { code: "FFMC", value: 88, fill: "#ef4444" },
  { code: "DMC", value: 64, fill: "#fb923c" },
  { code: "ISI", value: 12, fill: "#f59e0b" },
  { code: "BUI", value: 70, fill: "#84cc16" },
  { code: "FWI", value: 38, fill: "#38bdf8" },
]

type Hotspot = {
  id: string
  block: string
  coords: string
  confidence: string
  confTone: Tone
  frp: number
  detected: string
  status: string
  statusTone: Tone
}

const initialHotspots: Hotspot[] = [
  {
    id: "HS-01",
    block: "Blok C-14",
    coords: "0.342°S, 102.118°E",
    confidence: "High",
    confTone: "critical",
    frp: 18.4,
    detected: "03:12",
    status: "Confirmed",
    statusTone: "critical",
  },
  {
    id: "HS-02",
    block: "Blok D-07",
    coords: "0.355°S, 102.131°E",
    confidence: "Nominal",
    confTone: "warning",
    frp: 9.7,
    detected: "03:54",
    status: "Investigating",
    statusTone: "warning",
  },
  {
    id: "HS-03",
    block: "Blok A-22",
    coords: "0.318°S, 102.094°E",
    confidence: "High",
    confTone: "critical",
    frp: 24.1,
    detected: "13:41",
    status: "Confirmed",
    statusTone: "critical",
  },
  {
    id: "HS-04",
    block: "Blok B-03",
    coords: "0.371°S, 102.149°E",
    confidence: "Low",
    confTone: "info",
    frp: 4.2,
    detected: "15:08",
    status: "False alarm",
    statusTone: "normal",
  },
  {
    id: "HS-05",
    block: "Blok E-11",
    coords: "0.329°S, 102.107°E",
    confidence: "Nominal",
    confTone: "warning",
    frp: 11.6,
    detected: "16:27",
    status: "Investigating",
    statusTone: "warning",
  },
]

const CONFIDENCE_FILTERS = ["All", "High", "Nominal", "Low"]

function StatusPill({ tone, label }: { tone: Tone; label: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11.5px] font-medium", valueTone[tone])}>
      <span className={cn("size-1.5 rounded-full", dotTone[tone])} />
      {label}
    </span>
  )
}

export default function FireRiskPage() {
  const riskScore = 82

  const [trendRange, setTrendRange] = useState(TREND_RANGES[0])
  const [rangeOpen, setRangeOpen] = useState(false)
  const fireRiskTrend = trendData[trendRange]

  const [hotspots, setHotspots] = useState<Hotspot[]>(initialHotspots)
  const [confFilter, setConfFilter] = useState(CONFIDENCE_FILTERS[0])

  const visibleHotspots = useMemo(
    () => (confFilter === "All" ? hotspots : hotspots.filter((h) => h.confidence === confFilter)),
    [hotspots, confFilter]
  )

  function setHotspotStatus(id: string, status: string, statusTone: Tone, message: string) {
    setHotspots((rows) => rows.map((r) => (r.id === id ? { ...r, status, statusTone } : r)))
    toast.success(message)
  }

  function dispatchPatrol() {
    const id = toast.loading("Mengirim tim patroli…")
    setTimeout(() => toast.success("Tim patroli dikirim ke titik panas aktif", { id }), 900)
  }

  return (
    <PeatShell title="Fire Risk" subtitle="Fire Danger & Hotspot Monitoring">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Fire Risk Index" value="82" unit="High" tone="critical" icon={FlameIcon} status="Critical" delta="+3 pts" />
        <StatTile label="Active Hotspots" value="4" tone="critical" icon={MapPinIcon} status="Above threshold" delta="+2" />
        <StatTile label="Days Since Rain" value="2" unit="days" tone="warning" icon={CloudRainIcon} status="Drying out" delta="+1 day" />
        <StatTile label="FDRS Level" value="High" tone="critical" icon={GaugeIcon} status="Danger" delta="Was Medium" />
        <StatTile label="Ground Water" value="-35" unit="cm" tone="warning" icon={WavesIcon} status="Below target" delta="-4 cm" />
        <StatTile label="Patrols Active" value="6" tone="normal" icon={ShieldCheckIcon} status="On duty" delta="+1 team" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel className="h-full">
          <div className="flex items-center justify-between px-4 pb-1 pt-3.5">
            <div>
              <h3 className="text-[14px] font-semibold text-white">Fire Risk Trend ({trendRange})</h3>
              <p className="text-[11px] text-white/40">Composite Fire Risk Index</p>
            </div>
            <div className="relative">
              <button
                onClick={() => setRangeOpen((o) => !o)}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11.5px] font-medium text-white/70 transition-colors hover:border-white/20"
              >
                {trendRange} <ChevronDownIcon className="size-3.5" />
              </button>
              {rangeOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setRangeOpen(false)} />
                  <div className="absolute right-0 z-50 mt-1 min-w-full overflow-hidden rounded-lg border border-white/10 bg-[#10201a] py-1 shadow-xl">
                    {TREND_RANGES.map((o) => (
                      <button
                        key={o}
                        onClick={() => {
                          setTrendRange(o)
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
              <ComposedChart data={fireRiskTrend} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                <defs>
                  <linearGradient id="frGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                <XAxis dataKey="day" {...axisProps} />
                <YAxis domain={[0, 100]} {...axisProps} width={28} ticks={[0, 25, 50, 75, 100]} />
                <ReferenceArea y1={71} y2={100} fill="#ef4444" fillOpacity={0.06} label={{ value: "High (71-100)", position: "insideTopLeft", fontSize: 9, fill: "#f87171" }} />
                <ReferenceArea y1={41} y2={70} fill="#f59e0b" fillOpacity={0.05} label={{ value: "Medium (41-70)", position: "insideTopLeft", fontSize: 9, fill: "#fbbf24" }} />
                <ReferenceArea y1={0} y2={40} fill="#22c55e" fillOpacity={0.05} label={{ value: "Low (0-40)", position: "insideTopLeft", fontSize: 9, fill: "#34d399" }} />
                <Tooltip {...tooltipStyle} />
                <Area dataKey="value" type="monotone" stroke="none" fill="url(#frGrad)" />
                <Line dataKey="value" name="Risk Index" type="monotone" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3, fill: "#ef4444" }} activeDot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="h-full">
          <div className="flex items-center justify-between px-4 pb-1 pt-3.5">
            <div>
              <h3 className="text-[14px] font-semibold text-white">Fire Weather Index Components</h3>
              <p className="text-[11px] text-white/40">Canadian FWI System (today)</p>
            </div>
            <span className="text-[11px] font-medium text-white/40">FWI 38</span>
          </div>
          <div className="h-[200px] px-1 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fwiComponents} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                <XAxis dataKey="code" {...axisProps} />
                <YAxis domain={[0, 100]} {...axisProps} width={28} ticks={[0, 25, 50, 75, 100]} />
                <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="value" name="Index" radius={[3, 3, 0, 0]} barSize={30}>
                  {fwiComponents.map((c) => (
                    <Cell key={c.code} fill={c.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-1">
          <div className="flex items-center justify-between px-4 pb-1 pt-3.5">
            <h3 className="text-[14px] font-semibold text-white">Risk Level</h3>
            <span className="text-[11px] font-medium text-red-400">High</span>
          </div>
          <div className="flex flex-col gap-3 px-4 pb-4 pt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-[40px] font-bold leading-none text-red-400">{riskScore}</span>
              <span className="text-[13px] font-medium text-white/40">/ 100</span>
            </div>
            <div className="relative h-3 w-full overflow-hidden rounded-full">
              <div className="absolute inset-0 flex">
                <div className="h-full bg-emerald-500/35" style={{ width: "40%" }} />
                <div className="h-full bg-amber-500/35" style={{ width: "30%" }} />
                <div className="h-full bg-red-500/35" style={{ width: "30%" }} />
              </div>
              <div className="absolute inset-y-0 left-0 rounded-full bg-red-500" style={{ width: `${riskScore}%` }} />
              <div className="absolute -top-0.5 h-4 w-1 rounded-full bg-white shadow ring-1 ring-black/30" style={{ left: `calc(${riskScore}% - 2px)` }} />
            </div>
            <div className="flex justify-between text-[10px] font-medium uppercase tracking-wide text-white/40">
              <span className="text-emerald-400">Low</span>
              <span className="text-amber-400">Medium</span>
              <span className="text-red-400">High</span>
            </div>
            <p className="border-t border-white/5 pt-3 text-[11.5px] leading-relaxed text-white/55">
              Extreme caution. Hot-work permits suspended. Increase patrol frequency and pre-position suppression units near active blocks.
            </p>
            <button
              onClick={dispatchPatrol}
              className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-2 text-[12px] font-semibold text-emerald-400 ring-1 ring-emerald-500/30 transition-colors hover:bg-emerald-500/25"
            >
              <ShieldCheckIcon className="size-4" />
              Dispatch Patrol
            </button>
          </div>
        </Panel>

        <Panel className="xl:col-span-2">
          <div className="flex items-center justify-between px-4 pb-1 pt-3.5">
            <div>
              <h3 className="text-[14px] font-semibold text-white">VIIRS Hotspots (24h)</h3>
              <p className="text-[11px] text-white/40">Satellite thermal anomaly detections</p>
            </div>
            <ViewAll />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 px-4 pb-2 pt-1">
            {CONFIDENCE_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setConfFilter(f)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors",
                  confFilter === f
                    ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                    : "text-white/45 hover:text-white/70"
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className={th}>ID</th>
                <th className={th}>Block</th>
                <th className={th}>Coordinates</th>
                <th className={th}>Confidence</th>
                <th className={cn(th, "text-right")}>FRP (MW)</th>
                <th className={th}>Detected</th>
                <th className={th}>Status</th>
                <th className={cn(th, "text-right")}>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleHotspots.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => toast(`${r.id} · ${r.block} · FRP ${r.frp.toFixed(1)} MW · ${r.coords}`)}
                  className="cursor-pointer border-t border-white/5 hover:bg-white/[0.03]"
                >
                  <td className={cn(td, "font-medium text-white/85")}>{r.id}</td>
                  <td className={cn(td, "text-white/70")}>{r.block}</td>
                  <td className={cn(td, "font-mono text-[11px] text-white/55")}>{r.coords}</td>
                  <td className={td}>
                    <StatusPill tone={r.confTone} label={r.confidence} />
                  </td>
                  <td className={cn(td, "text-right font-medium text-white/80")}>{r.frp.toFixed(1)}</td>
                  <td className={cn(td, "text-white/55")}>{r.detected}</td>
                  <td className={td}>
                    <StatusPill tone={r.statusTone} label={r.status} />
                  </td>
                  <td className={cn(td, "text-right")}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setHotspotStatus(r.id, "Confirmed", "critical", `${r.id} dikonfirmasi sebagai titik api`)
                        }}
                        className="rounded-md px-2 py-1 text-[11px] font-medium text-red-400 ring-1 ring-red-500/25 transition-colors hover:bg-red-500/15"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setHotspotStatus(r.id, "False alarm", "normal", `${r.id} ditandai sebagai alarm palsu`)
                        }}
                        className="rounded-md px-2 py-1 text-[11px] font-medium text-white/55 ring-1 ring-white/10 transition-colors hover:bg-white/5"
                      >
                        False
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {visibleHotspots.length === 0 && (
                <tr className="border-t border-white/5">
                  <td className={cn(td, "text-center text-white/40")} colSpan={8}>
                    Tidak ada titik panas untuk filter ini
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Panel>
      </div>
    </PeatShell>
  )
}
