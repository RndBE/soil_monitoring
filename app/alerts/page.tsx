"use client"

import {
  AlertTriangleIcon,
  BellIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  FlameIcon,
  InboxIcon,
  InfoIcon,
} from "lucide-react"
import { Fragment, useMemo, useState } from "react"
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

import { Panel, PanelHeader, TableScroll, ViewAll, tableRow, tableTd, tableTh } from "@/components/peatland/panel"
import { PeatShell } from "@/components/peatland/peat-shell"
import { StatTile } from "@/components/peatland/stat-tile"
import { EwsPill, StatusDot, TONE_COLOR, type Tone } from "@/components/peatland/status"
import { axisProps, gridProps, tooltipStyle } from "@/components/peatland/chart-theme"
import { OpenInTwin } from "@/components/peatland/open-in-twin"
import { alerts as dashboardAlerts, type Severity } from "@/lib/peatland/mock-data"
import {
  STATION_TYPE_LABEL,
  formatLatLng,
  formatStationValue,
  stationByCode,
  type Station,
} from "@/lib/peatland/stations"
import { useDashboardFilters } from "@/lib/peatland/filters"
import { ALL_BLOCKS, matchesBlock } from "@/lib/peatland/filter-logic"
import { cn } from "@/lib/utils"

type Category = "Water Level" | "Fire" | "Soil Moisture" | "Weather" | "Sensor"
type Status = "Open" | "Acknowledged" | "Resolved"

const CATEGORY_COLOR: Record<Category, string> = {
  "Water Level": "#38bdf8",
  Fire: "#fb7185",
  "Soil Moisture": "#a3e635",
  Weather: "#a78bfa",
  Sensor: "#8a9a92",
}
const CATEGORIES = Object.keys(CATEGORY_COLOR) as Category[]

const SEVERITY_LABEL: Record<Severity, string> = { critical: "Critical", warning: "Warning", info: "Info" }
const SEVERITY_TONE: Record<Severity, Tone> = { critical: "critical", warning: "warning", info: "info" }
const STATUS_TONE: Record<Status, Tone> = { Open: "critical", Acknowledged: "warning", Resolved: "normal" }
const severityRank: Record<Severity, number> = { critical: 0, warning: 1, info: 2 }

type Seed = {
  time: string
  asset: string
  alert: string
  severity: Severity
  category: Category
  status: Status
  assigned: string
  /** Menit dari alert muncul sampai ditangani (Ack/Resolve). */
  responseMin?: number
}

type Handling = Pick<Seed, "category" | "status" | "assigned" | "responseMin">

// Kategori & penanganan untuk alert aktif ([[mock-data]] alerts, sama dengan dashboard), per kode aset.
const HANDLING: Record<string, Handling> = {
  "BH-07": { category: "Water Level", status: "Open", assigned: "Andi Saputra" },
  "WTG-02": { category: "Sensor", status: "Acknowledged", assigned: "Rina Wati", responseMin: 6 },
  "RG-04": { category: "Weather", status: "Open", assigned: "Budi Hartono" },
  "BH-12": { category: "Water Level", status: "Open", assigned: "Andi Saputra" },
  "PMS-03": { category: "Soil Moisture", status: "Acknowledged", assigned: "Budi Hartono", responseMin: 15 },
  "BH-03": { category: "Sensor", status: "Open", assigned: "Rina Wati" },
  "RG-01": { category: "Weather", status: "Open", assigned: "Dewi Lestari" },
  "BH-11": { category: "Water Level", status: "Open", assigned: "Andi Saputra" },
  "PMS-05": { category: "Soil Moisture", status: "Open", assigned: "Budi Hartono" },
  "WTS-03": { category: "Sensor", status: "Acknowledged", assigned: "Rina Wati", responseMin: 18 },
  "HS-02": { category: "Fire", status: "Acknowledged", assigned: "Dewi Lestari", responseMin: 9 },
  "HS-01": { category: "Fire", status: "Acknowledged", assigned: "Dewi Lestari", responseMin: 11 },
}

// Riwayat alert yang sudah selesai hari ini.
const EXTRA: Seed[] = [
  { time: "05:30", asset: "WTG-01", alert: "Gate actuator restored · opening 60% (Auto)", severity: "info", category: "Water Level", status: "Resolved", assigned: "Andi Saputra", responseMin: 14 },
  { time: "04:10", asset: "RG-06", alert: "Weak signal · data delayed 25 min", severity: "info", category: "Sensor", status: "Resolved", assigned: "Rina Wati", responseMin: 22 },
]

type LogRow = Seed & { id: string; message: string; block: string }

/** Pesan + bacaan registri (mis. "Water level critical (−62 cm)"). */
function withReading(s: Seed, st: Station | undefined): string {
  if (!st || st.value == null || st.value === 0 || s.category === "Sensor" || st.type === "water-gate") return s.alert
  return `${s.alert} (${formatStationValue(st)})`
}

const INITIAL_ROWS: LogRow[] = [
  ...dashboardAlerts.map(
    (a): Seed => ({
      ...a,
      ...(HANDLING[a.asset] ?? { category: "Sensor", status: "Open", assigned: "—" }),
    })
  ),
  ...EXTRA,
].map((s, i) => {
  const st = stationByCode(s.asset)
  return { ...s, id: `AL-${String(i + 1).padStart(3, "0")}`, message: withReading(s, st), block: st?.block ?? "—" }
})

// Waktu live dashboard (10 Sep 09:37) untuk menghitung waktu respons Ack.
const NOW_MIN = 9 * 60 + 37
const minutesOf = (t: string) => {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

// Riwayat alert 4–9 Sep: block tiap alert per severity (10 Sep dihitung dari log).
const HISTORY: { day: string; critical: string[]; warning: string[]; info: string[] }[] = [
  { day: "4 Sep", critical: ["C"], warning: ["D", "C"], info: ["B"] },
  { day: "5 Sep", critical: [], warning: ["C", "D", "E"], info: ["A", "B"] },
  { day: "6 Sep", critical: ["C", "D"], warning: ["B"], info: ["E"] },
  { day: "7 Sep", critical: ["C"], warning: ["C", "D", "B", "A"], info: ["E", "D"] },
  { day: "8 Sep", critical: ["C", "D", "D"], warning: ["C", "B"], info: [] },
  { day: "9 Sep", critical: ["C"], warning: ["D"], info: ["B", "A", "E"] },
]

const FILTERS = ["All", "Critical", "Warning", "Info", "Resolved"] as const
type FilterLabel = (typeof FILTERS)[number]

const FILTER_COLOR: Record<FilterLabel, string> = {
  All: "#34d399",
  Critical: TONE_COLOR.critical,
  Warning: TONE_COLOR.warning,
  Info: TONE_COLOR.info,
  Resolved: TONE_COLOR.normal,
}

function matchesFilter(r: LogRow, f: FilterLabel): boolean {
  switch (f) {
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
}

const sortOptions = ["Newest", "Oldest", "Severity"] as const
type SortOption = (typeof sortOptions)[number]

const actionBtn =
  "inline-flex h-8 items-center rounded-md border px-3 text-[12px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-emerald-400/60"

function DetailItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10.5px] text-white/50">{label}</dt>
      <dd className="text-[12px] text-white/80">{children}</dd>
    </div>
  )
}

export default function AlertsPage() {
  const { division } = useDashboardFilters()
  const [activeFilter, setActiveFilter] = useState<FilterLabel>("All")
  const [rows, setRows] = useState<LogRow[]>(INITIAL_ROWS)
  const [sortOpen, setSortOpen] = useState(false)
  const [sort, setSort] = useState<SortOption>("Newest")
  const [expanded, setExpanded] = useState<string | null>(null)

  // Semua angka (KPI, chip, donut, grafik 10 Sep) diturunkan dari state baris.
  const scoped = useMemo(() => rows.filter((r) => matchesBlock(r.block, division)), [rows, division])
  const active = scoped.filter((r) => r.status !== "Resolved")
  const handled = scoped.filter((r) => r.responseMin != null)
  const avgResponse = handled.length ? Math.round(handled.reduce((a, r) => a + (r.responseMin ?? 0), 0) / handled.length) : null

  const weekly = useMemo(() => {
    const inScope = (b: string) => matchesBlock(`Block ${b}`, division)
    const past = HISTORY.map((h) => ({
      day: h.day,
      critical: h.critical.filter(inScope).length,
      warning: h.warning.filter(inScope).length,
      info: h.info.filter(inScope).length,
    }))
    const count = (s: Severity) => scoped.filter((r) => r.severity === s).length
    return [...past, { day: "10 Sep", critical: count("critical"), warning: count("warning"), info: count("info") }]
  }, [scoped, division])

  const byCategory = CATEGORIES.map((c) => ({ name: c, value: active.filter((r) => r.category === c).length, color: CATEGORY_COLOR[c] })).filter(
    (c) => c.value > 0
  )

  const sevTile = (s: Severity) => {
    const list = active.filter((r) => r.severity === s)
    return {
      value: String(list.length),
      foot: `${list.filter((r) => r.status === "Open").length} open · ${list.filter((r) => r.status === "Acknowledged").length} ack`,
      spark: weekly.map((d) => d[s]),
    }
  }

  const visibleRows = useMemo(() => {
    const sorted = scoped.filter((r) => matchesFilter(r, activeFilter))
    if (sort === "Newest") sorted.sort((a, b) => b.time.localeCompare(a.time) || a.id.localeCompare(b.id))
    else if (sort === "Oldest") sorted.sort((a, b) => a.time.localeCompare(b.time) || a.id.localeCompare(b.id))
    else sorted.sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || b.time.localeCompare(a.time))
    return sorted
  }, [scoped, activeFilter, sort])

  function updateStatus(row: LogRow, status: Status, label: string) {
    const prev = { status: row.status, responseMin: row.responseMin }
    const responseMin = status === "Open" ? undefined : (row.responseMin ?? Math.max(1, NOW_MIN - minutesOf(row.time)))
    setRows((all) => all.map((r) => (r.id === row.id ? { ...r, status, responseMin } : r)))
    toast.success(label, {
      action: { label: "Undo", onClick: () => setRows((all) => all.map((r) => (r.id === row.id ? { ...r, ...prev } : r))) },
    })
  }

  const critical = sevTile("critical")
  const warning = sevTile("warning")
  const info = sevTile("info")
  const resolved = scoped.filter((r) => r.status === "Resolved").length
  const unack = active.filter((r) => r.status === "Open").length

  return (
    <PeatShell title="Alerts" subtitle="Alert & Incident Center">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Critical" tone="critical" icon={AlertTriangleIcon} status="Active" {...critical} onClick={() => setActiveFilter("Critical")} />
        <StatTile label="Warning" tone="warning" icon={BellIcon} status="Active" {...warning} onClick={() => setActiveFilter("Warning")} />
        <StatTile label="Info" tone="info" icon={InfoIcon} status="Active" {...info} onClick={() => setActiveFilter("Info")} />
        <StatTile
          label="Resolved Today"
          value={String(resolved)}
          tone="normal"
          icon={CheckCircle2Icon}
          status="10 Sep"
          foot={`of ${scoped.length} raised today`}
          onClick={() => setActiveFilter("Resolved")}
        />
        <StatTile
          label="Avg Response"
          value={avgResponse == null ? "—" : String(avgResponse)}
          unit="min"
          tone="info"
          icon={ClockIcon}
          status="Raised → acknowledged"
          foot={`${handled.length} handled alerts`}
        />
        <StatTile
          label="Open Total"
          value={String(active.length)}
          tone={unack > 0 ? "warning" : "normal"}
          icon={InboxIcon}
          status="Open + acknowledged"
          foot={`${unack} unacknowledged`}
          onClick={() => setActiveFilter("All")}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter alert">
        {FILTERS.map((f) => {
          const on = activeFilter === f
          const count = scoped.filter((r) => matchesFilter(r, f)).length
          return (
            <button
              key={f}
              type="button"
              aria-pressed={on}
              onClick={() => setActiveFilter(f)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium transition-colors",
                on
                  ? "border-emerald-500/30 bg-emerald-500/12 text-emerald-300"
                  : "border-white/[0.08] bg-white/[0.03] text-white/60 hover:border-white/15 hover:text-white/85"
              )}
            >
              <span className="size-1.5 rounded-full" style={{ background: FILTER_COLOR[f] }} />
              {f}
              <span className={cn("rounded-full px-1.5 font-mono text-[10.5px]", on ? "bg-emerald-400/15" : "bg-white/[0.06] text-white/55")}>
                {count}
              </span>
            </button>
          )
        })}
        {division !== ALL_BLOCKS && <span className="text-[11.5px] text-white/50">Filtered: {division}</span>}
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_320px]">
        <Panel>
          <PanelHeader
            kicker="EWS · RIWAYAT"
            icon={BellIcon}
            title="Alerts — Last 7 Days"
            subtitle="Raised per day by severity · 4–10 Sep 2024 · 10 Sep from the log below"
            action={<ViewAll href="/reports" />}
          />
          <div className="flex items-center gap-4 px-4 pb-1">
            {(["critical", "warning", "info"] as const).map((s) => (
              <span key={s} className="flex items-center gap-1.5 text-[10.5px] text-white/55">
                <span className="size-2.5 rounded-[3px]" style={{ background: TONE_COLOR[s] }} />
                {SEVERITY_LABEL[s]}
              </span>
            ))}
          </div>
          <div className="h-[220px] px-1 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="day" {...axisProps} />
                <YAxis allowDecimals={false} {...axisProps} width={28} />
                <Tooltip
                  {...tooltipStyle}
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  formatter={(v, n) => [`${v} alerts`, n]}
                  labelFormatter={(l) => `${l} 2024`}
                />
                <Bar dataKey="critical" name="Critical" stackId="sev" fill={TONE_COLOR.critical} maxBarSize={24} />
                <Bar dataKey="warning" name="Warning" stackId="sev" fill={TONE_COLOR.warning} maxBarSize={24} />
                <Bar dataKey="info" name="Info" stackId="sev" fill={TONE_COLOR.info} radius={[3, 3, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <PanelHeader kicker="EWS · KATEGORI" title="By Category" subtitle={`Active alerts (open + ack) · ${active.length} total`} />
          <div className="relative h-[200px] px-1">
            {byCategory.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip {...tooltipStyle} formatter={(v, n) => [`${v} alerts`, n]} />
                  <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={72} paddingAngle={2} stroke="none">
                    {byCategory.map((c) => (
                      <Cell key={c.name} fill={c.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-[12px] text-white/50">Tidak ada alert aktif.</div>
            )}
            {byCategory.length > 0 && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[22px] font-bold leading-none text-white">{active.length}</span>
                <span className="text-[10px] text-white/50">active</span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1.5 px-4 pb-4 pt-1">
            {CATEGORIES.map((c) => {
              const n = active.filter((r) => r.category === c).length
              return (
                <div key={c} className="flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-2 text-white/65">
                    <span className="size-2 rounded-[3px]" style={{ background: CATEGORY_COLOR[c] }} />
                    {c}
                  </span>
                  <span className={cn("font-semibold tabular-nums", n ? "text-white/85" : "text-white/50")}>{n}</span>
                </div>
              )
            })}
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          kicker="EWS · LOG"
          icon={InboxIcon}
          title="Alert Log"
          subtitle={`Today · 10 Sep 2024 · ${visibleRows.length} of ${scoped.length} alerts · assets from station registry`}
          action={
            <>
              <div className="relative">
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={sortOpen}
                  onClick={() => setSortOpen((o) => !o)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11.5px] font-medium text-white/70 transition-colors hover:border-white/15 hover:text-white/90"
                >
                  Sort: {sort}
                  <ChevronDownIcon className="size-3.5" />
                </button>
                {sortOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />
                    <div role="listbox" className="absolute right-0 z-50 mt-1 min-w-full overflow-hidden rounded-lg border border-white/10 bg-[#10201a] py-1 shadow-xl">
                      {sortOptions.map((o) => (
                        <button
                          key={o}
                          type="button"
                          role="option"
                          aria-selected={sort === o}
                          onClick={() => {
                            setSort(o)
                            setSortOpen(false)
                          }}
                          className={cn("block w-full px-3 py-2 text-left text-[12.5px] hover:bg-white/5", sort === o ? "text-emerald-300" : "text-white/75")}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <ViewAll
                onClick={() => {
                  setActiveFilter("All")
                  setSort("Newest")
                }}
              />
            </>
          }
        />
        <TableScroll className="pb-2">
          <table className="w-full min-w-[1180px] text-left">
            <thead>
              <tr>
                <th className={tableTh}>Time</th>
                <th className={tableTh}>Asset</th>
                <th className={tableTh}>Block</th>
                <th className={tableTh}>Category</th>
                <th className={tableTh}>Message</th>
                <th className={tableTh}>Severity</th>
                <th className={tableTh}>EWS</th>
                <th className={tableTh}>Status</th>
                <th className={tableTh}>Assigned</th>
                <th className={tableTh}>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 ? (
                <tr className={tableRow}>
                  <td className={cn(tableTd, "text-white/50")} colSpan={10}>
                    {division === ALL_BLOCKS ? "Tidak ada peringatan untuk filter ini." : `Tidak ada peringatan di ${division} untuk filter ini.`}
                  </td>
                </tr>
              ) : (
                visibleRows.map((r) => {
                  const st = stationByCode(r.asset)
                  const open = expanded === r.id
                  return (
                    <Fragment key={r.id}>
                      <tr className={cn(tableRow, open && "bg-emerald-400/[0.03]")}>
                        <td className={cn(tableTd, "font-mono font-medium text-white/70")}>{r.time}</td>
                        <td className={tableTd}>
                          <button
                            type="button"
                            aria-expanded={open}
                            aria-controls={`alert-${r.id}`}
                            onClick={() => setExpanded(open ? null : r.id)}
                            className="inline-flex h-7 items-center gap-1 rounded-md pr-1.5 font-mono font-semibold text-white/85 transition-colors hover:text-emerald-300"
                          >
                            <ChevronRightIcon className={cn("size-3.5 transition-transform", open && "rotate-90")} />
                            {r.asset}
                          </button>
                        </td>
                        <td className={cn(tableTd, "whitespace-nowrap text-white/65")}>{r.block}</td>
                        <td className={cn(tableTd, "whitespace-nowrap text-white/60")}>
                          <span className="inline-flex items-center gap-1.5">
                            {r.category === "Fire" ? (
                              <FlameIcon className="size-3" style={{ color: CATEGORY_COLOR.Fire }} />
                            ) : (
                              <span className="size-2 rounded-[3px]" style={{ background: CATEGORY_COLOR[r.category] }} />
                            )}
                            {r.category}
                          </span>
                        </td>
                        <td className={cn(tableTd, "text-white/75")}>{r.message}</td>
                        <td className={tableTd}>
                          <StatusDot tone={SEVERITY_TONE[r.severity]} label={SEVERITY_LABEL[r.severity]} />
                        </td>
                        <td className={tableTd}>{st ? <EwsPill level={st.level} pulse={st.level === "awas"} /> : "—"}</td>
                        <td className={cn(tableTd, "whitespace-nowrap")}>
                          <StatusDot tone={STATUS_TONE[r.status]} label={r.status} />
                        </td>
                        <td className={cn(tableTd, "whitespace-nowrap text-white/60")}>{r.assigned}</td>
                        <td className={tableTd}>
                          <div className="flex items-center gap-1.5">
                            {r.status === "Open" && (
                              <button
                                type="button"
                                onClick={() => updateStatus(r, "Acknowledged", `Peringatan ${r.asset} ditangani`)}
                                className={cn(actionBtn, "border-white/10 bg-white/[0.03] text-white/75 hover:border-amber-400/40 hover:text-amber-200")}
                              >
                                Ack
                              </button>
                            )}
                            {r.status !== "Resolved" ? (
                              <button
                                type="button"
                                onClick={() => updateStatus(r, "Resolved", `Peringatan ${r.asset} diselesaikan`)}
                                className={cn(actionBtn, "border-white/10 bg-white/[0.03] text-white/75 hover:border-emerald-400/40 hover:text-emerald-200")}
                              >
                                Resolve
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => updateStatus(r, "Open", `Peringatan ${r.asset} dibuka kembali`)}
                                className={cn(actionBtn, "border-white/10 bg-white/[0.03] text-white/65 hover:border-white/25 hover:text-white/90")}
                              >
                                Reopen
                              </button>
                            )}
                            <OpenInTwin variant="icon" asset={r.asset} className="size-8" />
                          </div>
                        </td>
                      </tr>
                      {open && (
                        <tr id={`alert-${r.id}`} className="border-t border-white/[0.04] bg-white/[0.015]">
                          <td colSpan={10} className="px-4 py-3">
                            {st ? (
                              <div className="flex flex-wrap items-start gap-x-8 gap-y-3">
                                <div className="min-w-[180px]">
                                  <span className="kicker block text-white/55">{STATION_TYPE_LABEL[st.type]}</span>
                                  <span className="mt-1 flex items-center gap-2">
                                    <span className="text-[20px] font-bold tabular-nums text-white">{formatStationValue(st)}</span>
                                    <EwsPill level={st.level} />
                                  </span>
                                  {st.note && <span className="mt-1 block text-[11.5px] text-white/60">{st.note}</span>}
                                </div>
                                <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
                                  <DetailItem label="Last seen">
                                    <span className="font-mono">{st.lastSeen}</span>
                                  </DetailItem>
                                  <DetailItem label="Battery">{st.battery}%</DetailItem>
                                  <DetailItem label="Signal">
                                    <StatusDot
                                      tone={st.signal === "No signal" ? "offline" : st.signal === "Weak" ? "warning" : st.signal === "Fair" ? "info" : "normal"}
                                      label={st.signal}
                                    />
                                  </DetailItem>
                                  <DetailItem label="Coordinates">
                                    <span className="font-mono text-[11px]">{formatLatLng(st.lat, st.lng)}</span>
                                  </DetailItem>
                                  <DetailItem label="Raised">{r.time} · 10 Sep</DetailItem>
                                  <DetailItem label="Response">{r.responseMin != null ? `${r.responseMin} min` : "Not acknowledged"}</DetailItem>
                                  <DetailItem label="Assigned">{r.assigned}</DetailItem>
                                  {st.peatDepth != null ? (
                                    <DetailItem label="Peat depth · soil temp">
                                      {st.peatDepth} cm · {st.soilTemp} °C
                                    </DetailItem>
                                  ) : (
                                    <DetailItem label="Twin">{st.twinId ? `Asset ${st.twinId}` : `${st.block} (block)`}</DetailItem>
                                  )}
                                </dl>
                                <OpenInTwin asset={r.asset} label={st.twinId ? "Buka di Twin" : `Buka ${st.block} di Twin`} />
                              </div>
                            ) : (
                              <span className="text-[12px] text-white/55">Aset {r.asset} tidak ada di registri stasiun.</span>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </TableScroll>
      </Panel>
    </PeatShell>
  )
}
