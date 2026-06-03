import { BellRingIcon, CheckCircle2Icon } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/dashboard/status-badge"
import type { AlarmRingkas } from "@/lib/types"

type Props = {
  items: AlarmRingkas[]
  title?: string
  description?: string
  showResolved?: boolean
}

export function AlarmList({
  items,
  title = "Alarm Aktif",
  description = "Daftar alarm yang masih terbuka atau sedang ditangani.",
  showResolved = false,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
            <CheckCircle2Icon className="size-4" />
            Tidak ada alarm aktif.
          </div>
        ) : (
          items.map((a) => (
            <div
              key={a.id}
              className="flex flex-col gap-2 rounded-lg border border-foreground/10 p-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <BellRingIcon className="size-3.5 text-rose-500" />
                  <span className="font-medium">{a.jenis}</span>
                  <span className="text-xs text-muted-foreground">{a.kode}</span>
                </div>
                <p className="text-sm text-muted-foreground">{a.pesan}</p>
                <div className="text-xs text-muted-foreground">
                  {a.titik ? `Titik: ${a.titik}` : null}
                  {a.pintuAir ? ` · Pintu: ${a.pintuAir}` : null}
                  {a.occurredAt ? ` · ${a.occurredAt}` : null}
                </div>
                {showResolved && a.resolutionNote ? (
                  <div className="text-xs text-emerald-700 dark:text-emerald-400">
                    Catatan: {a.resolutionNote}
                  </div>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge status={a.status} />
                <StatusBadge status={a.state} />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
