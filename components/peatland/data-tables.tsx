"use client"

import { boreholeStatus, plantationHealth, waterTableTrend, type NdviRow } from "@/lib/peatland/mock-data"
import { ewsFromMoisture, ewsFromWaterTable } from "@/lib/peatland/digital-twin"
import { formatStationValue, stationsOfType, type Station, type StationLevel } from "@/lib/peatland/stations"
import { matchesBlock, scaleNumber } from "@/lib/peatland/filter-logic"
import { useDashboardFilters } from "@/lib/peatland/filters"
import { cn } from "@/lib/utils"
import { OpenInTwin } from "./open-in-twin"
import { Panel, PanelHeader, TableScroll, ViewAll, tableRow, tableTd, tableTh } from "./panel"
import { EwsPill, levelColor } from "./status"

// Dashboard menampilkan 5 baris terparah; daftar lengkap ada di halaman masing-masing.
const MAX_ROWS = 5
const emptyTd = "px-3 py-6 text-center text-[12px] text-white/50"

// Urutan keparahan: Awas paling atas, lalu Siaga, Waspada, offline, Normal.
const SEVERITY: Record<StationLevel, number> = { awas: 0, siaga: 1, waspada: 2, offline: 3, normal: 4 }

type Row = Station & { shown: number | null; lvl: StationLevel }

/** Bacaan diskalakan per estate; level EWS dihitung ulang dari bacaan yang tampil. */
function scaledRows(stations: Station[], estate: string, levelOf: (v: number) => StationLevel): Row[] {
  return stations
    .map((s) => {
      const shown = s.value == null ? null : scaleNumber(s.value, estate)
      return { ...s, shown, lvl: shown == null ? ("offline" as const) : levelOf(shown) }
    })
    .sort((a, b) => SEVERITY[a.lvl] - SEVERITY[b.lvl] || (a.shown ?? 0) - (b.shown ?? 0))
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const w = 56
  const h = 18
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ")
  const fmt = (v: number) => `${v < 0 ? "−" : ""}${Math.abs(v)}`
  return (
    <svg width={w} height={h} className="overflow-visible" role="img" aria-label={`${fmt(data[0])} → ${fmt(data[data.length - 1])} cm`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Tren 3 hari (6 titik per 12 jam). Borehole yang punya deret di mock-data memakainya;
// sisanya mengikuti bentuk rata-rata estate 7→10 Sep, diskalakan ke bacaan live.
const avgTail = waterTableTrend.slice(-4).map((d) => d.value)
function trendOf(code: string, live: number): number[] {
  const known = boreholeStatus.find((b) => b.id === code)?.trend
  if (known) return known
  const first = avgTail[0]
  const last = avgTail[avgTail.length - 1]
  return Array.from({ length: 6 }, (_, i) => Math.round((live * (first + ((last - first) * i) / 5)) / last))
}

function TwinTh() {
  return <th className={cn(tableTh, "text-right")}>Twin</th>
}

export function BoreholeTable() {
  const { estate, division } = useDashboardFilters()
  const all = scaledRows(
    stationsOfType("borehole").filter((s) => matchesBlock(s.block, division)),
    estate,
    ewsFromWaterTable
  )
  const rows = all.slice(0, MAX_ROWS)
  return (
    <Panel>
      <PanelHeader
        kicker="EWS · Borehole"
        title="Borehole Status"
        subtitle={`Water level, cm below surface · ${rows.length} of ${all.length}, most severe first`}
        action={<ViewAll href="/borehole-monitoring" />}
      />
      <TableScroll>
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className={tableTh}>ID</th>
              <th className={tableTh}>Block</th>
              <th className={tableTh}>Water Level</th>
              <th className={tableTh}>Status</th>
              <th className={cn(tableTh, "text-right")}>3-Day Trend</th>
              <TwinTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const color = levelColor(r.lvl)
              return (
                <tr key={r.code} className={tableRow}>
                  <td className={cn(tableTd, "whitespace-nowrap font-mono font-medium text-white/85")}>{r.code}</td>
                  <td className={cn(tableTd, "whitespace-nowrap text-white/60")}>{r.block}</td>
                  <td className={cn(tableTd, "whitespace-nowrap font-medium tabular-nums")} style={{ color }}>
                    {formatStationValue({ value: r.shown, unit: r.unit })}
                  </td>
                  <td className={tableTd}>
                    <EwsPill level={r.lvl} pulse={r.lvl === "awas"} />
                  </td>
                  <td className={tableTd}>
                    <div className="flex justify-end">
                      {r.shown != null && (
                        <Sparkline data={trendOf(r.code, r.value ?? 0).map((v) => scaleNumber(v, estate))} color={color} />
                      )}
                    </div>
                  </td>
                  <td className={cn(tableTd, "text-right")}>
                    <OpenInTwin variant="icon" asset={r.code} />
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr className={tableRow}>
                <td className={emptyTd} colSpan={6}>
                  No boreholes in {division}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableScroll>
    </Panel>
  )
}

export function PeatTable() {
  const { estate, division } = useDashboardFilters()
  const all = scaledRows(
    stationsOfType("peat-station").filter((s) => matchesBlock(s.block, division)),
    estate,
    ewsFromMoisture
  )
  const rows = all.slice(0, MAX_ROWS)
  return (
    <Panel>
      <PanelHeader
        kicker="Telemetri · Gambut"
        title="Peat Monitoring"
        subtitle={`Latest · moisture %, depth cm, temp °C · ${rows.length} of ${all.length}`}
        action={<ViewAll href="/peat-monitoring" />}
      />
      <TableScroll>
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className={tableTh}>Station</th>
              <th className={tableTh}>Peat Depth</th>
              <th className={tableTh}>Soil Moisture</th>
              <th className={tableTh}>Soil Temp</th>
              <th className={tableTh}>Status</th>
              <TwinTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code} className={tableRow}>
                <td className={cn(tableTd, "whitespace-nowrap")}>
                  <span className="block font-mono font-medium text-white/85">{r.code}</span>
                  <span className="block text-[10.5px] text-white/50">{r.block}</span>
                </td>
                <td className={cn(tableTd, "whitespace-nowrap tabular-nums text-white/70")}>
                  {r.peatDepth != null ? `${scaleNumber(r.peatDepth, estate)} cm` : "—"}
                </td>
                <td className={cn(tableTd, "whitespace-nowrap font-medium tabular-nums")} style={{ color: levelColor(r.lvl) }}>
                  {r.shown != null ? `${r.shown}%` : "OFFLINE"}
                </td>
                <td className={cn(tableTd, "whitespace-nowrap tabular-nums text-white/70")}>
                  {r.soilTemp != null ? `${scaleNumber(r.soilTemp, estate, 1).toFixed(1)}°C` : "—"}
                </td>
                <td className={tableTd}>
                  <EwsPill level={r.lvl} pulse={r.lvl === "awas"} />
                </td>
                <td className={cn(tableTd, "text-right")}>
                  <OpenInTwin variant="icon" asset={r.code} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr className={tableRow}>
                <td className={emptyTd} colSpan={6}>
                  No peat stations in {division}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableScroll>
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
  const { estate, division } = useDashboardFilters()
  const rows = plantationHealth.filter((r) => matchesBlock(r.block, division))
  return (
    <Panel>
      <PanelHeader
        kicker="Sentinel-2 · NDVI"
        title="Plantation Health (NDVI)"
        subtitle="Per block · pass 8 Sep 2024 · area in ha"
        action={<ViewAll href="/plantation-health" />}
      />
      <TableScroll>
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className={tableTh}>Block</th>
              <th className={tableTh}>NDVI</th>
              <th className={tableTh}>Health Status</th>
              <th className={cn(tableTh, "text-right")}>Area (ha)</th>
              <TwinTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const ndvi = Math.min(1, scaleNumber(r.ndvi, estate, 2))
              return (
                <tr key={r.block} className={tableRow}>
                  <td className={cn(tableTd, "whitespace-nowrap font-medium text-white/85")}>{r.block}</td>
                  <td className={cn(tableTd, "font-medium tabular-nums text-white/80")}>{ndvi.toFixed(2)}</td>
                  <td className={tableTd}>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-white/10">
                        <div className={cn("h-full rounded-full", ndviBar[r.healthTone])} style={{ width: `${ndvi * 100}%` }} />
                      </div>
                      <span className={cn("whitespace-nowrap text-[11.5px] font-medium", ndviText[r.healthTone])}>{r.health}</span>
                    </div>
                  </td>
                  <td className={cn(tableTd, "text-right tabular-nums text-white/70")}>
                    {scaleNumber(r.area, estate).toLocaleString("id-ID")}
                  </td>
                  <td className={cn(tableTd, "text-right")}>
                    <OpenInTwin variant="icon" block={r.block} layer="ndvi" />
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr className={tableRow}>
                <td className={emptyTd} colSpan={5}>
                  No plantation blocks in {division}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableScroll>
    </Panel>
  )
}
