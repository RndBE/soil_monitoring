"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  DownloadIcon,
  DropletIcon,
  GaugeIcon,
  LeafIcon,
  PlusIcon,
  RefreshCwIcon,
  ScissorsIcon,
  SprayCanIcon,
  SproutIcon,
  TractorIcon,
  TruckIcon,
  UsersIcon,
  WavesIcon,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Panel, PanelHeader, TableScroll, ViewAll, tableRow, tableTd, tableTh } from "@/components/peatland/panel"
import { PeatShell } from "@/components/peatland/peat-shell"
import { StatTile } from "@/components/peatland/stat-tile"
import { axisProps, gridProps, tooltipStyle, withUnit } from "@/components/peatland/chart-theme"
import { OpenInTwin } from "@/components/peatland/open-in-twin"
import {
  LIVE_GATE_OPENING,
  SCENARIO_PRESETS,
  getBlockBaseline,
  recommendGateOpening,
  simulateScenario,
} from "@/lib/peatland/digital-twin"
import { dashboardMeta, plantationHealth } from "@/lib/peatland/mock-data"
import { stationsOfType, type TwinLink } from "@/lib/peatland/stations"
import { useDashboardFilters } from "@/lib/peatland/filters"
import { ALL_BLOCKS, matchesBlock, scaleNumber } from "@/lib/peatland/filter-logic"
import { cn } from "@/lib/utils"

// Data operasional per block. NDVI & luas dari mock plantationHealth; yield
// (t/ha/tahun, 12 bulan berjalan) selaras NDVI (NDVI rendah ↔ yield rendah) dan
// SAMA dengan halaman Plantation Health. palms = pokok/ha (tidak diskalakan).
const BLOCK_OPS: Record<
  string,
  { year: number; palms: number; prodArea: number; yield: number; fert: number; crews: number }
> = {
  "Block A": { year: 2011, palms: 138, prodArea: 1100, yield: 24.6, fert: 88, crews: 3 },
  "Block B": { year: 2013, palms: 136, prodArea: 1030, yield: 22.6, fert: 84, crews: 2 },
  "Block C": { year: 2009, palms: 134, prodArea: 1120, yield: 19.6, fert: 79, crews: 3 },
  "Block D": { year: 2015, palms: 140, prodArea: 950, yield: 16.5, fert: 72, crews: 2 },
  "Block E": { year: 2012, palms: 137, prodArea: 1040, yield: 23.4, fert: 86, crews: 2 },
}

const YIELD_TARGET = 21
const OER = 22.8
// Data live 10 Sep 2024 → month-to-date = 1–10 Sep.
const MTD_DAYS = 10

// Tren yield estate (t/ha, disetahunkan per bulan) Okt 2023 – Sep 2024. Dipakai
// sebagai rasio terhadap bulan kini agar grafik, KPI, dan tabel satu sumber.
const MONTHS: { month: string; label: string; days: number; yield: number }[] = [
  { month: "Oct", label: "Oct 2023", days: 31, yield: 19.2 },
  { month: "Nov", label: "Nov 2023", days: 30, yield: 19.6 },
  { month: "Dec", label: "Dec 2023", days: 31, yield: 19.1 },
  { month: "Jan", label: "Jan 2024", days: 31, yield: 19.8 },
  { month: "Feb", label: "Feb 2024", days: 29, yield: 20.2 },
  { month: "Mar", label: "Mar 2024", days: 31, yield: 20.6 },
  { month: "Apr", label: "Apr 2024", days: 30, yield: 20.4 },
  { month: "May", label: "May 2024", days: 31, yield: 21.0 },
  { month: "Jun", label: "Jun 2024", days: 30, yield: 21.5 },
  { month: "Jul", label: "Jul 2024", days: 31, yield: 21.2 },
  { month: "Aug", label: "Aug 2024", days: 31, yield: 21.0 },
  { month: "Sep", label: "Sep 2024", days: 30, yield: 21.4 },
]
const LAST = MONTHS.length - 1
const ratio = (i: number) => MONTHS[i].yield / MONTHS[LAST].yield

// Periode grafik panen = potongan indeks bulan [from, to).
const HARVEST_PERIODS = [
  { key: "YTD 2024", from: 3, to: 12, sub: "Jan – Sep 2024" },
  { key: "Last 6 months", from: 6, to: 12, sub: "Apr – Sep 2024" },
  { key: "Last 12 months", from: 0, to: 12, sub: "Oct 2023 – Sep 2024" },
  { key: "Last quarter", from: 6, to: 9, sub: "Q2 2024 · Apr – Jun" },
] as const
type HarvestPeriod = (typeof HARVEST_PERIODS)[number]["key"]

type BlockStatus = "Optimal" | "Good" | "Below Target"
const BLOCK_FILTERS = ["All", "Optimal", "Good", "Below Target"] as const
const statusOf = (prod: number): BlockStatus => (prod >= 23 ? "Optimal" : prod >= YIELD_TARGET ? "Good" : "Below Target")
const blockTone: Record<BlockStatus, { text: string; dot: string }> = {
  Optimal: { text: "text-emerald-400", dot: "bg-emerald-500" },
  Good: { text: "text-lime-400", dot: "bg-lime-500" },
  "Below Target": { text: "text-amber-400", dot: "bg-amber-500" },
}
const HEALTH_TEXT: Record<string, string> = {
  "very-good": "text-emerald-400",
  good: "text-lime-400",
  moderate: "text-amber-400",
  poor: "text-red-400",
}

type TaskTone = "emerald" | "amber" | "sky"
type TaskStatus = "Pending" | "Scheduled" | "In Progress" | "Done"

type Task = {
  id: string
  task: string
  block: string
  date: string
  status: TaskStatus
  icon: LucideIcon
  note?: string
  /** Block yang terkait (untuk filter division); default [block]. */
  scope?: string[]
  twin?: TwinLink
}

const initialTasks: Task[] = [
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

// Horizon rekomendasi pintu air dari twin (skenario baseline).
const TWIN_DAYS = 7
const TWIN_TASK_ID = "twin-gate"
const fmtCm = (v: number) => `${v < 0 ? "−" : ""}${Math.abs(v)} cm`

const round1 = (v: number) => Math.round(v * 10) / 10

export default function AgriculturePage() {
  const { estate, division } = useDashboardFilters()
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [twinStatus, setTwinStatus] = useState<TaskStatus>("Pending")
  const [period, setPeriod] = useState<HarvestPeriod>(HARVEST_PERIODS[0].key)
  const [periodOpen, setPeriodOpen] = useState(false)
  const [blockFilter, setBlockFilter] = useState<(typeof BLOCK_FILTERS)[number]>("All")
  const [refreshing, setRefreshing] = useState(false)
  const [synced, setSynced] = useState(false)

  // Baris block: produktivitas diskalakan faktor estate (sama dengan Plantation Health),
  // FFB MTD = yield × luas produktif × 10/365.
  const rows = useMemo(
    () =>
      plantationHealth.map((p) => {
        const o = BLOCK_OPS[p.block]
        const prod = scaleNumber(o.yield, estate, 1)
        return {
          ...o,
          block: p.block,
          area: p.area,
          ndvi: p.ndvi,
          health: p.health,
          healthTone: p.healthTone,
          prod,
          ffb: Math.round((prod * o.prodArea * MTD_DAYS) / 365),
          status: statusOf(prod),
        }
      }),
    [estate]
  )
  const divRows = useMemo(() => rows.filter((r) => matchesBlock(r.block, division)), [rows, division])
  const visibleBlocks = divRows.filter((b) => blockFilter === "All" || b.status === blockFilter)

  // KPI dari baris block yang lolos filter division.
  const sum = (pick: (r: (typeof rows)[number]) => number) => divRows.reduce((a, r) => a + pick(r), 0)
  const plantedArea = sum((r) => r.area)
  const prodArea = sum((r) => r.prodArea)
  const ffbMtd = sum((r) => r.ffb)
  const avgYield = plantedArea ? round1(sum((r) => r.prod * r.area) / plantedArea) : 0
  const fert = prodArea ? Math.round(sum((r) => r.fert * r.prodArea) / prodArea) : 0
  const crews = sum((r) => r.crews)

  // Panen bulanan (t): bulan penuh = yield × rasio bulan × luas produktif × hari/365; Sep = MTD.
  const harvest = useMemo(
    () =>
      MONTHS.map((m, i) => {
        const mtd = i === LAST
        const t = mtd
          ? divRows.reduce((a, r) => a + r.ffb, 0)
          : Math.round(divRows.reduce((a, r) => a + (r.prod * ratio(i) * r.prodArea * m.days) / 365, 0))
        return { month: m.month, label: mtd ? "Sep 2024 · MTD 1–10 Sep" : m.label, t, mtd }
      }),
    [divRows]
  )
  const periodDef = HARVEST_PERIODS.find((p) => p.key === period) ?? HARVEST_PERIODS[0]
  const harvestSlice = harvest.slice(periodDef.from, periodDef.to)
  const periodTotal = harvestSlice.reduce((a, m) => a + m.t, 0)
  const augMtd = Math.round((harvest[LAST - 1].t * MTD_DAYS) / MONTHS[LAST - 1].days)
  const ffbDelta = augMtd ? ((ffbMtd - augMtd) / augMtd) * 100 : 0

  const yieldTrend = useMemo(
    () => MONTHS.map((m, i) => ({ month: m.month, label: m.label, v: round1(avgYield * ratio(i)) })),
    [avgYield]
  )
  const yieldDelta = round1(yieldTrend[LAST].v - yieldTrend[LAST - 1].v)
  const yieldDomain = useMemo<[number, number]>(() => {
    const vals = yieldTrend.map((d) => d.v)
    return [Math.floor(Math.min(...vals, YIELD_TARGET) - 0.5), Math.ceil(Math.max(...vals, YIELD_TARGET) + 0.5)]
  }, [yieldTrend])

  // Tugas dari digital twin: rekomendasi bukaan pintu air skenario baseline 7 hari.
  const twinTask = useMemo<Task>(() => {
    const baseline = getBlockBaseline(estate)
    const scenario = { ...SCENARIO_PRESETS[0].scenario, days: TWIN_DAYS }
    const rec = recommendGateOpening(baseline, scenario)
    const asIs = simulateScenario(baseline, scenario).at(-1)?.blocks[rec.worstBlock]?.waterTable ?? rec.worstLevel
    const gates = stationsOfType("water-gate").filter((s) => s.level !== "offline")
    const codes = gates.map((s) => s.code).join("/")
    const end = `${10 + TWIN_DAYS} Sep`
    return {
      id: TWIN_TASK_ID,
      task: rec.gateOpening === 0 ? `Close ${codes} (0%)` : `Set ${codes} to ${rec.gateOpening}%`,
      block: rec.worstBlock,
      date: "10 Sep",
      status: twinStatus,
      icon: WavesIcon,
      note:
        `Twin: at ${LIVE_GATE_OPENING}% ${rec.worstBlock} hits ${fmtCm(asIs)} by ${end}; ${rec.gateOpening}% → ${fmtCm(rec.worstLevel)}` +
        (rec.feasible ? "" : " · still below −40 cm, add canal blocking"),
      scope: [rec.worstBlock, ...gates.map((s) => s.block)],
      twin: { block: rec.worstBlock, layer: "waterTable", scenario: "baseline" },
    }
  }, [estate, twinStatus])

  const visibleTasks = useMemo(
    () => [twinTask, ...tasks].filter((t) => (t.scope ?? [t.block]).some((b) => matchesBlock(b, division))),
    [twinTask, tasks, division]
  )

  const advanceTask = (t: Task) => {
    const status = nextTaskStatus[t.status]
    if (t.id === TWIN_TASK_ID) setTwinStatus(status)
    else setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, status } : x)))
    toast.success(`${t.task} · ${status}`)
  }

  const addTask = () => {
    const id = `t${Date.now()}`
    setTasks((prev) => [...prev, { id, task: "Weeding", block: "Block B", date: "15 Sep", status: "Pending", icon: LeafIcon }])
    toast.success("Tugas baru ditambahkan")
  }

  const refresh = () => {
    if (refreshing) return
    setRefreshing(true)
    setTimeout(() => {
      setRefreshing(false)
      setSynced(true)
      toast.success("Data operasional disinkronkan", { description: dashboardMeta.lastUpdate })
    }, 800)
  }

  const exportReport = () => {
    const id = toast.loading("Membuat laporan…")
    setTimeout(() => toast.success("Laporan siap diunduh", { id }), 900)
  }

  const scopeLabel = division === ALL_BLOCKS ? "All Blocks" : division
  const fmtT = (v: unknown) => `${Number(v).toLocaleString("en-US")} t`

  return (
    <PeatShell title="Agriculture" subtitle="Plantation Operations & Productivity">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile
          label="FFB Harvest (MTD)"
          value={ffbMtd.toLocaleString("en-US")}
          unit="t"
          tone="normal"
          icon={TruckIcon}
          spark={harvest.slice(LAST - 6, LAST).map((m) => m.t)}
          delta={{ text: `${ffbDelta >= 0 ? "+" : "−"}${Math.abs(ffbDelta).toFixed(1)}%`, dir: ffbDelta >= 0 ? "up" : "down", good: ffbDelta >= 0, vs: "vs 1–10 Aug" }}
        />
        <StatTile
          label="Yield"
          value={avgYield.toFixed(1)}
          unit="t/ha"
          tone={avgYield >= YIELD_TARGET ? "normal" : "warning"}
          icon={SproutIcon}
          spark={yieldTrend.slice(-6).map((d) => d.v)}
          delta={{ text: `${yieldDelta >= 0 ? "+" : "−"}${Math.abs(yieldDelta).toFixed(1)} t/ha`, dir: yieldDelta >= 0 ? "up" : "down", good: yieldDelta >= 0, vs: "vs Aug" }}
          href="/plantation-health"
        />
        <StatTile
          label="Fertilizer Applied"
          value={String(fert)}
          unit="%"
          tone={fert >= 80 ? "normal" : "warning"}
          icon={DropletIcon}
          foot={`${divRows.filter((r) => r.fert >= 80).length}/${divRows.length} blocks ≥ 80% · Sep program`}
        />
        <StatTile
          label="Productive Area"
          value={prodArea.toLocaleString("en-US")}
          unit="ha"
          tone="info"
          icon={LeafIcon}
          foot={`of ${plantedArea.toLocaleString("en-US")} ha planted`}
          href="/map-view"
        />
        <StatTile label="Harvest Crews" value={String(crews)} tone="info" icon={UsersIcon} foot={`${divRows.length} blocks · this week`} />
        <StatTile
          label="OER"
          value={OER.toFixed(1)}
          unit="%"
          tone="normal"
          icon={GaugeIcon}
          delta={{ text: "+0.3 pts", dir: "up", good: true, vs: "vs Aug" }}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel>
          <PanelHeader
            kicker="Panen · TBS"
            icon={TruckIcon}
            title="Monthly FFB Harvest (t)"
            subtitle={`${periodDef.sub} · total ${periodTotal.toLocaleString("en-US")} t${periodDef.to > LAST ? " · Sep = MTD" : ""}`}
            action={
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPeriodOpen((o) => !o)}
                  aria-expanded={periodOpen}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11.5px] font-medium text-white/70 transition-colors hover:bg-white/[0.06]"
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
                          key={o.key}
                          type="button"
                          onClick={() => {
                            setPeriod(o.key)
                            setPeriodOpen(false)
                          }}
                          className={cn(
                            "block w-full whitespace-nowrap px-3 py-2 text-left text-[12.5px] hover:bg-white/5",
                            o.key === period ? "text-emerald-300" : "text-white/75"
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
          <div className="h-[220px] px-1 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={harvestSlice} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis
                  {...axisProps}
                  width={48}
                  tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k t` : `${v} t`)}
                />
                <Tooltip
                  {...tooltipStyle}
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  formatter={fmtT}
                  labelFormatter={(_, p) => (p?.[0]?.payload as { label?: string } | undefined)?.label ?? ""}
                />
                <Bar dataKey="t" name="FFB" radius={[3, 3, 0, 0]} barSize={22}>
                  {harvestSlice.map((m) => (
                    <Cell key={m.month} fill="#84cc16" fillOpacity={m.mtd ? 0.45 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            kicker="Produksi · yield"
            icon={SproutIcon}
            title="Yield Trend (t/ha)"
            subtitle={`Trailing 12 months · ${scopeLabel} · target ${YIELD_TARGET} t/ha`}
            action={<ViewAll href="/plantation-health" label="By block" />}
          />
          <div className="h-[220px] px-1 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yieldTrend} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis domain={yieldDomain} {...axisProps} width={52} allowDecimals={false} tickFormatter={(v: number) => `${v} t/ha`} />
                <ReferenceArea y1={YIELD_TARGET} y2={yieldDomain[1]} fill="#22c55e" fillOpacity={0.06} ifOverflow="hidden" />
                <ReferenceLine
                  y={YIELD_TARGET}
                  stroke="#22c55e"
                  strokeDasharray="4 3"
                  strokeOpacity={0.7}
                  label={{ value: `Target ${YIELD_TARGET} t/ha`, position: "insideTopLeft", fontSize: 9, fill: "#34d399" }}
                />
                <Tooltip
                  {...tooltipStyle}
                  formatter={withUnit("t/ha")}
                  labelFormatter={(_, p) => (p?.[0]?.payload as { label?: string } | undefined)?.label ?? ""}
                />
                <Line
                  dataKey="v"
                  name="Yield"
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
            kicker="Lapangan · jadwal"
            icon={ClockIcon}
            title="Upcoming Tasks"
            subtitle="Field operations schedule · 10–15 Sep 2024"
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
            {visibleTasks.length === 0 && (
              <div className="px-2 py-6 text-center text-[12px] text-white/50">Tidak ada tugas di {division}.</div>
            )}
            {visibleTasks.map((t) => {
              const s = taskTone[taskStatusTone[t.status]]
              const Icon = t.icon
              const done = t.status === "Done"
              const fromTwin = t.id === TWIN_TASK_ID
              return (
                <div
                  key={t.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-white/[0.03]",
                    fromTwin && "bg-emerald-400/[0.04] ring-1 ring-emerald-400/15"
                  )}
                >
                  <span className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-lg ring-1", s.chip)}>
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-[12.5px] font-medium text-white/85">
                      {fromTwin && (
                        <span className="inline-flex shrink-0 items-center gap-0.5 rounded border border-emerald-400/30 px-1 font-mono text-[9px] font-bold uppercase text-emerald-300">
                          <BoxIcon className="size-2.5" />
                          Twin
                        </span>
                      )}
                      <span className="truncate">{t.task}</span>
                    </p>
                    <p className="text-[11px] text-white/50">
                      {t.block} · {t.date}
                    </p>
                    {t.note && <p className="mt-0.5 text-[11px] leading-snug text-white/55">{t.note}</p>}
                  </div>
                  <span className={cn("hidden items-center gap-1.5 whitespace-nowrap text-[11.5px] font-medium sm:inline-flex", s.pill)}>
                    <span className={cn("size-1.5 rounded-full", s.dot)} />
                    {t.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => advanceTask(t)}
                    disabled={done}
                    title={done ? "Done" : `Mark as ${nextTaskStatus[t.status]}`}
                    className={cn(
                      "inline-flex size-7 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/60 transition-colors",
                      done ? "cursor-default opacity-40" : "hover:bg-white/[0.06] hover:text-emerald-400"
                    )}
                    aria-label="Advance task status"
                  >
                    <CheckIcon className="size-3.5" />
                  </button>
                  <OpenInTwin variant="icon" {...(t.twin ?? { block: t.block })} />
                </div>
              )
            })}
            <div className="flex items-center gap-2 px-2 pt-2 text-[11px] text-white/50">
              <ClockIcon className="size-3.5" />
              <span>
                {visibleTasks.length} tasks across {new Set(visibleTasks.map((t) => t.block)).size} blocks this week
              </span>
            </div>
          </div>
        </Panel>

        <Panel className="xl:col-span-3">
          <PanelHeader
            kicker="Operasional · block"
            icon={TractorIcon}
            title="Block Productivity"
            subtitle={`FFB MTD 1–10 Sep 2024 · ${synced ? "synced just now" : `updated ${dashboardMeta.lastUpdate}`}`}
            action={
              <>
                <button
                  type="button"
                  onClick={refresh}
                  disabled={refreshing}
                  aria-label="Refresh"
                  title="Refresh"
                  className="inline-flex size-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-white/70 transition-colors hover:bg-white/[0.06] disabled:opacity-60"
                >
                  <RefreshCwIcon className={cn("size-3.5", refreshing && "animate-spin")} />
                </button>
                <button
                  type="button"
                  onClick={exportReport}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-[11.5px] font-medium text-emerald-400 ring-1 ring-emerald-500/30 transition-colors hover:bg-emerald-500/25"
                >
                  <DownloadIcon className="size-3.5" />
                  Export
                </button>
              </>
            }
          />
          <div className="flex flex-wrap items-center gap-1 px-4 pb-2">
            {BLOCK_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setBlockFilter(f)}
                aria-pressed={blockFilter === f}
                className={cn(
                  "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                  blockFilter === f ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30" : "text-white/55 hover:text-white/80"
                )}
              >
                {f}
                <span className="ml-1 tabular-nums text-white/50">
                  {f === "All" ? divRows.length : divRows.filter((r) => r.status === f).length}
                </span>
              </button>
            ))}
          </div>
          <TableScroll>
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr>
                  <th className={tableTh}>Block</th>
                  <th className={tableTh}>Planting Year</th>
                  <th className={tableTh}>Palms/ha</th>
                  <th className={tableTh}>NDVI</th>
                  <th className={cn(tableTh, "text-right")}>FFB MTD (t)</th>
                  <th className={cn(tableTh, "text-right")}>Productivity</th>
                  <th className={cn(tableTh, "text-right")}>Status</th>
                  <th className={cn(tableTh, "text-right")}>Twin</th>
                </tr>
              </thead>
              <tbody>
                {visibleBlocks.map((b) => {
                  const s = blockTone[b.status]
                  return (
                    <tr key={b.block} className={tableRow}>
                      <td className={cn(tableTd, "whitespace-nowrap font-medium text-white/90")}>{b.block}</td>
                      <td className={cn(tableTd, "text-white/60")}>{b.year}</td>
                      <td className={cn(tableTd, "tabular-nums text-white/75")}>{b.palms}</td>
                      <td className={cn(tableTd, "whitespace-nowrap")}>
                        <Link href="/plantation-health" className="hover:underline">
                          <span className="font-mono tabular-nums text-white/85">{b.ndvi.toFixed(2)}</span>
                          <span className={cn("ml-1.5 text-[11px] font-medium", HEALTH_TEXT[b.healthTone])}>{b.health}</span>
                        </Link>
                      </td>
                      <td className={cn(tableTd, "text-right tabular-nums text-white/75")}>{b.ffb.toLocaleString("en-US")}</td>
                      <td className={cn(tableTd, "whitespace-nowrap text-right font-medium tabular-nums", s.text)}>{b.prod.toFixed(1)} t/ha</td>
                      <td className={cn(tableTd, "text-right")}>
                        <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-[11.5px] font-medium", s.text)}>
                          <span className={cn("size-1.5 rounded-full", s.dot)} />
                          {b.status}
                        </span>
                      </td>
                      <td className={cn(tableTd, "text-right")}>
                        <OpenInTwin variant="icon" block={b.block} layer="ndvi" />
                      </td>
                    </tr>
                  )
                })}
                {visibleBlocks.length === 0 && (
                  <tr className="border-t border-white/[0.06]">
                    <td className={cn(tableTd, "text-white/50")} colSpan={8}>
                      {division === ALL_BLOCKS ? "Tidak ada block untuk filter ini." : `Tidak ada data di ${division}.`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableScroll>
        </Panel>
      </div>
    </PeatShell>
  )
}
