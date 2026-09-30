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
  Pie,
  PieChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  ActivityIcon,
  ChevronDownIcon,
  DownloadIcon,
  LeafIcon,
  MapIcon,
  SatelliteIcon,
  SproutIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { PeatShell } from "@/components/peatland/peat-shell"
import { Panel, PanelHeader, TableScroll, tableRow, tableTd, tableTh } from "@/components/peatland/panel"
import { StatTile } from "@/components/peatland/stat-tile"
import { StatusDot, type Tone } from "@/components/peatland/status"
import { axisProps, gridProps, tooltipStyle, withUnit } from "@/components/peatland/chart-theme"
import { OpenInTwin } from "@/components/peatland/open-in-twin"
import { TWIN_LAYERS, rampColor } from "@/lib/peatland/digital-twin"
import { plantationHealth, type NdviRow } from "@/lib/peatland/mock-data"
import { twinHref } from "@/lib/peatland/stations"
import { useDashboardFilters } from "@/lib/peatland/filters"
import { ALL_BLOCKS, matchesBlock, scaleNumber } from "@/lib/peatland/filter-logic"
import { cn } from "@/lib/utils"

type HealthTone = NdviRow["healthTone"]
type TrendKind = "improving" | "stable" | "declining"

// Kelas kesehatan NDVI — ambang selaras mock plantationHealth
// (A 0.82 Very Good, B 0.71 & E 0.78 Good, C 0.59 Moderate, D 0.42 Poor).
const HEALTH_CLASSES: { tone: HealthTone; label: string; color: string; y1: number; y2: number; range: string }[] = [
  { tone: "very-good", label: "Very Good", color: "#22c55e", y1: 0.8, y2: 1, range: "≥ 0.80" },
  { tone: "good", label: "Good", color: "#84cc16", y1: 0.65, y2: 0.8, range: "0.65–0.80" },
  { tone: "moderate", label: "Moderate", color: "#f59e0b", y1: 0.5, y2: 0.65, range: "0.50–0.65" },
  { tone: "poor", label: "Poor", color: "#ef4444", y1: 0, y2: 0.5, range: "< 0.50" },
]
const HEALTH_COLOR = Object.fromEntries(HEALTH_CLASSES.map((c) => [c.tone, c.color])) as Record<HealthTone, string>

const TREND_TONE: Record<TrendKind, { tone: Tone; label: string }> = {
  improving: { tone: "normal", label: "Improving" },
  stable: { tone: "info", label: "Stable" },
  declining: { tone: "critical", label: "Declining" },
}

// Data tambahan per block (tidak ada di mock-data): NDVI pass Sentinel-2 sebelumnya
// (3 Sep) dan yield 12 bulan berjalan (t/ha). Yield SAMA dengan halaman Agriculture.
const BLOCK_EXTRA: Record<string, { prevNdvi: number; yield: number }> = {
  "Block A": { prevNdvi: 0.81, yield: 24.6 },
  "Block B": { prevNdvi: 0.71, yield: 22.6 },
  "Block C": { prevNdvi: 0.61, yield: 19.6 },
  "Block D": { prevNdvi: 0.46, yield: 16.5 },
  "Block E": { prevNdvi: 0.77, yield: 23.4 },
}
const YIELD_TARGET = 21

// Komposit NDVI bulanan Okt 2023 – Sep 2024 sebagai selisih terhadap pass terakhir
// (8 Sep). Deret per filter = NDVI block + selisih ini.
const NDVI_MONTHS: { month: string; year: number; off: number }[] = [
  { month: "Oct", year: 2023, off: -0.05 },
  { month: "Nov", year: 2023, off: -0.06 },
  { month: "Dec", year: 2023, off: -0.07 },
  { month: "Jan", year: 2024, off: -0.07 },
  { month: "Feb", year: 2024, off: -0.06 },
  { month: "Mar", year: 2024, off: -0.05 },
  { month: "Apr", year: 2024, off: -0.04 },
  { month: "May", year: 2024, off: -0.02 },
  { month: "Jun", year: 2024, off: -0.01 },
  { month: "Jul", year: 2024, off: 0 },
  { month: "Aug", year: 2024, off: 0.01 },
  { month: "Sep", year: 2024, off: 0 },
]

const ndviRangeOptions = ["3M", "6M", "12M"] as const
type NdviRange = (typeof ndviRangeOptions)[number]
const ndviRangeMonths: Record<NdviRange, number> = { "3M": 3, "6M": 6, "12M": 12 }
const ndviRangeLabel: Record<NdviRange, string> = {
  "3M": "NDVI Trend (3 Months)",
  "6M": "NDVI Trend (6 Months)",
  "12M": "NDVI Trend (12 Months)",
}

const LAST_PASS = "8 Sep"
const NEXT_PASS = "13 Sep"

const round2 = (v: number) => Math.round(v * 100) / 100

type BlockRow = NdviRow & { prevNdvi: number; delta: number; trend: TrendKind; yield: number }

function weighted(rows: BlockRow[], pick: (r: BlockRow) => number): number {
  const area = rows.reduce((a, r) => a + r.area, 0)
  return area ? rows.reduce((a, r) => a + pick(r) * r.area, 0) / area : 0
}

function ndviTone(v: number): Tone {
  return v >= 0.65 ? "normal" : v >= 0.5 ? "warning" : "critical"
}

/** Warna ramp NDVI twin → CSS rgb; teks gelap untuk warna terang. */
function rampCss(v: number): { bg: string; fg: string } {
  const [r, g, b] = rampColor("ndvi", v)
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return {
    bg: `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`,
    fg: lum > 0.55 ? "#06140e" : "#ffffff",
  }
}

const NDVI_STOPS = TWIN_LAYERS.find((l) => l.key === "ndvi")?.stops ?? []
const NDVI_MIN = NDVI_STOPS[0]?.[0] ?? 0.3
const NDVI_MAX = NDVI_STOPS[NDVI_STOPS.length - 1]?.[0] ?? 0.9
const NDVI_GRADIENT = `linear-gradient(90deg, ${NDVI_STOPS.map(([v, c]) => `${c} ${((v - NDVI_MIN) / (NDVI_MAX - NDVI_MIN)) * 100}%`).join(", ")})`

// Tata letak skematis block, kira-kira posisi geografis (lihat blockPoints):
// D barat laut, B barat, E tengah, A & C timur.
const TILE_LAYOUT: Record<string, string> = {
  "Block D": "col-start-1 row-start-1 row-span-3",
  "Block B": "col-start-1 row-start-4 row-span-3",
  "Block E": "col-start-2 row-start-2 row-span-4",
  "Block A": "col-start-3 row-start-2 row-span-3",
  "Block C": "col-start-3 row-start-5 row-span-2",
}

export default function PlantationHealthPage() {
  const { estate, division } = useDashboardFilters()
  const [ndviRange, setNdviRange] = useState<NdviRange>("6M")
  const [exportOpen, setExportOpen] = useState(false)
  const [healthFilter, setHealthFilter] = useState<HealthTone | null>(null)

  // Semua angka per block diturunkan dari mock plantationHealth (NDVI & luas tidak
  // diskalakan agar sama dengan twin); yield ikut faktor estate seperti Agriculture.
  const rows = useMemo<BlockRow[]>(
    () =>
      plantationHealth.map((p) => {
        const x = BLOCK_EXTRA[p.block] ?? { prevNdvi: p.ndvi, yield: YIELD_TARGET }
        const diff = Math.round((p.ndvi - x.prevNdvi) * 100)
        const trend: TrendKind = diff >= 1 ? "improving" : diff <= -2 ? "declining" : "stable"
        return { ...p, prevNdvi: x.prevNdvi, delta: diff / 100, trend, yield: scaleNumber(x.yield, estate, 1) }
      }),
    [estate]
  )
  const visible = useMemo(() => rows.filter((r) => matchesBlock(r.block, division)), [rows, division])
  const tableRows = visible.filter((r) => !healthFilter || r.healthTone === healthFilter)

  const totalArea = visible.reduce((a, r) => a + r.area, 0)
  const avgNdvi = weighted(visible, (r) => r.ndvi)
  const prevNdvi = weighted(visible, (r) => r.prevNdvi)
  const ndviDelta = round2(avgNdvi - prevNdvi)
  const healthyArea = visible.filter((r) => r.healthTone === "very-good" || r.healthTone === "good").reduce((a, r) => a + r.area, 0)
  const healthyPct = totalArea ? Math.round((healthyArea / totalArea) * 100) : 0
  const atRisk = visible.filter((r) => r.healthTone === "poor")
  const avgYield = Math.round(weighted(visible, (r) => r.yield) * 10) / 10

  // Deret bulanan: rata-rata tertimbang luas block terpilih + selisih bulanan.
  const ndviSeries = useMemo(() => {
    const base = weighted(visible, (r) => r.ndvi)
    return NDVI_MONTHS.map((m) => ({ month: m.month, label: `${m.month} ${m.year}`, ndvi: round2(base + m.off) }))
  }, [visible])
  const ndviTrend = ndviSeries.slice(ndviSeries.length - ndviRangeMonths[ndviRange])
  const ndviDomain = useMemo<[number, number]>(() => {
    const vals = ndviTrend.map((d) => d.ndvi)
    const lo = Math.max(0, Math.floor((Math.min(...vals) - 0.03) * 20) / 20)
    const hi = Math.min(1, Math.ceil((Math.max(...vals) + 0.03) * 20) / 20)
    return [lo, hi]
  }, [ndviTrend])

  // Distribusi kesehatan = luas per kelas dari block yang lolos filter division.
  const healthDist = HEALTH_CLASSES.map((c) => {
    const area = visible.filter((r) => r.healthTone === c.tone).reduce((a, r) => a + r.area, 0)
    return { ...c, area, pct: totalArea ? Math.round((area / totalArea) * 100) : 0 }
  })

  const yieldData = visible.map((r) => ({
    block: r.block.replace("Block ", ""),
    yield: r.yield,
    color: HEALTH_COLOR[r.healthTone],
  }))

  const exportFormats = ["PDF", "Excel", "CSV"] as const
  const scopeLabel = division === ALL_BLOCKS ? "All Blocks" : division

  return (
    <PeatShell title="Plantation Health" subtitle="Vegetation Index (NDVI) & Crop Health">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile
          label="Avg NDVI"
          value={avgNdvi.toFixed(2)}
          tone={ndviTone(avgNdvi)}
          icon={LeafIcon}
          spark={ndviSeries.slice(-6).map((d) => d.ndvi)}
          delta={
            Math.abs(ndviDelta) >= 0.005
              ? { text: `${ndviDelta > 0 ? "+" : "−"}${Math.abs(ndviDelta).toFixed(2)}`, dir: ndviDelta > 0 ? "up" : "down", good: ndviDelta > 0, vs: "vs last pass" }
              : undefined
          }
          foot={Math.abs(ndviDelta) >= 0.005 ? undefined : "Unchanged vs last pass"}
        />
        <StatTile
          label="Healthy Area"
          value={String(healthyPct)}
          unit="%"
          tone={healthyPct >= 50 ? "normal" : "warning"}
          icon={SproutIcon}
          foot={`${healthyArea.toLocaleString("en-US")} ha Very Good + Good`}
        />
        <StatTile
          label="Blocks at Risk"
          value={String(atRisk.length)}
          tone={atRisk.length ? "critical" : "normal"}
          icon={TriangleAlertIcon}
          status={atRisk.length ? atRisk.map((r) => r.block).join(" · ") : "None"}
          foot="Poor · NDVI < 0.50"
          onClick={atRisk.length ? () => setHealthFilter("poor") : undefined}
        />
        <StatTile
          label="Total Area"
          value={totalArea.toLocaleString("en-US")}
          unit="ha"
          tone="info"
          icon={MapIcon}
          foot={`${visible.length} ${visible.length === 1 ? "block" : "blocks"} · ${scopeLabel}`}
          href="/map-view"
        />
        <StatTile
          label="Avg Yield"
          value={avgYield.toFixed(1)}
          unit="t/ha"
          tone={avgYield >= YIELD_TARGET ? "normal" : "warning"}
          icon={ActivityIcon}
          foot={`Trailing 12 months · target ${YIELD_TARGET}`}
          href="/agriculture"
        />
        <StatTile
          label="Last Satellite Pass"
          value={LAST_PASS}
          tone="info"
          icon={SatelliteIcon}
          status="Sentinel-2 · 2 days ago"
          foot={`Next pass ${NEXT_PASS} 2024`}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Panel className="md:col-span-2">
          <PanelHeader
            kicker="Satelit · NDVI"
            icon={SatelliteIcon}
            title={ndviRangeLabel[ndviRange]}
            subtitle={`${scopeLabel} · area-weighted monthly composite · Sentinel-2`}
            action={
              <div className="inline-flex items-center gap-1 rounded-lg bg-white/5 p-0.5">
                {ndviRangeOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setNdviRange(opt)}
                    aria-pressed={ndviRange === opt}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-colors",
                      ndviRange === opt
                        ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                        : "text-white/55 hover:text-white/80"
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            }
          />
          <div className="h-[220px] px-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ndviTrend} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                <defs>
                  <linearGradient id="ndviStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#84cc16" />
                    <stop offset="100%" stopColor="#22c55e" />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                {HEALTH_CLASSES.map((c) => (
                  <ReferenceArea key={c.tone} y1={c.y1} y2={c.y2} fill={c.color} fillOpacity={0.07} ifOverflow="hidden" />
                ))}
                <XAxis dataKey="month" {...axisProps} />
                <YAxis domain={ndviDomain} {...axisProps} width={40} tickFormatter={(v: number) => v.toFixed(2)} />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v) => (typeof v === "number" ? v.toFixed(2) : String(v ?? ""))}
                  labelFormatter={(_, p) => (p?.[0]?.payload as { label?: string } | undefined)?.label ?? ""}
                />
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
          {/* Legenda pita kelas kesehatan */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-white/[0.06] px-4 py-2.5">
            {HEALTH_CLASSES.map((c) => (
              <span key={c.tone} className="flex items-center gap-1.5 text-[11px] text-white/60">
                <span className="size-2.5 rounded-[3px]" style={{ background: c.color, opacity: 0.8 }} />
                {c.label}
                <span className="font-mono text-[10.5px] text-white/50">{c.range}</span>
              </span>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader kicker="Luas · kelas" title="Health Distribution" subtitle={`Share of area · ${scopeLabel}`} />
          <div className="relative h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip {...tooltipStyle} formatter={(v) => `${Number(v).toLocaleString("en-US")} ha`} />
                <Pie
                  data={healthDist.filter((d) => d.area > 0)}
                  dataKey="area"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={2}
                  stroke="none"
                >
                  {healthDist
                    .filter((d) => d.area > 0)
                    .map((d) => (
                      <Cell key={d.tone} fill={d.color} fillOpacity={healthFilter && healthFilter !== d.tone ? 0.3 : 1} />
                    ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[17px] font-bold leading-none tabular-nums text-white">{totalArea.toLocaleString("en-US")}</span>
              <span className="text-[9.5px] uppercase tracking-wide text-white/50">ha</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1 px-3 pb-3">
            {healthDist.map((d) => (
              <button
                key={d.tone}
                type="button"
                onClick={() => setHealthFilter((f) => (f === d.tone ? null : d.tone))}
                aria-pressed={healthFilter === d.tone}
                title={`Filter table: ${d.label}`}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[11px] text-white/65 transition-colors hover:bg-white/[0.04] hover:text-white/90",
                  healthFilter === d.tone && "bg-white/[0.06] text-white/90"
                )}
              >
                <span className="size-2.5 rounded-[3px]" style={{ background: d.color }} />
                {d.label}
                <span className="ml-auto font-medium tabular-nums text-white/85">{d.pct}%</span>
              </button>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Panel className="lg:col-span-3">
          <PanelHeader
            kicker="Produksi · yield"
            icon={ActivityIcon}
            title="Yield by Block (t/ha)"
            subtitle={`Trailing 12 months FFB · bar colour = NDVI health · target ${YIELD_TARGET} t/ha`}
            action={
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setExportOpen((o) => !o)}
                  aria-expanded={exportOpen}
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
                          type="button"
                          onClick={() => {
                            setExportOpen(false)
                            const id = toast.loading(`Menyiapkan ekspor ${fmt}…`)
                            setTimeout(() => toast.success(`Laporan ${fmt} siap diunduh`, { id }), 900)
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
          <div className="h-[220px] px-1 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yieldData} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="block" {...axisProps} tickFormatter={(b: string) => `Block ${b}`} />
                <YAxis
                  domain={[0, (max: number) => Math.max(25, Math.ceil(max / 5) * 5)]}
                  {...axisProps}
                  width={48}
                  tickFormatter={(v: number) => `${v} t/ha`}
                />
                <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} formatter={withUnit("t/ha")} />
                <ReferenceLine
                  y={YIELD_TARGET}
                  stroke="#34d399"
                  strokeDasharray="4 3"
                  strokeOpacity={0.7}
                  label={{ value: `Target ${YIELD_TARGET} t/ha`, position: "insideTopRight", fontSize: 9, fill: "#34d399" }}
                />
                <Bar dataKey="yield" name="Yield" radius={[4, 4, 0, 0]} barSize={40}>
                  {yieldData.map((d) => (
                    <Cell key={d.block} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Peta block NDVI skematis dengan ramp warna layer NDVI twin */}
        <Panel className="lg:col-span-2">
          <PanelHeader
            kicker="Twin · layer NDVI"
            icon={MapIcon}
            title="NDVI Block Map"
            subtitle={`Schematic layout · ${LAST_PASS} pass · twin NDVI ramp`}
            action={<OpenInTwin variant="link" label="Open layer" layer="ndvi" block={division === ALL_BLOCKS ? undefined : division} />}
          />
          <div className="px-4 pb-3">
            <div className="grid h-[190px] grid-cols-3 grid-rows-6 gap-1.5">
              {rows.map((r) => {
                const c = rampCss(r.ndvi)
                const inScope = matchesBlock(r.block, division)
                return (
                  <Link
                    key={r.block}
                    href={twinHref({ block: r.block, layer: "ndvi" })}
                    title={`Buka di Twin · ${r.block} (NDVI)`}
                    className={cn(
                      "flex flex-col justify-between rounded-lg p-2 ring-1 ring-black/20 transition-[transform,opacity,box-shadow] hover:-translate-y-0.5 hover:ring-2 hover:ring-white/40",
                      TILE_LAYOUT[r.block],
                      !inScope && "opacity-35"
                    )}
                    style={{ background: c.bg, color: c.fg }}
                  >
                    <span className="text-[10.5px] font-semibold leading-none">{r.block}</span>
                    <span>
                      <span className="block font-mono text-[17px] font-bold leading-none tabular-nums">{r.ndvi.toFixed(2)}</span>
                      <span className="text-[9.5px] font-medium uppercase tracking-wide opacity-85">{r.health}</span>
                    </span>
                  </Link>
                )
              })}
            </div>
            <div className="mt-3">
              <div className="h-2 rounded-full" style={{ background: NDVI_GRADIENT }} />
              <div className="mt-1 flex justify-between font-mono text-[10px] text-white/50">
                {NDVI_STOPS.map(([v]) => (
                  <span key={v}>{v.toFixed(2)}</span>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4">
        <Panel>
          <PanelHeader
            kicker="Satelit · per block"
            icon={LeafIcon}
            title="Block Health (NDVI)"
            subtitle={`Latest pass ${LAST_PASS} · Δ vs previous pass 3 Sep`}
            action={
              <>
                {healthFilter && (
                  <button
                    type="button"
                    onClick={() => setHealthFilter(null)}
                    className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-white/75 hover:bg-white/10"
                  >
                    {HEALTH_CLASSES.find((c) => c.tone === healthFilter)?.label}
                    <XIcon className="size-3" />
                  </button>
                )}
                <OpenInTwin variant="link" label="NDVI in Twin" layer="ndvi" />
              </>
            }
          />
          <TableScroll>
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr>
                  <th className={tableTh}>Block</th>
                  <th className={tableTh}>NDVI</th>
                  <th className={tableTh}>Health Status</th>
                  <th className={cn(tableTh, "text-right")}>Area (ha)</th>
                  <th className={cn(tableTh, "text-right")}>Yield (t/ha)</th>
                  <th className={cn(tableTh, "text-right")}>Trend</th>
                  <th className={cn(tableTh, "text-right")}>Twin</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.length === 0 ? (
                  <tr className="border-t border-white/[0.06]">
                    <td className={cn(tableTd, "text-center text-white/50")} colSpan={7}>
                      Tidak ada block untuk filter ini
                    </td>
                  </tr>
                ) : (
                  tableRows.map((r) => {
                    const color = HEALTH_COLOR[r.healthTone]
                    const t = TREND_TONE[r.trend]
                    return (
                      <tr key={r.block} className={tableRow}>
                        <td className={cn(tableTd, "whitespace-nowrap font-medium text-white/90")}>{r.block}</td>
                        <td className={cn(tableTd, "whitespace-nowrap")}>
                          <span className="font-mono font-semibold tabular-nums text-white/85">{r.ndvi.toFixed(2)}</span>
                          <span className={cn("ml-1.5 font-mono text-[10.5px]", r.delta > 0 ? "text-emerald-400" : r.delta < 0 ? "text-red-400" : "text-white/50")}>
                            {r.delta > 0 ? "+" : r.delta < 0 ? "−" : "±"}
                            {Math.abs(r.delta).toFixed(2)}
                          </span>
                        </td>
                        <td className={tableTd}>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
                              <div className="h-full rounded-full" style={{ width: `${r.ndvi * 100}%`, background: color }} />
                            </div>
                            <span className="whitespace-nowrap text-[11.5px] font-medium" style={{ color }}>
                              {r.health}
                            </span>
                          </div>
                        </td>
                        <td className={cn(tableTd, "text-right tabular-nums text-white/75")}>{r.area.toLocaleString("en-US")}</td>
                        <td
                          className={cn(tableTd, "text-right tabular-nums", r.yield >= YIELD_TARGET ? "text-white/75" : "text-amber-300")}
                        >
                          {r.yield.toFixed(1)}
                        </td>
                        <td className={cn(tableTd, "text-right")}>
                          <div className="flex justify-end">
                            <StatusDot tone={t.tone} label={t.label} />
                          </div>
                        </td>
                        <td className={cn(tableTd, "text-right")}>
                          <OpenInTwin variant="icon" block={r.block} layer="ndvi" />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </TableScroll>
        </Panel>
      </div>
    </PeatShell>
  )
}
