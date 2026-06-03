import { AppShell } from "@/components/dashboard/app-shell"
import { AlarmList } from "@/components/dashboard/alarm-list"
import { KpiSimpleCard } from "@/components/dashboard/kpi-cards"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getAlarmAktif, getAlarmSemua, getEvents } from "@/lib/backend/queries"
import { BellIcon, CheckCircleIcon, ClockIcon } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function AlarmPage() {
  const [aktif, semua, events] = await Promise.all([
    getAlarmAktif(),
    getAlarmSemua(),
    getEvents(),
  ])

  const resolved = semua.filter((a) => a.state === "Resolved")
  const open = semua.filter((a) => a.state === "Open")
  const inProgress = semua.filter((a) => a.state === "In Progress")

  return (
    <AppShell activePath="/alarm" title="Alarm & Event">
      <SectionHeading
        title="Alarm & Event Operasional"
        description="Alarm aktif, historis, dan event manual dari operator lapangan."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiSimpleCard
          title="Alarm Terbuka"
          value={`${open.length}`}
          detail="Perlu tinjauan operator"
          icon={<BellIcon className="size-4" />}
          tone="bg-rose-500/10 text-rose-600 dark:text-rose-300"
        />
        <KpiSimpleCard
          title="Ditangani"
          value={`${inProgress.length}`}
          detail="Sedang dalam penanganan"
          icon={<ClockIcon className="size-4" />}
          tone="bg-amber-500/10 text-amber-600 dark:text-amber-300"
        />
        <KpiSimpleCard
          title="Terselesaikan"
          value={`${resolved.length}`}
          detail="100 alarm historis terakhir"
          icon={<CheckCircleIcon className="size-4" />}
          tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
        />
      </div>

      <AlarmList items={aktif} title="Alarm Aktif" description="Alarm yang masih terbuka atau ditangani." />

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Alarm</CardTitle>
          <CardDescription>100 alarm terbaru di seluruh DI.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Pesan</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Waktu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {semua.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{a.kode}</TableCell>
                    <TableCell className="text-sm">{a.jenis}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.pesan}</TableCell>
                    <TableCell className="text-xs">{a.titik ?? a.pintuAir ?? "-"}</TableCell>
                    <TableCell>
                      <StatusBadge status={a.status} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={a.state} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.occurredAt}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Event Manual</CardTitle>
          <CardDescription>Catatan operator dan kegiatan lapangan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada event.</p>
          ) : (
            events.map((e) => (
              <div
                key={e.id}
                className="flex flex-col gap-2 rounded-lg border border-foreground/10 p-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">{e.judul}</div>
                  <div className="text-xs text-muted-foreground">{e.occurredAt}</div>
                  {e.catatan ? (
                    <div className="text-xs text-muted-foreground">{e.catatan}</div>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={e.status} />
                  <StatusBadge status={e.state} />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </AppShell>
  )
}
