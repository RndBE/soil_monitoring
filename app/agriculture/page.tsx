"use client"

import { useMemo, useState } from "react"

import {
  Bar,
  BarChart,
  CartesianGrid,
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
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  DownloadIcon,
  DropletIcon,
  GaugeIcon,
  LeafIcon,
  PlusIcon,
  ScissorsIcon,
  SprayCanIcon,
  SproutIcon,
  TractorIcon,
  TruckIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Panel, PanelHeader, ViewAll } from "@/components/peatland/panel"
import { PeatShell } from "@/components/peatland/peat-shell"
import { cn } from "@/lib/utils"

type Tone = "emerald" | "amber" | "red" | "sky" | "lime" | "orange"

const valueTone: Record<Tone, string> = {
  emerald: "text-emerald-400",
  amber: "text-amber-400",
  red: "text-red-400",
  sky: "text-sky-400",
  lime: "text-lime-400",
  orange: "text-orange-400",
}

const iconTone: Record<Tone, string> = {
  emerald: "bg-emerald-500/12 text-emerald-400 ring-emerald-500/20",
  amber: "bg-amber-500/12 text-amber-400 ring-amber-500/20",
  red: "bg-red-500/12 text-red-400 ring-red-500/20",
  sky: "bg-sky-500/12 text-sky-400 ring-sky-500/20",
  lime: "bg-lime-500/12 text-lime-400 ring-lime-500/20",
  orange: "bg-orange-500/12 text-orange-400 ring-orange-500/20",
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
  deltaGood,
}: {
  label: string
  value: string
  unit?: string
  tone: Tone
  icon: LucideIcon
  delta?: string
  deltaGood?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => toast(label, { description: `${value}${unit ? " " + unit : ""}` })}
      className="flex cursor-pointer flex-col gap-3 rounded-xl border border-white/8 bg-gradient-to-b from-white/[0.04] to-transparent p-4 text-left ring-1 ring-white/5 transition-colors hover:border-white/15"
    >
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
          <span className={cn("font-semibold", deltaGood ? "text-emerald-400" : "text-white/55")}>{delta}</span>
        </div>
      )}
    </button>
  )
}

const kpis: {
  label: string
  value: string
  unit?: string
  tone: Tone
  icon: LucideIcon
  delta?: string
  deltaGood?: boolean
}[] = [
  { label: "FFB Harvest (MTD)", value: "3,420", unit: "t", tone: "emerald", icon: TruckIcon, delta: "+4.2%", deltaGood: true },
  { label: "Yield", value: "21.4", unit: "t/ha", tone: "lime", icon: SproutIcon, delta: "+0.6 t/ha", deltaGood: true },
  { label: "Fertilizer Applied", value: "82", unit: "%", tone: "amber", icon: DropletIcon, delta: "+3 pts", deltaGood: true },
  { label: "Productive Area", value: "5,240", unit: "ha", tone: "sky", icon: LeafIcon, delta: "0", deltaGood: false },
  { label: "Harvest Crews", value: "12", tone: "orange", icon: UsersIcon, delta: "+1", deltaGood: true },
  { label: "OER", value: "22.8", unit: "%", tone: "emerald", icon: GaugeIcon, delta: "+0.3 pts", deltaGood: true },
]

const monthlyHarvest = [
  { month: "Jan", t: 2840 },
  { month: "Feb", t: 2960 },
  { month: "Mar", t: 3120 },
  { month: "Apr", t: 3010 },
  { month: "May", t: 3280 },
  { month: "Jun", t: 3440 },
  { month: "Jul", t: 3380 },
  { month: "Aug", t: 3560 },
  { month: "Sep", t: 3420 },
]

const yieldTrend = [
  { month: "Oct", v: 19.2 },
  { month: "Nov", v: 19.6 },
  { month: "Dec", v: 19.1 },
  { month: "Jan", v: 19.8 },
  { month: "Feb", v: 20.2 },
  { month: "Mar", v: 20.6 },
  { month: "Apr", v: 20.4 },
  { month: "May", v: 21.0 },
  { month: "Jun", v: 21.5 },
  { month: "Jul", v: 21.2 },
  { month: "Aug", v: 21.8 },
  { month: "Sep", v: 21.4 },
]

type TaskTone = "emerald" | "amber" | "sky"
type TaskStatus = "Pending" | "Scheduled" | "In Progress" | "Done"

const initialTasks: {
  id: string
  task: string
  block: string
  date: string
  status: TaskStatus
  icon: LucideIcon
}[] = [
  { id: "t1", task: "Harvesting", block: "Block A", date: "11 Sep", status: "In Progress", icon: TractorIcon },
  { id: "t2", task: "Fertilizing", block: "Block C", date: "12 Sep", status: "Scheduled", icon: DropletIcon },
  { id: "t3", task: "Spraying", block: "Block E", date: "13 Sep", status: "Scheduled", icon: SprayCanIcon },
  { id: "t4", task: "Pruning", block: "Block D", date: "14 Sep", status: "Pending", icon: ScissorsIcon },
]

const taskStatusTone: Record<TaskStatus, TaskTone> = {
  "In Progress": "emerald",
  Scheduled: "sky",
  Pending: "amber",
  Done: "emerald",
}

const taskTone: Record<TaskTone, { chip: string; pill: string; dot: string }> = {
  emerald: { chip: "bg-emerald-500/12 text-emerald-400 ring-emerald-500/20", pill: "text-emerald-400", dot: "bg-emerald-500" },
  amber: { chip: "bg-amber-500/12 text-amber-400 ring-amber-500/20", pill: "text-amber-400", dot: "bg-amber-500" },
  sky: { chip: "bg-sky-500/12 text-sky-400 ring-sky-500/20", pill: "text-sky-400", dot: "bg-sky-500" },
}

const nextTaskStatus: Record<TaskStatus, TaskStatus> = {
  Pending: "In Progress",
  Scheduled: "In Progress",
  "In Progress": "Done",
  Done: "Done",
}

type BlockTone = "emerald" | "lime" | "amber"
const blocks: {
  block: string
  year: number
  palms: number
  ffb: number
  prod: number
  status: string
  tone: BlockTone
}[] = [
  { block: "Block A", year: 2011, palms: 138, ffb: 742, prod: 22.6, status: "Optimal", tone: "emerald" },
  { block: "Block B", year: 2013, palms: 136, ffb: 698, prod: 21.1, status: "Good", tone: "lime" },
  { block: "Block C", year: 2009, palms: 134, ffb: 654, prod: 19.4, status: "Below Target", tone: "amber" },
  { block: "Block D", year: 2015, palms: 140, ffb: 726, prod: 22.0, status: "Optimal", tone: "emerald" },
  { block: "Block E", year: 2012, palms: 137, ffb: 600, prod: 18.8, status: "Below Target", tone: "amber" },
]

const blockTone: Record<BlockTone, { text: string; dot: string }> = {
  emerald: { text: "text-emerald-400", dot: "bg-emerald-500" },
  lime: { text: "text-lime-400", dot: "bg-lime-500" },
  amber: { text: "text-amber-400", dot: "bg-amber-500" },
}

const HARVEST_PERIODS = ["YTD 2026", "Last 6 months", "Last 12 months", "Last quarter"] as const
const BLOCK_FILTERS = ["All", "Optimal", "Good", "Below Target"] as const

export default function AgriculturePage() {
  const [tasks, setTasks] = useState(initialTasks)
  const [period, setPeriod] = useState<(typeof HARVEST_PERIODS)[number]>(HARVEST_PERIODS[0])
  const [periodOpen, setPeriodOpen] = useState(false)
  const [blockFilter, setBlockFilter] = useState<(typeof BLOCK_FILTERS)[number]>("All")

  const visibleBlocks = useMemo(
    () => (blockFilter === "All" ? blocks : blocks.filter((b) => b.status === blockFilter)),
    [blockFilter]
  )

  const advanceTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t
        const status = nextTaskStatus[t.status]
        toast.success(`${t.task} · ${status}`)
        return { ...t, status }
      })
    )
  }

  const addTask = () => {
    const id = `t${Date.now()}`
    setTasks((prev) => [
      ...prev,
      { id, task: "Weeding", block: "Block B", date: "15 Sep", status: "Pending", icon: LeafIcon },
    ])
    toast.success("Tugas baru ditambahkan")
  }

  const exportReport = () => {
    const id = toast.loading("Membuat laporan…")
    setTimeout(() => toast.success("Laporan siap diunduh", { id }), 900)
  }

  return (
    <PeatShell title="Agriculture" subtitle="Plantation Operations & Productivity">
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => toast.info("Menyegarkan data…")}
          className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12px] font-medium text-white/70 transition-colors hover:bg-white/[0.06]"
        >
          Refresh
        </button>
        <button
          type="button"
          onClick={exportReport}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-[12px] font-medium text-emerald-400 ring-1 ring-emerald-500/30 transition-colors hover:bg-emerald-500/25"
        >
          <DownloadIcon className="size-3.5" />
          Export
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <StatTile key={k.label} {...k} />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Monthly FFB Harvest (t)"
            subtitle="Jan – Sep 2026"
            action={
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPeriodOpen((o) => !o)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11.5px] font-medium text-white/70 transition-colors hover:bg-white/[0.06]"
                >
                  {period}
                  <ChevronDownIcon className="size-3.5" />
                </button>
                {periodOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setPeriodOpen(false)} />
                    <div className="absolute right-0 z-50 mt-1 min-w-full overflow-hidden rounded-lg border border-white/10 bg-[#10201a] py-1 shadow-xl">
                      {HARVEST_PERIODS.map((o) => (
                        <button
                          key={o}
                          type="button"
                          onClick={() => {
                            setPeriod(o)
                            setPeriodOpen(false)
                            toast("Periode: " + o)
                          }}
                          className="block w-full whitespace-nowrap px-3 py-2 text-left text-[12.5px] text-white/75 hover:bg-white/5"
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
          <div className="h-[200px] px-1 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyHarvest} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis domain={[2400, 3800]} {...axisProps} width={40} />
                <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="t" name="FFB (t)" fill="#84cc16" radius={[3, 3, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Yield Trend (t/ha)" subtitle="Trailing 12 months" action={<ViewAll />} />
          <div className="h-[200px] px-1 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yieldTrend} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis domain={[18, 23]} {...axisProps} width={34} ticks={[18, 19, 20, 21, 22, 23]} />
                <ReferenceArea y1={21} y2={23} fill="#22c55e" fillOpacity={0.06} />
                <ReferenceLine
                  y={21}
                  stroke="#22c55e"
                  strokeDasharray="4 3"
                  strokeOpacity={0.6}
                  label={{ value: "Target 21 t/ha", position: "insideTopLeft", fontSize: 9, fill: "#34d399" }}
                />
                <Tooltip {...tooltipStyle} />
                <Line
                  dataKey="v"
                  name="Yield (t/ha)"
                  type="monotone"
                  stroke="#22c55e"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#22c55e" }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Panel className="xl:col-span-2">
          <PanelHeader
            title="Upcoming Tasks"
            subtitle="Field operations schedule"
            action={
              <button
                type="button"
                onClick={addTask}
                className="inline-flex items-center gap-1 text-[11.5px] font-medium text-emerald-400 transition-colors hover:text-emerald-300"
              >
                <PlusIcon className="size-3.5" />
                Add task
              </button>
            }
          />
          <div className="flex flex-col px-2 pb-2">
            {tasks.map((t) => {
              const tone = taskStatusTone[t.status]
              const s = taskTone[tone]
              const Icon = t.icon
              const done = t.status === "Done"
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-white/[0.03]"
                >
                  <span className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-lg ring-1", s.chip)}>
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium text-white/85">{t.task}</p>
                    <p className="text-[11px] text-white/45">
                      {t.block} · {t.date}
                    </p>
                  </div>
                  <span className={cn("inline-flex items-center gap-1.5 text-[11.5px] font-medium", s.pill)}>
                    <span className={cn("size-1.5 rounded-full", s.dot)} />
                    {t.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => advanceTask(t.id)}
                    disabled={done}
                    className={cn(
                      "inline-flex size-7 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/60 transition-colors",
                      done ? "cursor-default opacity-40" : "hover:bg-white/[0.06] hover:text-emerald-400"
                    )}
                    aria-label="Advance task status"
                  >
                    <CheckIcon className="size-3.5" />
                  </button>
                </div>
              )
            })}
            <div className="flex items-center gap-2 px-2 pt-2 text-[11px] text-white/40">
              <ClockIcon className="size-3.5" />
              <span>{tasks.length} tasks across {new Set(tasks.map((t) => t.block)).size} blocks this week</span>
            </div>
          </div>
        </Panel>

        <Panel className="xl:col-span-3">
          <PanelHeader
            title="Block Productivity"
            subtitle="Active estate blocks"
            action={
              <div className="flex items-center gap-1">
                {BLOCK_FILTERS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setBlockFilter(f)}
                    className={cn(
                      "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                      blockFilter === f
                        ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                        : "text-white/45 hover:text-white/70"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            }
          />
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className={th}>Block</th>
                <th className={th}>Planting Year</th>
                <th className={th}>Palms/ha</th>
                <th className={cn(th, "text-right")}>FFB (t)</th>
                <th className={cn(th, "text-right")}>Productivity</th>
                <th className={cn(th, "text-right")}>Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleBlocks.map((b) => {
                const s = blockTone[b.tone]
                return (
                  <tr
                    key={b.block}
                    onClick={() =>
                      toast(b.block, {
                        description: `${b.prod.toFixed(1)} t/ha · ${b.status} · ${b.ffb.toLocaleString()} t FFB`,
                      })
                    }
                    className="cursor-pointer border-t border-white/5 hover:bg-white/[0.03]"
                  >
                    <td className={cn(td, "font-medium text-white/85")}>{b.block}</td>
                    <td className={cn(td, "text-white/55")}>{b.year}</td>
                    <td className={cn(td, "text-white/70")}>{b.palms}</td>
                    <td className={cn(td, "text-right text-white/70")}>{b.ffb.toLocaleString()}</td>
                    <td className={cn(td, "text-right font-medium", s.text)}>{b.prod.toFixed(1)} t/ha</td>
                    <td className={cn(td, "text-right")}>
                      <span className={cn("inline-flex items-center gap-1.5 text-[11.5px] font-medium", s.text)}>
                        <span className={cn("size-1.5 rounded-full", s.dot)} />
                        {b.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {visibleBlocks.length === 0 && (
                <tr className="border-t border-white/5">
                  <td className={cn(td, "text-white/40")} colSpan={6}>
                    Tidak ada blok untuk filter ini.
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
