"use client"

import { useMemo, useState } from "react"
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
import {
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  DownloadIcon,
  FileTextIcon,
  FolderArchiveIcon,
  HardDriveIcon,
  LayoutTemplateIcon,
  PlusIcon,
  UsersIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Panel, ViewAll } from "@/components/peatland/panel"
import { PeatShell } from "@/components/peatland/peat-shell"
import { cn } from "@/lib/utils"

type Tone = "normal" | "warning" | "critical" | "info" | "neutral"

const valueTone: Record<Tone, string> = {
  normal: "text-emerald-400",
  warning: "text-amber-400",
  critical: "text-red-400",
  info: "text-sky-400",
  neutral: "text-white",
}

const iconTone: Record<Tone, string> = {
  normal: "bg-emerald-500/12 text-emerald-400 ring-emerald-500/20",
  warning: "bg-amber-500/12 text-amber-400 ring-amber-500/20",
  critical: "bg-red-500/12 text-red-400 ring-red-500/20",
  info: "bg-sky-500/12 text-sky-400 ring-sky-500/20",
  neutral: "bg-white/8 text-white/70 ring-white/15",
}

function StatTile({
  label,
  value,
  unit,
  icon: Icon,
  tone = "neutral",
  delta,
}: {
  label: string
  value: string
  unit?: string
  icon: React.ComponentType<{ className?: string }>
  tone?: Tone
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

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "relative inline-flex h-4.5 w-8 shrink-0 items-center rounded-full transition-colors",
        on ? "bg-emerald-500/80" : "bg-white/12"
      )}
      style={{ height: 18, width: 32 }}
    >
      <span
        className={cn(
          "inline-block size-3.5 rounded-full bg-white shadow transition-transform",
          on ? "translate-x-4" : "translate-x-0.5"
        )}
      />
    </span>
  )
}

const formatBadge: Record<string, string> = {
  PDF: "bg-red-500/12 text-red-300 ring-red-500/25",
  Excel: "bg-emerald-500/12 text-emerald-300 ring-emerald-500/25",
  CSV: "bg-sky-500/12 text-sky-300 ring-sky-500/25",
}

const typeTone: Record<string, string> = {
  "Water Table": "text-sky-400",
  "Fire Risk": "text-red-400",
  NDVI: "text-lime-400",
  Compliance: "text-amber-400",
}

const th = "px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-white/35"
const td = "px-3 py-2 text-[12px]"

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

const monthlyGenerated = [
  { month: "Mar", count: 26 },
  { month: "Apr", count: 31 },
  { month: "May", count: 28 },
  { month: "Jun", count: 35 },
  { month: "Jul", count: 24 },
  { month: "Aug", count: 38 },
  { month: "Sep", count: 32 },
]

const typeMix = [
  { name: "Water Table", value: 96, color: "#38bdf8" },
  { name: "Fire Risk", value: 64, color: "#ef4444" },
  { name: "NDVI", value: 52, color: "#84cc16" },
  { name: "Compliance", value: 36, color: "#f59e0b" },
]

type ScheduledReport = {
  name: string
  freq: string
  next: string
  recipients: number
  on: boolean
}

const initialScheduledReports: ScheduledReport[] = [
  { name: "Daily Water Table Summary", freq: "Daily", next: "04 Jun, 06:00", recipients: 8, on: true },
  { name: "Weekly Fire Risk Bulletin", freq: "Weekly", next: "07 Jun, 07:30", recipients: 12, on: true },
  { name: "Monthly NDVI Health Report", freq: "Monthly", next: "01 Jul, 08:00", recipients: 5, on: false },
  { name: "Compliance & GHG Audit", freq: "Monthly", next: "30 Jun, 09:00", recipients: 6, on: true },
]

type ReportRow = {
  name: string
  type: string
  period: string
  by: string
  date: string
  size: string
  format: string
}

const initialRecentReports: ReportRow[] = [
  { name: "Water Table Summary - Estate A", type: "Water Table", period: "1-10 Sep 2024", by: "Andi Pratama", date: "10 Sep 2024", size: "2.4 MB", format: "PDF" },
  { name: "Fire Risk Weekly Bulletin W36", type: "Fire Risk", period: "Wk 36 2024", by: "Siti Rahayu", date: "08 Sep 2024", size: "1.1 MB", format: "PDF" },
  { name: "NDVI Plantation Health Q3", type: "NDVI", period: "Jul-Sep 2024", by: "Budi Santoso", date: "05 Sep 2024", size: "8.7 MB", format: "Excel" },
  { name: "Compliance Audit - Block C12", type: "Compliance", period: "Aug 2024", by: "Andi Pratama", date: "02 Sep 2024", size: "3.9 MB", format: "PDF" },
  { name: "Borehole Sensor Raw Export", type: "Water Table", period: "Aug 2024", by: "System", date: "01 Sep 2024", size: "640 KB", format: "CSV" },
  { name: "Fire Hotspot Log - South Sector", type: "Fire Risk", period: "Aug 2024", by: "Siti Rahayu", date: "31 Aug 2024", size: "1.8 MB", format: "Excel" },
  { name: "Monthly NDVI Health Report", type: "NDVI", period: "Aug 2024", by: "Budi Santoso", date: "31 Aug 2024", size: "6.2 MB", format: "PDF" },
  { name: "GHG Emission Compliance Summary", type: "Compliance", period: "Aug 2024", by: "Dewi Lestari", date: "29 Aug 2024", size: "4.5 MB", format: "PDF" },
]

const TEMPLATE_OPTIONS = [
  "Daily Water Table Summary",
  "Weekly Fire Risk Bulletin",
  "Monthly NDVI Health Report",
  "Compliance & GHG Audit",
  "Borehole Sensor Raw Export",
]

const TEMPLATE_TYPE: Record<string, string> = {
  "Daily Water Table Summary": "Water Table",
  "Weekly Fire Risk Bulletin": "Fire Risk",
  "Monthly NDVI Health Report": "NDVI",
  "Compliance & GHG Audit": "Compliance",
  "Borehole Sensor Raw Export": "Water Table",
}

const DATE_RANGE_OPTIONS = [
  "1 - 10 Sep 2024",
  "Bulan ini",
  "30 hari terakhir",
  "Kuartal ini",
  "Tahun ini",
]

const FORMATS = ["PDF", "Excel", "CSV"] as const

function SelectMenu({
  icon: Icon,
  value,
  options,
  onSelect,
}: {
  icon: React.ComponentType<{ className?: string }>
  value: string
  options: readonly string[]
  onSelect: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[12.5px] text-white/80 transition-colors hover:border-white/20"
      >
        <span className="flex items-center gap-2">
          <Icon className="size-3.5 text-white/40" />
          {value}
        </span>
        <ChevronDownIcon className="size-4 text-white/40" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 min-w-full overflow-hidden rounded-lg border border-white/10 bg-[#10201a] py-1 shadow-xl">
            {options.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => {
                  onSelect(o)
                  setOpen(false)
                  toast("Dipilih: " + o)
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
  )
}

export default function ReportsPage() {
  const [template, setTemplate] = useState(TEMPLATE_OPTIONS[0])
  const [dateRange, setDateRange] = useState(DATE_RANGE_OPTIONS[0])
  const [format, setFormat] = useState<(typeof FORMATS)[number]>("PDF")

  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>(initialScheduledReports)
  const [recentReports, setRecentReports] = useState<ReportRow[]>(initialRecentReports)

  const [typeFilter, setTypeFilter] = useState<string>("All")

  const filteredReports = useMemo(
    () => (typeFilter === "All" ? recentReports : recentReports.filter((r) => r.type === typeFilter)),
    [recentReports, typeFilter]
  )

  function handleGenerate() {
    const id = toast.loading("Membuat laporan…")
    setTimeout(() => {
      const newRow: ReportRow = {
        name: template,
        type: TEMPLATE_TYPE[template] ?? "Water Table",
        period: dateRange,
        by: "Anda",
        date: "03 Jun 2026",
        size: format === "Excel" ? "5.2 MB" : format === "CSV" ? "820 KB" : "2.6 MB",
        format,
      }
      setRecentReports((prev) => [newRow, ...prev])
      toast.success("Laporan siap diunduh", { id })
    }, 900)
  }

  function toggleSchedule(name: string) {
    setScheduledReports((prev) =>
      prev.map((s) => {
        if (s.name !== name) return s
        const next = !s.on
        toast(next ? `Jadwal "${name}" diaktifkan` : `Jadwal "${name}" dijeda`)
        return { ...s, on: next }
      })
    )
  }

  return (
    <PeatShell title="Reports" subtitle="Report Generation & Archive">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatTile label="Total Reports" value="248" icon={FolderArchiveIcon} tone="info" delta="all-time archive" />
        <StatTile label="Generated This Month" value="32" icon={FileTextIcon} tone="normal" delta="+18% vs last month" />
        <StatTile label="Scheduled" value="6" icon={ClockIcon} tone="warning" delta="4 active, 2 paused" />
        <StatTile label="Storage Used" value="1.8" unit="GB" icon={HardDriveIcon} tone="neutral" delta="of 10 GB quota" />
        <StatTile label="Templates" value="9" icon={LayoutTemplateIcon} tone="normal" delta="3 added this year" />
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
        <Panel>
          <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
            <h3 className="text-[14px] font-semibold text-white">Generate Report</h3>
            <span className="text-[11px] text-white/40">Ad-hoc export</span>
          </div>
          <div className="flex flex-col gap-3.5 px-4 pb-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10.5px] font-semibold uppercase tracking-wide text-white/45">Template</label>
              <SelectMenu icon={LayoutTemplateIcon} value={template} options={TEMPLATE_OPTIONS} onSelect={setTemplate} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10.5px] font-semibold uppercase tracking-wide text-white/45">Date Range</label>
              <SelectMenu icon={CalendarIcon} value={dateRange} options={DATE_RANGE_OPTIONS} onSelect={setDateRange} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10.5px] font-semibold uppercase tracking-wide text-white/45">Format</label>
              <div className="flex items-center gap-2">
                {FORMATS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => {
                      setFormat(f)
                      toast("Format: " + f)
                    }}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-[12px] font-medium ring-1 transition-colors",
                      f === format
                        ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                        : "bg-white/[0.03] text-white/55 ring-white/10 hover:text-white/80"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-[13px] font-semibold text-[#062013] transition-colors hover:bg-emerald-400"
            >
              <FileTextIcon className="size-4" />
              Generate Report
            </button>
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
            <h3 className="text-[14px] font-semibold text-white">Scheduled Reports</h3>
            <button
              type="button"
              onClick={() => toast.info("Buat jadwal laporan baru")}
              className="inline-flex items-center gap-1 text-[11.5px] font-medium text-emerald-400 transition-colors hover:text-emerald-300"
            >
              <PlusIcon className="size-3.5" />
              New
            </button>
          </div>
          <div className="flex flex-col px-2 pb-3">
            {scheduledReports.map((s) => (
              <div
                key={s.name}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-white/[0.03]"
              >
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-medium text-white/85">{s.name}</p>
                  <div className="mt-0.5 flex items-center gap-3 text-[11px] text-white/45">
                    <span className="text-emerald-400/80">{s.freq}</span>
                    <span className="flex items-center gap-1">
                      <ClockIcon className="size-3" />
                      {s.next}
                    </span>
                    <span className="flex items-center gap-1">
                      <UsersIcon className="size-3" />
                      {s.recipients}
                    </span>
                  </div>
                </div>
                <button type="button" onClick={() => toggleSchedule(s.name)} aria-label={`Toggle ${s.name}`}>
                  <Toggle on={s.on} />
                </button>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <Panel>
          <div className="flex items-center justify-between px-4 pb-1 pt-3.5">
            <div>
              <h3 className="text-[14px] font-semibold text-white">Reports Generated (7 Months)</h3>
              <p className="text-[11px] text-white/40">Monthly output volume</p>
            </div>
            <ViewAll onClick={() => toast.info("Membuka detail volume bulanan")} />
          </div>
          <div className="h-[200px] px-1 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyGenerated} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...axisProps} width={28} />
                <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="count" name="Reports" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center justify-between px-4 pb-1 pt-3.5">
            <h3 className="text-[14px] font-semibold text-white">Reports by Type</h3>
            <span className="text-[11px] text-white/40">248 total</span>
          </div>
          <div className="flex items-center gap-2 px-2 pb-3">
            <div className="h-[160px] w-[150px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip {...tooltipStyle} />
                  <Pie
                    data={typeMix}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={66}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {typeMix.map((t) => (
                      <Cell key={t.name} fill={t.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-1 flex-col gap-2 pr-2">
              {typeMix.map((t) => {
                const active = typeFilter === t.name
                return (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => {
                      const next = active ? "All" : t.name
                      setTypeFilter(next)
                      toast(next === "All" ? "Filter tipe direset" : "Filter: " + next)
                    }}
                    className={cn(
                      "flex items-center justify-between rounded-md px-1.5 py-0.5 text-[12px] transition-colors",
                      active ? "bg-emerald-500/15 ring-1 ring-emerald-500/30" : "hover:bg-white/[0.04]"
                    )}
                  >
                    <span className="flex items-center gap-2 text-white/65">
                      <span className="size-2.5 rounded-[3px]" style={{ background: t.color }} />
                      {t.name}
                    </span>
                    <span className="font-medium text-white/80">{t.value}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </Panel>
      </div>

      <Panel>
        <div className="flex items-center justify-between px-4 pb-1 pt-3.5">
          <h3 className="text-[14px] font-semibold text-white">Recent Reports</h3>
          <div className="flex items-center gap-2">
            {typeFilter !== "All" && (
              <button
                type="button"
                onClick={() => setTypeFilter("All")}
                className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-400 ring-1 ring-emerald-500/30 hover:bg-emerald-500/25"
              >
                {typeFilter} ✕
              </button>
            )}
            <ViewAll onClick={() => toast.info("Membuka seluruh arsip laporan")} />
          </div>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className={th}>Report Name</th>
              <th className={th}>Type</th>
              <th className={th}>Period</th>
              <th className={th}>Generated By</th>
              <th className={th}>Date</th>
              <th className={th}>Size</th>
              <th className={th}>Format</th>
              <th className={cn(th, "text-right")}>Download</th>
            </tr>
          </thead>
          <tbody>
            {filteredReports.map((r, i) => (
              <tr
                key={`${r.name}-${i}`}
                onClick={() => toast(r.name, { description: `${r.type} • ${r.period} • ${r.size}` })}
                className="cursor-pointer border-t border-white/5 hover:bg-white/[0.03]"
              >
                <td className={cn(td, "font-medium text-white/85")}>{r.name}</td>
                <td className={td}>
                  <span className={cn("inline-flex items-center gap-1.5 font-medium", typeTone[r.type])}>
                    <span className="size-1.5 rounded-full bg-current" />
                    {r.type}
                  </span>
                </td>
                <td className={cn(td, "text-white/55")}>{r.period}</td>
                <td className={cn(td, "text-white/65")}>{r.by}</td>
                <td className={cn(td, "text-white/55")}>{r.date}</td>
                <td className={cn(td, "tabular-nums text-white/60")}>{r.size}</td>
                <td className={td}>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-semibold ring-1",
                      formatBadge[r.format]
                    )}
                  >
                    {r.format === "PDF" && <CheckIcon className="size-3" />}
                    {r.format}
                  </span>
                </td>
                <td className={cn(td, "text-right")}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toast.info(`Mengunduh ${r.name}…`)
                    }}
                    className="inline-flex size-7 items-center justify-center rounded-lg text-white/50 ring-1 ring-white/10 transition-colors hover:bg-emerald-500/12 hover:text-emerald-400 hover:ring-emerald-500/25"
                    aria-label={`Download ${r.name}`}
                  >
                    <DownloadIcon className="size-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2.5 text-[11px] text-white/35">
          Showing {filteredReports.length} of 248 reports.{" "}
          <span className="font-medium text-emerald-400/80">Last sync 2 min ago</span>
        </div>
      </Panel>

      <Panel className="bg-transparent">
        <div className="flex items-center gap-2 px-4 py-2.5 text-[11px] text-white/40">
          <AreaChartLegendNote />
        </div>
      </Panel>
    </PeatShell>
  )
}

function AreaChartLegendNote() {
  return (
    <span className="flex items-center gap-2">
      <FolderArchiveIcon className="size-3.5 text-white/30" />
      Reports auto-archived after 90 days. PDF retained 2 years for compliance.
    </span>
  )
}
