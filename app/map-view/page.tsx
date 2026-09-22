"use client"

import { useMemo, useState } from "react"
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import {
  ActivityIcon,
  ClockIcon,
  LayersIcon,
  MapPinnedIcon,
  RadioTowerIcon,
  WifiOffIcon,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

import { PeatShell } from "@/components/peatland/peat-shell"
import { Panel, PanelHeader, ViewAll } from "@/components/peatland/panel"
import { EstateMap } from "@/components/peatland/estate-map"
import { cn } from "@/lib/utils"

type Tone = "normal" | "warning" | "critical" | "info" | "offline"

const valueTone: Record<Tone, string> = {
  normal: "text-emerald-400",
  warning: "text-amber-400",
  critical: "text-red-400",
  info: "text-sky-400",
  offline: "text-white/55",
}

const iconTone: Record<Tone, string> = {
  normal: "bg-emerald-500/12 text-emerald-400 ring-emerald-500/20",
  warning: "bg-amber-500/12 text-amber-400 ring-amber-500/20",
  critical: "bg-red-500/12 text-red-400 ring-red-500/20",
  info: "bg-sky-500/12 text-sky-400 ring-sky-500/20",
  offline: "bg-slate-500/12 text-white/55 ring-slate-500/20",
}

function StatTile({
  label,
  value,
  unit,
  icon: Icon,
  tone,
  delta,
}: {
  label: string
  value: string
  unit?: string
  icon: LucideIcon
  tone: Tone
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
      {delta && (
        <div className="flex items-center gap-1 border-t border-white/5 pt-2 text-[11px]">
          <span className="text-white/40">{delta}</span>
        </div>
      )}
    </div>
  )
}

// key selaras dengan layer aset di EstateMap / map-points (lihat [[map-points]]).
const layers = [
  { key: "borehole", name: "Borehole", color: "#38bdf8", count: 34 },
  { key: "water-station", name: "Water Table Station", color: "#22c55e", count: 28 },
  { key: "rain-gauge", name: "Rain Gauge", color: "#84cc16", count: 12 },
  { key: "water-gate", name: "Water Gate", color: "#fb923c", count: 9 },
  { key: "canal", name: "Canal", color: "#64748b", count: 22 },
  { key: "peat-station", name: "Peat Monitoring Station", color: "#f59e0b", count: 18 },
  { key: "fire-hotspot", name: "Fire Hotspot", color: "#ef4444", count: 4 },
  { key: "plantation-block", name: "Plantation Block", color: "#a3e635", count: 12 },
]

const statusBreakdown = [
  { label: "Normal", count: 96, color: "#22c55e" },
  { label: "Warning", count: 24, color: "#f59e0b" },
  { label: "Critical", count: 11, color: "#ef4444" },
  { label: "Offline", count: 8, color: "#64748b" },
]

type StationStatus = "normal" | "warning" | "critical" | "offline"

const statusStyle: Record<StationStatus, { text: string; dot: string; label: string }> = {
  normal: { text: "text-emerald-400", dot: "bg-emerald-500", label: "Normal" },
  warning: { text: "text-amber-400", dot: "bg-amber-500", label: "Warning" },
  critical: { text: "text-red-400", dot: "bg-red-500", label: "Critical" },
  offline: { text: "text-white/45", dot: "bg-slate-500", label: "Offline" },
}

const initialStations: {
  id: string
  type: string
  block: string
  coords: string
  status: StationStatus
  updated: string
}[] = [
  { id: "BH-014", type: "Borehole", block: "Block A-3", coords: "0.421°S, 102.118°E", status: "normal", updated: "2 min ago" },
  { id: "WTS-007", type: "Water Table Station", block: "Block B-1", coords: "0.438°S, 102.097°E", status: "warning", updated: "3 min ago" },
  { id: "RG-002", type: "Rain Gauge", block: "Block C-2", coords: "0.402°S, 102.143°E", status: "normal", updated: "1 min ago" },
  { id: "PMS-021", type: "Peat Monitoring Station", block: "Block A-1", coords: "0.456°S, 102.081°E", status: "critical", updated: "5 min ago" },
  { id: "WTG-005", type: "Water Gate", block: "Block D-4", coords: "0.389°S, 102.162°E", status: "normal", updated: "2 min ago" },
  { id: "BH-029", type: "Borehole", block: "Block B-3", coords: "0.447°S, 102.109°E", status: "offline", updated: "47 min ago" },
  { id: "PMS-013", type: "Peat Monitoring Station", block: "Block C-1", coords: "0.411°S, 102.134°E", status: "warning", updated: "4 min ago" },
  { id: "RG-006", type: "Rain Gauge", block: "Block D-2", coords: "0.395°S, 102.151°E", status: "normal", updated: "1 min ago" },
]

const th = "px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-white/35"
const td = "px-3 py-2 text-[12px]"

function StatusPill({ status }: { status: StationStatus }) {
  const s = statusStyle[status]
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11.5px] font-medium", s.text)}>
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  )
}

const statusFilters = [
  { key: "all", label: "All" },
  { key: "normal", label: "Normal" },
  { key: "warning", label: "Warning" },
  { key: "critical", label: "Critical" },
  { key: "offline", label: "Offline" },
] as const

type StatusFilter = (typeof statusFilters)[number]["key"]

export default function MapViewPage() {
  const totalMarkers = statusBreakdown.reduce((sum, s) => sum + s.count, 0)

  // Visibilitas layer — sumber kebenaran tunggal yang mengendalikan peta (EstateMap)
  // sekaligus tampilan Layer Legend di sidebar. true = tampil.
  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(layers.map((l) => [l.key, true]))
  )
  const activeLayerCount = layers.filter((l) => visibleLayers[l.key]).length

  const toggleLayer = (key: string) => {
    setVisibleLayers((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleAllLayers = (target: boolean) => {
    setVisibleLayers(Object.fromEntries(layers.map((l) => [l.key, target])))
  }

  // Station directory: filter + sync feedback
  const [stations, setStations] = useState(initialStations)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  const visibleStations = useMemo(
    () => (statusFilter === "all" ? stations : stations.filter((s) => s.status === statusFilter)),
    [stations, statusFilter]
  )

  const handleSync = () => {
    const id = toast.loading("Menyinkronkan stasiun…")
    setTimeout(() => {
      setStations((prev) => prev.map((s) => ({ ...s, updated: "baru saja" })))
      toast.success("Data stasiun diperbarui", { id })
    }, 900)
  }

  const handleStationClick = (id: string, status: StationStatus) => {
    toast(`Stasiun ${id}`, { description: `Status: ${statusStyle[status].label}` })
  }

  return (
    <PeatShell title="Map View" subtitle="Estate-wide Asset & Sensor Map">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Total Stations" value="139" icon={RadioTowerIcon} tone="info" delta="across 12 blocks" />
        <StatTile label="Online" value="128" icon={ActivityIcon} tone="normal" delta="92.1% uptime" />
        <StatTile label="Offline" value="11" icon={WifiOffIcon} tone="critical" delta="needs attention" />
        <StatTile label="Layers Active" value={String(activeLayerCount)} icon={LayersIcon} tone="info" delta={`of ${layers.length} layers`} />
        <StatTile label="Area Monitored" value="5,110" unit="ha" icon={MapPinnedIcon} tone="normal" delta="estate coverage" />
        <StatTile label="Last Sync" value="2 min" unit="ago" icon={ClockIcon} tone="normal" delta="auto every 5 min" />
      </div>

      {/* Main map row */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        <div className="h-[520px]">
          <EstateMap
            title="Estate Asset Map"
            subtitle="Live sensor & infrastructure positions"
            headerAction={<ViewAll label="Export" onClick={() => toast.info("Mengekspor peta…")} />}
            layers={visibleLayers}
            onToggleLayer={toggleLayer}
            onToggleAll={toggleAllLayers}
            showLayerPanel={false}
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Panel>
            <PanelHeader title="Layer Legend" subtitle="Visible map layers" />
            <div className="flex flex-col gap-0.5 px-2 pb-3">
              {layers.map((l) => {
                const hidden = !visibleLayers[l.key]
                return (
                  <button
                    key={l.key}
                    onClick={() => toggleLayer(l.key)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left hover:bg-white/[0.03]",
                      hidden && "opacity-40"
                    )}
                  >
                    <span className="flex items-center gap-2.5 text-[12px] text-white/70">
                      <span
                        className={cn("size-2.5 rounded-full ring-2 ring-white/5", hidden && "ring-white/10")}
                        style={{ background: hidden ? "transparent" : l.color, boxShadow: hidden ? `inset 0 0 0 1.5px ${l.color}` : undefined }}
                      />
                      {l.name}
                    </span>
                    <span className="text-[12px] font-semibold tabular-nums text-white/85">{l.count}</span>
                  </button>
                )
              })}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Quick Stats" subtitle="Markers by status" />
            <div className="flex items-center gap-3 px-4 pb-4 pt-1">
              <div className="relative h-[110px] w-[110px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      contentStyle={{
                        background: "#10201a",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      labelStyle={{ color: "rgba(255,255,255,0.6)" }}
                    />
                    <Pie
                      data={statusBreakdown}
                      dataKey="count"
                      nameKey="label"
                      innerRadius={32}
                      outerRadius={52}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {statusBreakdown.map((s) => (
                        <Cell key={s.label} fill={s.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[18px] font-bold leading-none text-white">{totalMarkers}</span>
                  <span className="text-[9px] uppercase tracking-wide text-white/40">markers</span>
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                {statusBreakdown.map((s) => (
                  <div key={s.label} className="flex items-center justify-between text-[12px]">
                    <span className="flex items-center gap-2 text-white/65">
                      <span className="size-1.5 rounded-full" style={{ background: s.color }} />
                      {s.label}
                    </span>
                    <span className="font-semibold tabular-nums text-white/85">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {/* Station directory */}
      <div className="grid grid-cols-1 gap-4">
        <Panel>
          <div className="flex items-center justify-between px-4 pb-1 pt-3.5">
            <div>
              <h3 className="text-[14px] font-semibold text-white">Station Directory</h3>
              <p className="text-[11px] text-white/40">All registered sensors & infrastructure assets</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSync}
                className="text-[11.5px] font-medium text-emerald-400 transition-colors hover:text-emerald-300"
              >
                Sync
              </button>
              <ViewAll />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 px-4 pb-2 pt-1">
            {statusFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                  statusFilter === f.key
                    ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                    : "text-white/45 hover:text-white/70"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className={th}>ID</th>
                <th className={th}>Type</th>
                <th className={th}>Block</th>
                <th className={th}>Coordinates</th>
                <th className={th}>Status</th>
                <th className={cn(th, "text-right")}>Last Update</th>
              </tr>
            </thead>
            <tbody>
              {visibleStations.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => handleStationClick(s.id, s.status)}
                  className="cursor-pointer border-t border-white/5 hover:bg-white/[0.03]"
                >
                  <td className={cn(td, "font-medium text-white/85")}>{s.id}</td>
                  <td className={cn(td, "text-white/55")}>{s.type}</td>
                  <td className={cn(td, "text-white/70")}>{s.block}</td>
                  <td className={cn(td, "font-mono text-[11px] text-white/55")}>{s.coords}</td>
                  <td className={td}>
                    <StatusPill status={s.status} />
                  </td>
                  <td className={cn(td, "text-right text-white/55")}>{s.updated}</td>
                </tr>
              ))}
              {visibleStations.length === 0 && (
                <tr className="border-t border-white/5">
                  <td className={cn(td, "text-white/40")} colSpan={6}>
                    Tidak ada stasiun untuk filter ini
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
