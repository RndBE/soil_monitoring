"use client"

import {
  ActivityIcon,
  BoxIcon,
  ChevronDownIcon,
  DownloadIcon,
  GaugeIcon,
  LayersIcon,
  RadioTowerIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  TrendingDownIcon,
} from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
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

import { axisProps, gridProps, tooltipStyle, withUnit } from "@/components/peatland/chart-theme"
import { OpenInTwin } from "@/components/peatland/open-in-twin"
import { Panel, PanelHeader, TableScroll, ViewAll, tableRow, tableTd, tableTh } from "@/components/peatland/panel"
import { PeatShell } from "@/components/peatland/peat-shell"
import { StatTile } from "@/components/peatland/stat-tile"
import { EwsPill, type Tone } from "@/components/peatland/status"
import {
  BLOCK_COLOR,
  EWS_META,
  SCENARIO_PRESETS,
  TWIN_BLOCKS,
  WT_COMPLIANCE,
  WT_CRITICAL,
  WT_TARGET,
  buildHistoryFrames,
  ewsFromWaterTable,
  getBlockBaseline,
  simulateScenario,
  subsidenceRate,
  summarizeFrame,
  type EwsLevel,
} from "@/lib/peatland/digital-twin"
import { useDashboardFilters } from "@/lib/peatland/filters"
import { ALL_BLOCKS, matchesBlock, scaleNumber } from "@/lib/peatland/filter-logic"
import { stationByCode } from "@/lib/peatland/stations"
import { cn } from "@/lib/utils"

const round1 = (v: number) => Math.round(v * 10) / 10
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
/** Angka dengan minus tipografis, mis. "−62". */
const fmtNum = (v: number) => `${v < 0 ? "−" : ""}${Math.abs(round1(v))}`

// Laju subsidence setara ambang muka air (model twin: cm/tahun = −muka air / 10).
const RATE_TARGET = subsidenceRate(WT_TARGET) // 3 cm/thn ↔ −30 cm
const RATE_PP57 = subsidenceRate(WT_COMPLIANCE) // 4 cm/thn ↔ −40 cm (PP 57/2016)
const RATE_AWAS = subsidenceRate(WT_CRITICAL) // 6 cm/thn ↔ −60 cm

/** Level EWS laju subsidence, selaras dengan ambang muka air. */
function rateLevel(rate: number): EwsLevel {
  if (rate <= RATE_TARGET) return "normal"
  if (rate < RATE_PP57) return "waspada"
  if (rate < RATE_AWAS) return "siaga"
  return "awas"
}

const YEARS = ["2019", "2020", "2021", "2022", "2023", "2024"]
// Selisih muka air rata-rata tahunan (cm) terhadap muka air live twin, 2020–2024 (2024 = live).
const ANNUAL_WT_OFFSET: Record<string, number[]> = {
  "Block A": [2, 4, -1, 3, 0],
  "Block B": [3, 0, -2, 2, 0],
  "Block C": [10, 7, 4, 3, 0],
  "Block D": [6, 4, 1, 3, 0],
  "Block E": [1, 3, -2, 2, 0],
}

type BlockSeries = {
  block: string
  waterTable: number
  /** Laju tahunan 2020–2024 (cm/tahun). */
  rates: number[]
  /** Kumulatif 2019–2024 (cm), 2019 = 0. */
  cumulative: number[]
  rate: number
}

// Laju tiap tahun dari muka air rata-rata tahunan lewat model twin; kumulatif = jumlah berjalan.
function buildBlockSeries(estate: string): BlockSeries[] {
  const baseline = getBlockBaseline(estate)
  return TWIN_BLOCKS.map((block) => {
    const waterTable = baseline.find((b) => b.block === block)?.waterTable ?? WT_TARGET
    const rates = (ANNUAL_WT_OFFSET[block] ?? [0, 0, 0, 0, 0]).map((o) => subsidenceRate(waterTable + o))
    const cumulative = [0]
    for (const r of rates) cumulative.push(round1(cumulative[cumulative.length - 1] + r))
    return { block, waterTable, rates, cumulative, rate: rates[rates.length - 1] }
  })
}

// Tiang pantau subsidence; muka air diambil dari borehole acuan terdekat di registri stasiun.
const POLES = [
  { pole: "SUB-01", block: "Block A", ref: "BH-03", dev: 0.1 },
  { pole: "SUB-02", block: "Block A", ref: "BH-02", dev: -0.1 },
  { pole: "SUB-03", block: "Block B", ref: "BH-01", dev: 0.1 },
  { pole: "SUB-04", block: "Block B", ref: "BH-04", dev: 0.1 },
  { pole: "SUB-05", block: "Block C", ref: "BH-07", dev: 0.2 },
  { pole: "SUB-06", block: "Block C", ref: "BH-11", dev: -0.1 },
  { pole: "SUB-07", block: "Block D", ref: "BH-12", dev: 0.1 },
  { pole: "SUB-08", block: "Block D", ref: "BH-12", dev: -0.2 },
  { pole: "SUB-09", block: "Block E", ref: "BH-15", dev: -0.1 },
  { pole: "SUB-10", block: "Block E", ref: "BH-09", dev: -0.1 },
]

type PoleRow = { pole: string; block: string; ref: string; waterTable: number; rate: number; cumulative: number; level: EwsLevel }

function buildPoles(estate: string, series: BlockSeries[]): PoleRow[] {
  return POLES.map((p) => {
    const waterTable = scaleNumber(stationByCode(p.ref)?.value ?? WT_TARGET, estate)
    // Hasil survei = laju model + simpangan kecil per tiang.
    const rate = round1(Math.max(0, subsidenceRate(waterTable) + p.dev))
    const s = series.find((b) => b.block === p.block)
    const cum = s ? s.cumulative[s.cumulative.length - 1] : 0
    const cumulative = s && s.rate > 0 ? round1((cum * rate) / s.rate) : cum
    return { pole: p.pole, block: p.block, ref: p.ref, waterTable, rate, cumulative, level: rateLevel(rate) }
  })
}

const PROJECTION_DAYS = 14
const presetOf = (key: string) => (SCENARIO_PRESETS.find((p) => p.key === key) ?? SCENARIO_PRESETS[0]).scenario

// Proyeksi twin 14 hari: muka air rata-rata (tertimbang luas) → laju subsidence, Baseline vs Rewetting.
function buildProjection(estate: string, blocks: string[]) {
  const baseline = getBlockBaseline(estate)
  const frames = buildHistoryFrames(baseline)
  const live = frames[frames.length - 1]
  const base = simulateScenario(baseline, { ...presetOf("baseline"), days: PROJECTION_DAYS })
  const rewet = simulateScenario(baseline, { ...presetOf("rewet"), days: PROJECTION_DAYS })
  const wt = (f: typeof live) => summarizeFrame(f, baseline, blocks).waterTable
  const liveWt = wt(live)
  const data = [
    { day: live.label, baseline: subsidenceRate(liveWt), rewet: subsidenceRate(liveWt) },
    ...base.map((f, i) => ({ day: f.label, baseline: subsidenceRate(wt(f)), rewet: subsidenceRate(wt(rewet[i])) })),
  ]
  const baseEndWt = wt(base[base.length - 1])
  const rewetEndWt = wt(rewet[rewet.length - 1])
  return {
    data,
    endDay: base[base.length - 1].label,
    baseEndWt,
    rewetEndWt,
    baseEnd: subsidenceRate(baseEndWt),
    rewetEnd: subsidenceRate(rewetEndWt),
  }
}

function LegendToggle({
  items,
  hidden,
  onToggle,
}: {
  items: string[]
  hidden: string[]
  onToggle: (block: string) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pb-1">
      {items.map((block) => {
        const on = !hidden.includes(block)
        return (
          <button
            key={block}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(block)}
            className={cn(
              "flex items-center gap-1.5 text-[10.5px] transition-colors",
              on ? "text-white/70 hover:text-white/90" : "text-white/50 line-through hover:text-white/70"
            )}
          >
            <span className="h-0.5 w-3.5 rounded-full" style={{ background: BLOCK_COLOR[block], opacity: on ? 1 : 0.3 }} />
            {block}
          </button>
        )
      })}
    </div>
  )
}

const exportFormats = ["PDF", "Excel", "CSV"] as const
type ExportFormat = (typeof exportFormats)[number]

/** Satu tombol Export dengan pilihan format. */
function ExportMenu({ onExport }: { onExport: (format: ExportFormat) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1.5 text-[11.5px] font-medium text-emerald-400 transition-colors hover:bg-emerald-500/25"
      >
        <DownloadIcon className="size-3.5" />
        Export
        <ChevronDownIcon className="size-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute right-0 z-50 mt-1 min-w-full overflow-hidden rounded-lg border border-white/10 bg-[#10201a] py-1 shadow-xl"
          >
            {exportFormats.map((o) => (
              <button
                key={o}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  onExport(o)
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
  )
}

type StatusFilter = "all" | EwsLevel

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "normal", label: "Normal" },
  { key: "waspada", label: "Waspada" },
  { key: "siaga", label: "Siaga" },
  { key: "awas", label: "Awas" },
]

export default function PeatSubsidencePage() {
  const { estate, division } = useDashboardFilters()
  const [hidden, setHidden] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  const series = useMemo(() => buildBlockSeries(estate), [estate])
  const poles = useMemo(() => buildPoles(estate, series), [estate, series])
  const visibleBlocks = useMemo(() => TWIN_BLOCKS.filter((b) => matchesBlock(b, division)), [division])
  const visibleSeries = useMemo(() => series.filter((s) => visibleBlocks.includes(s.block)), [series, visibleBlocks])
  const divisionPoles = useMemo(() => poles.filter((p) => matchesBlock(p.block, division)), [poles, division])
  const filteredPoles = useMemo(
    () => divisionPoles.filter((p) => statusFilter === "all" || p.level === statusFilter),
    [divisionPoles, statusFilter]
  )
  const projection = useMemo(() => buildProjection(estate, visibleBlocks), [estate, visibleBlocks])

  const cumulativeData = useMemo(
    () =>
      YEARS.map((year, i) => ({
        year,
        ...Object.fromEntries(visibleSeries.map((s) => [s.block, s.cumulative[i]])),
      })),
    [visibleSeries]
  )

  // KPI dihitung dari data grafik & tabel yang sama.
  const kpi = useMemo(() => {
    const rateNow = round1(avg(visibleSeries.map((s) => s.rate)))
    const ratePrev = round1(avg(visibleSeries.map((s) => s.rates[s.rates.length - 2])))
    const cumSpark = YEARS.map((_, i) => round1(avg(visibleSeries.map((s) => s.cumulative[i]))))
    const worst = [...visibleSeries].sort((a, b) => b.rate - a.rate)[0]
    const maxPole = divisionPoles.reduce<PoleRow | null>((a, b) => (!a || b.rate > a.rate ? b : a), null)
    const safe = divisionPoles.filter((p) => p.rate < RATE_PP57).length
    return {
      rateNow,
      rateDelta: round1(rateNow - ratePrev),
      rateSpark: [0, 1, 2, 3, 4].map((i) => round1(avg(visibleSeries.map((s) => s.rates[i])))),
      cumulative: cumSpark[cumSpark.length - 1],
      cumSpark,
      worst,
      maxPole,
      safe,
      safePct: divisionPoles.length ? Math.round((safe / divisionPoles.length) * 100) : 0,
    }
  }, [visibleSeries, divisionPoles])

  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = { all: divisionPoles.length }
    for (const p of divisionPoles) counts[p.level] = (counts[p.level] ?? 0) + 1
    return counts
  }, [divisionPoles])

  function toggleSeries(block: string) {
    setHidden((prev) => (prev.includes(block) ? prev.filter((b) => b !== block) : [...prev, block]))
  }

  function regenerateInsight() {
    const id = toast.loading("Memperbarui penilaian…")
    setTimeout(() => toast.success("Penilaian diperbarui", { id }), 900)
  }

  function exportReport(format: ExportFormat) {
    const id = toast.loading(`Membuat laporan ${format}…`)
    setTimeout(() => toast.success(`Laporan ${format} siap diunduh`, { id }), 900)
  }

  const rateTone = rateLevel(kpi.rateNow)
  const safeTone: Tone = kpi.safePct >= 80 ? "normal" : kpi.safePct >= 50 ? "warning" : "critical"
  const cumMax = Math.max(30, Math.ceil(Math.max(0, ...visibleSeries.map((s) => s.cumulative[s.cumulative.length - 1])) / 5) * 5)
  const overLimit = divisionPoles.filter((p) => p.rate >= RATE_PP57).length
  const avoided = round1(projection.baseEnd - projection.rewetEnd)
  const twinBlock = division === ALL_BLOCKS ? undefined : division

  return (
    <PeatShell title="Peat Subsidence" subtitle="Peat Surface Subsidence Monitoring">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatTile
          label="Avg Subsidence Rate"
          value={kpi.rateNow.toFixed(1)}
          unit="cm/yr"
          tone={rateTone}
          icon={TrendingDownIcon}
          status={`${EWS_META[rateTone].label} · PP 57 setara ${RATE_PP57} cm/yr`}
          spark={kpi.rateSpark}
          delta={
            kpi.rateDelta !== 0
              ? { text: `${Math.abs(kpi.rateDelta).toFixed(1)} cm/yr`, dir: kpi.rateDelta > 0 ? "up" : "down", good: kpi.rateDelta < 0, vs: "vs 2023" }
              : undefined
          }
          foot={kpi.rateDelta === 0 ? "Same as 2023" : undefined}
        />
        <StatTile
          label="Cumulative (since 2019)"
          value={kpi.cumulative.toFixed(1)}
          unit="cm"
          tone="warning"
          icon={LayersIcon}
          status={kpi.worst ? `Max ${kpi.worst.block} · ${kpi.worst.cumulative[kpi.worst.cumulative.length - 1]} cm` : undefined}
          spark={kpi.cumSpark}
          delta={{ text: `${kpi.rateNow.toFixed(1)} cm`, dir: "up", good: false, vs: "vs 2023" }}
        />
        <StatTile
          label="Max Rate Station"
          value={kpi.maxPole?.pole ?? "—"}
          unit={kpi.maxPole ? `${kpi.maxPole.rate.toFixed(1)} cm/yr` : undefined}
          tone={kpi.maxPole?.level ?? "offline"}
          icon={GaugeIcon}
          status={kpi.maxPole ? `${kpi.maxPole.block} · ${kpi.maxPole.ref} ${fmtNum(kpi.maxPole.waterTable)} cm` : undefined}
          foot={`Awas ≥ ${RATE_AWAS} cm/yr (−60 cm)`}
        />
        <StatTile
          label="Monitoring Poles"
          value={String(divisionPoles.length)}
          unit="active"
          tone="info"
          icon={RadioTowerIcon}
          foot="0 offline · survey 1 Sep 2024"
        />
        <StatTile
          label="Within Safe Limit"
          value={String(kpi.safePct)}
          unit="%"
          tone={safeTone}
          icon={ShieldCheckIcon}
          foot={`${kpi.safe} of ${divisionPoles.length} poles < ${RATE_PP57} cm/yr`}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel>
          <PanelHeader
            kicker="SURVEI · KUMULATIF"
            title="Cumulative Subsidence (cm)"
            subtitle={`${division === ALL_BLOCKS ? "By block" : division}, 2019 – 2024 · cm below 2019 surface`}
            action={<ViewAll href="/reports" />}
          />
          <LegendToggle items={visibleSeries.map((s) => s.block)} hidden={hidden} onToggle={toggleSeries} />
          <div className="h-[220px] px-1 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cumulativeData} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="year" {...axisProps} />
                <YAxis domain={[0, cumMax]} tickFormatter={(v: number) => `${v} cm`} {...axisProps} width={44} />
                <Tooltip {...tooltipStyle} formatter={withUnit("cm")} />
                {visibleSeries
                  .filter((s) => !hidden.includes(s.block))
                  .map((s) => (
                    <Line
                      key={s.block}
                      dataKey={s.block}
                      name={s.block}
                      type="monotone"
                      stroke={BLOCK_COLOR[s.block]}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: BLOCK_COLOR[s.block] }}
                      activeDot={{ r: 4 }}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            kicker="EWS · LAJU"
            title="Subsidence Rate by Block (cm/yr)"
            subtitle="2024 rate vs PP 57/2016 equivalent (−40 cm ↔ 4 cm/yr)"
            action={<ViewAll href="/borehole-monitoring" label="Water Table" />}
          />
          <div className="h-[220px] px-1 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="block" {...axisProps} />
                <YAxis domain={[0, 8]} tickFormatter={(v: number) => `${v}`} {...axisProps} width={28} />
                <Tooltip {...tooltipStyle} formatter={withUnit("cm/yr")} />
                <ReferenceLine
                  y={RATE_PP57}
                  stroke={EWS_META.siaga.color}
                  strokeDasharray="4 3"
                  strokeOpacity={0.7}
                  label={{ value: `PP 57 setara · ${RATE_PP57} cm/yr (−40 cm)`, position: "insideTopLeft", fontSize: 9, fill: EWS_META.siaga.color }}
                />
                <ReferenceLine
                  y={RATE_AWAS}
                  stroke={EWS_META.awas.color}
                  strokeDasharray="4 3"
                  strokeOpacity={0.7}
                  label={{ value: `Awas · ${RATE_AWAS} cm/yr (−60 cm)`, position: "insideTopLeft", fontSize: 9, fill: EWS_META.awas.color }}
                />
                <Bar dataKey="rate" name="Rate" radius={[3, 3, 0, 0]} maxBarSize={30}>
                  {series.map((s) => (
                    <Cell
                      key={s.block}
                      fill={EWS_META[rateLevel(s.rate)].color}
                      fillOpacity={matchesBlock(s.block, division) ? 0.9 : 0.25}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            kicker="ANALISIS · OTOMATIS"
            title="Insight"
            subtitle="Auto-generated assessment · live 10 Sep 2024"
            action={
              <>
                <ExportMenu onExport={exportReport} />
                <button
                  type="button"
                  onClick={regenerateInsight}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11.5px] font-medium text-white/70 transition-colors hover:bg-white/5"
                >
                  <RefreshCwIcon className="size-3.5" />
                  Regenerate
                </button>
              </>
            }
          />
          <div className="flex items-start gap-3 px-4 pb-4 pt-1">
            <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/12 text-amber-400 ring-1 ring-amber-500/20">
              <ActivityIcon className="size-4" />
            </span>
            <p className="text-[12.5px] leading-relaxed text-white/70">
              Subsidence tracks water-table depth (twin model ≈ 1 cm/yr per 10 cm of drainage) &mdash; poles whose water table
              is below <span className="font-medium text-amber-300">−40 cm</span> (PP 57/2016) exceed the{" "}
              <span className="font-medium text-white/85">{RATE_PP57} cm/yr</span> equivalent limit ({overLimit} of{" "}
              {divisionPoles.length} poles).{" "}
              {kpi.worst && (
                <>
                  <span className="font-medium text-red-300">{kpi.worst.block}</span> shows the steepest cumulative loss (
                  {kpi.worst.cumulative[kpi.worst.cumulative.length - 1]} cm since 2019) and a water table of{" "}
                  {fmtNum(kpi.worst.waterTable)} cm.{" "}
                </>
              )}
              Twin projection: rewetting holds the rate at{" "}
              <span className="font-medium text-sky-300">{projection.rewetEnd.toFixed(1)} cm/yr</span> by {projection.endDay} vs{" "}
              <span className="font-medium text-amber-300">{projection.baseEnd.toFixed(1)} cm/yr</span> under baseline.
              Recommended action: raise the managed water level{kpi.worst ? ` in ${kpi.worst.block}` : ""} toward the{" "}
              <span className="font-medium text-emerald-300">−30 cm</span> target by adjusting weir gates and rewetting
              priority canals.
            </p>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            kicker="DIGITAL TWIN · PRAKIRAAN 14 HARI"
            icon={BoxIcon}
            title="Subsidence Projection · Baseline vs Rewetting"
            subtitle={`${division === ALL_BLOCKS ? "Estate" : division} rate from twin water table (cm/yr) · 10–${projection.endDay}`}
            action={<OpenInTwin scenario="rewet" layer="waterTable" block={twinBlock} label="Simulasikan di Twin" />}
          />
          <div className="h-[180px] px-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={projection.data} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="day" {...axisProps} interval="preserveStartEnd" />
                <YAxis domain={[0, 8]} {...axisProps} width={28} />
                <Tooltip {...tooltipStyle} formatter={withUnit("cm/yr")} />
                <ReferenceLine
                  y={RATE_PP57}
                  stroke={EWS_META.siaga.color}
                  strokeDasharray="4 3"
                  strokeOpacity={0.7}
                  label={{ value: `PP 57 setara · ${RATE_PP57} cm/yr`, position: "insideTopLeft", fontSize: 9, fill: EWS_META.siaga.color }}
                />
                <Line dataKey="baseline" name="Baseline" type="monotone" stroke={EWS_META.siaga.color} strokeWidth={2.2} dot={false} />
                <Line dataKey="rewet" name="Rewetting" type="monotone" stroke="#38bdf8" strokeWidth={2.2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2 border-t border-white/[0.06] px-4 py-3">
            <div>
              <span className="kicker block text-white/55">Baseline · {projection.endDay}</span>
              <span className="block text-[15px] font-semibold tabular-nums" style={{ color: EWS_META[rateLevel(projection.baseEnd)].color }}>
                {projection.baseEnd.toFixed(1)} cm/yr
              </span>
              <span className="text-[10.5px] text-white/55">Water table {fmtNum(projection.baseEndWt)} cm</span>
            </div>
            <div>
              <span className="kicker block text-white/55">Rewetting · {projection.endDay}</span>
              <span className="block text-[15px] font-semibold tabular-nums" style={{ color: EWS_META[rateLevel(projection.rewetEnd)].color }}>
                {projection.rewetEnd.toFixed(1)} cm/yr
              </span>
              <span className="text-[10.5px] text-white/55">Water table {fmtNum(projection.rewetEndWt)} cm</span>
            </div>
            <div>
              <span className="kicker block text-white/55">Avoided</span>
              <span className="block text-[15px] font-semibold tabular-nums text-emerald-300">
                {avoided > 0 ? "−" : ""}
                {Math.abs(avoided).toFixed(1)} cm/yr
              </span>
              <span className="text-[10.5px] text-white/55">Gates 20% + canal blocking</span>
            </div>
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          kicker="SURVEI · TIANG PANTAU"
          title="Subsidence Poles"
          subtitle={`Survey 1 Sep 2024 · ${filteredPoles.length} of ${divisionPoles.length} poles · water table from reference borehole (live 10 Sep)`}
          action={<ViewAll href="/reports" label="Survey Report" />}
        />
        <div className="flex flex-wrap items-center gap-1.5 px-4 pb-2">
          {FILTERS.map((f) => {
            const on = statusFilter === f.key
            return (
              <button
                key={f.key}
                type="button"
                aria-pressed={on}
                onClick={() => setStatusFilter(f.key)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-[11.5px] font-medium transition-colors",
                  on ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30" : "text-white/55 hover:text-white/80"
                )}
              >
                {f.label}
                <span className="ml-1 font-mono text-[10px] text-white/50">{levelCounts[f.key] ?? 0}</span>
              </button>
            )
          })}
        </div>
        <TableScroll>
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr>
                <th className={tableTh}>Pole</th>
                <th className={tableTh}>Block</th>
                <th className={cn(tableTh, "text-right")}>Rate (cm/yr)</th>
                <th className={cn(tableTh, "text-right")}>Cumulative (cm)</th>
                <th className={cn(tableTh, "text-right")}>Water Table (cm)</th>
                <th className={tableTh}>Status</th>
                <th className={cn(tableTh, "text-right")}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPoles.map((r) => (
                <tr key={r.pole} className={tableRow}>
                  <td className={cn(tableTd, "font-mono font-medium text-white/85")}>{r.pole}</td>
                  <td className={cn(tableTd, "text-white/60")}>{r.block}</td>
                  <td className={cn(tableTd, "text-right font-medium tabular-nums")} style={{ color: EWS_META[r.level].color }}>
                    {r.rate.toFixed(1)}
                  </td>
                  <td className={cn(tableTd, "text-right tabular-nums text-white/70")}>{r.cumulative.toFixed(1)}</td>
                  <td className={cn(tableTd, "text-right tabular-nums")}>
                    <span className="font-medium" style={{ color: EWS_META[ewsFromWaterTable(r.waterTable)].color }}>
                      {fmtNum(r.waterTable)}
                    </span>
                    <span className="ml-1.5 font-mono text-[10.5px] text-white/50">{r.ref}</span>
                  </td>
                  <td className={tableTd}>
                    <EwsPill level={r.level} pulse={r.level === "awas"} />
                  </td>
                  <td className={cn(tableTd, "text-right")}>
                    <OpenInTwin variant="icon" asset={r.ref} layer="waterTable" />
                  </td>
                </tr>
              ))}
              {filteredPoles.length === 0 && (
                <tr className={tableRow}>
                  <td className={cn(tableTd, "text-center text-white/50")} colSpan={7}>
                    Tidak ada tiang dengan status ini{division === ALL_BLOCKS ? "" : ` di ${division}`}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableScroll>
      </Panel>
    </PeatShell>
  )
}
