import {
  CalendarDaysIcon,
  DoorOpenIcon,
  DropletIcon,
  GaugeIcon,
  SproutIcon,
  WavesIcon,
} from "lucide-react"

import { Card } from "@/components/ui/card"

type KpiItem = {
  label: string
  value: string
  delta?: string
  deltaTone?: "up" | "down" | "neutral"
  icon: React.ReactNode
  iconTone: string
}

function KpiCard({ item }: { item: KpiItem }) {
  return (
    <Card className="flex-row items-center gap-3 px-4 py-3" size="sm">
      <span
        className={`inline-flex size-11 shrink-0 items-center justify-center rounded-xl ${item.iconTone}`}
      >
        {item.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[11.5px] text-muted-foreground">{item.label}</div>
        <div className="font-heading text-[20px] font-semibold leading-tight">{item.value}</div>
        {item.delta ? (
          <div
            className={`text-[11px] ${
              item.deltaTone === "up"
                ? "text-emerald-600 dark:text-emerald-400"
                : item.deltaTone === "down"
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-muted-foreground"
            }`}
          >
            {item.delta}
          </div>
        ) : null}
      </div>
    </Card>
  )
}

export type DashboardKpis = {
  mukaAirAvg: string
  mukaAirDelta?: string
  debitTotal: string
  debitDelta?: string
  pintuAktif: string
  pintuAktifDetail?: string
  efisiensi: string
  efisiensiLabel?: string
  luasTeraliri: string
  luasTeraliriDetail?: string
  tanggalLabel: string
  jamLabel: string
}

export function DashboardKpiRow({
  kpis,
  onExport,
}: {
  kpis: DashboardKpis
  onExport?: () => void
}) {
  const items: KpiItem[] = [
    {
      label: "Rata-rata Muka Air",
      value: kpis.mukaAirAvg,
      delta: kpis.mukaAirDelta,
      deltaTone: kpis.mukaAirDelta?.startsWith("↑") ? "up" : "down",
      icon: <DropletIcon className="size-5" />,
      iconTone: "bg-sky-500/10 text-sky-600",
    },
    {
      label: "Total Debit Saat Ini",
      value: kpis.debitTotal,
      delta: kpis.debitDelta,
      deltaTone: kpis.debitDelta?.startsWith("↑") ? "up" : "down",
      icon: <WavesIcon className="size-5" />,
      iconTone: "bg-cyan-500/10 text-cyan-600",
    },
    {
      label: "Pintu Air Aktif",
      value: kpis.pintuAktif,
      delta: kpis.pintuAktifDetail,
      deltaTone: "neutral",
      icon: <DoorOpenIcon className="size-5" />,
      iconTone: "bg-blue-500/10 text-blue-600",
    },
    {
      label: "Efisiensi Irigasi",
      value: kpis.efisiensi,
      delta: kpis.efisiensiLabel,
      deltaTone: "up",
      icon: <GaugeIcon className="size-5" />,
      iconTone: "bg-violet-500/10 text-violet-600",
    },
    {
      label: "Luas Teraliri",
      value: kpis.luasTeraliri,
      delta: kpis.luasTeraliriDetail,
      deltaTone: "neutral",
      icon: <SproutIcon className="size-5" />,
      iconTone: "bg-orange-500/10 text-orange-600",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {items.map((it) => (
        <KpiCard key={it.label} item={it} />
      ))}

      <Card className="flex-row items-center justify-between gap-3 px-4 py-3" size="sm">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <CalendarDaysIcon className="size-5" />
          </span>
          <div className="leading-tight">
            <div className="text-[13px] font-semibold">{kpis.tanggalLabel}</div>
            <div className="text-[11px] text-muted-foreground">{kpis.jamLabel}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onExport}
          className="rounded-md bg-sky-600 px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm hover:bg-sky-700"
        >
          Export Report
        </button>
      </Card>
    </div>
  )
}
