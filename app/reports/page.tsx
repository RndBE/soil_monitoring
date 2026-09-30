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
  BoxIcon,
  CalendarIcon,
  ClockIcon,
  DownloadIcon,
  FactoryIcon,
  FileTextIcon,
  FlameIcon,
  FolderArchiveIcon,
  HardDriveIcon,
  LayoutTemplateIcon,
  MapIcon,
  PlusIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  UsersIcon,
  WavesIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { axisProps, gridProps, tooltipStyle, withUnit } from "@/components/peatland/chart-theme"
import { OpenInTwin } from "@/components/peatland/open-in-twin"
import { Panel, PanelHeader, TableScroll, ViewAll, tableRow, tableTd, tableTh } from "@/components/peatland/panel"
import { PeatShell } from "@/components/peatland/peat-shell"
import { StatTile } from "@/components/peatland/stat-tile"
import { EwsPill } from "@/components/peatland/status"
import { useSession } from "@/components/session-provider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  EWS_META,
  LIVE_GATE_OPENING,
  SCENARIO_PRESETS,
  TWIN_BLOCKS,
  WT_COMPLIANCE,
  areaBelowCompliance,
  buildHistoryFrames,
  co2Emission,
  ewsFromFireRisk,
  ewsFromWaterTable,
  getBlockBaseline,
  recommendGateOpening,
  simulateScenario,
  summarizeFrame,
} from "@/lib/peatland/digital-twin"
import { ALL_BLOCKS, matchesBlock } from "@/lib/peatland/filter-logic"
import { useDashboardFilters } from "@/lib/peatland/filters"
import { dashboardMeta } from "@/lib/peatland/mock-data"
import { twinHref, type TwinLink } from "@/lib/peatland/stations"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Data arsip laporan (timeline Sep 2024, live 10 Sep 2024 09:37 WIB)

type ReportType = "Water Table" | "Fire Risk" | "NDVI" | "Compliance" | "Digital Twin"
type ReportFormat = "PDF" | "Excel" | "CSV"
type Frequency = "Daily" | "Weekly" | "Monthly"

const TWIN_TEMPLATE = "Digital Twin Snapshot"
const LIVE_DATE = "10 Sep 2024"

const TEMPLATES: { name: string; type: ReportType; desc: string }[] = [
  { name: "Daily Water Table Summary", type: "Water Table", desc: "Water table per block vs the −40 cm PP 57/2016 limit" },
  { name: "Weekly Fire Risk Bulletin", type: "Fire Risk", desc: "Fire risk index, VIIRS hotspots and dry days" },
  { name: "Monthly NDVI Health Report", type: "NDVI", desc: "Sentinel-2 NDVI per block with stressed areas" },
  { name: "Compliance & GHG Audit", type: "Compliance", desc: "PP 57/2016 compliance points and CO₂ emission estimate" },
  { name: "Borehole Sensor Raw Export", type: "Water Table", desc: "Raw borehole telemetry for all blocks" },
  { name: TWIN_TEMPLATE, type: "Digital Twin", desc: "Live twin KPIs, per-block water table and 7-day gate recommendation" },
]

const TYPE_META: Record<ReportType, { color: string; text: string }> = {
  "Water Table": { color: "#38bdf8", text: "text-sky-400" },
  "Fire Risk": { color: "#ef4444", text: "text-red-400" },
  NDVI: { color: "#84cc16", text: "text-lime-400" },
  Compliance: { color: "#f59e0b", text: "text-amber-400" },
  "Digital Twin": { color: "#a78bfa", text: "text-violet-300" },
}

// Jumlah arsip per tipe sebelum sesi ini (total 248, sudah termasuk tabel di bawah).
const ARCHIVE_BY_TYPE: Record<ReportType, number> = {
  "Water Table": 92,
  "Fire Risk": 62,
  NDVI: 50,
  Compliance: 34,
  "Digital Twin": 10,
}
const ARCHIVE_STORAGE_MB = 1843
const STORAGE_QUOTA_GB = 10

// Volume bulanan 2024; Sep = month-to-date (1–10 Sep).
const MONTHLY_GENERATED = [
  { month: "Mar", count: 26 },
  { month: "Apr", count: 31 },
  { month: "May", count: 28 },
  { month: "Jun", count: 35 },
  { month: "Jul", count: 24 },
  { month: "Aug", count: 38 },
  { month: "Sep", count: 32 },
]

const DATE_RANGES = [
  { label: "Last 7 days · 4–10 Sep 2024", period: "4–10 Sep 2024" },
  { label: "Month to date · 1–10 Sep 2024", period: "1–10 Sep 2024" },
  { label: "Last 30 days · 12 Aug–10 Sep 2024", period: "12 Aug–10 Sep 2024" },
  { label: "Q3 2024 · Jul–Sep", period: "Q3 2024" },
  { label: "Year to date · Jan–Sep 2024", period: "Jan–Sep 2024" },
]

const FORMATS: { value: ReportFormat; label: string }[] = [
  { value: "PDF", label: "PDF" },
  { value: "Excel", label: "Excel" },
  { value: "CSV", label: "CSV" },
]

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: "Daily", label: "Daily" },
  { value: "Weekly", label: "Weekly" },
  { value: "Monthly", label: "Monthly" },
]

// Jadwal berikutnya setelah live 10 Sep 2024 (Selasa); mingguan jalan tiap Senin.
const NEXT_RUN: Record<Frequency, string> = {
  Daily: "11 Sep 2024 · 06:00",
  Weekly: "16 Sep 2024 · 07:00",
  Monthly: "1 Oct 2024 · 08:00",
}

const MODES = [
  { value: "now", label: "Generate now" },
  { value: "schedule", label: "Schedule" },
] as const
type Mode = (typeof MODES)[number]["value"]

type ScheduledReport = {
  id: string
  name: string
  freq: Frequency
  next: string
  recipients: number
  format: ReportFormat
  on: boolean
}

const INITIAL_SCHEDULES: ScheduledReport[] = [
  { id: "s-1", name: "Daily Water Table Summary", freq: "Daily", next: "11 Sep 2024 · 06:00", recipients: 8, format: "PDF", on: true },
  { id: "s-2", name: "Weekly Fire Risk Bulletin", freq: "Weekly", next: "16 Sep 2024 · 07:30", recipients: 12, format: "PDF", on: true },
  { id: "s-3", name: TWIN_TEMPLATE, freq: "Weekly", next: "16 Sep 2024 · 08:00", recipients: 4, format: "PDF", on: true },
  { id: "s-4", name: "Compliance & GHG Audit", freq: "Monthly", next: "30 Sep 2024 · 09:00", recipients: 6, format: "PDF", on: true },
  { id: "s-5", name: "Monthly NDVI Health Report", freq: "Monthly", next: "1 Oct 2024 · 08:00", recipients: 5, format: "PDF", on: false },
]

type ReportRow = {
  id: string
  name: string
  type: ReportType
  period: string
  by: string
  date: string
  sizeMb: number
  format: ReportFormat
  block?: string
  /** Dibuat di sesi ini (ikut dihitung ke KPI & grafik). */
  fresh?: boolean
}

const INITIAL_REPORTS: ReportRow[] = [
  { id: "r-10", name: "Daily Water Table Summary · 10 Sep", type: "Water Table", period: "10 Sep 2024", by: "System", date: "10 Sep 2024", sizeMb: 1.2, format: "PDF" },
  { id: "r-9", name: "Water Table Summary · Sei Galuh Estate", type: "Water Table", period: "1–10 Sep 2024", by: "Andi Saputra", date: "10 Sep 2024", sizeMb: 2.4, format: "PDF" },
  { id: "r-8", name: "Digital Twin Snapshot · 9 Sep", type: "Digital Twin", period: "3–9 Sep 2024", by: "System", date: "9 Sep 2024", sizeMb: 3.1, format: "PDF" },
  { id: "r-7", name: "Weekly Fire Risk Bulletin · W36", type: "Fire Risk", period: "2–8 Sep 2024", by: "System", date: "9 Sep 2024", sizeMb: 1.1, format: "PDF" },
  { id: "r-6", name: "NDVI Plantation Health Q3", type: "NDVI", period: "Jul–Sep 2024", by: "Budi Hartono", date: "5 Sep 2024", sizeMb: 8.7, format: "Excel" },
  { id: "r-5", name: "Compliance Audit · Block C", type: "Compliance", period: "Aug 2024", by: "Andi Saputra", date: "2 Sep 2024", sizeMb: 3.9, format: "PDF", block: "Block C" },
  { id: "r-4", name: "Borehole Sensor Raw Export", type: "Water Table", period: "Aug 2024", by: "Rina Wati", date: "1 Sep 2024", sizeMb: 0.64, format: "CSV" },
  { id: "r-3", name: "Monthly NDVI Health Report · Aug", type: "NDVI", period: "Aug 2024", by: "System", date: "1 Sep 2024", sizeMb: 6.2, format: "PDF" },
  { id: "r-2", name: "Fire Hotspot Log · Block D", type: "Fire Risk", period: "Aug 2024", by: "Dewi Lestari", date: "31 Aug 2024", sizeMb: 1.8, format: "Excel", block: "Block D" },
  { id: "r-1", name: "Compliance & GHG Audit · Aug", type: "Compliance", period: "Aug 2024", by: "System", date: "31 Aug 2024", sizeMb: 4.5, format: "PDF" },
]

const RECENT_LIMIT = 8

const FORMAT_BADGE: Record<ReportFormat, string> = {
  PDF: "bg-red-500/12 text-red-300 ring-red-500/25",
  Excel: "bg-emerald-500/12 text-emerald-300 ring-emerald-500/25",
  CSV: "bg-sky-500/12 text-sky-300 ring-sky-500/25",
}

const GENERATED_SIZE_MB: Record<ReportFormat, number> = { PDF: 2.6, Excel: 5.2, CSV: 0.82 }

// Layer twin yang relevan untuk tiap tipe laporan (aksi "Open in Twin").
const TYPE_LAYER: Record<ReportType, TwinLink["layer"]> = {
  "Water Table": "waterTable",
  "Fire Risk": "fireRisk",
  NDVI: "ndvi",
  Compliance: "waterTable",
  "Digital Twin": undefined,
}

const fieldLabel = "text-[10.5px] font-semibold uppercase tracking-wide text-white/55"

// ---------------------------------------------------------------------------
// Helper format

const fmtInt = (v: number) => Math.round(v).toLocaleString("en-US")
const fmtSigned = (v: number) => `${v < 0 ? "−" : ""}${Math.abs(Math.round(v))}`
const fmtCm = (v: number) => `${fmtSigned(v)} cm`
const fmtSize = (mb: number) => (mb < 1 ? `${Math.round(mb * 1000)} KB` : `${mb.toFixed(1)} MB`)

function scrollToSection(id: string, focusId?: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true })
}

// ---------------------------------------------------------------------------
// Kontrol form kecil

/** Pilihan tunggal berbentuk chip; radio native supaya panah & label bekerja. */
function ChoiceGroup<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string
  name: string
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <fieldset>
      <legend className={cn(fieldLabel, "mb-1.5")}>{legend}</legend>
      <div className="flex flex-wrap items-center gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              "cursor-pointer rounded-lg px-3 py-1.5 text-[12px] font-medium ring-1 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-emerald-400/70",
              o.value === value
                ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                : "bg-white/[0.03] text-white/60 ring-white/10 hover:text-white/85"
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={o.value === value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/** Select shadcn (Base UI) bertema gelap: Esc, panah, dan aria-expanded bawaan. */
function FormSelect({
  id,
  icon: Icon,
  value,
  options,
  onChange,
}: {
  id: string
  icon: React.ComponentType<{ className?: string }>
  value: string
  options: readonly string[]
  onChange: (v: string) => void
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (typeof v === "string") onChange(v)
      }}
    >
      <SelectTrigger
        id={id}
        className="w-full border-white/10 bg-white/[0.03] px-3 text-[12.5px] text-white/85 hover:border-white/20 data-[size=default]:h-9 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]"
      >
        <Icon className="size-3.5 text-white/50" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="bg-[#0b1a13] text-white/80 ring-emerald-200/15">
        {options.map((o) => (
          <SelectItem
            key={o}
            value={o}
            className="py-1.5 text-[12.5px] text-white/80 focus:bg-emerald-500/15 focus:text-white not-data-[variant=destructive]:focus:**:text-white"
          >
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Sakelar on/off yang dapat diakses (role="switch"). */
function Switch({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-[18px] w-8 shrink-0 items-center rounded-full ring-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400/70",
        checked ? "bg-emerald-500/80 ring-emerald-400/40" : "bg-white/12 ring-white/15"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block size-3.5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5"
        )}
      />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Snapshot digital twin (dihitung dari model twin, menghormati filter division)

function useTwinSnapshot(estate: string, division: string) {
  return useMemo(() => {
    const baseline = getBlockBaseline(estate)
    const blocks = TWIN_BLOCKS.filter((b) => matchesBlock(b, division))
    const inScope = baseline.filter((b) => blocks.includes(b.block))
    const history = buildHistoryFrames(baseline)
    const live = history[history.length - 1]
    const series = history.map((f) => summarizeFrame(f, baseline, blocks))
    const summary = series[series.length - 1]
    const belowSeries = history.map((f) =>
      inScope.reduce((acc, b) => acc + areaBelowCompliance(b.area, f.blocks[b.block].waterTable), 0)
    )
    const rows = inScope.map((b) => {
      const s = live.blocks[b.block]
      return {
        block: b.block,
        area: b.area,
        waterTable: s.waterTable,
        fireRisk: s.fireRisk,
        below: areaBelowCompliance(b.area, s.waterTable),
        co2: co2Emission(b.area, s.waterTable),
      }
    })
    const totalArea = inScope.reduce((acc, b) => acc + b.area, 0)

    // Rekomendasi bukaan pintu air 7 hari untuk skenario baseline (seluruh estate).
    const preset = SCENARIO_PRESETS.find((p) => p.key === "baseline") ?? SCENARIO_PRESETS[0]
    const scenario = { ...preset.scenario, days: 7 }
    const rec = recommendGateOpening(baseline, scenario)
    const noAction = simulateScenario(baseline, scenario)
    const withRec = simulateScenario(baseline, { ...scenario, gateOpening: rec.gateOpening })
    const endLabel = noAction[noAction.length - 1].label
    const noActionEnd = summarizeFrame(noAction[noAction.length - 1], baseline, TWIN_BLOCKS)
    const withRecEnd = summarizeFrame(withRec[withRec.length - 1], baseline, TWIN_BLOCKS)

    return {
      summary,
      series,
      belowSeries,
      rows,
      totalArea,
      areaBelow: belowSeries[belowSeries.length - 1],
      firstLabel: history[0].label,
      rec,
      scenario,
      // "11–17 Sep 2024"
      forecastRange: `${parseInt(noAction[0].label, 10)}–${endLabel} 2024`,
      endLabel,
      noActionEnd,
      withRecEnd,
    }
  }, [estate, division])
}

type TwinSnapshot = ReturnType<typeof useTwinSnapshot>

function twinDigest(t: TwinSnapshot): string {
  return `Water table ${fmtCm(t.summary.waterTable)} · ${t.summary.compliant}/${t.summary.total} blocks PP 57 · gate rec. ${t.rec.gateOpening}%`
}

function TwinSnapshotCard({
  twin,
  estate,
  division,
  onUseTemplate,
}: {
  twin: TwinSnapshot
  estate: string
  division: string
  onUseTemplate: () => void
}) {
  const { summary, series, rec } = twin
  const scopeBlock = division === ALL_BLOCKS ? undefined : division
  const wtLevel = ewsFromWaterTable(summary.waterTable)
  const fireLevel = ewsFromFireRisk(summary.fireRisk)
  const nonCompliant = summary.total - summary.compliant
  const first = series[0]
  const wtDiff = summary.waterTable - first.waterTable
  const fireDiff = summary.fireRisk - first.fireRisk
  const belowPct = twin.totalArea ? Math.round((twin.areaBelow / twin.totalArea) * 100) : 0
  const noActionLevel = ewsFromWaterTable(twin.noActionEnd.waterTable)
  const withRecLevel = ewsFromWaterTable(twin.withRecEnd.waterTable)

  return (
    <section id="twin-snapshot" aria-label={`${TWIN_TEMPLATE} preview`} className="scroll-mt-4">
      <Panel>
        <PanelHeader
          kicker="Digital Twin · Snapshot"
          icon={BoxIcon}
          title={TWIN_TEMPLATE}
          subtitle={`Live ${dashboardMeta.lastUpdate} · ${estate} · ${division} · computed from the twin model`}
          action={
            <>
              <button
                type="button"
                onClick={onUseTemplate}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11.5px] font-semibold text-white/75 transition-colors hover:border-white/20 hover:text-white"
              >
                <LayoutTemplateIcon className="size-3.5" />
                Use template
              </button>
              <OpenInTwin block={scopeBlock} layer="waterTable" label="Open in Twin" />
            </>
          }
        />
        <div className="grid grid-cols-2 gap-3 px-4 md:grid-cols-3 xl:grid-cols-5">
          <StatTile
            label={scopeBlock ? `${scopeBlock} water table` : "Estate water table"}
            value={fmtSigned(summary.waterTable)}
            unit="cm"
            icon={WavesIcon}
            tone={wtLevel}
            status={`${EWS_META[wtLevel].label} · target ≥ −30 cm`}
            spark={series.map((s) => s.waterTable)}
            delta={{ text: `${Math.abs(wtDiff)} cm`, dir: wtDiff < 0 ? "down" : "up", good: wtDiff >= 0, vs: `vs ${twin.firstLabel}` }}
            href={twinHref({ layer: "waterTable", block: scopeBlock })}
          />
          <StatTile
            label="PP 57 compliant"
            value={`${summary.compliant}/${summary.total}`}
            unit="blocks"
            icon={ShieldCheckIcon}
            tone={nonCompliant ? "siaga" : "normal"}
            status={nonCompliant ? `${nonCompliant} block${nonCompliant > 1 ? "s" : ""} below −40 cm` : "All blocks ≥ −40 cm"}
            spark={series.map((s) => s.compliant)}
            foot="PP 57/2016 · limit −40 cm"
          />
          <StatTile
            label="Area below −40 cm"
            value={fmtInt(twin.areaBelow)}
            unit="ha"
            icon={MapIcon}
            tone={twin.areaBelow > 0 ? "siaga" : "normal"}
            spark={twin.belowSeries}
            foot={`of ${fmtInt(twin.totalArea)} ha (${belowPct}%)`}
          />
          <StatTile
            label="CO₂ emission"
            value={fmtInt(summary.co2)}
            unit="t/yr"
            icon={FactoryIcon}
            tone="info"
            spark={series.map((s) => s.co2)}
            foot="0.91 t CO₂/ha/yr per cm drainage"
          />
          <StatTile
            label="Fire risk index"
            value={String(summary.fireRisk)}
            unit="/100"
            icon={FlameIcon}
            tone={fireLevel}
            status={EWS_META[fireLevel].label}
            spark={series.map((s) => s.fireRisk)}
            delta={{ text: String(Math.abs(fireDiff)), dir: fireDiff < 0 ? "down" : "up", good: fireDiff <= 0, vs: `vs ${twin.firstLabel}` }}
            href={twinHref({ layer: "fireRisk", block: scopeBlock })}
          />
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-[1.35fr_1fr]">
          <div className="min-w-0 rounded-xl border border-white/[0.06]">
            <div className="flex items-center justify-between gap-2 px-3 pt-2.5">
              <span className="kicker text-white/55">Per block · live {LIVE_DATE}</span>
              <span className="text-[11px] text-white/50">PP 57/2016 limit {fmtCm(WT_COMPLIANCE)}</span>
            </div>
            <TableScroll>
              <table className="w-full min-w-[560px] text-left">
                <thead>
                  <tr>
                    <th className={tableTh}>Block</th>
                    <th className={cn(tableTh, "text-right")}>Water table</th>
                    <th className={tableTh}>EWS</th>
                    <th className={cn(tableTh, "text-right")}>Below −40 cm</th>
                    <th className={cn(tableTh, "text-right")}>CO₂ t/yr</th>
                    <th className={cn(tableTh, "text-right")}>Fire risk</th>
                    <th className={cn(tableTh, "text-right")}>Twin</th>
                  </tr>
                </thead>
                <tbody>
                  {twin.rows.map((r) => {
                    const level = ewsFromWaterTable(r.waterTable)
                    return (
                      <tr key={r.block} className={tableRow}>
                        <td className={cn(tableTd, "font-medium text-white/85")}>{r.block}</td>
                        <td className={cn(tableTd, "text-right font-mono tabular-nums text-white/80")}>{fmtCm(r.waterTable)}</td>
                        <td className={tableTd}>
                          <EwsPill level={level} pulse={level === "awas"} />
                        </td>
                        <td className={cn(tableTd, "text-right tabular-nums text-white/70")}>
                          {fmtInt(r.below)} <span className="text-white/50">/ {fmtInt(r.area)} ha</span>
                        </td>
                        <td className={cn(tableTd, "text-right tabular-nums text-white/70")}>{fmtInt(r.co2)}</td>
                        <td className={cn(tableTd, "text-right tabular-nums")} style={{ color: EWS_META[ewsFromFireRisk(r.fireRisk)].color }}>
                          {r.fireRisk}
                        </td>
                        <td className={cn(tableTd, "text-right")}>
                          <OpenInTwin variant="icon" block={r.block} layer="waterTable" label="Open in Twin" />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </TableScroll>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-emerald-400/15 bg-emerald-500/[0.04] p-4">
            <span className="kicker flex items-center gap-1.5 text-emerald-300/70">
              <SlidersHorizontalIcon className="size-3" />
              7-day gate recommendation · Baseline
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-[28px] font-bold leading-none tabular-nums text-white">{rec.gateOpening}%</span>
              <span className="text-[12px] text-white/60">water gate opening (now {LIVE_GATE_OPENING}%)</span>
            </div>
            <p className="text-[11.5px] text-white/55">
              Rain {twin.scenario.rainfall} mm/day, no canal blocking · forecast {twin.forecastRange} · estate-wide
            </p>
            <dl className="grid gap-2 text-[12px]">
              <div className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.03] px-3 py-2">
                <dt className="text-white/60">
                  No action ({LIVE_GATE_OPENING}%) · {twin.endLabel}
                </dt>
                <dd className="flex items-center gap-2">
                  <span className="font-mono tabular-nums text-white/85">{fmtCm(twin.noActionEnd.waterTable)}</span>
                  <EwsPill level={noActionLevel} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.03] px-3 py-2">
                <dt className="text-white/60">
                  Recommended ({rec.gateOpening}%) · {twin.endLabel}
                </dt>
                <dd className="flex items-center gap-2">
                  <span className="font-mono tabular-nums text-white/85">{fmtCm(twin.withRecEnd.waterTable)}</span>
                  <EwsPill level={withRecLevel} />
                </dd>
              </div>
            </dl>
            <p className={cn("text-[11.5px]", rec.feasible ? "text-emerald-300/85" : "text-amber-300/90")}>
              {rec.feasible
                ? `All blocks return within −40 … −10 cm by ${twin.endLabel}.`
                : `Gates alone are not enough: ${rec.worstBlock} stays at ${fmtCm(rec.worstLevel)} (${EWS_META[ewsFromWaterTable(rec.worstLevel)].label}). Consider canal blocking.`}
              {rec.floodBlock ? ` Flood risk in ${rec.floodBlock} (above −10 cm).` : ""}
            </p>
            <div className="mt-auto flex flex-wrap items-center gap-3">
              <OpenInTwin scenario="baseline" label="Open scenario in Twin" />
              {!rec.feasible && <OpenInTwin variant="link" scenario="rewet" label="Try Rewetting scenario" />}
            </div>
          </div>
        </div>
      </Panel>
    </section>
  )
}

// ---------------------------------------------------------------------------

export default function ReportsPage() {
  const session = useSession()
  const { estate, division } = useDashboardFilters()
  const twin = useTwinSnapshot(estate, division)

  const [mode, setMode] = useState<Mode>("now")
  const [template, setTemplate] = useState(TEMPLATES[0].name)
  const [dateRange, setDateRange] = useState(DATE_RANGES[0].label)
  const [format, setFormat] = useState<ReportFormat>("PDF")
  const [frequency, setFrequency] = useState<Frequency>("Weekly")
  const [recipients, setRecipients] = useState("5")
  const [busy, setBusy] = useState(false)

  const [schedules, setSchedules] = useState<ScheduledReport[]>(INITIAL_SCHEDULES)
  const [reports, setReports] = useState<ReportRow[]>(INITIAL_REPORTS)
  const [typeFilter, setTypeFilter] = useState<ReportType | "All">("All")
  const [showAll, setShowAll] = useState(false)

  const templateMeta = TEMPLATES.find((t) => t.name === template) ?? TEMPLATES[0]
  const isTwinTemplate = template === TWIN_TEMPLATE
  const recipientCount = Number(recipients)
  const recipientsValid = Number.isInteger(recipientCount) && recipientCount >= 1 && recipientCount <= 50

  // KPI & grafik diturunkan dari daftar (arsip awal + laporan sesi ini).
  const fresh = reports.filter((r) => r.fresh)
  const typeMix = (Object.keys(ARCHIVE_BY_TYPE) as ReportType[]).map((type) => ({
    name: type,
    value: ARCHIVE_BY_TYPE[type] + fresh.filter((r) => r.type === type).length,
    color: TYPE_META[type].color,
  }))
  const totalReports = typeMix.reduce((acc, t) => acc + t.value, 0)
  const monthly = MONTHLY_GENERATED.map((m, i) =>
    i === MONTHLY_GENERATED.length - 1 ? { ...m, count: m.count + fresh.length } : m
  )
  const generatedThisMonth = monthly[monthly.length - 1].count
  const lastMonth = monthly[monthly.length - 2]
  const storageMb = ARCHIVE_STORAGE_MB + fresh.reduce((acc, r) => acc + r.sizeMb, 0)
  const storageGb = storageMb / 1024
  const storagePct = Math.round((storageGb / STORAGE_QUOTA_GB) * 100)
  const activeSchedules = schedules.filter((s) => s.on).length
  const pausedSchedules = schedules.length - activeSchedules
  const reportTypes = new Set(TEMPLATES.map((t) => t.type)).size

  const filtered = typeFilter === "All" ? reports : reports.filter((r) => r.type === typeFilter)
  const visible = showAll ? filtered : filtered.slice(0, RECENT_LIMIT)

  function startNewSchedule() {
    setMode("schedule")
    scrollToSection("generate-report", "report-template")
  }

  function applyTwinTemplate() {
    setTemplate(TWIN_TEMPLATE)
    setMode("now")
    scrollToSection("generate-report", "report-template")
  }

  function handleGenerate() {
    const range = DATE_RANGES.find((r) => r.label === dateRange) ?? DATE_RANGES[0]
    const row: ReportRow = {
      id: `r-new-${Date.now()}`,
      name: isTwinTemplate ? `${TWIN_TEMPLATE} · ${LIVE_DATE}` : template,
      type: templateMeta.type,
      period: isTwinTemplate ? `Live ${LIVE_DATE}` : range.period,
      by: session?.name ?? dashboardMeta.user.name,
      date: LIVE_DATE,
      sizeMb: isTwinTemplate && format === "PDF" ? 3.1 : GENERATED_SIZE_MB[format],
      format,
      fresh: true,
    }
    setBusy(true)
    const id = toast.loading(`Generating ${row.name}…`)
    window.setTimeout(() => {
      setReports((prev) => [row, ...prev])
      setTypeFilter("All")
      setBusy(false)
      toast.success("Report ready to download", {
        id,
        description: isTwinTemplate ? twinDigest(twin) : `${row.period} · ${row.format} · ${fmtSize(row.sizeMb)}`,
      })
    }, 900)
  }

  function handleSchedule() {
    if (!recipientsValid) {
      toast.error("Recipients must be a whole number between 1 and 50")
      return
    }
    if (schedules.some((s) => s.name === template && s.freq === frequency)) {
      toast.error(`${template} is already scheduled ${frequency.toLowerCase()}`)
      return
    }
    const item: ScheduledReport = {
      id: `s-new-${Date.now()}`,
      name: template,
      freq: frequency,
      next: NEXT_RUN[frequency],
      recipients: recipientCount,
      format,
      on: true,
    }
    setSchedules((prev) => [item, ...prev])
    toast.success("Schedule created", { description: `${item.name} · ${item.freq} · next run ${item.next}` })
  }

  function toggleSchedule(id: string, next: boolean) {
    const target = schedules.find((s) => s.id === id)
    if (!target) return
    setSchedules((prev) => prev.map((s) => (s.id === id ? { ...s, on: next } : s)))
    toast(next ? `"${target.name}" schedule resumed` : `"${target.name}" schedule paused`)
  }

  return (
    <PeatShell title="Reports" subtitle="Report Generation & Archive">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatTile
          label="Total Reports"
          value={fmtInt(totalReports)}
          icon={FolderArchiveIcon}
          tone="info"
          foot="All-time archive"
          onClick={() => scrollToSection("recent-reports")}
        />
        <StatTile
          label="Generated This Month"
          value={String(generatedThisMonth)}
          icon={FileTextIcon}
          tone="normal"
          spark={monthly.map((m) => m.count)}
          foot={`1–10 Sep 2024 · ${lastMonth.month}: ${lastMonth.count}`}
        />
        <StatTile
          label="Scheduled"
          value={String(schedules.length)}
          icon={ClockIcon}
          tone={pausedSchedules ? "warning" : "normal"}
          foot={`${activeSchedules} active · ${pausedSchedules} paused`}
          onClick={() => scrollToSection("scheduled-reports")}
        />
        <StatTile
          label="Storage Used"
          value={storageGb.toFixed(1)}
          unit="GB"
          icon={HardDriveIcon}
          tone={storagePct >= 80 ? "warning" : "normal"}
          foot={`of ${STORAGE_QUOTA_GB} GB quota · ${storagePct}% used`}
        />
        <StatTile
          label="Templates"
          value={String(TEMPLATES.length)}
          icon={LayoutTemplateIcon}
          tone="normal"
          foot={`${reportTypes} report types · incl. Digital Twin`}
          onClick={() => scrollToSection("generate-report", "report-template")}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section id="generate-report" aria-label="Generate report" className="flex min-w-0 scroll-mt-4 flex-col">
          <Panel className="flex-1">
            <PanelHeader
              kicker="Reports · Generate"
              icon={FileTextIcon}
              title="Generate Report"
              subtitle={mode === "now" ? "Ad-hoc export · saved to the archive" : "New schedule · delivered automatically (WIB)"}
            />
            <form
              className="flex flex-col gap-3.5 px-4 pb-4"
              onSubmit={(e) => {
                e.preventDefault()
                if (mode === "now") handleGenerate()
                else handleSchedule()
              }}
            >
              <ChoiceGroup legend="Delivery" name="report-mode" options={MODES} value={mode} onChange={setMode} />

              <div className="flex flex-col gap-1.5">
                <label htmlFor="report-template" className={fieldLabel}>
                  Template
                </label>
                <FormSelect
                  id="report-template"
                  icon={LayoutTemplateIcon}
                  value={template}
                  options={TEMPLATES.map((t) => t.name)}
                  onChange={setTemplate}
                />
                <p className="text-[11px] text-white/50">
                  {templateMeta.desc}
                  {isTwinTemplate && (
                    <>
                      {" · "}
                      <button
                        type="button"
                        onClick={() => scrollToSection("twin-snapshot")}
                        className="font-medium text-emerald-400 hover:text-emerald-300"
                      >
                        See preview
                      </button>
                    </>
                  )}
                </p>
              </div>

              {mode === "now" ? (
                isTwinTemplate ? (
                  <div className="flex flex-col gap-1.5">
                    <span className={fieldLabel}>Period</span>
                    <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[12.5px] text-white/75">
                      Live {dashboardMeta.lastUpdate} · history 4–10 Sep · forecast {twin.forecastRange}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="report-range" className={fieldLabel}>
                      Date Range
                    </label>
                    <FormSelect
                      id="report-range"
                      icon={CalendarIcon}
                      value={dateRange}
                      options={DATE_RANGES.map((r) => r.label)}
                      onChange={setDateRange}
                    />
                  </div>
                )
              ) : (
                <div className="grid gap-3.5 sm:grid-cols-[1fr_auto]">
                  <ChoiceGroup legend="Frequency" name="report-frequency" options={FREQUENCIES} value={frequency} onChange={setFrequency} />
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="report-recipients" className={fieldLabel}>
                      Recipients
                    </label>
                    <input
                      id="report-recipients"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={50}
                      step={1}
                      value={recipients}
                      onChange={(e) => setRecipients(e.target.value)}
                      aria-invalid={!recipientsValid}
                      aria-describedby="report-recipients-hint"
                      className="h-9 w-28 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-[12.5px] tabular-nums text-white/85 outline-none focus-visible:border-emerald-400/50 focus-visible:ring-2 focus-visible:ring-emerald-400/30 aria-[invalid=true]:border-red-400/60"
                    />
                    <span id="report-recipients-hint" className="text-[10.5px] text-white/50">
                      1–50 · next run {NEXT_RUN[frequency]}
                    </span>
                  </div>
                </div>
              )}

              <ChoiceGroup legend="Format" name="report-format" options={FORMATS} value={format} onChange={setFormat} />

              <button
                type="submit"
                disabled={busy}
                className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-[13px] font-semibold text-[#062013] transition-colors hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 disabled:cursor-wait disabled:opacity-60"
              >
                {mode === "now" ? <FileTextIcon className="size-4" /> : <ClockIcon className="size-4" />}
                {mode === "now" ? (busy ? "Generating…" : "Generate Report") : "Create Schedule"}
              </button>
            </form>
          </Panel>
        </section>

        <section id="scheduled-reports" aria-label="Scheduled reports" className="flex min-w-0 scroll-mt-4 flex-col">
          <Panel className="flex-1">
            <PanelHeader
              kicker="Reports · Schedule"
              icon={ClockIcon}
              title="Scheduled Reports"
              subtitle={`${activeSchedules} active · ${pausedSchedules} paused · times in WIB`}
              action={
                <button
                  type="button"
                  onClick={startNewSchedule}
                  className="inline-flex items-center gap-1 text-[11.5px] font-medium text-emerald-400 transition-colors hover:text-emerald-300"
                >
                  <PlusIcon className="size-3.5" />
                  New
                </button>
              }
            />
            <ul className="flex flex-col px-2 pb-3">
              {schedules.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-white/[0.03]"
                >
                  <div className="min-w-0">
                    <p className={cn("truncate text-[12.5px] font-medium", s.on ? "text-white/85" : "text-white/55")}>{s.name}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-white/55">
                      <span className="text-emerald-400/85">{s.freq}</span>
                      <span className="flex items-center gap-1">
                        <ClockIcon className="size-3" aria-hidden />
                        {s.on ? s.next : "Paused"}
                      </span>
                      <span className="flex items-center gap-1">
                        <UsersIcon className="size-3" aria-hidden />
                        {s.recipients} recipients
                      </span>
                      <span>{s.format}</span>
                    </div>
                  </div>
                  <Switch checked={s.on} onChange={(next) => toggleSchedule(s.id, next)} label={`${s.name} (${s.freq}) schedule`} />
                </li>
              ))}
            </ul>
          </Panel>
        </section>
      </div>

      <TwinSnapshotCard twin={twin} estate={estate} division={division} onUseTemplate={applyTwinTemplate} />

      <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <Panel>
          <PanelHeader
            kicker="Archive · Volume"
            title="Reports Generated (7 Months)"
            subtitle="Reports per month · Mar–Sep 2024 (Sep = 1–10 Sep)"
            action={<ViewAll label="View archive" onClick={() => scrollToSection("recent-reports")} />}
          />
          <div className="h-[220px] px-1 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ left: 4, right: 12, top: 8, bottom: 4 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis
                  {...axisProps}
                  width={40}
                  allowDecimals={false}
                  label={{ value: "reports", angle: -90, position: "insideLeft", fill: "rgba(255,255,255,0.5)", fontSize: 10 }}
                />
                <Tooltip {...tooltipStyle} formatter={withUnit("reports")} />
                <Bar dataKey="count" name="Generated" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            kicker="Archive · Mix"
            title="Reports by Type"
            subtitle={`${fmtInt(totalReports)} reports total · click a type to filter`}
          />
          <div className="flex items-center gap-2 px-2 pb-3">
            <div className="h-[180px] w-[160px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip {...tooltipStyle} formatter={withUnit("reports")} />
                  <Pie
                    data={typeMix}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={46}
                    outerRadius={72}
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
            <div className="flex flex-1 flex-col gap-1.5 pr-2">
              {typeMix.map((t) => {
                const active = typeFilter === t.name
                return (
                  <button
                    key={t.name}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setTypeFilter(active ? "All" : t.name)
                      setShowAll(false)
                    }}
                    className={cn(
                      "flex items-center justify-between rounded-md px-1.5 py-1 text-[12px] transition-colors",
                      active ? "bg-emerald-500/15 ring-1 ring-emerald-500/30" : "hover:bg-white/[0.04]"
                    )}
                  >
                    <span className="flex items-center gap-2 text-white/70">
                      <span className="size-2.5 rounded-[3px]" style={{ background: t.color }} />
                      {t.name}
                    </span>
                    <span className="font-medium tabular-nums text-white/85">{t.value}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </Panel>
      </div>

      <section id="recent-reports" aria-label="Recent reports" className="scroll-mt-4">
        <Panel>
          <PanelHeader
            kicker="Archive · Files"
            title="Recent Reports"
            subtitle={`Latest generated files · up to ${LIVE_DATE}`}
            action={
              <>
                {typeFilter !== "All" && (
                  <button
                    type="button"
                    onClick={() => setTypeFilter("All")}
                    aria-label={`Clear ${typeFilter} filter`}
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-400 ring-1 ring-emerald-500/30 hover:bg-emerald-500/25"
                  >
                    {typeFilter}
                    <XIcon className="size-3" aria-hidden />
                  </button>
                )}
                {filtered.length > RECENT_LIMIT && (
                  <ViewAll label={showAll ? "Show less" : "View All"} onClick={() => setShowAll((v) => !v)} />
                )}
              </>
            }
          />
          <TableScroll>
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr>
                  <th className={tableTh}>Report Name</th>
                  <th className={tableTh}>Type</th>
                  <th className={tableTh}>Period</th>
                  <th className={tableTh}>Generated By</th>
                  <th className={tableTh}>Date</th>
                  <th className={cn(tableTh, "text-right")}>Size</th>
                  <th className={tableTh}>Format</th>
                  <th className={cn(tableTh, "text-right")}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id} className={tableRow}>
                    <td className={cn(tableTd, "font-medium text-white/85")}>
                      {r.name}
                      {r.fresh && (
                        <span className="ml-2 rounded bg-emerald-500/15 px-1.5 py-px text-[9.5px] font-bold uppercase tracking-wide text-emerald-300">
                          New
                        </span>
                      )}
                    </td>
                    <td className={tableTd}>
                      <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap font-medium", TYPE_META[r.type].text)}>
                        <span className="size-1.5 rounded-full bg-current" />
                        {r.type}
                      </span>
                    </td>
                    <td className={cn(tableTd, "whitespace-nowrap text-white/60")}>{r.period}</td>
                    <td className={cn(tableTd, "whitespace-nowrap text-white/70")}>{r.by}</td>
                    <td className={cn(tableTd, "whitespace-nowrap text-white/60")}>{r.date}</td>
                    <td className={cn(tableTd, "text-right tabular-nums text-white/65")}>{fmtSize(r.sizeMb)}</td>
                    <td className={tableTd}>
                      <span className={cn("inline-flex rounded-md px-2 py-0.5 text-[10.5px] font-semibold ring-1", FORMAT_BADGE[r.format])}>
                        {r.format}
                      </span>
                    </td>
                    <td className={cn(tableTd, "text-right")}>
                      <div className="inline-flex items-center gap-1.5">
                        <OpenInTwin variant="icon" block={r.block} layer={TYPE_LAYER[r.type]} label="Open in Twin" />
                        <button
                          type="button"
                          onClick={() => toast.info(`Downloading ${r.name}…`, { description: `${r.format} · ${fmtSize(r.sizeMb)}` })}
                          className="inline-flex size-7 items-center justify-center rounded-md text-white/60 ring-1 ring-white/10 transition-colors hover:bg-emerald-500/12 hover:text-emerald-400 hover:ring-emerald-500/25"
                          aria-label={`Download ${r.name}`}
                        >
                          <DownloadIcon className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] px-4 py-2.5 text-[11px] text-white/50">
            <span>
              Showing {visible.length} of {filtered.length} recent {typeFilter === "All" ? "" : `${typeFilter} `}reports ·{" "}
              {fmtInt(totalReports)} in archive ·{" "}
              <span className="font-medium text-emerald-400/85">Last sync {dashboardMeta.lastUpdate}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <FolderArchiveIcon className="size-3.5" aria-hidden />
              Reports auto-archived after 90 days · PDF retained 2 years for compliance
            </span>
          </div>
        </Panel>
      </section>
    </PeatShell>
  )
}
