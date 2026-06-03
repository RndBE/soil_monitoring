import { AppShell } from "@/components/dashboard/app-shell"
import { AktuasiList } from "@/components/dashboard/aktuasi-list"
import { JadwalList } from "@/components/dashboard/jadwal-list"
import { KpiSimpleCard } from "@/components/dashboard/kpi-cards"
import { PintuAirGrid } from "@/components/dashboard/pintu-air-grid"
import { SectionHeading } from "@/components/dashboard/section-heading"
import {
  getAktuasiTerbaru,
  getJadwalPintu,
  getPintuAirRingkas,
} from "@/lib/backend/queries"
import { DoorOpenIcon, GaugeIcon, PowerIcon } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function PintuAirPage() {
  const [pintu, jadwal, aktuasi] = await Promise.all([
    getPintuAirRingkas(),
    getJadwalPintu(),
    getAktuasiTerbaru(15),
  ])

  const aktif = pintu.filter((p) => p.posisiPersen > 5).length
  const otomatis = pintu.filter((p) => p.mode === "Otomatis" || p.mode === "Terjadwal").length
  const kapasitasTerpakai = pintu.reduce(
    (sum, p) => sum + (p.posisiPersen / 100) * p.kapasitasM3s,
    0,
  )

  return (
    <AppShell activePath="/pintu-air" title="Pintu Air">
      <SectionHeading
        title="Kontrol & Jadwal Pintu Air"
        description="Atur bukaan pintu air manual, jadwal otomatis, dan lihat log aktuasi."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiSimpleCard
          title="Pintu Aktif"
          value={`${aktif} / ${pintu.length}`}
          detail={`${pintu.length - aktif} tertutup`}
          icon={<DoorOpenIcon className="size-4" />}
          tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
        />
        <KpiSimpleCard
          title="Mode Otomatis"
          value={`${otomatis}`}
          detail="Termasuk pintu terjadwal"
          icon={<PowerIcon className="size-4" />}
          tone="bg-sky-500/10 text-sky-600 dark:text-sky-300"
        />
        <KpiSimpleCard
          title="Estimasi Outflow"
          value={`${kapasitasTerpakai.toFixed(2)} m³/s`}
          detail="Berdasar bukaan saat ini × kapasitas"
          icon={<GaugeIcon className="size-4" />}
          tone="bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"
        />
      </div>

      <PintuAirGrid initial={pintu} />

      <div className="grid gap-3 xl:grid-cols-2">
        <JadwalList items={jadwal} />
        <AktuasiList items={aktuasi} />
      </div>
    </AppShell>
  )
}
