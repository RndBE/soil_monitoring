"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { TrendCuacaTanah, TrendDebit, TrendMukaAir } from "@/lib/types"

type SeriesMukaAir = { titikKode: string; titikNama: string; data: TrendMukaAir[] }
type SeriesDebit = { titikKode: string; titikNama: string; data: TrendDebit[] }
type SeriesCuaca = { titikKode: string; titikNama: string; data: TrendCuacaTanah[] }

const COLORS = ["#0ea5e9", "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#a855f7"]

// ----- Muka Air -----

export function MukaAirChart({ series }: { series: SeriesMukaAir[] }) {
  const merged = mergeByJam(
    series.map((s) => ({
      key: s.titikKode,
      data: s.data.map((d) => ({ jam: d.jam, value: d.tinggiM })),
    })),
  )
  const thresholds = series[0]?.data[0]
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tinggi Muka Air (24 jam)</CardTitle>
        <CardDescription>
          Pembacaan AWLR per titik. Garis horizontal = ambang waspada/siaga/awas titik pertama.
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[280px] px-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={merged} margin={{ left: 4, right: 8, top: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
            <XAxis dataKey="jam" tick={{ fontSize: 11 }} interval={Math.ceil(merged.length / 8)} />
            <YAxis tick={{ fontSize: 11 }} unit=" m" />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
              formatter={(v) => `${Number(v).toFixed(2)} m`}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {thresholds ? (
              <>
                <ReferenceLine y={thresholds.waspadaM} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "Waspada", fontSize: 10, fill: "#f59e0b" }} />
                <ReferenceLine y={thresholds.siagaM} stroke="#f97316" strokeDasharray="4 4" label={{ value: "Siaga", fontSize: 10, fill: "#f97316" }} />
                <ReferenceLine y={thresholds.awasM} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "Awas", fontSize: 10, fill: "#ef4444" }} />
              </>
            ) : null}
            {series.map((s, idx) => (
              <Line
                key={s.titikKode}
                type="monotone"
                dataKey={s.titikKode}
                name={s.titikNama}
                stroke={COLORS[idx % COLORS.length]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ----- Debit -----

export function DebitChart({ series }: { series: SeriesDebit[] }) {
  const merged = mergeByJam(
    series.map((s) => ({
      key: s.titikKode,
      data: s.data.map((d) => ({ jam: d.jam, value: d.debitM3s })),
    })),
  )
  return (
    <Card>
      <CardHeader>
        <CardTitle>Debit Aliran (24 jam)</CardTitle>
        <CardDescription>Pembacaan flow meter per titik (m³/s).</CardDescription>
      </CardHeader>
      <CardContent className="h-[280px] px-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={merged} margin={{ left: 4, right: 8, top: 8, bottom: 4 }}>
            <defs>
              {series.map((s, idx) => (
                <linearGradient key={s.titikKode} id={`grad-${s.titikKode}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS[idx % COLORS.length]} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={COLORS[idx % COLORS.length]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
            <XAxis dataKey="jam" tick={{ fontSize: 11 }} interval={Math.ceil(merged.length / 8)} />
            <YAxis tick={{ fontSize: 11 }} unit=" m³/s" />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => `${Number(v).toFixed(2)} m³/s`} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {series.map((s, idx) => (
              <Area
                key={s.titikKode}
                type="monotone"
                dataKey={s.titikKode}
                name={s.titikNama}
                stroke={COLORS[idx % COLORS.length]}
                strokeWidth={2}
                fill={`url(#grad-${s.titikKode})`}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ----- Cuaca/Tanah -----

export function CuacaTanahChart({ series }: { series: SeriesCuaca[] }) {
  const soilSeries = series.map((s) => ({
    key: s.titikKode,
    data: s.data.map((d) => ({ jam: d.jam, value: d.kelembabanTanahPct ?? 0 })),
  }))
  const merged = mergeByJam(soilSeries)
  const hujanSeries = series[0]?.data.map((d) => ({ jam: d.jam, hujan: d.curahHujanMm ?? 0 })) ?? []

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Kelembaban Tanah (24 jam)</CardTitle>
          <CardDescription>Persentase kelembaban di titik sensor tanah.</CardDescription>
        </CardHeader>
        <CardContent className="h-[260px] px-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={merged} margin={{ left: 4, right: 8, top: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
              <XAxis dataKey="jam" tick={{ fontSize: 11 }} interval={Math.ceil(merged.length / 8)} />
              <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => `${Number(v).toFixed(0)}%`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={40} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "Waspada", fontSize: 10, fill: "#f59e0b" }} />
              <ReferenceLine y={30} stroke="#f97316" strokeDasharray="4 4" label={{ value: "Siaga", fontSize: 10, fill: "#f97316" }} />
              {series.map((s, idx) => (
                <Line
                  key={s.titikKode}
                  type="monotone"
                  dataKey={s.titikKode}
                  name={s.titikNama}
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Curah Hujan (24 jam)</CardTitle>
          <CardDescription>Akumulasi curah hujan dari weather station utama.</CardDescription>
        </CardHeader>
        <CardContent className="h-[260px] px-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hujanSeries} margin={{ left: 4, right: 8, top: 8, bottom: 4 }}>
              <defs>
                <linearGradient id="grad-hujan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
              <XAxis dataKey="jam" tick={{ fontSize: 11 }} interval={Math.ceil(hujanSeries.length / 8)} />
              <YAxis tick={{ fontSize: 11 }} unit=" mm" />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => `${Number(v).toFixed(2)} mm`} />
              <Area dataKey="hujan" type="monotone" name="Curah Hujan" stroke="#0ea5e9" strokeWidth={2} fill="url(#grad-hujan)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

// ----- helper -----

function mergeByJam(series: { key: string; data: { jam: string; value: number }[] }[]) {
  const map = new Map<string, Record<string, number | string>>()
  for (const s of series) {
    for (const point of s.data) {
      const existing = map.get(point.jam) ?? { jam: point.jam }
      existing[s.key] = point.value
      map.set(point.jam, existing)
    }
  }
  return Array.from(map.values()) as Array<Record<string, number | string>>
}
