import { CalendarClockIcon, ClockIcon } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { JadwalRingkas } from "@/lib/types"

type Props = {
  items: JadwalRingkas[]
}

export function JadwalList({ items }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Jadwal Otomatis Pintu Air</CardTitle>
        <CardDescription>
          Jadwal harian yang akan diterapkan saat mode pintu = Terjadwal/Otomatis.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada jadwal aktif.</p>
        ) : (
          items.map((j) => (
            <div
              key={j.id}
              className="flex flex-col gap-1 rounded-lg border border-foreground/10 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CalendarClockIcon className="size-4 text-sky-500" />
                  {j.nama}
                </div>
                <div className="text-xs text-muted-foreground">{j.pintuAir}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ClockIcon className="size-3.5" /> {j.hariLabel} · {j.jamMulai} - {j.jamSelesai}
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="font-medium">Target {j.posisiTargetPersen}%</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ring-1 ring-inset ${
                    j.aktif
                      ? "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300"
                      : "bg-muted text-muted-foreground ring-foreground/15"
                  }`}
                >
                  {j.aktif ? "Aktif" : "Nonaktif"}
                </span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
