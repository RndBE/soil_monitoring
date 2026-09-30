"use client"

import { useMemo } from "react"
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { fireRiskTrend, rainfallCorrelation, waterTableTrend } from "@/lib/peatland/mock-data"
import {
  SCENARIO_PRESETS,
  TWIN_BLOCKS,
  buildHistoryFrames,
  ewsFromFireRisk,
  getBlockBaseline,
  simulateScenario,
  summarizeFrame,
} from "@/lib/peatland/digital-twin"
import { ALL_BLOCKS, scaleNumber, sliceSeries } from "@/lib/peatland/filter-logic"
import { useDashboardFilters } from "@/lib/peatland/filters"
import {
  FIRE_BANDS,
  FIRE_LINES,
  WT_BANDS,
  WT_LINES,
  axisProps,
  bandProps,
  gridProps,
  lineProps,
  tooltipStyle,
  withUnit,
} from "./chart-theme"
import { OpenInTwin } from "./open-in-twin"
import { Panel, PanelHeader } from "./panel"
import { EwsPill } from "./status"

const CHART_H = "h-[220px]"
const WT_COLOR = "#38bdf8"
const RAIN_COLOR = "#38bdf8"
const WT_LINE_COLOR = "#46d78f"
const FIRE_COLOR = "#f87171"
const FORECAST_DAYS = 3
const FORECAST_NAME = "Twin forecast"

type LegendItem = { label: string; color: string; shape?: "line" | "dash" | "box" }

function Legend({ items }: { items: LegendItem[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pb-1">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5 text-[10.5px] text-white/60">
          {i.shape === "dash" ? (
            <svg width="14" height="4" aria-hidden>
              <line x1="0" y1="2" x2="14" y2="2" stroke={i.color} strokeWidth="2" strokeDasharray="3 2" />
            </svg>
          ) : (
            <span
              className={i.shape === "box" ? "size-2.5 rounded-[3px]" : "h-0.5 w-3.5 rounded-full"}
              style={{ background: i.color }}
            />
          )}
          {i.label}
        </span>
      ))}
    </div>
  )
}

/** Domain Y muka air: minimal [−70, 0], melebar bila data lebih dalam supaya tidak terpotong. */
function wtDomain(values: number[]): [number, number] {
  const min = Math.min(...values)
  return [Math.min(-70, Math.floor((min - 6) / 10) * 10), 0]
}

function ticksFor([lo, hi]: [number, number]): number[] {
  const step = hi - lo > 80 ? 20 : 10
  const out: number[] = []
  for (let v = lo; v <= hi; v += step) out.push(v)
  return out
}

type WtPoint = { day: string; value?: number; forecast?: number }

export function WaterTableChart() {
  const { estate, division, dateRange } = useDashboardFilters()
  const allBlocks = division === ALL_BLOCKS || !TWIN_BLOCKS.includes(division)

  const data = useMemo<WtPoint[]>(() => {
    const blocks = allBlocks ? TWIN_BLOCKS : [division]
    const baseline = getBlockBaseline(estate)
    const history = buildHistoryFrames(baseline)
    // Semua block = rata-rata borehole estate (sama dengan KPI); satu block = histori twin block itu.
    const measured = allBlocks
      ? waterTableTrend.map((d) => ({ day: d.day, value: scaleNumber(d.value, estate) }))
      : history.map((f) => ({ day: f.label, value: summarizeFrame(f, baseline, blocks).waterTable }))
    const shown: WtPoint[] = sliceSeries(measured, dateRange)
    if (shown.length === 0) return shown

    // Prakiraan twin (skenario baseline, 11–13 Sep) disambung dari titik live terakhir.
    const live = history[history.length - 1]
    const last = shown[shown.length - 1]
    const offset = (last.value ?? 0) - summarizeFrame(live, baseline, blocks).waterTable
    const forecast = simulateScenario(baseline, { ...SCENARIO_PRESETS[0].scenario, days: FORECAST_DAYS }).map((f) => ({
      day: f.label,
      forecast: summarizeFrame(f, baseline, blocks).waterTable + offset,
    }))
    return [...shown.slice(0, -1), { ...last, forecast: last.value }, ...forecast]
  }, [estate, dateRange, allBlocks, division])

  const values = data.flatMap((d) => [d.value, d.forecast]).filter((v): v is number => v != null)
  const domain = wtDomain(values)
  // Area prakiraan: dari titik live (sambungan) sampai hari prakiraan terakhir.
  const liveDay = data.find((d) => d.value != null && d.forecast != null)?.day
  const lastDay = data[data.length - 1]?.day

  return (
    <Panel className="h-full">
      <PanelHeader
        kicker="EWS · Muka air"
        title="Water Table Trend"
        subtitle={`${allBlocks ? "All borehole average" : `${division} · twin block average`} · cm below surface`}
        action={<OpenInTwin variant="link" layer="waterTable" block={allBlocks ? undefined : division} />}
      />
      <Legend
        items={[
          { label: "Measured", color: WT_COLOR },
          { label: `${FORECAST_NAME} · baseline`, color: WT_COLOR, shape: "dash" },
        ]}
      />
      <div className={`${CHART_H} px-1 pb-2`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="day" {...axisProps} />
            <YAxis domain={domain} ticks={ticksFor(domain)} unit=" cm" {...axisProps} width={48} />
            {WT_BANDS.map((b) => (
              <ReferenceArea key={b.level} {...bandProps(b)} />
            ))}
            {liveDay && lastDay && liveDay !== lastDay && (
              <ReferenceArea
                x1={liveDay}
                x2={lastDay}
                fill="#ffffff"
                fillOpacity={0.035}
                label={{ value: "Forecast", position: "insideTopRight", fontSize: 9, fill: "rgba(255,255,255,0.55)" }}
              />
            )}
            {WT_LINES.map((t) => (
              <ReferenceLine key={t.y} {...lineProps(t)} />
            ))}
            <Tooltip
              {...tooltipStyle}
              formatter={(value, name, item) =>
                // Titik sambungan live punya dua nilai sama; cukup tampilkan yang terukur.
                name === FORECAST_NAME && (item.payload as WtPoint | undefined)?.value != null ? null : withUnit("cm")(value)
              }
            />
            <Line
              dataKey="value"
              name="Measured"
              type="monotone"
              stroke={WT_COLOR}
              strokeWidth={2.5}
              dot={{ r: 3, fill: WT_COLOR }}
              activeDot={{ r: 4 }}
            />
            <Line
              dataKey="forecast"
              name={FORECAST_NAME}
              type="monotone"
              stroke={WT_COLOR}
              strokeOpacity={0.75}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={{ r: 2.5, fill: "#04100b", stroke: WT_COLOR, strokeWidth: 1.5 }}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  )
}

export function RainfallCorrelationChart() {
  const { estate, dateRange } = useDashboardFilters()
  const data = sliceSeries(rainfallCorrelation, dateRange).map((d) => ({
    ...d,
    rainfall: scaleNumber(d.rainfall, estate),
    waterTable: scaleNumber(d.waterTable, estate),
  }))
  const rainMax = Math.max(40, Math.ceil(Math.max(0, ...data.map((d) => d.rainfall)) / 20) * 20)
  const wt = wtDomain(data.map((d) => d.waterTable))
  return (
    <Panel className="h-full">
      <PanelHeader
        kicker="Hidrologi · Hujan × muka air"
        title="Rainfall & Water Table Correlation"
        subtitle="Daily rainfall (mm, left) vs estate water table (cm, right)"
      />
      <Legend
        items={[
          { label: "Rainfall (mm)", color: RAIN_COLOR, shape: "box" },
          { label: "Water Table (cm)", color: WT_LINE_COLOR },
        ]}
      />
      <div className={`${CHART_H} px-1 pb-2`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ left: 0, right: 4, top: 8, bottom: 4 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="day" {...axisProps} />
            <YAxis yAxisId="left" domain={[0, rainMax]} unit=" mm" {...axisProps} width={46} />
            <YAxis yAxisId="right" orientation="right" domain={wt} ticks={ticksFor(wt)} unit=" cm" {...axisProps} width={48} />
            <ReferenceLine yAxisId="right" {...lineProps(WT_LINES[0])} label={{ ...lineProps(WT_LINES[0]).label, position: "insideBottomRight" }} />
            <Tooltip {...tooltipStyle} />
            <Bar yAxisId="left" dataKey="rainfall" name="Rainfall" unit=" mm" fill={RAIN_COLOR} fillOpacity={0.85} radius={[3, 3, 0, 0]} barSize={18} />
            <Line
              yAxisId="right"
              dataKey="waterTable"
              name="Water Table"
              unit=" cm"
              type="monotone"
              stroke={WT_LINE_COLOR}
              strokeWidth={2.5}
              dot={{ r: 3, fill: WT_LINE_COLOR }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  )
}

export function FireRiskChart() {
  const { estate, dateRange } = useDashboardFilters()
  const data = sliceSeries(fireRiskTrend, dateRange).map((d) => ({ ...d, value: Math.min(100, scaleNumber(d.value, estate)) }))
  const latest = data[data.length - 1]?.value
  return (
    <Panel className="h-full">
      <PanelHeader
        kicker="EWS · Risiko api"
        title="Fire Risk Trend"
        subtitle="Estate fire risk index 0–100 · Waspada 50 · Siaga 70 · Awas 85"
        action={latest != null ? <EwsPill level={ewsFromFireRisk(latest)} /> : undefined}
      />
      <Legend items={[{ label: "Fire Risk Index", color: FIRE_COLOR }]} />
      <div className={`${CHART_H} px-1 pb-2`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
            <defs>
              <linearGradient id="fireGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={FIRE_COLOR} stopOpacity={0.32} />
                <stop offset="100%" stopColor={FIRE_COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="day" {...axisProps} />
            <YAxis domain={[0, 100]} ticks={[0, 25, 50, 70, 85, 100]} {...axisProps} width={30} />
            {FIRE_BANDS.map((b) => (
              <ReferenceArea key={b.level} {...bandProps(b)} />
            ))}
            {FIRE_LINES.map((t) => (
              <ReferenceLine key={t.y} {...lineProps(t)} />
            ))}
            <Tooltip {...tooltipStyle} />
            <Area dataKey="value" type="monotone" stroke="none" fill="url(#fireGrad)" tooltipType="none" />
            <Line
              dataKey="value"
              name="Fire Risk Index"
              type="monotone"
              stroke={FIRE_COLOR}
              strokeWidth={2.5}
              dot={{ r: 3, fill: FIRE_COLOR }}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  )
}
