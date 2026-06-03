"use client"

import { Area, AreaChart, ResponsiveContainer } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type InsightCard = {
  label: string
  value: string
  detail: string
  trend: "up" | "stable" | "down"
  series: number[]
}

const TREND_LABEL: Record<InsightCard["trend"], string> = {
  up: "Naik",
  stable: "Stabil",
  down: "Turun",
}

const TREND_COLOR: Record<InsightCard["trend"], { stroke: string; fill: string; text: string }> = {
  up: { stroke: "#22c55e", fill: "#22c55e", text: "text-emerald-600" },
  stable: { stroke: "#0ea5e9", fill: "#0ea5e9", text: "text-sky-600" },
  down: { stroke: "#ef4444", fill: "#ef4444", text: "text-rose-600" },
}

export function AnalitikInsight({ cards }: { cards: InsightCard[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[13px] font-semibold uppercase tracking-wide text-foreground/80">
            Analitik & Insight
          </CardTitle>
          <a className="text-[11px] font-medium text-sky-600 hover:underline" href="/analisa-data">
            Lihat Detail
          </a>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 pt-0 sm:grid-cols-3">
        {cards.map((c) => {
          const color = TREND_COLOR[c.trend]
          return (
            <div
              key={c.label}
              className="rounded-lg border border-foreground/10 bg-card p-3"
            >
              <div className="text-[11.5px] text-muted-foreground">{c.label}</div>
              <div className={`text-[15px] font-semibold ${color.text}`}>
                {TREND_LABEL[c.trend]}
              </div>
              <div className="text-[11px] text-muted-foreground">{c.value}</div>
              <div className="mt-1 h-10">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={c.series.map((v, i) => ({ i, v }))}>
                    <defs>
                      <linearGradient id={`g-${c.label}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color.fill} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={color.fill} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke={color.stroke}
                      strokeWidth={1.6}
                      fill={`url(#g-${c.label})`}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[10.5px] text-muted-foreground">{c.detail}</div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
