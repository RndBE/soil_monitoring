import {
  BatteryFullIcon,
  RadioTowerIcon,
  RouterIcon,
  SettingsIcon,
  SunIcon,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Props = {
  iotGatewayStatus: "Online" | "Offline"
  sensorAktifText: string
  aktuatorAktifText: string
  solarPanelStatus: string
  bateraiPct: number
}

export function SistemPerangkat({
  iotGatewayStatus,
  sensorAktifText,
  aktuatorAktifText,
  solarPanelStatus,
  bateraiPct,
}: Props) {
  const items = [
    {
      icon: <RouterIcon className="size-4 text-emerald-600" />,
      label: "IoT Gateway",
      value: iotGatewayStatus,
      tone: iotGatewayStatus === "Online" ? "text-emerald-600" : "text-rose-600",
    },
    {
      icon: <RadioTowerIcon className="size-4 text-sky-600" />,
      label: "Sensor Aktif",
      value: sensorAktifText,
    },
    {
      icon: <SettingsIcon className="size-4 text-violet-600" />,
      label: "Aktuator Aktif",
      value: aktuatorAktifText,
    },
    {
      icon: <SunIcon className="size-4 text-amber-500" />,
      label: "Solar Panel",
      value: solarPanelStatus,
      tone: "text-emerald-600",
    },
    {
      icon: <BatteryFullIcon className="size-4 text-emerald-600" />,
      label: "Baterai",
      value: `${bateraiPct}%`,
      tone:
        bateraiPct >= 70
          ? "text-emerald-600"
          : bateraiPct >= 30
            ? "text-amber-600"
            : "text-rose-600",
    },
  ]

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[13px] font-semibold uppercase tracking-wide text-foreground/80">
            Sistem & Perangkat
          </CardTitle>
          <a className="text-[11px] font-medium text-sky-600 hover:underline" href="/perangkat">
            Lihat Detail
          </a>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {items.map((it) => (
          <div
            key={it.label}
            className="flex items-center justify-between gap-2 border-b border-foreground/5 pb-2 text-[12.5px] last:border-0 last:pb-0"
          >
            <span className="flex items-center gap-2 text-foreground/80">
              {it.icon}
              {it.label}
            </span>
            <span className={`font-semibold ${it.tone ?? ""}`}>{it.value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
