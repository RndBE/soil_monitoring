import { DatabaseIcon, KeyRoundIcon, SettingsIcon, ShieldIcon } from "lucide-react"

import { AppShell } from "@/components/dashboard/app-shell"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getBobotRisiko, getThresholdGlobal } from "@/lib/backend/queries"

export const dynamic = "force-dynamic"

export default async function PengaturanPage() {
  const [thresholds, bobot] = await Promise.all([
    getThresholdGlobal(),
    getBobotRisiko(),
  ])
  const totalBobot = bobot.reduce((sum, b) => sum + b.weight, 0)

  return (
    <AppShell activePath="/pengaturan" title="Pengaturan">
      <SectionHeading
        title="Pengaturan Sistem"
        description="Threshold global, bobot risiko, dan info sistem."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="size-4 text-sky-500" /> Threshold Global
          </CardTitle>
          <CardDescription>
            Definisi ambang status (Normal/Waspada/Siaga/Awas) per metrik.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metrik</TableHead>
                  <TableHead>Normal</TableHead>
                  <TableHead>Waspada</TableHead>
                  <TableHead>Siaga</TableHead>
                  <TableHead>Awas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {thresholds.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm font-medium">{t.metric}</TableCell>
                    <TableCell className="text-xs">{t.normal}</TableCell>
                    <TableCell className="text-xs text-amber-600 dark:text-amber-400">
                      {t.waspada}
                    </TableCell>
                    <TableCell className="text-xs text-orange-600 dark:text-orange-400">
                      {t.siaga}
                    </TableCell>
                    <TableCell className="text-xs text-rose-600 dark:text-rose-400">
                      {t.awas}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldIcon className="size-4 text-sky-500" /> Bobot Risiko
          </CardTitle>
          <CardDescription>
            Bobot tiap parameter untuk perhitungan risiko komposit. Total {totalBobot}%.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parameter</TableHead>
                  <TableHead>Sumber</TableHead>
                  <TableHead className="w-1/2">Bobot</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bobot.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="text-sm font-medium">{b.metric}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{b.source}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={b.weight} className="h-2" />
                        <span className="w-10 text-right text-xs">{b.weight}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DatabaseIcon className="size-4 text-sky-500" /> Info Sistem
          </CardTitle>
          <CardDescription>
            Konfigurasi sumber data dan integrasi pihak ketiga.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <InfoRow label="Sumber Data" value="MySQL via Prisma" />
          <InfoRow label="Timezone" value="Asia/Jakarta" />
          <InfoRow label="Frekuensi Polling" value="60 detik" />
          <InfoRow label="Integrasi Aktuator" value="HTTP/MQTT (belum aktif)" />
          <InfoRow label="Auth" value="Belum aktif" />
          <InfoRow label="Build" value="Next.js 16 + Tailwind v4" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRoundIcon className="size-4 text-sky-500" /> Akun & Akses
          </CardTitle>
          <CardDescription>
            Saat ini sistem berjalan tanpa login. Aktifkan auth dengan menambahkan middleware.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Tabel <code>User</code> sudah berisi 3 akun seed (admin/operator/viewer) untuk
            kebutuhan testing API login. Aktifkan session cookie & guard di langkah berikutnya.
          </p>
        </CardContent>
      </Card>
    </AppShell>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-foreground/10 p-3">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  )
}
