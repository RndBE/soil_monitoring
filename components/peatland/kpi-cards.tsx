"use client"

import { BellIcon, CloudRainIcon, FlameIcon, RadioTowerIcon, SignalIcon, WavesIcon } from "lucide-react"

import {
  alerts,
  fireRiskTrend,
  kpis,
  rainfallCorrelation,
  stations,
  waterTableTrend,
  type Kpi,
} from "@/lib/peatland/mock-data"
import { EWS_META, WT_TARGET, ewsFromFireRisk, ewsFromWaterTable } from "@/lib/peatland/digital-twin"
import { stationsOfType } from "@/lib/peatland/stations"
import { scaleNumber } from "@/lib/peatland/filter-logic"
import { useDashboardFilters } from "@/lib/peatland/filters"
import { StatTile, type StatDelta } from "./stat-tile"
import type { Tone } from "./status"

const VS = "vs yesterday"

type Tile = React.ComponentProps<typeof StatTile> & { key: string }

function kpiOf(key: string): Kpi | undefined {
  return kpis.find((k) => k.key === key)
}

/** Delta dari mock (angka yang tidak punya deret di halaman ini). */
function mockDelta(k: Kpi | undefined): StatDelta | undefined {
  if (!k) return undefined
  return { text: k.delta, dir: k.deltaDir, good: k.deltaTone === "neutral" ? null : k.deltaTone === "good", vs: VS }
}

/** Delta hari terakhir vs kemarin dari deret yang sama dengan grafik, supaya angkanya cocok. */
function seriesDelta(series: number[], unit: string, higherIsGood: boolean): StatDelta | undefined {
  if (series.length < 2) return undefined
  const d = series[series.length - 1] - series[series.length - 2]
  return {
    text: `${Math.abs(d)}${unit ? ` ${unit}` : ""}`,
    dir: d >= 0 ? "up" : "down",
    good: d === 0 ? null : d > 0 === higherIsGood,
    vs: VS,
  }
}

/** Jumlah hari berturut-turut naik di ujung deret. */
function risingDays(series: number[]): number {
  let n = 0
  for (let i = series.length - 1; i > 0 && series[i] > series[i - 1]; i -= 1) n += 1
  return n
}

const cm = (v: number) => `${v < 0 ? "−" : ""}${Math.abs(v)}`

function buildTiles(estate: string): Tile[] {
  // Muka air rata-rata — deret sama dengan grafik Water Table Trend.
  const wtSeries = waterTableTrend.map((d) => scaleNumber(d.value, estate))
  const wt = wtSeries[wtSeries.length - 1]
  const wtLevel = ewsFromWaterTable(wt)

  // Borehole Siaga/Awas — dihitung dari registri stasiun (sama dengan tabel Borehole Status).
  const hot = stationsOfType("borehole")
    .filter((s) => s.value != null)
    .map((s) => ({ code: s.code, wt: scaleNumber(s.value ?? 0, estate) }))
    .filter((s) => ["siaga", "awas"].includes(ewsFromWaterTable(s.wt)))
    .sort((a, b) => a.wt - b.wt)
  const hotCodes = hot.slice(0, 3).map((s) => s.code).join(" · ") + (hot.length > 3 ? ` +${hot.length - 3}` : "")

  // Risiko api — deret sama dengan grafik Fire Risk Trend.
  const fireSeries = fireRiskTrend.map((d) => Math.min(100, scaleNumber(d.value, estate)))
  const fire = fireSeries[fireSeries.length - 1]
  const fireLevel = ewsFromFireRisk(fire)
  const rising = risingDays(fireSeries)

  // Hujan 24 jam — rata-rata semua penakar di registri.
  const gauges = stationsOfType("rain-gauge").filter((s) => s.value != null)
  const rainAvg = gauges.reduce((a, s) => a + (s.value ?? 0), 0) / (gauges.length || 1)
  const rain = scaleNumber(rainAvg, estate, 1)

  // Alert aktif — sama dengan daftar Alert Center (tidak diskalakan per estate).
  const critical = alerts.filter((a) => a.severity === "critical").length
  const warning = alerts.filter((a) => a.severity === "warning").length

  // Stasiun online — online & total diskalakan bersama, persen diturunkan dari keduanya.
  const online = scaleNumber(stations.online, estate)
  const total = scaleNumber(stations.total, estate)
  const pct = Math.round((online / (total || 1)) * 100)
  const stationTone: Tone = pct >= 90 ? "normal" : pct >= 75 ? "warning" : "critical"

  const label = (key: string, fallback: string) => kpiOf(key)?.label ?? fallback

  return [
    {
      key: "water-table",
      label: label("water-table", "Water Table Level (Avg)"),
      value: cm(wt),
      unit: "cm",
      icon: WavesIcon,
      tone: wtLevel,
      status: `${EWS_META[wtLevel].label} · target ≥ ${cm(WT_TARGET)} cm`,
      spark: wtSeries,
      delta: seriesDelta(wtSeries, "cm", true),
      href: "/borehole-monitoring",
    },
    {
      key: "borehole-critical",
      label: label("borehole-critical", "Borehole Siaga/Awas"),
      value: String(hot.length),
      unit: "Stations",
      icon: RadioTowerIcon,
      tone: hot.length > 0 ? "siaga" : "normal",
      status: hot.length > 0 ? hotCodes : "All within Waspada or better",
      delta: mockDelta(kpiOf("borehole-critical")),
      href: "/borehole-monitoring",
    },
    {
      key: "fire-risk",
      label: label("fire-risk", "Fire Risk Index (Estate)"),
      value: String(fire),
      icon: FlameIcon,
      tone: fireLevel,
      status: `${EWS_META[fireLevel].label} · ${rising > 0 ? `rising ${rising} days` : "not rising"}`,
      spark: fireSeries,
      delta: seriesDelta(fireSeries, "", false),
      href: "/fire-risk",
    },
    {
      key: "rainfall",
      label: label("rainfall", "Rainfall (24h)"),
      value: rain.toFixed(1),
      unit: "mm",
      icon: CloudRainIcon,
      tone: "info",
      status: `Avg of ${gauges.length} rain gauges`,
      spark: rainfallCorrelation.map((d) => scaleNumber(d.rainfall, estate)),
      delta: mockDelta(kpiOf("rainfall")),
      href: "/weather-rainfall",
    },
    {
      key: "active-alerts",
      label: label("active-alerts", "Active Alerts"),
      value: String(alerts.length),
      icon: BellIcon,
      tone: "warning",
      status: `${critical} critical · ${warning} warning`,
      delta: mockDelta(kpiOf("active-alerts")),
      href: "/alerts",
    },
    {
      key: "stations-online",
      label: label("stations-online", "Stations Online"),
      value: String(online),
      unit: `/ ${total}`,
      icon: SignalIcon,
      tone: stationTone,
      status: `${pct}% online`,
      delta: mockDelta(kpiOf("stations-online")),
      href: "/map-view",
    },
  ]
}

export function KpiCards() {
  const { estate } = useDashboardFilters()
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {buildTiles(estate).map(({ key, ...t }) => (
        <StatTile key={key} {...t} />
      ))}
    </div>
  )
}
