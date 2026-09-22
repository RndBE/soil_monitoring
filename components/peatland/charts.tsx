"use client"

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
import { scaleNumber, sliceSeries } from "@/lib/peatland/filter-logic"
import { useDashboardFilters } from "@/lib/peatland/filters"
import { Panel } from "./panel"

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

function Legend({ items }: { items: { label: string; color: string; shape?: "line" | "box" }[] }) {
  return (
    <div className="flex items-center gap-4 px-4 pb-1">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5 text-[10.5px] text-white/55">
          <span
            className={i.shape === "box" ? "size-2.5 rounded-[3px]" : "h-0.5 w-3.5 rounded-full"}
            style={{ background: i.color }}
          />
          {i.label}
        </span>
      ))}
    </div>
  )
}

export function WaterTableChart() {
  const { estate, dateRange } = useDashboardFilters()
  const data = sliceSeries(waterTableTrend, dateRange).map((d) => ({ ...d, value: scaleNumber(d.value, estate) }))
  return (
    <Panel className="h-full">
      <div className="px-4 pb-1 pt-3.5">
        <h3 className="text-[14px] font-semibold text-white">Water Table Trend</h3>
        <p className="text-[11px] text-white/40">All Borehole Average</p>
      </div>
      <div className="h-[180px] px-1 pb-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
            <XAxis dataKey="day" {...axisProps} />
            <YAxis domain={[-60, -10]} {...axisProps} width={34} />
            <ReferenceArea y1={-30} y2={-10} fill="#22c55e" fillOpacity={0.06} />
            <ReferenceArea y1={-40} y2={-30} fill="#f59e0b" fillOpacity={0.06} />
            <ReferenceArea y1={-60} y2={-40} fill="#ef4444" fillOpacity={0.07} />
            <ReferenceLine y={-30} stroke="#22c55e" strokeDasharray="4 3" strokeOpacity={0.6} label={{ value: "Target (-30 cm)", position: "insideTopLeft", fontSize: 9, fill: "#34d399" }} />
            <ReferenceLine y={-40} stroke="#f59e0b" strokeDasharray="4 3" strokeOpacity={0.6} label={{ value: "Warning (-40 cm)", position: "insideTopLeft", fontSize: 9, fill: "#fbbf24" }} />
            <ReferenceLine y={-60} stroke="#ef4444" strokeDasharray="4 3" strokeOpacity={0.6} label={{ value: "Critical (-60 cm)", position: "insideTopLeft", fontSize: 9, fill: "#f87171" }} />
            <Tooltip {...tooltipStyle} />
            <Line
              dataKey="value"
              name="Water Table"
              type="monotone"
              stroke="#38bdf8"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#38bdf8" }}
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
  return (
    <Panel className="h-full">
      <div className="px-4 pb-1 pt-3.5">
        <h3 className="text-[14px] font-semibold text-white">Rainfall &amp; Water Table Correlation</h3>
      </div>
      <Legend
        items={[
          { label: "Rainfall (mm)", color: "#38bdf8", shape: "box" },
          { label: "Water Table (cm)", color: "#22c55e", shape: "line" },
        ]}
      />
      <div className="h-[170px] px-1 pb-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ left: 0, right: 4, top: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
            <XAxis dataKey="day" {...axisProps} />
            <YAxis yAxisId="left" domain={[0, 100]} {...axisProps} width={28} />
            <YAxis yAxisId="right" orientation="right" domain={[-100, 0]} {...axisProps} width={32} />
            <Tooltip {...tooltipStyle} />
            <Bar yAxisId="left" dataKey="rainfall" name="Rainfall (mm)" fill="#38bdf8" radius={[3, 3, 0, 0]} barSize={18} />
            <Line
              yAxisId="right"
              dataKey="waterTable"
              name="Water Table (cm)"
              type="monotone"
              stroke="#22c55e"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#22c55e" }}
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
  return (
    <Panel className="h-full">
      <div className="px-4 pb-1 pt-3.5">
        <h3 className="text-[14px] font-semibold text-white">Fire Risk Trend</h3>
      </div>
      <div className="h-[180px] px-1 pb-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
            <defs>
              <linearGradient id="fireGrad" x1="0" y1="0" x2="0" y2="1">
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
            <Area dataKey="value" type="monotone" stroke="none" fill="url(#fireGrad)" />
            <Line
              dataKey="value"
              name="Fire Risk"
              type="monotone"
              stroke="#ef4444"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#ef4444" }}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  )
}
