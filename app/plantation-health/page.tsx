"use client"

import { useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  ActivityIcon,
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  DownloadIcon,
  LeafIcon,
  type LucideIcon,
  MapIcon,
  SatelliteIcon,
  SproutIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { toast } from "sonner"

import { PeatShell } from "@/components/peatland/peat-shell"
import { Panel, PanelHeader, ViewAll } from "@/components/peatland/panel"
import { useDashboardFilters } from "@/lib/peatland/filters"
import { matchesBlock, scaleNumber, scaleNumericString } from "@/lib/peatland/filter-logic"
import { cn } from "@/lib/utils"

type Tone = "good" | "warn" | "crit" | "info"

const valueTone: Record<Tone, string> = {
  good: "text-emerald-400",
  warn: "text-amber-400",
  crit: "text-red-400",
  info: "text-sky-400",
}

const iconTone: Record<Tone, string> = {
  good: "bg-emerald-500/12 text-emerald-400 ring-emerald-500/20",
  warn: "bg-amber-500/12 text-amber-400 ring-amber-500/20",
  crit: "bg-red-500/12 text-red-400 ring-red-500/20",
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
  tone,
  icon: Icon,
  delta,
  deltaDir,
}: {
  label: string
  value: string
  unit?: string
  tone: Tone
  icon: LucideIcon
  delta?: string
  deltaDir?: "up" | "down" | "flat"
}) {
  const DeltaIcon = deltaDir === "down" ? ArrowDownIcon : deltaDir === "flat" ? ArrowRightIcon : ArrowUpIcon
  const deltaColor =
    deltaDir === "down" ? "text-red-400" : deltaDir === "flat" ? "text-white/50" : "text-emerald-400"
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
      ) : null}
    </div>
  )
}

const ndviTrendFull = [
  { month: "Apr", ndvi: 0.58 },
  { month: "May", ndvi: 0.6 },
  { month: "Jun", ndvi: 0.61 },
  { month: "Jul", ndvi: 0.63 },
  { month: "Aug", ndvi: 0.65 },
  { month: "Sep", ndvi: 0.66 },
]

const ndviRangeOptions = ["3M", "6M", "12M"] as const
type NdviRange = (typeof ndviRangeOptions)[number]

const ndviRangeMonths: Record<NdviRange, number> = {
  "3M": 3,
  "6M": 6,
  "12M": 12,
}

const ndviRangeLabel: Record<NdviRange, string> = {
  "3M": "NDVI Trend (3 Months)",
  "6M": "NDVI Trend (6 Months)",
  "12M": "NDVI Trend (12 Months)",
}

const healthDist = [
  { name: "Very Good", value: 38, color: "#22c55e" },
  { name: "Good", value: 34, color: "#84cc16" },
  { name: "Moderate", value: 18, color: "#f59e0b" },
  { name: "Poor", value: 10, color: "#ef4444" },
]

const yieldByBlock = [
  { block: "A", yield: 24, color: "#22c55e" },
  { block: "B", yield: 22, color: "#84cc16" },
  { block: "C", yield: 19, color: "#f59e0b" },
  { block: "D", yield: 16, color: "#ef4444" },
  { block: "E", yield: 23, color: "#22c55e" },
]

type HealthTone = "very-good" | "good" | "moderate" | "poor"
type TrendKind = "improving" | "stable" | "declining"

const ndviBar: Record<HealthTone, string> = {
  "very-good": "bg-emerald-500",
  good: "bg-lime-500",
  moderate: "bg-amber-500",
  poor: "bg-red-500",
}
const ndviText: Record<HealthTone, string> = {
  "very-good": "text-emerald-400",
  good: "text-lime-400",
  moderate: "text-amber-400",
  poor: "text-red-400",
}

const trendStyle: Record<TrendKind, { text: string; dot: string; label: string }> = {
  improving: { text: "text-emerald-400", dot: "bg-emerald-500", label: "Improving" },
  stable: { text: "text-sky-400", dot: "bg-sky-500", label: "Stable" },
  declining: { text: "text-red-400", dot: "bg-red-500", label: "Declining" },
}

const blockRows = [
  { block: "Block A", ndvi: 0.82, health: "Very Good", healthTone: "very-good" as HealthTone, area: 1420, crop: 24.1, trend: "improving" as TrendKind },
  { block: "Block B", ndvi: 0.74, health: "Good", healthTone: "good" as HealthTone, area: 1280, crop: 22.3, trend: "stable" as TrendKind },
  { block: "Block C", ndvi: 0.61, health: "Moderate", healthTone: "moderate" as HealthTone, area: 1095, crop: 19.4, trend: "stable" as TrendKind },
  { block: "Block D", ndvi: 0.42, health: "Poor", healthTone: "poor" as HealthTone, area: 980, crop: 16.2, trend: "declining" as TrendKind },
  { block: "Block E", ndvi: 0.78, health: "Very Good", healthTone: "very-good" as HealthTone, area: 1335, crop: 23.0, trend: "improving" as TrendKind },
]

function TrendPill({ trend }: { trend: TrendKind }) {
  const s = trendStyle[trend]
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11.5px] font-medium", s.text)}>
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  )
}

export default function PlantationHealthPage() {
  const { estate, division } = useDashboardFilters()
  const [ndviRange, setNdviRange] = useState<NdviRange>("6M")
  const [exportOpen, setExportOpen] = useState(false)

  const ndviTrend = useMemo(() => {
    const n = ndviRangeMonths[ndviRange]
    let series: { month: string; ndvi: number }[]
    if (n >= ndviTrendFull.length) {
      // Extend backwards with synthetic earlier months for the 12M view.
      const extraMonths = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"]
      const base = ndviTrendFull[0].ndvi
      const head = extraMonths
        .slice(0, n - ndviTrendFull.length)
        .map((month, i) => ({ month, ndvi: Number((base - (i + 1) * 0.015).toFixed(2)) }))
        .reverse()
      series = [...head, ...ndviTrendFull]
    } else {
      series = ndviTrendFull.slice(ndviTrendFull.length - n)
    }
    // Scale NDVI series per estate; NDVI must stay ≤ 1.0.
    return series.map((d) => ({ ...d, ndvi: Math.min(1, scaleNumber(d.ndvi, estate, 2)) }))
  }, [ndviRange, estate])

  // Per-block NDVI table filtered by the global division selector.
  const visibleBlockRows = useMemo(
    () => blockRows.filter((r) => matchesBlock(r.block, division)),
    [division]
  )

  // Yield-by-block chart filtered by division (single-letter label → "Block X").
  const visibleYieldByBlock = useMemo(
    () => yieldByBlock.filter((d) => matchesBlock(`Block ${d.block}`, division)),
    [division]
  )

  const exportFormats = ["PDF", "Excel", "CSV"] as const

  return (
    <PeatShell title="Plantation Health" subtitle="Vegetation Index (NDVI) & Crop Health">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile
          label="Avg NDVI"
          value={Math.min(1, scaleNumber(0.66, estate, 2)).toFixed(2)}
          tone="good"
          icon={LeafIcon}
          delta="+0.01"
          deltaDir="up"
        />
        <StatTile
          label="Healthy Area"
          value={scaleNumericString("72", estate)}
          unit="%"
          tone="good"
          icon={SproutIcon}
          delta="+2%"
          deltaDir="up"
        />
        <StatTile label="Blocks at Risk" value="1" tone="warn" icon={TriangleAlertIcon} delta="0" deltaDir="flat" />
        <StatTile
          label="Total Area"
          value={scaleNumber(6110, estate).toLocaleString()}
          unit="ha"
          tone="info"
          icon={MapIcon}
        />
        <StatTile
          label="Avg Yield"
          value={scaleNumericString("21.4", estate)}
          unit="t/ha"
          tone="good"
          icon={ActivityIcon}
          delta="+0.3"
          deltaDir="up"
        />
        <StatTile label="Last Satellite Pass" value="10 Sep" tone="info" icon={SatelliteIcon} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Panel className="md:col-span-2">
          <PanelHeader
            title={ndviRangeLabel[ndviRange]}
            subtitle="All Blocks Average"
            action={
              <div className="inline-flex items-center gap-1 rounded-lg bg-white/5 p-0.5">
                {ndviRangeOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setNdviRange(opt)
                      toast(`Rentang NDVI: ${opt}`)
                    }}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-colors",
                      ndviRange === opt
                        ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                        : "text-white/45 hover:text-white/70"
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            }
          />
          <div className="h-[220px] px-1 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ndviTrend} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                <defs>
                  <linearGradient id="ndviStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#84cc16" />
                    <stop offset="100%" stopColor="#22c55e" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis domain={[0.5, 0.7]} {...axisProps} width={36} ticks={[0.5, 0.55, 0.6, 0.65, 0.7]} />
                <ReferenceArea y1={0.6} y2={0.7} fill="#22c55e" fillOpacity={0.05} />
                <ReferenceArea y1={0.5} y2={0.6} fill="#f59e0b" fillOpacity={0.04} />
                <Tooltip {...tooltipStyle} />
                <Line
                  dataKey="ndvi"
                  name="Avg NDVI"
                  type="monotone"
                  stroke="url(#ndviStroke)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#22c55e" }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Health Distribution" subtitle="Share of Total Area" />
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip {...tooltipStyle} />
                <Pie
                  data={healthDist}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={2}
                  stroke="none"
                >
                  {healthDist.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 px-4 pb-4">
            {healthDist.map((d) => (
              <button
                key={d.name}
                onClick={() => toast(`${d.name}: ${d.value}% dari total area`)}
                className="flex cursor-pointer items-center gap-1.5 text-left text-[11px] text-white/60 transition-colors hover:text-white/90"
              >
                <span className="size-2.5 rounded-[3px]" style={{ background: d.color }} />
                {d.name}
                <span className="ml-auto font-medium text-white/80">{d.value}%</span>
              </button>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4">
        <Panel>
          <PanelHeader
            title="Yield by Block (t/ha)"
            subtitle="Latest Harvest Estimate"
            action={
              <div className="relative">
                <button
                  onClick={() => setExportOpen((o) => !o)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1 text-[11.5px] font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <DownloadIcon className="size-3.5" />
                  Export
                  <ChevronDownIcon className="size-3.5" />
                </button>
                {exportOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
                    <div className="absolute right-0 z-50 mt-1 min-w-[140px] overflow-hidden rounded-lg border border-white/10 bg-[#10201a] py-1 shadow-xl">
                      {exportFormats.map((fmt) => (
                        <button
                          key={fmt}
                          onClick={() => {
                            setExportOpen(false)
                            const id = toast.loading(`Menyiapkan ekspor ${fmt}…`)
                            setTimeout(
                              () => toast.success(`Laporan ${fmt} siap diunduh`, { id }),
                              900
                            )
                          }}
                          className="block w-full px-3 py-2 text-left text-[12.5px] text-white/75 hover:bg-white/5"
                        >
                          {fmt}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            }
          />
          <div className="h-[200px] px-1 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={visibleYieldByBlock} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                <XAxis dataKey="block" {...axisProps} />
                <YAxis domain={[0, 28]} {...axisProps} width={28} ticks={[0, 7, 14, 21, 28]} />
                <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="yield" name="Yield (t/ha)" radius={[4, 4, 0, 0]} barSize={40}>
                  {visibleYieldByBlock.map((d) => (
                    <Cell key={d.block} fill={d.color} />
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
            <h3 className="text-[14px] font-semibold text-white">
              Block Health (NDVI) <span className="text-[11px] font-normal text-white/35">(Latest Pass)</span>
            </h3>
            <ViewAll />
          </div>
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className={th}>Block</th>
                <th className={th}>NDVI</th>
                <th className={th}>Health Status</th>
                <th className={cn(th, "text-right")}>Area (Ha)</th>
                <th className={cn(th, "text-right")}>Yield (t/ha)</th>
                <th className={cn(th, "text-right")}>Trend</th>
              </tr>
            </thead>
            <tbody>
              {visibleBlockRows.length === 0 ? (
                <tr className="border-t border-white/5">
                  <td className={cn(td, "text-center text-white/40")} colSpan={6}>
                    Tidak ada blok di {division}
                  </td>
                </tr>
              ) : (
                visibleBlockRows.map((r) => {
                  const ndvi = Math.min(1, scaleNumber(r.ndvi, estate, 2))
                  return (
                    <tr
                      key={r.block}
                      onClick={() => toast(`${r.block} · NDVI ${ndvi.toFixed(2)} · ${r.health}`)}
                      className="cursor-pointer border-t border-white/5 hover:bg-white/[0.03]"
                    >
                      <td className={cn(td, "font-medium text-white/85")}>{r.block}</td>
                      <td className={cn(td, "font-medium text-white/80")}>{ndvi.toFixed(2)}</td>
                      <td className={td}>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
                            <div
                              className={cn("h-full rounded-full", ndviBar[r.healthTone])}
                              style={{ width: `${ndvi * 100}%` }}
                            />
                          </div>
                          <span className={cn("text-[11.5px] font-medium", ndviText[r.healthTone])}>{r.health}</span>
                        </div>
                      </td>
                      <td className={cn(td, "text-right text-white/70")}>
                        {scaleNumber(r.area, estate).toLocaleString()}
                      </td>
                      <td className={cn(td, "text-right text-white/70")}>{scaleNumber(r.crop, estate, 1).toFixed(1)}</td>
                      <td className={cn(td, "text-right")}>
                        <div className="flex justify-end">
                          <TrendPill trend={r.trend} />
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </Panel>
      </div>
    </PeatShell>
  )
}
