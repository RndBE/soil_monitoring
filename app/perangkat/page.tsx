import { AppShell } from "@/components/dashboard/app-shell"
import { KpiSimpleCard } from "@/components/dashboard/kpi-cards"
import { PerangkatTable } from "@/components/dashboard/perangkat-table"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { getPerangkat } from "@/lib/backend/queries"
import {
  BatteryWarningIcon,
  RadioTowerIcon,
  SignalIcon,
  WrenchIcon,
} from "lucide-react"

export const dynamic = "force-dynamic"

export default async function PerangkatPage() {
  const items = await getPerangkat()
  const online = items.filter((p) => p.status === "Online").length
  const weak = items.filter((p) => p.status === "Weak").length
  const offline = items.filter((p) => p.status === "Offline").length
  const maintenance = items.filter((p) => p.status === "Maintenance").length
  const batteryLow = items.filter((p) => p.battery < 30).length

  return (
    <AppShell activePath="/perangkat" title="Perangkat">
      <SectionHeading
        title="Perangkat Lapangan"
        description="Status logger, sensor, dan aktuator pintu air di seluruh DI."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiSimpleCard
          title="Online"
          value={`${online}`}
          detail={`Dari ${items.length} perangkat`}
          icon={<SignalIcon className="size-4" />}
          tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
        />
        <KpiSimpleCard
          title="Sinyal Lemah"
          value={`${weak}`}
          detail="Perlu pemantauan"
          icon={<RadioTowerIcon className="size-4" />}
          tone="bg-amber-500/10 text-amber-600 dark:text-amber-300"
        />
        <KpiSimpleCard
          title="Offline"
          value={`${offline}`}
          detail="Hubungi tim lapangan"
          icon={<RadioTowerIcon className="size-4" />}
          tone="bg-rose-500/10 text-rose-600 dark:text-rose-300"
        />
        <KpiSimpleCard
          title="Maintenance"
          value={`${maintenance}`}
          detail={`Baterai rendah: ${batteryLow}`}
          icon={<WrenchIcon className="size-4" />}
          tone="bg-sky-500/10 text-sky-600 dark:text-sky-300"
        />
      </div>

      <PerangkatTable items={items} />

      {batteryLow > 0 ? (
        <div className="flex items-center gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          <BatteryWarningIcon className="size-4" />
          Ada {batteryLow} perangkat dengan baterai di bawah 30%. Jadwalkan pengisian/pengecekan
          panel surya.
        </div>
      ) : null}
    </AppShell>
  )
}
