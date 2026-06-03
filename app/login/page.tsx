import Image from "next/image"

import logoBeacon from "@/logo_beacon.png"
import { LoginForm } from "@/components/login-form"
import { Separator } from "@/components/ui/separator"

export const dynamic = "force-dynamic"

export default function LoginPage() {
  return (
    <main className="grid min-h-svh bg-background lg:grid-cols-2">
      <section className="relative flex min-h-svh flex-col gap-4 overflow-hidden p-6 md:p-10">
        <div className="relative flex justify-center gap-2 md:justify-start">
          <div className="flex items-center gap-3 font-medium">
            <Image
              alt="Dashboard Pemantauan Irigasi"
              className="h-8 w-auto object-contain"
              priority
              src={logoBeacon}
            />
            <Separator orientation="vertical" className="h-5 data-vertical:self-auto" />
            <span>Dashboard Irigasi</span>
          </div>
        </div>

        <div className="relative flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-[420px] rounded-lg border bg-background/92 p-6 shadow-sm backdrop-blur">
            <LoginForm />
          </div>
        </div>
      </section>

      <aside className="relative hidden bg-gradient-to-br from-sky-500/20 via-emerald-500/15 to-amber-500/10 lg:flex lg:flex-col lg:items-center lg:justify-center lg:p-10">
        <div className="max-w-md space-y-4 text-center">
          <h2 className="font-heading text-3xl font-semibold">Dashboard Pemantauan Irigasi</h2>
          <p className="text-sm text-muted-foreground">
            Monitoring muka air, debit, status pintu air, dan kelembaban tanah Daerah Irigasi
            secara realtime. Atur jadwal otomatis, lihat alarm, dan generate laporan distribusi
            air.
          </p>
          <div className="grid grid-cols-2 gap-3 text-left">
            <div className="rounded-lg border border-foreground/10 bg-background/80 p-3">
              <div className="text-xs text-muted-foreground">Sensor Aktif</div>
              <div className="text-xl font-semibold">8 titik</div>
            </div>
            <div className="rounded-lg border border-foreground/10 bg-background/80 p-3">
              <div className="text-xs text-muted-foreground">Pintu Air</div>
              <div className="text-xl font-semibold">5 unit</div>
            </div>
            <div className="rounded-lg border border-foreground/10 bg-background/80 p-3">
              <div className="text-xs text-muted-foreground">Saluran</div>
              <div className="text-xl font-semibold">Primer · Sekunder · Tersier</div>
            </div>
            <div className="rounded-lg border border-foreground/10 bg-background/80 p-3">
              <div className="text-xs text-muted-foreground">Luas Baku</div>
              <div className="text-xl font-semibold">850 Ha</div>
            </div>
          </div>
        </div>
      </aside>
    </main>
  )
}
