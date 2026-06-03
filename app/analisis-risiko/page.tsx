import { AppShell } from "@/components/dashboard/app-shell"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { StatusBadge } from "@/components/dashboard/status-badge"
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
import {
  getAlarmAktif,
  getBobotRisiko,
  getTitikRingkas,
} from "@/lib/backend/queries"

export const dynamic = "force-dynamic"

const statusWeight: Record<string, number> = {
  Normal: 0,
  Waspada: 25,
  Siaga: 60,
  Awas: 90,
}

function scoreTitik(status: string, alarmCount: number) {
  return Math.min(100, (statusWeight[status] ?? 0) + alarmCount * 10)
}

export default async function AnalisisRisikoPage() {
  const [titik, alarms, bobot] = await Promise.all([
    getTitikRingkas(),
    getAlarmAktif(),
    getBobotRisiko(),
  ])

  const alarmByTitik = alarms.reduce<Record<string, number>>((acc, a) => {
    if (a.titik) acc[a.titik] = (acc[a.titik] ?? 0) + 1
    return acc
  }, {})

  const scored = titik
    .map((t) => ({
      ...t,
      alarmCount: alarmByTitik[t.nama] ?? 0,
      score: scoreTitik(t.status, alarmByTitik[t.nama] ?? 0),
    }))
    .sort((a, b) => b.score - a.score)

  const totalBobot = bobot.reduce((sum, b) => sum + b.weight, 0)

  return (
    <AppShell activePath="/analisis-risiko" title="Analisis Risiko">
      <SectionHeading
        title="Analisis Risiko Operasional"
        description="Skor risiko per titik berdasar status dan alarm aktif, serta konfigurasi bobot."
      />

      <Card>
        <CardHeader>
          <CardTitle>Ranking Risiko Titik</CardTitle>
          <CardDescription>
            Skor dihitung dari status + jumlah alarm aktif. Skala 0-100.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titik</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Alarm Aktif</TableHead>
                  <TableHead className="w-1/3">Skor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scored.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="text-sm font-medium">{t.nama}</div>
                      <div className="text-xs text-muted-foreground">{t.kode}</div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={t.status} />
                    </TableCell>
                    <TableCell className="text-sm">{t.alarmCount}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={t.score} className="h-2" />
                        <span className="w-10 text-right text-xs">{t.score}</span>
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
          <CardTitle>Bobot Risiko Parameter</CardTitle>
          <CardDescription>
            Konfigurasi bobot untuk perhitungan composite risk (total {totalBobot}%).
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
    </AppShell>
  )
}
