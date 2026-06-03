import {
  ActivityIcon,
  BellIcon,
  CloudRainIcon,
  DoorOpenIcon,
  GaugeIcon,
  SproutIcon,
  WavesIcon,
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { KpiSummary } from "@/lib/types"

type Props = {
  kpis: KpiSummary
}

export function KpiCards({ kpis }: Props) {
  const items = [
    {
      title: "Debit Total Inflow",
      value: kpis.debitTotal,
      detail: kpis.debitTotalDetail,
      icon: <ActivityIcon className="size-4" />,
      tone: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
    },
    {
      title: "Muka Air Rata-rata",
      value: kpis.mukaAirRataRata,
      detail: kpis.mukaAirDetail,
      icon: <WavesIcon className="size-4" />,
      tone: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
    },
    {
      title: "Pintu Air Aktif",
      value: kpis.pintuAktif,
      detail: kpis.pintuAktifDetail,
      icon: <DoorOpenIcon className="size-4" />,
      tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    },
    {
      title: "Kelembaban Tanah",
      value: kpis.kelembabanTanah,
      detail: kpis.kelembabanTanahDetail,
      icon: <SproutIcon className="size-4" />,
      tone: "bg-lime-500/10 text-lime-700 dark:text-lime-300",
    },
    {
      title: "Alarm Aktif",
      value: kpis.alarmAktif.toString(),
      detail: kpis.alarmAktifDetail,
      icon: <BellIcon className="size-4" />,
      tone:
        kpis.alarmAktif === 0
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
          : "bg-rose-500/10 text-rose-600 dark:text-rose-300",
    },
    {
      title: "Cuaca Sekarang",
      value: kpis.cuaca,
      detail: `Hujan 24j: ${kpis.curahHujan}`,
      icon: <CloudRainIcon className="size-4" />,
      tone: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => (
        <Card key={item.title} size="sm">
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between gap-2">
              <CardDescription className="text-[11px] uppercase tracking-wide">
                {item.title}
              </CardDescription>
              <span
                className={`inline-flex size-7 items-center justify-center rounded-md ${item.tone}`}
              >
                {item.icon}
              </span>
            </div>
            <CardTitle className="font-heading text-xl leading-tight">{item.value}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">{item.detail}</CardContent>
        </Card>
      ))}
    </div>
  )
}

export function KpiSimpleCard({
  title,
  value,
  detail,
  icon,
  tone = "bg-sky-500/10 text-sky-600",
}: {
  title: string
  value: string
  detail?: string
  icon?: React.ReactNode
  tone?: string
}) {
  return (
    <Card size="sm">
      <CardHeader className="pb-1">
        <div className="flex items-center justify-between gap-2">
          <CardDescription className="text-[11px] uppercase tracking-wide">{title}</CardDescription>
          {icon ? (
            <span className={`inline-flex size-7 items-center justify-center rounded-md ${tone}`}>
              {icon}
            </span>
          ) : (
            <span
              className={`inline-flex size-7 items-center justify-center rounded-md ${tone}`}
            >
              <GaugeIcon className="size-4" />
            </span>
          )}
        </div>
        <CardTitle className="font-heading text-xl leading-tight">{value}</CardTitle>
      </CardHeader>
      {detail ? (
        <CardContent className="text-xs text-muted-foreground">{detail}</CardContent>
      ) : null}
    </Card>
  )
}
