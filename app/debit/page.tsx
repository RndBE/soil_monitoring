import { ActivityIcon } from "lucide-react"

import { AppShell } from "@/components/dashboard/app-shell"
import { KpiSimpleCard } from "@/components/dashboard/kpi-cards"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { DebitChart } from "@/components/dashboard/trend-charts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getTitikRingkas, getTrendDebit } from "@/lib/backend/queries"

export const dynamic = "force-dynamic"

export default async function DebitPage() {
  const [titik, trend] = await Promise.all([getTitikRingkas(), getTrendDebit(48)])
  const flow = titik.filter((t) => t.jenis === "DEBIT")

  const last = trend.map((s) => ({
    kode: s.titikKode,
    nama: s.titikNama,
    nilai: s.data[s.data.length - 1]?.debitM3s ?? 0,
  }))
  const total = last.reduce((sum, x) => sum + x.nilai, 0)
  const max = last.length ? Math.max(...last.map((x) => x.nilai)) : 0
  const min = last.length ? Math.min(...last.map((x) => x.nilai)) : 0

  return (
    <AppShell activePath="/debit" title="Data Debit">
      <SectionHeading
        title="Data Debit (Flow Meter)"
        description="Pembacaan debit aliran air saluran irigasi."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiSimpleCard
          title="Total Debit"
          value={`${total.toFixed(2)} m³/s`}
          detail={`Dari ${flow.length} flow meter`}
          icon={<ActivityIcon className="size-4" />}
          tone="bg-sky-500/10 text-sky-600 dark:text-sky-300"
        />
        <KpiSimpleCard
          title="Maksimum"
          value={`${max.toFixed(2)} m³/s`}
          detail="Nilai tertinggi saat ini"
          icon={<ActivityIcon className="size-4" />}
          tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
        />
        <KpiSimpleCard
          title="Minimum"
          value={`${min.toFixed(2)} m³/s`}
          detail="Nilai terendah saat ini"
          icon={<ActivityIcon className="size-4" />}
          tone="bg-amber-500/10 text-amber-600 dark:text-amber-300"
        />
      </div>

      <DebitChart series={trend} />

      <Card>
        <CardHeader>
          <CardTitle>Titik Flow Meter</CardTitle>
          <CardDescription>Pembacaan debit terkini per titik.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Saluran</TableHead>
                  <TableHead>Debit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Update</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flow.map((t) => (
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
