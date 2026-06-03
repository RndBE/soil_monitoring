"use client"

import {
  CartesianGrid,
  Line,
  LineChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { TrendDebit, TrendMukaAir } from "@/lib/types"

const COLORS = ["#22c55e", "#0ea5e9", "#1e40af", "#a855f7", "#f97316", "#ec4899"]

type SeriesMukaAir = { titikKode: string; titikNama: string; data: TrendMukaAir[] }
type SeriesDebit = { titikKode: string; titikNama: string; data: TrendDebit[] }

function mergeByJam<T extends { jam: string }>(
  series: { key: string; data: (T & { value: number })[] }[],
) {
  const map = new Map<string, Record<string, number | string>>()
  for (const s of series) {
    for (const point of s.data) {
      const existing = map.get(point.jam) ?? { jam: point.jam }
      existing[s.key] = point.value
      map.set(point.jam, existing)
    }
  }
  return Array.from(map.values())
}

export function GrafikMukaAir({ series }: { series: SeriesMukaAir[] }) {
  const merged = mergeByJam(
    series.map((s) => ({
      key: s.titikKode,
      data: s.data.map((d) => ({ jam: d.jam, value: d.tinggiM })),
    })),
  )

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[13px] font-semibold uppercase tracking-wide text-foreground/80">
            Grafik Muka Air (24 Jam)
          </CardTitle>
          <a className="text-[11px] font-medium text-sky-600 hover:underline" href="/muka-air">
            Lihat Detail
          </a>
        </div>
      </CardHeader>
      <CardContent className="h-[210px] px-2 pt-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={merged} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.18} />
            <XAxis
              dataKey="jam"
              tick={{ fontSize: 10 }}
              interval={Math.max(0, Math.ceil(merged.length / 6) - 1)}
              tickLine={false}
              axisLine={false}
            />
            <YAxis tick={{ fontSize: 10 }} unit=" m" tickLine={false} axisLine={false} width={40} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8 }}
              formatter={(v) => `${Number(v).toFixed(2)} m`}
            />
            <Legend
              wrapperStyle={{ fontSize: 10 }}
              iconType="circle"
              iconSize={8}
              align="center"
              verticalAlign="bottom"
            />
            {series.map((s, idx) => (
              <Line
                key={s.titikKode}
                type="monotone"
                dataKey={s.titikKode}
                name={s.titikKode}
                stroke={COLORS[idx % COLORS.length]}
                strokeWidth={1.8}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function GrafikDebit({ series }: { series: SeriesDebit[] }) {
  const merged = mergeByJam(
    series.map((s) => ({
      key: s.titikKode,
      data: s.data.map((d) => ({ jam: d.jam, value: d.debitM3s })),
    })),
  )

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[13px] font-semibold uppercase tracking-wide text-foreground/80">
            Grafik Debit (24 Jam)
          </CardTitle>
          <a className="text-[11px] font-medium text-sky-600 hover:underline" href="/debit">
            Lihat Detail
          </a>
        </div>
      </CardHeader>
      <CardContent className="h-[210px] px-2 pt-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={merged} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.18} />
            <XAxis
              dataKey="jam"
              tick={{ fontSize: 10 }}
              interval={Math.max(0, Math.ceil(merged.length / 6) - 1)}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              unit=" m³/dt"
              tickLine={false}
              axisLine={false}
              width={50}
            />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8 }}
              formatter={(v) => `${Number(v).toFixed(2)} m³/dt`}
            />
            <Legend
              wrapperStyle={{ fontSize: 10 }}
              iconType="circle"
              iconSize={8}
              align="center"
              verticalAlign="bottom"
            />
            {series.map((s, idx) => (
              <Line
                key={s.titikKode}
                type="monotone"
                dataKey={s.titikKode}
                name={s.titikKode}
                stroke={COLORS[idx % COLORS.length]}
                strokeWidth={1.8}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
