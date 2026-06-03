import { AppShell } from "@/components/dashboard/app-shell"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { MukaAirChart } from "@/components/dashboard/trend-charts"
import { KpiSimpleCard } from "@/components/dashboard/kpi-cards"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getTitikRingkas, getTrendMukaAir } from "@/lib/backend/queries"
import { WavesIcon } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function MukaAirPage() {
  const [titik, trend] = await Promise.all([getTitikRingkas(), getTrendMukaAir(48)])
  const awlr = titik.filter((t) => t.jenis === "AWLR")

  // hitung rata-rata terkini
  const lastValues = trend
    .map((s) => s.data[s.data.length - 1]?.tinggiM)
    .filter((v): v is number => typeof v === "number")
  const avg = lastValues.length ? lastValues.reduce((a, b) => a + b, 0) / lastValues.length : 0
  const max = lastValues.length ? Math.max(...lastValues) : 0
  const min = lastValues.length ? Math.min(...lastValues) : 0

  return (
    <AppShell activePath="/muka-air" title="Data Muka Air">
      <SectionHeading
        title="Data Muka Air (AWLR)"
        description="Pembacaan tinggi muka air saluran irigasi."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiSimpleCard
          title="Rata-rata"
          value={`${avg.toFixed(2)} m`}
          detail={`Dari ${awlr.length} titik AWLR`}
          icon={<WavesIcon className="size-4" />}
          tone="bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"
        />
        <KpiSimpleCard
          title="Maksimum"
          value={`${max.toFixed(2)} m`}
          detail="Nilai terkini tertinggi"
          icon={<WavesIcon className="size-4" />}
          tone="bg-rose-500/10 text-rose-600 dark:text-rose-300"
        />
        <KpiSimpleCard
          title="Minimum"
          value={`${min.toFixed(2)} m`}
          detail="Nilai terkini terendah"
          icon={<WavesIcon className="size-4" />}
          tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
        />
      </div>

      <MukaAirChart series={trend} />

      <Card>
        <CardHeader>
          <CardTitle>Titik AWLR</CardTitle>
          <CardDescription>Daftar titik dengan pembacaan terkini.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Saluran</TableHead>
                  <TableHead>Tinggi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Update</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {awlr.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.kode}</TableCell>
                    <TableCell className="text-sm">{t.nama}</TableCell>
                    <TableCell className="text-xs">{t.saluran ?? "-"}</TableCell>
                    <TableCell className="text-sm font-medium">{t.nilaiTerakhir}</TableCell>
                    <TableCell>
                      <StatusBadge status={t.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.lastUpdate}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  )
}
