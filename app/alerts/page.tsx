"use client"

import {
  AlertTriangleIcon,
  BellIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ClockIcon,
  FlameIcon,
  InboxIcon,
  InfoIcon,
} from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Panel, PanelHeader, ViewAll } from "@/components/peatland/panel"
import { PeatShell } from "@/components/peatland/peat-shell"
import { cn } from "@/lib/utils"

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

type Tone = "critical" | "warning" | "info" | "good" | "muted"

const valueTone: Record<Tone, string> = {
  critical: "text-red-400",
  warning: "text-amber-400",
  info: "text-sky-400",
  good: "text-emerald-400",
  muted: "text-white/80",
}

const iconTone: Record<Tone, string> = {
  critical: "bg-red-500/12 text-red-400 ring-red-500/20",
  warning: "bg-amber-500/12 text-amber-400 ring-amber-500/20",
  info: "bg-sky-500/12 text-sky-400 ring-sky-500/20",
  good: "bg-emerald-500/12 text-emerald-400 ring-emerald-500/20",
  muted: "bg-white/8 text-white/60 ring-white/15",
}

function StatTile({
  label,
  value,
  unit,
  tone,
  icon: Icon,
  delta,
}: {
  label: string
  value: string
  unit?: string
  tone: Tone
  icon: React.ElementType
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
          <span className="text-white/40">vs yesterday</span>
          <span className="font-semibold text-white/65">{delta}</span>
        </div>
      )}
    </div>
  )
}

const filters = [
  { label: "All", color: "emerald" },
  { label: "Critical", color: "red" },
  { label: "Warning", color: "amber" },
  { label: "Info", color: "sky" },
  { label: "Resolved", color: "slate" },
] as const

type FilterLabel = (typeof filters)[number]["label"]

const dotColor: Record<string, string> = {
  emerald: "bg-emerald-500",
  red: "bg-red-500",
  amber: "bg-amber-500",
  sky: "bg-sky-500",
  slate: "bg-slate-500",
}

const weekly = [
  { day: "Mon", critical: 1, warning: 2, info: 1 },
  { day: "Tue", critical: 0, warning: 3, info: 2 },
  { day: "Wed", critical: 2, warning: 1, info: 1 },
  { day: "Thu", critical: 1, warning: 4, info: 2 },
  { day: "Fri", critical: 3, warning: 2, info: 0 },
  { day: "Sat", critical: 1, warning: 1, info: 3 },
  { day: "Sun", critical: 2, warning: 2, info: 1 },
]

const byCategory = [
  { name: "Water Level", value: 9, color: "#38bdf8" },
  { name: "Fire", value: 4, color: "#ef4444" },
  { name: "Sensor", value: 6, color: "#84cc16" },
  { name: "Weather", value: 3, color: "#fb923c" },
]

type Severity = "critical" | "warning" | "info"
type Status = "Open" | "Acknowledged" | "Resolved"

const severityStyle: Record<Severity, { text: string; dot: string; label: string }> = {
  critical: { text: "text-red-400", dot: "bg-red-500", label: "Critical" },
  warning: { text: "text-amber-400", dot: "bg-amber-500", label: "Warning" },
  info: { text: "text-sky-400", dot: "bg-sky-500", label: "Info" },
}

const statusStyle: Record<Status, { text: string; dot: string }> = {
  Open: { text: "text-red-400", dot: "bg-red-500" },
  Acknowledged: { text: "text-amber-400", dot: "bg-amber-500" },
  Resolved: { text: "text-emerald-400", dot: "bg-emerald-500" },
}

type AlertRow = {
  id: number
  time: string
  asset: string
  category: string
  message: string
  severity: Severity
  status: Status
  assigned: string
}

const initialAlertLog: AlertRow[] = [
  { id: 1, time: "08:42", asset: "BH-07 Blok C", category: "Water Level", message: "Water level critical (-62 cm)", severity: "critical", status: "Open", assigned: "Andi Saputra" },
  { id: 2, time: "08:15", asset: "GATE-03", category: "Sensor", message: "Water Gate offline — no telemetry", severity: "critical", status: "Acknowledged", assigned: "Rina Wati" },
  { id: 3, time: "07:58", asset: "Estate North", category: "Weather", message: "No rainfall recorded for 7 days", severity: "warning", status: "Open", assigned: "Budi Hartono" },
  { id: 4, time: "07:30", asset: "PEAT-12", category: "Sensor", message: "Soil moisture low (18%)", severity: "warning", status: "Open", assigned: "Andi Saputra" },
  { id: 5, time: "06:54", asset: "Sector E-4", category: "Fire", message: "Hotspot detected — VIIRS confidence high", severity: "critical", status: "Acknowledged", assigned: "Dewi Lestari" },
  { id: 6, time: "06:20", asset: "BH-11 Blok A", category: "Sensor", message: "Data not received for 45 min", severity: "warning", status: "Open", assigned: "Rina Wati" },
  { id: 7, time: "05:48", asset: "PEAT-04", category: "Water Level", message: "Water table approaching warning (-39 cm)", severity: "warning", status: "Acknowledged", assigned: "Budi Hartono" },
  { id: 8, time: "05:05", asset: "Weather St. 02", category: "Weather", message: "Humidity below 40% — fire risk rising", severity: "info", status: "Open", assigned: "Dewi Lestari" },
  { id: 9, time: "04:30", asset: "GATE-01", category: "Water Level", message: "Gate actuator restored — level normalized", severity: "info", status: "Resolved", assigned: "Andi Saputra" },
  { id: 10, time: "03:12", asset: "BH-02 Blok D", category: "Sensor", message: "Battery voltage low (3.2V)", severity: "warning", status: "Resolved", assigned: "Rina Wati" },
]

const sortOptions = ["Terbaru", "Terlama", "Severity"] as const
type SortOption = (typeof sortOptions)[number]

const th = "px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-white/35"
const td = "px-3 py-2 text-[12px]"

function SeverityPill({ severity }: { severity: Severity }) {
  const s = severityStyle[severity]
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11.5px] font-medium", s.text)}>
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  )
}

function StatusPill({ status }: { status: Status }) {
  const s = statusStyle[status]
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11.5px] font-medium", s.text)}>
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      {status}
    </span>
  )
}

const severityRank: Record<Severity, number> = { critical: 0, warning: 1, info: 2 }

export default function AlertsPage() {
  const [activeFilter, setActiveFilter] = useState<FilterLabel>("All")
  const [rows, setRows] = useState<AlertRow[]>(initialAlertLog)
  const [sortOpen, setSortOpen] = useState(false)
  const [sort, setSort] = useState<SortOption>(sortOptions[0])

  const visibleRows = useMemo(() => {
    const filtered = rows.filter((r) => {
      switch (activeFilter) {
        case "All":
          return true
        case "Critical":
          return r.severity === "critical"
        case "Warning":
          return r.severity === "warning"
        case "Info":
          return r.severity === "info"
        case "Resolved":
          return r.status === "Resolved"
        default:
          return true
      }
    })
    const sorted = [...filtered]
    if (sort === "Terbaru") {
      sorted.sort((a, b) => b.time.localeCompare(a.time))
    } else if (sort === "Terlama") {
      sorted.sort((a, b) => a.time.localeCompare(b.time))
    } else {
      sorted.sort((a, b) => severityRank[a.severity] - severityRank[b.severity])
    }
    return sorted
  }, [rows, activeFilter, sort])

  function updateStatus(id: number, status: Status, label: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
    toast.success(label)
  }

  return (
    <PeatShell title="Alerts" subtitle="Alert & Incident Center">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Critical" value="3" tone="critical" icon={AlertTriangleIcon} delta="+1" />
        <StatTile label="Warning" value="8" tone="warning" icon={BellIcon} delta="+2" />
        <StatTile label="Info" value="5" tone="info" icon={InfoIcon} delta="-1" />
        <StatTile label="Resolved Today" value="14" tone="good" icon={CheckCircle2Icon} delta="+6" />
        <StatTile label="Avg Response" value="12" unit="min" tone="muted" icon={ClockIcon} delta="-3 min" />
        <StatTile label="Open Total" value="16" tone="muted" icon={InboxIcon} delta="+4" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => {
          const active = activeFilter === f.label
          return (
            <button
              key={f.label}
              onClick={() => setActiveFilter(f.label)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                active
                  ? "border-emerald-500/30 bg-emerald-500/12 text-emerald-300"
                  : "border-white/8 bg-white/[0.03] text-white/55 hover:border-white/15 hover:text-white/80"
              )}
            >
              <span className={cn("size-1.5 rounded-full", dotColor[f.color])} />
              {f.label}
            </button>
          )
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_320px]">
        <Panel>
          <PanelHeader title="Alerts — Last 7 Days" subtitle="By severity" action={<ViewAll />} />
          <div className="flex items-center gap-4 px-4 pb-1">
            {[
              { label: "Critical", color: "#ef4444" },
              { label: "Warning", color: "#f59e0b" },
              { label: "Info", color: "#38bdf8" },
            ].map((i) => (
              <span key={i.label} className="flex items-center gap-1.5 text-[10.5px] text-white/55">
                <span className="size-2.5 rounded-[3px]" style={{ background: i.color }} />
                {i.label}
              </span>
            ))}
          </div>
          <div className="h-[220px] px-1 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                <XAxis dataKey="day" {...axisProps} />
                <YAxis allowDecimals={false} {...axisProps} width={28} />
                <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="critical" name="Critical" stackId="sev" fill="#ef4444" barSize={22} />
                <Bar dataKey="warning" name="Warning" stackId="sev" fill="#f59e0b" barSize={22} />
                <Bar dataKey="info" name="Info" stackId="sev" fill="#38bdf8" radius={[3, 3, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="By Category" subtitle="Open alerts" />
          <div className="h-[200px] px-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip {...tooltipStyle} />
                <Pie
                  data={byCategory}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={72}
                  paddingAngle={2}
                  stroke="none"
                >
                  {byCategory.map((c) => (
                    <Cell key={c.name} fill={c.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-1.5 px-4 pb-4 pt-1">
            {byCategory.map((c) => (
              <div key={c.name} className="flex items-center justify-between text-[12px]">
                <span className="flex items-center gap-2 text-white/60">
                  <span className="size-2 rounded-[3px]" style={{ background: c.color }} />
                  {c.name}
                </span>
                <span className="font-semibold text-white/85">{c.value}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel>
        <div className="flex items-center justify-between px-4 pb-1 pt-3.5">
          <h3 className="text-[14px] font-semibold text-white">
            Alert Log <span className="text-[11px] font-normal text-white/35">(Today)</span>
          </h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setSortOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[11.5px] font-medium text-white/70 transition-colors hover:border-white/15 hover:text-white/90"
              >
                {sort}
                <ChevronDownIcon className="size-3.5" />
              </button>
              {sortOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />
                  <div className="absolute right-0 z-50 mt-1 min-w-full overflow-hidden rounded-lg border border-white/10 bg-[#10201a] py-1 shadow-xl">
                    {sortOptions.map((o) => (
                      <button
                        key={o}
                        onClick={() => {
                          setSort(o)
                          setSortOpen(false)
                          toast("Urutkan: " + o)
                        }}
                        className="block w-full px-3 py-2 text-left text-[12.5px] text-white/75 hover:bg-white/5"
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <ViewAll />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className={th}>Time</th>
                <th className={th}>Asset</th>
                <th className={th}>Category</th>
                <th className={th}>Message</th>
                <th className={th}>Severity</th>
                <th className={th}>Status</th>
                <th className={th}>Assigned</th>
                <th className={th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 ? (
                <tr className="border-t border-white/5">
                  <td className={cn(td, "text-white/40")} colSpan={8}>
                    Tidak ada peringatan untuk filter ini.
                  </td>
                </tr>
              ) : (
                visibleRows.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => toast.info(`${r.asset} — ${r.message}`)}
                    className="cursor-pointer border-t border-white/5 hover:bg-white/[0.03]"
                  >
                    <td className={cn(td, "font-medium text-white/70")}>{r.time}</td>
                    <td className={cn(td, "font-medium text-white/85")}>{r.asset}</td>
                    <td className={cn(td, "text-white/55")}>
                      <span className="inline-flex items-center gap-1.5">
                        {r.category === "Fire" && <FlameIcon className="size-3 text-red-400" />}
                        {r.category}
                      </span>
                    </td>
                    <td className={cn(td, "text-white/70")}>{r.message}</td>
                    <td className={td}>
                      <SeverityPill severity={r.severity} />
                    </td>
                    <td className={td}>
                      <StatusPill status={r.status} />
                    </td>
                    <td className={cn(td, "text-white/55")}>{r.assigned}</td>
                    <td className={td}>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            updateStatus(r.id, "Acknowledged", `Peringatan ${r.asset} ditangani`)
                          }}
                          disabled={r.status !== "Open"}
                          className="rounded-md border border-white/8 bg-white/[0.03] px-2 py-0.5 text-[11px] font-medium text-white/70 transition-colors hover:border-amber-500/30 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/8 disabled:hover:text-white/70"
                        >
                          Ack
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            updateStatus(r.id, "Resolved", `Peringatan ${r.asset} diselesaikan`)
                          }}
                          disabled={r.status === "Resolved"}
                          className="rounded-md border border-white/8 bg-white/[0.03] px-2 py-0.5 text-[11px] font-medium text-white/70 transition-colors hover:border-emerald-500/30 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/8 disabled:hover:text-white/70"
                        >
                          Resolve
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </PeatShell>
  )
}
