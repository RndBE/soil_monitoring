import { TriangleAlertIcon } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { AlarmRingkas } from "@/lib/types"

const severityTone: Record<string, string> = {
  Waspada: "bg-amber-500/15 text-amber-700 ring-amber-500/30",
  Siaga: "bg-orange-500/15 text-orange-700 ring-orange-500/30",
  Awas: "bg-rose-500/15 text-rose-700 ring-rose-500/30",
  Normal: "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30",
}

const severityLabel: Record<string, string> = {
  Normal: "Rendah",
  Waspada: "Sedang",
  Siaga: "Tinggi",
  Awas: "Kritis",
}

export function PeringatanNotifikasi({ items }: { items: AlarmRingkas[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[13px] font-semibold uppercase tracking-wide text-foreground/80">
            Peringatan & Notifikasi
          </CardTitle>
          <a className="text-[11px] font-medium text-sky-600 hover:underline" href="/alarm">
            Lihat Semua
          </a>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {items.length === 0 ? (
          <p className="text-[12px] text-muted-foreground">Tidak ada peringatan aktif.</p>
        ) : (
          items.slice(0, 6).map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-3 border-b border-foreground/5 pb-2 last:border-0 last:pb-0"
            >
              <div className="flex min-w-0 items-start gap-2">
                <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                <div className="min-w-0">
                  <div className="truncate text-[12.5px]">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {a.occurredAt.split(" ").slice(-1)[0]}
                    </span>{" "}
                    <span>{a.pesan.length > 70 ? a.pesan.slice(0, 70) + "…" : a.pesan}</span>
                  </div>
                </div>
              </div>
              <span
                className={`shrink-0 rounded-md px-2 py-0.5 text-[10.5px] font-semibold ring-1 ring-inset ${
                  severityTone[a.status] ?? severityTone.Normal
                }`}
              >
                {severityLabel[a.status] ?? a.status}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
