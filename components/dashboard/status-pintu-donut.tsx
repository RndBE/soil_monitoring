"use client"

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Props = {
  bukaPenuh: number
  bukaSebagian: number
  tertutup: number
}

export function StatusPintuDonut({ bukaPenuh, bukaSebagian, tertutup }: Props) {
  const total = bukaPenuh + bukaSebagian + tertutup
  const data = [
    { name: "Buka Penuh", value: bukaPenuh, color: "#22c55e" },
    { name: "Buka Sebagian", value: bukaSebagian, color: "#3b82f6" },
    { name: "Tertutup", value: tertutup, color: "#ef4444" },
  ]

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[13px] font-semibold uppercase tracking-wide text-foreground/80">
            Status Pintu Air
          </CardTitle>
          <a className="text-[11px] font-medium text-sky-600 hover:underline" href="/pintu-air">
            Lihat Detail
          </a>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-[120px_1fr] items-center gap-3 pt-0">
        <div className="relative size-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                innerRadius={36}
                outerRadius={55}
                paddingAngle={2}
                stroke="none"
              >
                {data.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] text-muted-foreground">Total</span>
            <span className="font-heading text-xl font-bold">{total}</span>
          </div>
        </div>

        <ul className="space-y-1.5 text-[12.5px]">
          {data.map((d) => {
            const pct = total === 0 ? 0 : Math.round((d.value / total) * 100)
            return (
              <li key={d.name} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block size-2.5 rounded-full"
                    style={{ background: d.color }}
                  />
                  <span className="text-foreground/80">{d.name}</span>
                </span>
                <span className="font-mono text-[11.5px] text-muted-foreground">
                  {d.value} ({pct}%)
                </span>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
