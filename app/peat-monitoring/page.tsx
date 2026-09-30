"use client"

import {
  ActivityIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DropletsIcon,
  FactoryIcon,
  LayersIcon,
  RadioTowerIcon,
  ThermometerIcon,
} from "lucide-react"
import { Fragment, useMemo, useState } from "react"
import {
  Area,
  AreaChart,
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
  MOISTURE_BANDS,
  MOISTURE_LINES,
  axisProps,
  bandProps,
  gridProps,
  lineProps,
  tooltipStyle,
  withUnit,
} from "@/components/peatland/chart-theme"
import { OpenInTwin } from "@/components/peatland/open-in-twin"
import { Panel, PanelHeader, TableScroll, ViewAll, tableRow, tableTd, tableTh } from "@/components/peatland/panel"
import { PeatShell } from "@/components/peatland/peat-shell"
import { StatTile } from "@/components/peatland/stat-tile"
import { EwsPill, StatusDot, type Tone } from "@/components/peatland/status"
import {
  BLOCK_COLOR,
  EWS_META,
  TWIN_BLOCKS,
  TWIN_STREAMS,
  WT_COMPLIANCE,
  WT_CRITICAL,
  buildHistoryFrames,
  co2Emission,
  ewsFromMoisture,
  ewsFromWaterTable,
  getBlockBaseline,
  summarizeFrame,
} from "@/lib/peatland/digital-twin"
import { useDashboardFilters } from "@/lib/peatland/filters"
import { ALL_BLOCKS, DATE_RANGE_OPTIONS, DIVISION_OPTIONS, matchesBlock, sliceSeries } from "@/lib/peatland/filter-logic"
import { formatLatLng, stationsOfType, type Station, type StationLevel, type StationSignal } from "@/lib/peatland/stations"
import { cn } from "@/lib/utils"

const round1 = (v: number) => Math.round(v * 10) / 10
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
/** Angka dengan minus tipografis, mis. "−62". */
const fmtNum = (v: number) => `${v < 0 ? "−" : ""}${Math.abs(round1(v))}`

const PEAT_STATIONS = stationsOfType("peat-station")
const NETWORK = TWIN_STREAMS.find((s) => s.label === "Peat Stations")?.value ?? "—"
// Emisi CO₂ setara batas PP 57/2016 (muka air −40 cm), t CO₂/ha/tahun.
const CO2_AT_COMPLIANCE = round1(co2Emission(1, WT_COMPLIANCE))
const DEEP_PEAT_CM = 300

type PeatRow = Station & {
  moisture: number | null
  level: StationLevel
  /** CO₂ block stasiun dari model twin (t/ha/tahun). */
  co2: number
  /** Muka air block di twin (cm). */
  blockWt: number
}
type LivePeatRow = PeatRow & { moisture: number }

const SIGNAL_TONE: Record<StationSignal, Tone> = {
  Good: "normal",
  Fair: "warning",
  Weak: "critical",
  "No signal": "offline",
}

// Pola harian suhu tanah (°C) relatif terhadap bacaan 09:00 — 24 jam terakhir s/d live 10 Sep.
const TEMP_PROFILE = [
  { t: "12:00", d: 1.2 },
  { t: "15:00", d: 1.6 },
  { t: "18:00", d: 0.8 },
  { t: "21:00", d: -0.3 },
  { t: "00:00", d: -0.9 },
  { t: "03:00", d: -1.3 },
  { t: "06:00", d: -1.2 },
  { t: "09:00", d: 0 },
]

/** Pemilih rentang tanggal — tersambung ke filter global header. */
function RangeMenu({ value, onSelect }: { value: string; onSelect: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11.5px] font-medium text-white/70 transition-colors hover:border-white/20"
      >
        <CalendarIcon className="size-3.5" />
        {value}
        <ChevronDownIcon className="size-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="listbox"
            className="absolute right-0 z-50 mt-1 min-w-full overflow-hidden rounded-lg border border-white/10 bg-[#10201a] py-1 shadow-xl"
          >
            {DATE_RANGE_OPTIONS.map((o) => (
              <button
                key={o}
                type="button"
                role="option"
                aria-selected={o === value}
                onClick={() => {
                  onSelect(o)
                  setOpen(false)
                }}
                className={cn(
                  "block w-full whitespace-nowrap px-3 py-2 text-left text-[12.5px] hover:bg-white/5",
                  o === value ? "text-emerald-300" : "text-white/75"
                )}
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

/**
 * Penampang gambut satu block: permukaan, muka air live (twin), ambang
 * PP 57/2016 −40 cm, kelembapan tanah, dan dasar gambut. Sumbu atas 0–100 cm
 * diperbesar; sisa kolom gambut dipadatkan (ditandai garis patah).
 */
function PeatCrossSection({
  block,
  waterTable,
  moisture,
  peatDepth,
}: {
  block: string
  waterTable: number
  moisture: number
  peatDepth: number
}) {
  const S = 34
  const BREAK = 144
  const BOTTOM = 176
  const y = (d: number) =>
    d <= 100 ? S + d * 1.1 : BREAK + ((Math.min(d, peatDepth) - 100) / Math.max(1, peatDepth - 100)) * (BOTTOM - BREAK)
  const wtY = y(Math.min(100, Math.max(0, -waterTable)))
  const wtColor = EWS_META[ewsFromWaterTable(waterTable)].color
  const mColor = EWS_META[ewsFromMoisture(moisture)].color
  const siaga = EWS_META.siaga.color
  const awas = EWS_META.awas.color
  const ground = `M0 ${S} L276 ${S} L290 ${y(100)} L322 ${y(100)} L336 ${S} L360 ${S} L360 ${BOTTOM} L0 ${BOTTOM} Z`
  const palms = [34, 104, 174]
  return (
    <svg
      viewBox="0 0 360 206"
      role="img"
      aria-label={`Penampang gambut ${block}: muka air ${waterTable} cm, kelembapan ${moisture}%, kedalaman gambut ${peatDepth} cm`}
      className="block h-auto w-full"
    >
      <defs>
        <linearGradient id="pm-sec-peat" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#4a3524" />
          <stop offset="100%" stopColor="#1a110a" />
        </linearGradient>
        <linearGradient id="pm-sec-water" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#5fd8ff" stopOpacity={0.55} />
          <stop offset="100%" stopColor="#0c3f8a" stopOpacity={0.7} />
        </linearGradient>
        <pattern id="pm-sec-moist" width="7" height="7" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="0.9" fill="#7dd3fc" />
        </pattern>
        <clipPath id="pm-sec-ground">
          <path d={ground} />
        </clipPath>
      </defs>

      {/* Air kanal (muka air kanal ≈ −80 cm) */}
      <rect x={282} y={y(80)} width={48} height={y(100) - y(80)} fill="url(#pm-sec-water)" />
      <path d={ground} fill="url(#pm-sec-peat)" stroke="#6b8f7c" strokeWidth={1.2} />
      {/* Tanah mineral di bawah gambut */}
      <rect x={0} y={BOTTOM} width={360} height={206 - BOTTOM} fill="#2a3036" />
      <line x1={0} x2={360} y1={BOTTOM} y2={BOTTOM} stroke="#6b7a86" strokeWidth={1} />

      <g clipPath="url(#pm-sec-ground)">
        {/* Zona tak jenuh: kerapatan titik mengikuti kelembapan */}
        <rect x={0} y={S} width={360} height={Math.max(0, wtY - S)} fill="url(#pm-sec-moist)" opacity={0.15 + (moisture / 100) * 0.6} />
        {/* Zona jenuh di bawah muka air */}
        <rect x={0} y={wtY} width={360} height={BOTTOM - wtY} fill="url(#pm-sec-water)" opacity={0.45} />
        <line x1={0} x2={276} y1={wtY} y2={wtY} stroke="#5fd8ff" strokeWidth={1.8} />
      </g>

      {/* Garis patah: kolom gambut di bawah 100 cm dipadatkan */}
      <path d={`M0 ${BREAK - 3} L360 ${BREAK - 3}`} stroke="rgba(255,255,255,0.18)" strokeDasharray="2 5" />
      <path d={`M8 ${BREAK + 1} l6 -6 l6 6 l6 -6`} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={1} />

      {/* Ambang EWS muka air */}
      <line x1={8} x2={268} y1={y(-WT_COMPLIANCE)} y2={y(-WT_COMPLIANCE)} stroke={siaga} strokeDasharray="5 4" strokeWidth={1.2} />
      <text x={10} y={y(-WT_COMPLIANCE) - 3} fontSize={8.5} fontWeight={700} fill={siaga} className="font-mono">
        PP 57/2016 · −40 cm
      </text>
      <line x1={8} x2={268} y1={y(-WT_CRITICAL)} y2={y(-WT_CRITICAL)} stroke={awas} strokeDasharray="2 4" strokeWidth={1} opacity={0.8} />
      <text x={10} y={y(-WT_CRITICAL) - 3} fontSize={8} fill={awas} className="font-mono">
        Awas · −60 cm
      </text>

      {/* Vegetasi di permukaan */}
      {palms.map((x) => (
        <g key={x} stroke="#4ade80" strokeWidth={1.3} fill="none" opacity={0.7}>
          <line x1={x} x2={x} y1={S} y2={S - 16} stroke="#8b6b4a" />
          <path d={`M${x} ${S - 16} q -7 -2 -11 4 M${x} ${S - 16} q 7 -2 11 4 M${x} ${S - 16} q -4 -6 -9 -6 M${x} ${S - 16} q 4 -6 9 -6`} />
        </g>
      ))}

      <text x={210} y={S - 7} fontSize={9} fill="rgba(255,255,255,0.6)" className="font-mono">
        Permukaan · 0 cm
      </text>
      <text x={6} y={S + 13} fontSize={9} fontWeight={700} fill={mColor} className="font-mono">
        Kelembapan {moisture}%
      </text>

      {/* Pipa ukur (piezometer) */}
      <line x1={236} x2={236} y1={S - 4} y2={y(100)} stroke="#c7d8cf" strokeWidth={1.3} opacity={0.6} />
      {[0, 20, 40, 60, 80, 100].map((d) => (
        <g key={d}>
          <line x1={232} x2={240} y1={y(d)} y2={y(d)} stroke="#c7d8cf" strokeWidth={1} opacity={0.6} />
          <text x={244} y={y(d) + 3} fontSize={8} fill="#93a89c" className="font-mono">
            {d === 0 ? "0" : `−${d}`}
          </text>
        </g>
      ))}

      <rect x={120} y={wtY - 8} width={66} height={16} rx={4} fill="#04120b" stroke={wtColor} />
      <text x={153} y={wtY + 3.5} textAnchor="middle" fontSize={9.5} fontWeight={700} fill="#ecf6f0" className="font-mono">
        MAT {fmtNum(waterTable)} cm
      </text>

      <text x={306} y={y(100) + 11} textAnchor="middle" fontSize={8.5} fill="#93a89c" className="font-mono">
        Kanal
      </text>
      <text x={6} y={BOTTOM - 5} fontSize={9} fill="rgba(255,255,255,0.65)" className="font-mono">
        Dasar gambut · −{peatDepth} cm
      </text>
      <text x={6} y={BOTTOM + 17} fontSize={8.5} fill="rgba(255,255,255,0.5)" className="font-mono">
        Tanah mineral
      </text>
    </svg>
  )
}

export default function PeatMonitoringPage() {
  const { estate, division, dateRange, setDateRange, setDivision } = useDashboardFilters()
  const [expanded, setExpanded] = useState<string | null>(null)

  // State twin live + replay 4–10 Sep untuk muka air, kelembapan, dan CO₂ per block.
  const twin = useMemo(() => {
    const baseline = getBlockBaseline(estate)
    const frames = buildHistoryFrames(baseline)
    return { baseline, frames, live: frames[frames.length - 1] }
  }, [estate])

  const blockStats = useMemo(
    () =>
      TWIN_BLOCKS.map((block) => {
        const base = twin.baseline.find((b) => b.block === block)
        const st = PEAT_STATIONS.filter((s) => s.block === block)
        const waterTable = base?.waterTable ?? -30
        const area = base?.area ?? 1
        return {
          block,
          waterTable,
          depth: Math.round(avg(st.map((s) => s.peatDepth ?? base?.peatDepth ?? 0))),
          moisture: Math.round(avg(st.map((s) => s.value ?? base?.soilMoisture ?? 0))),
          co2: round1(co2Emission(area, waterTable) / area),
        }
      }),
    [twin]
  )

  const rows = useMemo(
    () =>
      PEAT_STATIONS.map((s): PeatRow => {
        const b = blockStats.find((x) => x.block === s.block)
        return {
          ...s,
          moisture: s.value,
          level: s.value == null ? "offline" : ewsFromMoisture(s.value),
          co2: b?.co2 ?? 0,
          blockWt: b?.waterTable ?? 0,
        }
      }),
    [blockStats]
  )
  const visibleRows = useMemo(() => rows.filter((r) => matchesBlock(r.block, division)), [rows, division])
  const liveRows = useMemo(
    () => visibleRows.filter((r): r is LivePeatRow => r.moisture != null),
    [visibleRows]
  )
  const divisionBlocks = useMemo(() => TWIN_BLOCKS.filter((b) => matchesBlock(b, division)), [division])

  // Kelembapan tiap stasiun mengikuti perubahan kelembapan block di replay twin (muka air turun → makin kering).
  const moistureTrend = useMemo(() => {
    const live = twin.live
    return twin.frames.map((f) => ({
      day: f.label,
      value: round1(
        avg(liveRows.map((r) => r.moisture + (f.blocks[r.block].soilMoisture - live.blocks[r.block].soilMoisture)))
      ),
    }))
  }, [twin, liveRows])
  const shownMoisture = sliceSeries(moistureTrend, dateRange)
  const moistureSpan =
    shownMoisture.length > 1
      ? `${shownMoisture[0].day.replace(" Sep", "")}–${shownMoisture[shownMoisture.length - 1].day}`
      : shownMoisture[0]?.day ?? "—"

  const soilTemp = useMemo(() => {
    const base = round1(avg(visibleRows.map((r) => r.soilTemp ?? 28)))
    return TEMP_PROFILE.map((p) => ({ t: p.t, temp: round1(base + p.d) }))
  }, [visibleRows])

  // CO₂ per ha dari model twin (0.91 t CO₂/ha/tahun per cm drainase), tertimbang luas block terpilih.
  const co2 = useMemo(() => {
    const area = twin.baseline.filter((b) => divisionBlocks.includes(b.block)).reduce((a, b) => a + b.area, 0) || 1
    const series = twin.frames.map((f) => round1(summarizeFrame(f, twin.baseline, divisionBlocks).co2 / area))
    const wt = summarizeFrame(twin.live, twin.baseline, divisionBlocks).waterTable
    return { series, now: series[series.length - 1], prev: series[series.length - 2], wt, level: ewsFromWaterTable(wt) }
  }, [twin, divisionBlocks])

  const kpi = useMemo(() => {
    const moisture = Math.round(avg(liveRows.map((r) => r.moisture)))
    return {
      depth: Math.round(avg(visibleRows.map((r) => r.peatDepth ?? 0))),
      deep: visibleRows.filter((r) => (r.peatDepth ?? 0) >= DEEP_PEAT_CM).length,
      moisture,
      moistureLevel: ewsFromMoisture(moisture),
      temp: soilTemp[soilTemp.length - 1].temp,
      online: liveRows.length,
    }
  }, [visibleRows, liveRows, soilTemp])
  const moistureDelta = round1(moistureTrend[moistureTrend.length - 1].value - moistureTrend[moistureTrend.length - 2].value)
  const co2Delta = round1(co2.now - co2.prev)

  // Penampang: block terpilih di header; bila semua block, tampilkan block dengan muka air terdalam.
  const section = useMemo(() => {
    const worst = [...blockStats].sort((a, b) => a.waterTable - b.waterTable)[0]
    return blockStats.find((b) => b.block === division) ?? worst
  }, [blockStats, division])

  const allBlocks = division === ALL_BLOCKS

  return (
    <PeatShell title="Peat Monitoring" subtitle="Soil & Peat Condition — Stations Overview">
      {/* KPI ROW */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile
          label="Avg Peat Depth"
          value={String(kpi.depth)}
          unit="cm"
          tone="normal"
          icon={LayersIcon}
          status={`${kpi.deep} of ${visibleRows.length} stations ≥ 3 m`}
          foot="Deep peat ≥ 3 m = protected zone"
        />
        <StatTile
          label="Avg Soil Moisture"
          value={String(kpi.moisture)}
          unit="%"
          tone={kpi.moistureLevel}
          icon={DropletsIcon}
          status={`${EWS_META[kpi.moistureLevel].label} · Siaga < 35%`}
          spark={moistureTrend.map((p) => p.value)}
          delta={
            moistureDelta !== 0
              ? { text: `${Math.abs(moistureDelta)}%`, dir: moistureDelta < 0 ? "down" : "up", good: moistureDelta > 0, vs: "vs yesterday" }
              : undefined
          }
          foot={moistureDelta === 0 ? "Stable vs yesterday" : undefined}
        />
        <StatTile
          label="Avg Soil Temp"
          value={kpi.temp.toFixed(1)}
          unit="°C"
          tone="info"
          icon={ThermometerIcon}
          spark={soilTemp.map((p) => p.temp)}
          foot="Reading 10 Sep 09:00"
        />
        <StatTile
          label="Stations Reporting"
          value={`${kpi.online}/${visibleRows.length}`}
          tone={kpi.online < visibleRows.length ? "warning" : "info"}
          icon={RadioTowerIcon}
          status="Registry stations in table"
          foot={`Network ${NETWORK} online · LoRaWAN`}
        />
        <StatTile
          label="CO₂ Flux"
          value={co2.now.toFixed(1)}
          unit="t/ha/yr"
          tone={co2.level}
          icon={FactoryIcon}
          spark={co2.series}
          delta={
            co2Delta !== 0
              ? { text: co2Delta.toFixed(1), dir: co2Delta > 0 ? "up" : "down", good: co2Delta < 0, vs: "vs yesterday" }
              : undefined
          }
          foot={co2Delta === 0 ? "Twin model · 0.91 t/ha/yr per cm" : undefined}
        />
        <StatTile
          label="GHG Status"
          value={EWS_META[co2.level].label}
          tone={co2.level}
          icon={ActivityIcon}
          status={`Water table ${fmtNum(co2.wt)} cm`}
          foot={`PP 57/2016 ≈ ${CO2_AT_COMPLIANCE} t/ha/yr (−40 cm)`}
        />
      </div>

      {/* ROW 1: Moisture trend + Peat depth by block */}
      <div className="grid gap-4 md:grid-cols-2">
        <Panel>
          <PanelHeader
            kicker="EWS · KELEMBAPAN"
            title={`Soil Moisture Trend (${moistureSpan})`}
            subtitle={`${allBlocks ? "All stations" : division} average (%) · follows falling water table`}
            action={<RangeMenu value={dateRange} onSelect={setDateRange} />}
          />
          <div className="h-[220px] px-1 pb-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={shownMoisture} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="day" {...axisProps} />
                <YAxis domain={[20, 80]} tickFormatter={(v: number) => `${v}%`} {...axisProps} width={40} />
                {MOISTURE_BANDS.map((b) => (
                  <ReferenceArea key={b.level} {...bandProps(b)} />
                ))}
                {MOISTURE_LINES.map((t) => (
                  <ReferenceLine key={t.y} {...lineProps(t)} />
                ))}
                <Tooltip {...tooltipStyle} formatter={withUnit("%")} />
                <Line
                  dataKey="value"
                  name="Soil Moisture"
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
          <PanelHeader
            kicker="STASIUN · KEDALAMAN"
            title="Peat Depth by Block"
            subtitle="Station average depth (cm) · ≥ 300 cm protected"
            action={<OpenInTwin variant="link" layer="peatDepth" label="Twin layer" />}
          />
          <div className="h-[220px] px-1 pb-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={blockStats} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="block" {...axisProps} />
                <YAxis domain={[250, 340]} tickFormatter={(v: number) => `${v} cm`} {...axisProps} width={50} />
                <ReferenceLine
                  y={DEEP_PEAT_CM}
                  stroke="#7dd3fc"
                  strokeDasharray="4 3"
                  strokeOpacity={0.7}
                  label={{ value: "Gambut dalam ≥ 3 m, kawasan lindung", position: "insideTopLeft", fontSize: 9, fill: "#7dd3fc" }}
                />
                <Tooltip {...tooltipStyle} formatter={withUnit("cm")} />
                <Bar dataKey="depth" name="Peat Depth" radius={[4, 4, 0, 0]} maxBarSize={34}>
                  {blockStats.map((b) => (
                    <Cell key={b.block} fill={BLOCK_COLOR[b.block]} fillOpacity={matchesBlock(b.block, division) ? 0.9 : 0.25} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* ROW 2: Soil temp area + CO₂ flux bar */}
      <div className="grid gap-4 md:grid-cols-2">
        <Panel>
          <PanelHeader
            kicker="STASIUN · SUHU"
            title="Soil Temperature (24h)"
            subtitle={`${allBlocks ? "Station" : division} average (°C) · 9 Sep 12:00 – 10 Sep 09:00`}
            action={<ViewAll href="#pms-stations" label="Per Station" />}
          />
          <div className="h-[220px] px-1 pb-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={soilTemp} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                <defs>
                  <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb923c" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#fb923c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="t" {...axisProps} />
                <YAxis domain={[25, 32]} tickFormatter={(v: number) => `${v}°C`} {...axisProps} width={42} />
                <Tooltip {...tooltipStyle} formatter={withUnit("°C")} />
                <Area
                  dataKey="temp"
                  name="Soil Temp"
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
          <PanelHeader
            kicker="TWIN · EMISI"
            title="CO₂ Flux by Block"
            subtitle="t CO₂/ha/yr · twin model from water table (0.91 per cm drainage)"
            action={<ViewAll href="/digital-twin" label="Open Twin" />}
          />
          <div className="h-[220px] px-1 pb-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={blockStats} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="block" {...axisProps} />
                <YAxis domain={[0, 70]} {...axisProps} width={32} />
                <ReferenceLine
                  y={CO2_AT_COMPLIANCE}
                  stroke={EWS_META.siaga.color}
                  strokeDasharray="4 3"
                  strokeOpacity={0.7}
                  label={{
                    value: `PP 57/2016 setara (−40 cm) · ${CO2_AT_COMPLIANCE}`,
                    position: "insideTopLeft",
                    fontSize: 9,
                    fill: EWS_META.siaga.color,
                  }}
                />
                <Tooltip {...tooltipStyle} formatter={withUnit("t/ha/yr")} />
                <Bar dataKey="co2" name="CO₂ Flux" radius={[4, 4, 0, 0]} maxBarSize={34}>
                  {blockStats.map((b) => (
                    <Cell
                      key={b.block}
                      fill={EWS_META[ewsFromWaterTable(b.waterTable)].color}
                      fillOpacity={matchesBlock(b.block, division) ? 0.9 : 0.25}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* BOTTOM: Stations table + penampang gambut twin */}
      <div id="pms-stations" className="grid scroll-mt-4 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel>
          <PanelHeader
            kicker="TELEMETRI · LORAWAN"
            title="Peat Monitoring Stations"
            subtitle={`Latest reading 10 Sep 09:37 · ${visibleRows.length} of ${rows.length} stations · network ${NETWORK}`}
            action={<ViewAll href="/map-view" label="View on Map" />}
          />
          <div className="flex flex-wrap items-center gap-1.5 px-3 pb-3" role="group" aria-label="Division filter (header)">
            {DIVISION_OPTIONS.map((b) => {
              const active = b === division
              return (
                <button
                  key={b}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setDivision(b)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors",
                    active
                      ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                      : "text-white/55 hover:text-white/80"
                  )}
                >
                  {b}
                </button>
              )
            })}
          </div>
          <TableScroll>
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr>
                  <th className={tableTh}>Station</th>
                  <th className={tableTh}>Block</th>
                  <th className={cn(tableTh, "text-right")}>Peat Depth (cm)</th>
                  <th className={cn(tableTh, "text-right")}>Soil Moisture (%)</th>
                  <th className={cn(tableTh, "text-right")}>Soil Temp (°C)</th>
                  <th className={cn(tableTh, "text-right")}>CO₂ Flux (t/ha/yr)</th>
                  <th className={tableTh}>Status</th>
                  <th className={cn(tableTh, "text-right")}>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((r) => {
                  const open = expanded === r.code
                  const detailId = `pms-detail-${r.code}`
                  return (
                    <Fragment key={r.code}>
                      <tr className={tableRow}>
                        <td className={tableTd}>
                          <button
                            type="button"
                            aria-expanded={open}
                            aria-controls={detailId}
                            onClick={() => setExpanded(open ? null : r.code)}
                            className="inline-flex items-center gap-1 rounded font-mono font-medium text-white/85 hover:text-emerald-300 focus-visible:outline-2 focus-visible:outline-emerald-400/60"
                          >
                            <ChevronRightIcon className={cn("size-3.5 transition-transform", open && "rotate-90")} />
                            {r.code}
                          </button>
                        </td>
                        <td className={cn(tableTd, "text-white/60")}>{r.block}</td>
                        <td className={cn(tableTd, "text-right tabular-nums text-white/70")}>{r.peatDepth ?? "—"}</td>
                        <td
                          className={cn(tableTd, "text-right font-medium tabular-nums")}
                          style={{ color: r.level === "offline" ? undefined : EWS_META[r.level].color }}
                        >
                          {r.moisture ?? "OFFLINE"}
                        </td>
                        <td className={cn(tableTd, "text-right tabular-nums text-white/70")}>{r.soilTemp?.toFixed(1) ?? "—"}</td>
                        <td className={cn(tableTd, "text-right tabular-nums text-white/70")}>{r.co2.toFixed(1)}</td>
                        <td className={tableTd}>
                          <EwsPill level={r.level} pulse={r.level === "awas"} />
                        </td>
                        <td className={cn(tableTd, "text-right")}>
                          <OpenInTwin variant="icon" asset={r.code} layer="soilMoisture" />
                        </td>
                      </tr>
                      {open && (
                        <tr id={detailId} className="border-t border-white/[0.04] bg-emerald-400/[0.03]">
                          <td colSpan={8} className="px-4 py-3">
                            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[11.5px] sm:grid-cols-3 lg:grid-cols-6">
                              <div>
                                <dt className="text-white/50">Coordinates</dt>
                                <dd className="font-mono text-white/80">{formatLatLng(r.lat, r.lng)}</dd>
                              </div>
                              <div>
                                <dt className="text-white/50">Block water table (twin)</dt>
                                <dd className="font-mono" style={{ color: EWS_META[ewsFromWaterTable(r.blockWt)].color }}>
                                  {fmtNum(r.blockWt)} cm
                                </dd>
                              </div>
                              <div>
                                <dt className="text-white/50">Battery</dt>
                                <dd className="text-white/80">{r.battery}%</dd>
                              </div>
                              <div>
                                <dt className="text-white/50">Signal</dt>
                                <dd>
                                  <StatusDot tone={SIGNAL_TONE[r.signal]} label={r.signal} />
                                </dd>
                              </div>
                              <div>
                                <dt className="text-white/50">Last seen</dt>
                                <dd className="font-mono text-white/80">{r.lastSeen}</dd>
                              </div>
                              <div>
                                <dt className="text-white/50">Digital twin</dt>
                                <dd>
                                  <OpenInTwin
                                    variant="link"
                                    asset={r.code}
                                    layer="soilMoisture"
                                    label={r.twinId ? `3D sensor ${r.twinId}` : `Open ${r.block}`}
                                  />
                                </dd>
                              </div>
                            </dl>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
                {visibleRows.length === 0 && (
                  <tr className={tableRow}>
                    <td className={cn(tableTd, "text-center text-white/50")} colSpan={8}>
                      Tidak ada stasiun di {division}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableScroll>
        </Panel>

        <Panel>
          <PanelHeader
            kicker="DIGITAL TWIN · PENAMPANG GAMBUT"
            icon={LayersIcon}
            title={`Peat Cross-Section · ${section.block}`}
            subtitle={
              allBlocks
                ? "Deepest water table block · live 10 Sep 09:37"
                : "Twin water table · station moisture & depth · 10 Sep 09:37"
            }
          />
          <div className="px-3">
            <PeatCrossSection
              block={section.block}
              waterTable={section.waterTable}
              moisture={section.moisture}
              peatDepth={section.depth}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 px-4 pb-3 pt-3">
            <div>
              <span className="kicker block text-white/55">Water table</span>
              <span className="block text-[15px] font-semibold tabular-nums text-white">{fmtNum(section.waterTable)} cm</span>
              <EwsPill className="mt-1" level={ewsFromWaterTable(section.waterTable)} />
            </div>
            <div>
              <span className="kicker block text-white/55">Moisture</span>
              <span className="block text-[15px] font-semibold tabular-nums text-white">{section.moisture}%</span>
              <EwsPill className="mt-1" level={ewsFromMoisture(section.moisture)} />
            </div>
            <div>
              <span className="kicker block text-white/55">Peat depth</span>
              <span className="block text-[15px] font-semibold tabular-nums text-white">{section.depth} cm</span>
              <span className="mt-1 block text-[10.5px] text-white/55">
                {section.depth >= DEEP_PEAT_CM ? "Deep peat · protected" : "Below 3 m"}
              </span>
            </div>
          </div>
          <div className="mt-auto flex items-center justify-between gap-2 border-t border-white/[0.06] px-4 py-3">
            <span className="text-[11px] text-white/55">Layer kelembapan tanah di twin 3D</span>
            <OpenInTwin block={section.block} layer="soilMoisture" />
          </div>
        </Panel>
      </div>
    </PeatShell>
  )
}
