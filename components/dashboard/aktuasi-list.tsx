import { ArrowDownIcon, ArrowUpIcon, HistoryIcon } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/dashboard/status-badge"
import type { AktuasiRingkas } from "@/lib/types"

type Props = {
  items: AktuasiRingkas[]
}

export function AktuasiList({ items }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Log Aktuasi Pintu Air</CardTitle>
        <CardDescription>Riwayat aktuasi terakhir (manual, jadwal, dan alarm).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada aktuasi tercatat.</p>
        ) : (
          items.map((a) => {
            const naik = a.posisiSesudah > a.posisiSebelum
            return (
              <div
                key={a.id}
                className="flex flex-col gap-2 rounded-lg border border-foreground/10 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <HistoryIcon className="size-3.5 text-sky-500" />
                    {a.pintuAir}
                  </div>
                  <div className="text-xs text-muted-foreground">{a.waktu}</div>
                  {a.catatan ? (
                    <div className="text-xs text-muted-foreground">{a.catatan}</div>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-sm">
                    <span className="font-medium">{a.posisiSebelum.toFixed(0)}%</span>
                    {naik ? (
                      <ArrowUpIcon className="size-3.5 text-emerald-500" />
                    ) : (
                      <ArrowDownIcon className="size-3.5 text-rose-500" />
                    )}
                    <span className="font-medium">{a.posisiSesudah.toFixed(0)}%</span>
                  </div>
                  <StatusBadge status={a.sumber} />
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
