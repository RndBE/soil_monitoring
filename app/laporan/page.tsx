import { DownloadIcon, FileTextIcon } from "lucide-react"

import { AppShell } from "@/components/dashboard/app-shell"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getLaporanList, getLaporanTemplates } from "@/lib/backend/queries"

export const dynamic = "force-dynamic"

export default async function LaporanPage() {
  const [templates, laporan] = await Promise.all([
    getLaporanTemplates(),
    getLaporanList(),
  ])

  return (
    <AppShell activePath="/laporan" title="Laporan">
      <SectionHeading
        title="Laporan Distribusi Air"
        description="Template laporan rutin dan laporan yang sudah digenerate."
      />

      <Card>
        <CardHeader>
          <CardTitle>Template Laporan</CardTitle>
          <CardDescription>
            Pilih template lalu generate laporan untuk diunduh.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {templates.map((t) => (
            <div
              key={t.id}
              className="flex flex-col gap-3 rounded-lg border border-foreground/10 p-4"
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex size-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-300">
                  <FileTextIcon className="size-5" />
                </span>
                <div>
                  <div className="text-sm font-semibold">{t.nama}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.periode} · {t.audience}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1">
                  {t.formats.map((f) => (
                    <span
                      key={f}
                      className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground"
                    >
                      {f}
                    </span>
                  ))}
                </div>
                <Button size="sm" variant="outline">
                  Generate
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Laporan Terbaru</CardTitle>
          <CardDescription>20 laporan yang terakhir digenerate.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Daerah</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Waktu</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {laporan.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-sm">{l.template}</TableCell>
                    <TableCell className="text-xs">{l.daerahNama}</TableCell>
                    <TableCell>
                      <StatusBadge status={l.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{l.generatedAt}</TableCell>
                    <TableCell className="text-right">
                      {l.downloadUrl ? (
                        <a
                          href={l.downloadUrl}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-muted"
                        >
                          <DownloadIcon className="size-4" />
                          Unduh
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
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
