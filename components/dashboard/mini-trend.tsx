"use client"

import { Line, LineChart, ResponsiveContainer } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Series = {
  kode: string
  label: string
  values: number[]
  color?: string
}

export function MiniTrendList({
  title,
  href,
  series,
  unit,
  decimals = 2,
}: {
  title: string
  href?: string
  series: Series[]
  unit: string
  decimals?: number
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[13px] font-semibold uppercase tracking-wide text-foreground/80">
            {title}
          </CardTitle>
          {href ? (
            <a className="text-[11px] font-medium text-sky-600 hover:underline" href={href}>
              Lihat Semua
            </a>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {series.length === 0 ? (
          <p className="text-[12px] text-muted-foreground">Belum ada data.</p>
        ) : (
          series.map((s, idx) => {
            const last = s.values[s.values.length - 1] ?? 0
            const color = s.color ?? COLORS[idx % COLORS.length]
            return (
              <div
                key={s.kode}
                className="flex items-center justify-between gap-3 border-b border-foreground/5 pb-2 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold">{s.kode}</div>
                  <div className="text-[10.5px] text-muted-foreground">
                    {last.toFixed(decimals)} {unit}
                  </div>
                </div>
                <div className="h-7 w-20">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={s.values.map((v, i) => ({ i, v }))}>
                      <Line
                        type="monotone"
                        dataKey="v"
                        stroke={color}
                        strokeWidth={1.8}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

const COLORS = ["#0ea5e9", "#22c55e", "#6366f1", "#a855f7", "#f97316", "#ec4899"]
