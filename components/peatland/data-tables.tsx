import {
  boreholeStatus,
  peatMonitoring,
  plantationHealth,
  type NdviRow,
  type StatusLevel,
} from "@/lib/peatland/mock-data"
import { cn } from "@/lib/utils"
import { Panel, ViewAll } from "./panel"

const statusStyle: Record<StatusLevel, { text: string; dot: string; label: string }> = {
  normal: { text: "text-emerald-400", dot: "bg-emerald-500", label: "Normal" },
  warning: { text: "text-amber-400", dot: "bg-amber-500", label: "Warning" },
  critical: { text: "text-red-400", dot: "bg-red-500", label: "Critical" },
  offline: { text: "text-white/45", dot: "bg-slate-500", label: "Offline" },
}

function StatusPill({ status }: { status: StatusLevel }) {
  const s = statusStyle[status]
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11.5px] font-medium", s.text)}>
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  )
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const w = 56
  const h = 18
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(" ")
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const th = "px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-white/35"
const td = "px-3 py-2 text-[12px]"

export function BoreholeTable() {
  return (
    <Panel>
      <div className="flex items-center justify-between px-4 pb-1 pt-3.5">
        <h3 className="text-[14px] font-semibold text-white">Borehole Status</h3>
        <ViewAll />
      </div>
      <table className="w-full text-left">
        <thead>
          <tr>
            <th className={th}>ID</th>
            <th className={th}>Location</th>
            <th className={th}>Water Level</th>
            <th className={th}>Status</th>
            <th className={cn(th, "text-right")}>Trend (3D)</th>
          </tr>
        </thead>
        <tbody>
          {boreholeStatus.map((r) => {
            const s = statusStyle[r.status]
            const sparkColor =
              r.status === "critical" ? "#ef4444" : r.status === "warning" ? "#f59e0b" : "#22c55e"
            return (
              <tr key={r.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                <td className={cn(td, "font-medium text-white/85")}>{r.id}</td>
                <td className={cn(td, "text-white/55")}>{r.location}</td>
                <td className={cn(td, s.text, "font-medium")}>{r.waterLevel} cm</td>
                <td className={td}>
                  <StatusPill status={r.status} />
                </td>
                <td className={cn(td, "flex justify-end")}>
                  <Sparkline data={r.trend} color={sparkColor} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Panel>
  )
}

export function PeatTable() {
  return (
    <Panel>
      <div className="flex items-center justify-between px-4 pb-1 pt-3.5">
        <h3 className="text-[14px] font-semibold text-white">
          Peat Monitoring <span className="text-[11px] font-normal text-white/35">(Latest)</span>
        </h3>
        <ViewAll />
      </div>
      <table className="w-full text-left">
        <thead>
          <tr>
            <th className={th}>Station</th>
            <th className={th}>Peat Depth</th>
            <th className={th}>Soil Moisture</th>
            <th className={th}>Soil Temp</th>
            <th className={cn(th, "text-right")}>Status</th>
          </tr>
        </thead>
        <tbody>
          {peatMonitoring.map((r) => (
            <tr key={r.station} className="border-t border-white/5 hover:bg-white/[0.03]">
              <td className={cn(td, "font-medium text-white/85")}>{r.station}</td>
              <td className={cn(td, "text-white/70")}>{r.peatDepth} cm</td>
              <td className={cn(td, "text-white/70")}>{r.soilMoisture}%</td>
              <td className={cn(td, "text-white/70")}>{r.soilTemp.toFixed(1)}°C</td>
              <td className={cn(td, "text-right")}>
                <StatusPill status={r.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  )
}

const ndviBar: Record<NdviRow["healthTone"], string> = {
  "very-good": "bg-emerald-500",
  good: "bg-lime-500",
  moderate: "bg-amber-500",
  poor: "bg-red-500",
}
const ndviText: Record<NdviRow["healthTone"], string> = {
  "very-good": "text-emerald-400",
  good: "text-lime-400",
  moderate: "text-amber-400",
  poor: "text-red-400",
}

export function NdviTable() {
  return (
    <Panel>
      <div className="flex items-center justify-between px-4 pb-1 pt-3.5">
        <h3 className="text-[14px] font-semibold text-white">Plantation Health (NDVI)</h3>
        <ViewAll />
      </div>
      <table className="w-full text-left">
        <thead>
          <tr>
            <th className={th}>Block</th>
            <th className={th}>NDVI</th>
            <th className={th}>Health Status</th>
            <th className={cn(th, "text-right")}>Area (Ha)</th>
          </tr>
        </thead>
        <tbody>
          {plantationHealth.map((r) => (
            <tr key={r.block} className="border-t border-white/5 hover:bg-white/[0.03]">
              <td className={cn(td, "font-medium text-white/85")}>{r.block}</td>
              <td className={cn(td, "font-medium text-white/80")}>{r.ndvi.toFixed(2)}</td>
              <td className={td}>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
                    <div className={cn("h-full rounded-full", ndviBar[r.healthTone])} style={{ width: `${r.ndvi * 100}%` }} />
                  </div>
                  <span className={cn("text-[11.5px] font-medium", ndviText[r.healthTone])}>{r.health}</span>
                </div>
              </td>
              <td className={cn(td, "text-right text-white/70")}>{r.area.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  )
}
