"use client"

import { useId, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BellRingIcon, ChevronDownIcon, DropletsIcon } from "lucide-react"
import { toast } from "sonner"

import { alerts, type AlertRow } from "@/lib/peatland/mock-data"
import {
  EWS_META,
  SCENARIO_PRESETS,
  WT_COMPLIANCE,
  buildHistoryFrames,
  ewsFromWaterTable,
  getBlockBaseline,
  recommendGateOpening,
  simulateScenario,
  summarizeFrame,
  type EwsLevel,
  type TwinFrame,
} from "@/lib/peatland/digital-twin"
import { stationByCode, stationsOfType, type StationLevel } from "@/lib/peatland/stations"
import { matchesBlock } from "@/lib/peatland/filter-logic"
import { useDashboardFilters } from "@/lib/peatland/filters"
import { cn } from "@/lib/utils"
import { OpenInTwin } from "./open-in-twin"
import { Panel, PanelHeader, TableScroll, ViewAll, tableRow, tableTd, tableTh } from "./panel"
import { EwsPill, StatusDot } from "./status"

const HORIZON_DAYS = 3
/** Baris alert yang tampil di dashboard; sisanya di halaman Alerts. */
const MAX_ROWS = 7

/**
 * Level yang ditampilkan per alert: level EWS / offline stasiun di registri bila
 * tidak normal; selain itu dari severity (info = bukan ambang EWS).
 */
function alertLevel(a: AlertRow): StationLevel | null {
  const st = stationByCode(a.asset)
  if (st && st.level !== "normal") return st.level
  if (a.severity === "critical") return "awas"
  if (a.severity === "warning") return "waspada"
  return null
}

const cm = (v: number) => `${v < 0 ? "−" : ""}${Math.abs(v)} cm`

type Insight = {
  block: string
  now: number
  nowLevel: EwsLevel
  deepest?: string
  baseEnd: number
  rewetEnd: number
  endLabel: string
  gate: number
  feasible: boolean
  onlineGates: { code: string; opening: number }[]
  offlineGates: { code: string; block: string }[]
}

/** Insight & rekomendasi dari model twin: prakiraan baseline vs rewetting + bukaan pintu air optimal. */
function buildInsight(estate: string): Insight {
  const baseline = getBlockBaseline(estate)
  const base = SCENARIO_PRESETS[0].scenario
  const rewet = (SCENARIO_PRESETS.find((p) => p.key === "rewet") ?? SCENARIO_PRESETS[0]).scenario
  const rec = recommendGateOpening(baseline, { ...rewet, days: HORIZON_DAYS })
  const block = rec.worstBlock
  const wtOf = (f: TwinFrame) => summarizeFrame(f, baseline, [block]).waterTable

  const history = buildHistoryFrames(baseline)
  const baseFrames = simulateScenario(baseline, { ...base, days: HORIZON_DAYS })
  const rewetFrames = simulateScenario(baseline, { ...rewet, gateOpening: rec.gateOpening, days: HORIZON_DAYS })
  const now = wtOf(history[history.length - 1])

  const deepest = stationsOfType("borehole")
    .filter((s) => s.block === block && s.value != null)
    .sort((a, b) => (a.value ?? 0) - (b.value ?? 0))[0]
  const gates = stationsOfType("water-gate")

  return {
    block,
    now,
    nowLevel: ewsFromWaterTable(now),
    deepest: deepest?.code,
    baseEnd: wtOf(baseFrames[baseFrames.length - 1]),
    rewetEnd: wtOf(rewetFrames[rewetFrames.length - 1]),
    endLabel: baseFrames[baseFrames.length - 1]?.label ?? "",
    gate: rec.gateOpening,
    feasible: rec.feasible,
    onlineGates: gates.filter((g) => g.value != null).map((g) => ({ code: g.code, opening: g.value ?? 0 })),
    offlineGates: gates.filter((g) => g.value == null).map((g) => ({ code: g.code, block: g.block })),
  }
}

function insightText(i: Insight): string {
  const where = `${EWS_META[i.nowLevel].label}${i.deepest ? ` · ${i.deepest}` : ""}`
  const trend = i.baseEnd < i.now ? " and still falling" : ""
  const limit = i.baseEnd < WT_COMPLIANCE ? "below" : "within"
  const offline = i.offlineGates.find((g) => g.block === i.block)
  return (
    `${i.block} water table is at ${cm(i.now)} (${where})${trend}. ` +
    `The twin baseline forecast puts it at ${cm(i.baseEnd)} by ${i.endLabel}, ${limit} the PP 57/2016 limit of ${cm(WT_COMPLIANCE)}.` +
    (offline ? ` ${offline.code} in ${i.block} is offline and cannot be operated remotely.` : "")
  )
}

function recommendationText(i: Insight): string {
  const codes = i.onlineGates.map((g) => g.code).join(" / ")
  const openings = i.onlineGates.map((g) => `${g.opening}%`).join(" / ")
  const reduce = i.onlineGates.every((g) => g.opening > i.gate)
  const gateStep = `${reduce ? "Reduce" : "Set"} ${codes} opening to ${i.gate}% (now ${openings}) and block the ${i.block} canal (rewetting)`
  const effect = i.feasible
    ? `the twin brings every block back within −40…−10 cm by ${i.endLabel}.`
    : `the twin holds ${i.block} at ${cm(i.rewetEnd)} by ${i.endLabel} instead of ${cm(i.baseEnd)}, still below ${cm(WT_COMPLIANCE)}.`
  const offline = i.offlineGates.find((g) => g.block === i.block)
  const field = offline ? ` Send a crew to close ${offline.code} manually (offline) and add peat patrols in ${i.block}.` : ""
  return `${gateStep}; ${effect}${field}`
}

export function AlertCenter() {
  const router = useRouter()
  const { estate, division } = useDashboardFilters()
  const [showRec, setShowRec] = useState(false)
  const recId = useId()

  const rows = alerts.filter((a) => matchesBlock(stationByCode(a.asset)?.block, division))
  const critical = rows.filter((a) => a.severity === "critical").length
  const warning = rows.filter((a) => a.severity === "warning").length

  const insight = useMemo(() => buildInsight(estate), [estate])
  const rec = recommendationText(insight)

  return (
    <div className="flex flex-col gap-3">
      <Panel>
        <PanelHeader
          kicker="EWS · Alert aktif"
          icon={BellRingIcon}
          title="Alert Center"
          subtitle={`${rows.length} active · ${critical} critical · ${warning} warning`}
          action={<ViewAll href="/alerts" />}
        />
        <TableScroll className="px-1 pb-1">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className={tableTh}>Time</th>
                <th className={tableTh}>Asset</th>
                <th className={tableTh}>Alert</th>
                <th className={cn(tableTh, "text-right")}>Level</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, MAX_ROWS).map((a) => {
                const level = alertLevel(a)
                return (
                  <tr key={a.time + a.asset} onClick={() => router.push("/alerts")} className={cn(tableRow, "cursor-pointer")}>
                    <td className={cn(tableTd, "font-mono tabular-nums text-white/55")}>{a.time}</td>
                    <td className={cn(tableTd, "whitespace-nowrap")}>
                      {/* Link = titik fokus keyboard; klik baris memakai tujuan yang sama. */}
                      <Link
                        href="/alerts"
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-sm font-mono font-medium text-white/85 transition-colors hover:text-emerald-300 focus-visible:outline-2 focus-visible:outline-emerald-400/60"
                      >
                        {a.asset}
                      </Link>
                    </td>
                    <td className={cn(tableTd, "text-white/75")}>{a.alert}</td>
                    <td className={cn(tableTd, "text-right")}>
                      {level ? (
                        <EwsPill level={level} pulse={level === "awas" || level === "offline"} />
                      ) : (
                        <StatusDot tone="info" label="Info" />
                      )}
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr className={tableRow}>
                  <td className="px-3 py-6 text-center text-[12px] text-white/50" colSpan={4}>
                    No active alerts in {division}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableScroll>
        {rows.length > MAX_ROWS && (
          <Link
            href="/alerts"
            className="border-t border-white/[0.06] px-4 py-2 text-center text-[11.5px] font-medium text-emerald-400 transition-colors hover:text-emerald-300"
          >
            +{rows.length - MAX_ROWS} alert lainnya di halaman Alerts
          </Link>
        )}
      </Panel>

      {/* AI Insight — dari prakiraan digital twin */}
      <Panel className="border-emerald-500/20 bg-emerald-500/[0.04]">
        <PanelHeader
          kicker="Twin · Prakiraan 3 hari"
          icon={DropletsIcon}
          title="AI Insight"
          subtitle={`${insight.block} water table · baseline vs rewetting`}
          action={<ViewAll onClick={() => toast.info("Membuka riwayat AI Insight…")} />}
        />
        <div className="flex flex-col gap-3 px-4 pb-4">
          <p className="text-[12.5px] leading-relaxed text-white/70">{insightText(insight)}</p>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Now", value: insight.now },
              { label: `Baseline · ${insight.endLabel}`, value: insight.baseEnd },
              { label: `Rewetting · ${insight.endLabel}`, value: insight.rewetEnd },
            ].map((s) => {
              const c = EWS_META[ewsFromWaterTable(s.value)].color
              return (
                <div key={s.label} className="rounded-lg border border-white/[0.07] bg-black/20 px-2.5 py-2">
                  <span className="block truncate text-[10px] text-white/55">{s.label}</span>
                  <span className="text-[15px] font-bold tabular-nums" style={{ color: c }}>
                    {cm(s.value)}
                  </span>
                </div>
              )
            })}
          </div>

          <p
            id={recId}
            hidden={!showRec}
            className="rounded-lg border border-sky-400/20 bg-sky-400/[0.06] px-3 py-2.5 text-[12px] leading-relaxed text-white/80"
          >
            {rec}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowRec((v) => !v)}
              aria-expanded={showRec}
              aria-controls={recId}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3.5 py-1.5 text-[12px] font-semibold text-emerald-300 ring-1 ring-emerald-500/30 transition-colors hover:bg-emerald-500/25"
            >
              {showRec ? "Hide Recommendation" : "View Recommendation"}
              <ChevronDownIcon className={cn("size-3.5 transition-transform", showRec && "rotate-180")} />
            </button>
            <OpenInTwin scenario="rewet" block={insight.block} label="Simulasikan di Twin" />
          </div>
        </div>
      </Panel>
    </div>
  )
}
