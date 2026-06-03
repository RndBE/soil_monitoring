import { CloudRainIcon, DropletIcon, ThermometerIcon, WavesIcon, WindIcon } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Props = {
  curahHujan24h: string
  tmaSungaiCisadane: string
  tmaSungaiAktif: string
  kelembabanUdara: string
  kecepatanAngin: string
}

export function KondisiAktual({
  curahHujan24h,
  tmaSungaiCisadane,
  tmaSungaiAktif,
  kelembabanUdara,
  kecepatanAngin,
}: Props) {
  const items = [
    { icon: <CloudRainIcon className="size-4 text-sky-500" />, label: "Curah Hujan (24 Jam)", value: curahHujan24h },
    { icon: <WavesIcon className="size-4 text-blue-500" />, label: "TMA Sungai Cisadane", value: tmaSungaiCisadane },
    { icon: <WavesIcon className="size-4 text-indigo-500" />, label: "TMA Sungai Aktif", value: tmaSungaiAktif },
    { icon: <DropletIcon className="size-4 text-cyan-500" />, label: "Kelembaban Udara", value: kelembabanUdara },
    { icon: <WindIcon className="size-4 text-emerald-500" />, label: "Kecepatan Angin", value: kecepatanAngin },
  ]

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-[13px] font-semibold uppercase tracking-wide text-foreground/80">
          Kondisi Aktual
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {items.map((it) => (
          <div
            key={it.label}
            className="flex items-center justify-between gap-3 border-b border-foreground/5 pb-2 text-[12.5px] last:border-0 last:pb-0"
          >
            <span className="flex items-center gap-2 text-foreground/80">
              {it.icon}
              {it.label}
            </span>
            <span className="font-semibold">{it.value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
