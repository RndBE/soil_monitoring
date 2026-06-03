"use client"

import {
  ActivityIcon,
  ArrowDownIcon,
  ArrowUpIcon,
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

type Tone = "normal" | "warning" | "critical" | "info"

const valueTone: Record<Tone, string> = {
  normal: "text-emerald-400",
  warning: "text-amber-400",
  critical: "text-red-400",
  info: "text-sky-400",
}

const iconTone: Record<Tone, string> = {
  normal: "bg-emerald-500/12 text-emerald-400 ring-emerald-500/20",
  warning: "bg-amber-500/12 text-amber-400 ring-amber-500/20",
  critical: "bg-red-500/12 text-red-400 ring-red-500/20",
  info: "bg-sky-500/12 text-sky-400 ring-sky-500/20",
}

const statusStyle: Record<Tone, { text: string; dot: string; label: string }> = {
  normal: { text: "text-emerald-400", dot: "bg-emerald-500", label: "Normal" },
  warning: { text: "text-amber-400", dot: "bg-amber-500", label: "Warning" },
  critical: { text: "text-red-400", dot: "bg-red-500", label: "Critical" },
  info: { text: "text-sky-400", dot: "bg-sky-500", label: "Info" },
}

function StatTile({
  label,
  value,
  unit,
  tone,
  icon: Icon,
  delta,
  deltaDir,
  deltaTone,
}: {
  label: string
  value: string
  unit?: string
  tone: Tone
  icon: typeof GaugeIcon
  delta?: string
  deltaDir?: "up" | "down"
  deltaTone?: "good" | "bad" | "muted"
}) {
  const DeltaIcon = deltaDir === "up" ? ArrowUpIcon : ArrowDownIcon
  const deltaColor =
    deltaTone === "good" ? "text-emerald-400" : deltaTone === "bad" ? "text-red-400" : "text-white/50"
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
      {delta ? (
        <div className="flex items-center gap-1 border-t border-white/5 pt-2 text-[11px]">
          <span className="text-white/40">vs yesterday</span>
          <DeltaIcon className={cn("size-3", deltaColor)} />
          <span className={cn("font-semibold", deltaColor)}>{delta}</span>
        </div>
      ) : null}
    </div>
  )
}

function StatusPill({ tone }: { tone: Tone }) {
  const s = statusStyle[tone]
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11.5px] font-medium", s.text)}>
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  )
}

type LegendItem = { key: keyof typeof seriesMeta; label: string; color: string }

function LegendToggle({
  items,
  active,
  onToggle,
}: {
  items: LegendItem[]
  active: Record<string, boolean>
  onToggle: (key: string) => void
}) {
  return (
    <div className="flex items-center gap-4 px-4 pb-1">
      {items.map((i) => {
        const on = active[i.key]
        return (
          <button
            key={i.label}
            onClick={() => onToggle(i.key)}
            className={cn(
              "flex items-center gap-1.5 text-[10.5px] transition-colors",
              on ? "text-white/55 hover:text-white/80" : "text-white/25 hover:text-white/45"
            )}
          >
            <span
              className="h-0.5 w-3.5 rounded-full"
              style={{ background: i.color, opacity: on ? 1 : 0.3 }}
            />
            {i.label}
          </button>
        )
      })}
    </div>
  )
}

const cumulativeSubsidence = [
  { year: "2019", blockA: 0, blockC: 0, blockE: 0 },
  { year: "2020", blockA: 3.2, blockC: 5.8, blockE: 4.1 },
  { year: "2021", blockA: 6.0, blockC: 11.4, blockE: 8.0 },
  { year: "2022", blockA: 9.1, blockC: 16.9, blockE: 11.7 },
  { year: "2023", blockA: 11.8, blockC: 21.7, blockE: 15.0 },
  { year: "2024", blockA: 14.2, blockC: 26.3, blockE: 18.4 },
]

const seriesMeta = {
  blockA: { label: "Block A", color: "#38bdf8" },
  blockC: { label: "Block C", color: "#ef4444" },
  blockE: { label: "Block E", color: "#f59e0b" },
} as const

const rateByBlock = [
  { block: "Block A", rate: 2.8, tone: "normal" as Tone },
  { block: "Block B", rate: 3.6, tone: "normal" as Tone },
  { block: "Block C", rate: 6.1, tone: "critical" as Tone },
  { block: "Block D", rate: 4.4, tone: "normal" as Tone },
  { block: "Block E", rate: 5.2, tone: "warning" as Tone },
  { block: "Block F", rate: 3.1, tone: "normal" as Tone },
]

const barColor: Record<Tone, string> = {
  normal: "#22c55e",
  warning: "#f59e0b",
  critical: "#ef4444",
  info: "#38bdf8",
}

function poleTone(rate: number): Tone {
  if (rate >= 6) return "critical"
  if (rate >= 5) return "warning"
  return "normal"
}

const poles = [
  { pole: "SUB-01", block: "Block A", rate: 2.6, cumulative: 13.1, waterTable: -28 },
  { pole: "SUB-02", block: "Block A", rate: 3.0, cumulative: 15.2, waterTable: -31 },
  { pole: "SUB-03", block: "Block B", rate: 3.6, cumulative: 17.8, waterTable: -34 },
  { pole: "SUB-04", block: "Block D", rate: 4.4, cumulative: 19.6, waterTable: -39 },
  { pole: "SUB-05", block: "Block E", rate: 5.0, cumulative: 21.3, waterTable: -44 },
  { pole: "SUB-06", block: "Block E", rate: 5.4, cumulative: 22.9, waterTable: -47 },
  { pole: "SUB-07", block: "Block C", rate: 6.1, cumulative: 26.3, waterTable: -58 },
  { pole: "SUB-08", block: "Block C", rate: 5.8, cumulative: 24.7, waterTable: -55 },
]

const statusFilters = ["Semua", "Normal", "Warning", "Critical"] as const
type StatusFilter = (typeof statusFilters)[number]

const exportFormats = ["PDF", "Excel", "CSV"] as const
type ExportFormat = (typeof exportFormats)[number]

const th = "px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-white/35"
const td = "px-3 py-2 text-[12px]"

export default function PeatSubsidencePage() {
  const [series, setSeries] = useState<Record<string, boolean>>({
    blockA: true,
    blockC: true,
    blockE: true,
  })

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Semua")

  const [exportOpen, setExportOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat>("PDF")

  const filteredPoles = useMemo(() => {
    if (statusFilter === "Semua") return poles
    return poles.filter((p) => statusStyle[poleTone(p.rate)].label === statusFilter)
  }, [statusFilter])

  function toggleSeries(key: string) {
    setSeries((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      const meta = seriesMeta[key as keyof typeof seriesMeta]
      toast(next[key] ? `${meta.label} ditampilkan` : `${meta.label} disembunyikan`)
      return next
    })
  }

  function regenerateInsight() {
    const id = toast.loading("Memperbarui penilaian…")
    setTimeout(() => toast.success("Penilaian diperbarui", { id }), 900)
  }

  function exportReport() {
    const id = toast.loading("Membuat laporan…")
    setTimeout(() => toast.success(`Laporan ${exportFormat} siap diunduh`, { id }), 900)
  }

  return (
    <PeatShell title="Peat Subsidence" subtitle="Peat Surface Subsidence Monitoring">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatTile
          label="Avg Subsidence Rate"
          value="4.2"
          unit="cm/yr"
          tone="warning"
          icon={TrendingDownIcon}
          delta="+0.3 cm/yr"
          deltaDir="up"
          deltaTone="bad"
        />
        <StatTile
          label="Cumulative (since 2019)"
          value="22"
          unit="cm"
          tone="warning"
          icon={LayersIcon}
          delta="+0.4 cm"
          deltaDir="up"
          deltaTone="bad"
        />
        <StatTile label="Max Rate Station" value="SUB-07" unit="6.1 cm/yr" tone="critical" icon={GaugeIcon} />
        <StatTile
          label="Monitoring Poles"
          value="36"
          unit="active"
          tone="info"
          icon={RadioTowerIcon}
          delta="0 offline"
          deltaDir="down"
          deltaTone="good"
        />
        <StatTile
          label="Within Safe Limit"
          value="78"
          unit="%"
          tone="normal"
          icon={ShieldCheckIcon}
          delta="+2 pts"
          deltaDir="up"
          deltaTone="good"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Cumulative Subsidence (cm)"
            subtitle="By block, 2019 - 2024"
            action={<ViewAll onClick={() => toast.info("Membuka riwayat subsidensi…")} />}
          />
          <LegendToggle
            items={[
              { key: "blockA", label: "Block A", color: "#38bdf8" },
              { key: "blockC", label: "Block C", color: "#ef4444" },
              { key: "blockE", label: "Block E", color: "#f59e0b" },
            ]}
            active={series}
            onToggle={toggleSeries}
          />
          <div className="h-[220px] px-1 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cumulativeSubsidence} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                <XAxis dataKey="year" {...axisProps} />
                <YAxis domain={[0, 30]} {...axisProps} width={30} />
                <Tooltip {...tooltipStyle} />
                {series.blockC && (
                  <Line dataKey="blockC" name="Block C" type="monotone" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3, fill: "#ef4444" }} activeDot={{ r: 4 }} />
                )}
                {series.blockE && (
                  <Line dataKey="blockE" name="Block E" type="monotone" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3, fill: "#f59e0b" }} activeDot={{ r: 4 }} />
                )}
                {series.blockA && (
                  <Line dataKey="blockA" name="Block A" type="monotone" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 3, fill: "#38bdf8" }} activeDot={{ r: 4 }} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Subsidence Rate by Block (cm/yr)"
            subtitle="Annual rate vs safe limit"
            action={<ViewAll onClick={() => toast.info("Membuka detail laju per blok…")} />}
          />
          <div className="h-[220px] px-1 pb-2 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rateByBlock} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                <XAxis dataKey="block" {...axisProps} />
                <YAxis domain={[0, 8]} {...axisProps} width={28} />
                <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <ReferenceLine
                  y={5}
                  stroke="#f59e0b"
                  strokeDasharray="4 3"
                  strokeOpacity={0.7}
                  label={{ value: "Safe Limit", position: "insideTopRight", fontSize: 9, fill: "#fbbf24" }}
                />
                <Bar dataKey="rate" name="Rate (cm/yr)" radius={[3, 3, 0, 0]} barSize={26}>
                  {rateByBlock.map((d) => (
                    <Cell key={d.block} fill={barColor[d.tone]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel>
        <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-3.5">
          <div>
            <h3 className="text-[14px] font-semibold text-white">Insight</h3>
            <p className="text-[11px] text-white/40">Auto-generated assessment</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setExportOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11.5px] font-medium text-white/70 transition-colors hover:bg-white/5"
              >
                <DownloadIcon className="size-3.5" />
                {exportFormat}
                <ChevronDownIcon className="size-3.5" />
              </button>
              {exportOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
                  <div className="absolute right-0 z-50 mt-1 min-w-full overflow-hidden rounded-lg border border-white/10 bg-[#10201a] py-1 shadow-xl">
                    {exportFormats.map((o) => (
                      <button
                        key={o}
                        onClick={() => {
                          setExportFormat(o)
                          setExportOpen(false)
                          toast("Format: " + o)
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
            <button
              onClick={exportReport}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1.5 text-[11.5px] font-medium text-emerald-400 transition-colors hover:bg-emerald-500/25"
            >
              <DownloadIcon className="size-3.5" />
              Export
            </button>
            <button
              onClick={regenerateInsight}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11.5px] font-medium text-white/70 transition-colors hover:bg-white/5"
            >
              <RefreshCwIcon className="size-3.5" />
              Regenerate
            </button>
          </div>
        </div>
        <div className="flex items-start gap-3 px-4 pb-4 pt-1">
          <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/12 text-amber-400 ring-1 ring-amber-500/20">
            <ActivityIcon className="size-4" />
          </span>
          <p className="text-[12.5px] leading-relaxed text-white/70">
            Subsidence rates correlate strongly with deeper water tables &mdash; poles reading below{" "}
            <span className="font-medium text-amber-300">-45 cm</span> consistently exceed the{" "}
            <span className="font-medium text-white/85">5 cm/yr</span> safe limit.{" "}
            <span className="font-medium text-red-300">Block C</span> shows the steepest cumulative loss (26 cm since 2019)
            and the deepest water tables (-55 to -58 cm). Recommended action: raise the managed water level in Block C toward
            the <span className="font-medium text-emerald-300">-30 cm</span> target by adjusting weir gates and rewetting
            priority canals.
          </p>
        </div>
      </Panel>

      <Panel>
        <div className="flex items-center justify-between gap-3 px-4 pb-1 pt-3.5">
          <div>
            <h3 className="text-[14px] font-semibold text-white">Subsidence Poles</h3>
            <p className="text-[11px] text-white/40">
              Latest survey readings &middot; {filteredPoles.length} of 36 poles
            </p>
          </div>
          <ViewAll onClick={() => toast.info("Membuka semua 36 tiang pantau…")} />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 px-4 pb-2 pt-1">
          {statusFilters.map((f) => {
            const on = statusFilter === f
            return (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-[11.5px] font-medium transition-colors",
                  on
                    ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                    : "text-white/45 hover:text-white/70"
                )}
              >
                {f}
              </button>
            )
          })}
        </div>
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className={th}>Pole</th>
              <th className={th}>Block</th>
              <th className={th}>Rate (cm/yr)</th>
              <th className={th}>Cumulative (cm)</th>
              <th className={th}>Water Table (cm)</th>
              <th className={cn(th, "text-right")}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredPoles.map((r) => {
              const tone = poleTone(r.rate)
              const s = statusStyle[tone]
              return (
                <tr
                  key={r.pole}
                  onClick={() =>
                    toast(`${r.pole} · ${r.block}`, {
                      description: `Laju ${r.rate.toFixed(1)} cm/thn · ${s.label} · muka air ${r.waterTable} cm`,
                    })
                  }
                  className="cursor-pointer border-t border-white/5 hover:bg-white/[0.03]"
                >
                  <td className={cn(td, "font-medium text-white/85")}>{r.pole}</td>
                  <td className={cn(td, "text-white/55")}>{r.block}</td>
                  <td className={cn(td, s.text, "font-medium")}>{r.rate.toFixed(1)}</td>
                  <td className={cn(td, "text-white/70")}>{r.cumulative.toFixed(1)}</td>
                  <td className={cn(td, "font-medium", r.waterTable <= -45 ? "text-amber-400" : "text-sky-400")}>
                    {r.waterTable}
                  </td>
                  <td className={cn(td, "text-right")}>
                    <span className="inline-flex justify-end">
                      <StatusPill tone={tone} />
                    </span>
                  </td>
                </tr>
              )
            })}
            {filteredPoles.length === 0 && (
              <tr className="border-t border-white/5">
                <td className={cn(td, "text-white/40")} colSpan={6}>
                  Tidak ada tiang dengan status {statusFilter}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Panel>
    </PeatShell>
  )
}
