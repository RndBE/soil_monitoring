import { CloudRainIcon, CloudSunIcon, SproutIcon, ThermometerIcon } from "lucide-react"

import { AppShell } from "@/components/dashboard/app-shell"
import { KpiSimpleCard } from "@/components/dashboard/kpi-cards"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { CuacaTanahChart } from "@/components/dashboard/trend-charts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getTitikRingkas, getTrendCuacaTanah } from "@/lib/backend/queries"

export const dynamic = "force-dynamic"

export default async function CuacaTanahPage() {
  const [titik, trend] = await Promise.all([getTitikRingkas(), getTrendCuacaTanah(48)])
  const ws = titik.filter((t) => t.jenis === "CUACA_TANAH")

  const lastRows = trend.map((s) => ({
    kode: s.titikKode,
    nama: s.titikNama,
    last: s.data[s.data.length - 1],
  }))

  const avgSoil =
    lastRows.length === 0
      ? 0
      : lastRows.reduce((sum, r) => sum + (r.last?.kelembabanTanahPct ?? 0), 0) / lastRows.length
  const avgSuhu =
    lastRows.length === 0
      ? 0
      : lastRows.reduce((sum, r) => sum + (r.last?.suhuC ?? 0), 0) / lastRows.length
  const hujan24h = lastRows.reduce(
    (sum, r) => sum + (r.last?.curahHujanMm ?? 0),
    0,
  )
  const totalEt0 = lastRows.reduce(
    (sum, r) => sum + (r.last?.evapotranspirasiMm ?? 0),
    0,
  )

  return (
    <AppShell activePath="/cuaca-tanah" title="Cuaca & Tanah">
      <SectionHeading
        title="Cuaca & Kelembaban Tanah"
        description="Soil moisture, curah hujan, suhu, dan evapotranspirasi untuk rekomendasi suplai air."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiSimpleCard
          title="Kelembaban Tanah"
          value={`${avgSoil.toFixed(0)} %`}
          detail="Rata-rata semua titik"
          icon={<SproutIcon className="size-4" />}
          tone="bg-lime-500/10 text-lime-700 dark:text-lime-300"
        />
        <KpiSimpleCard
          title="Curah Hujan"
          value={`${hujan24h.toFixed(1)} mm`}
          detail="Akumulasi terkini semua titik"
          icon={<CloudRainIcon className="size-4" />}
          tone="bg-sky-500/10 text-sky-600 dark:text-sky-300"
        />
        <KpiSimpleCard
          title="Suhu Rata-rata"
          value={`${avgSuhu.toFixed(1)} °C`}
          detail="Stasiun cuaca aktif"
          icon={<ThermometerIcon className="size-4" />}
          tone="bg-rose-500/10 text-rose-600 dark:text-rose-300"
        />
        <KpiSimpleCard
          title="ET₀ Estimasi"
          value={`${totalEt0.toFixed(2)} mm`}
          detail="Kebutuhan air per jam"
          icon={<CloudSunIcon className="size-4" />}
          tone="bg-amber-500/10 text-amber-600 dark:text-amber-300"
        />
      </div>

      <CuacaTanahChart series={trend} />

      <Card>
        <CardHeader>
          <CardTitle>Rekomendasi Irigasi</CardTitle>
          <CardDescription>
            Aturan rule-based sederhana berdasar kelembaban tanah dan curah hujan terkini.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {lastRows.map((r) => {
            const soil = r.last?.kelembabanTanahPct ?? null
            const hujan = r.last?.curahHujanMm ?? 0
            let rekomendasi = "Tidak ada tindakan"
            let tone: "Normal" | "Waspada" | "Siaga" | "Awas" = "Normal"
            if (soil === null) {
              rekomendasi = "Data sensor belum tersedia"
            } else if (soil < 30 && hujan < 1) {
              rekomendasi = "Buka pintu air maksimal 90 menit"
              tone = "Siaga"
            } else if (soil < 40 && hujan < 2) {
              rekomendasi = "Tambah suplai air 30-45 menit"
              tone = "Waspada"
            } else if (soil > 80) {
              rekomendasi = "Kurangi suplai, periksa drainase"
              tone = "Waspada"
            }
            return (
              <div
                key={r.kode}
                className="flex flex-col gap-1 rounded-lg border border-foreground/10 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="text-sm font-medium">{r.nama}</div>
                  <div className="text-xs text-muted-foreground">
                    Tanah {soil?.toFixed(0) ?? "-"}% · Hujan {hujan.toFixed(1)} mm
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{rekomendasi}</span>
                  <StatusBadge status={tone} />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Titik Cuaca & Tanah</CardTitle>
          <CardDescription>{ws.length} stasiun aktif.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto text-sm">
            <table className="w-full">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr className="border-b border-foreground/10">
                  <th className="px-3 py-2 text-left">Kode</th>
                  <th className="px-3 py-2 text-left">Nama</th>
                  <th className="px-3 py-2 text-left">Tanah</th>
                  <th className="px-3 py-2 text-left">Suhu</th>
                  <th className="px-3 py-2 text-left">Hujan</th>
                  <th className="px-3 py-2 text-left">ET₀</th>
                  <th className="px-3 py-2 text-left">Update</th>
                </tr>
              </thead>
              <tbody>
                {lastRows.map((r) => (
                  <tr key={r.kode} className="border-b border-foreground/5">
                    <td className="px-3 py-2 font-mono text-xs">{r.kode}</td>
                    <td className="px-3 py-2">{r.nama}</td>
                    <td className="px-3 py-2">{r.last?.kelembabanTanahPct?.toFixed(0) ?? "-"}%</td>
                    <td className="px-3 py-2">{r.last?.suhuC?.toFixed(1) ?? "-"} °C</td>
                    <td className="px-3 py-2">{r.last?.curahHujanMm?.toFixed(1) ?? "-"} mm</td>
                    <td className="px-3 py-2">{r.last?.evapotranspirasiMm?.toFixed(2) ?? "-"} mm</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {ws.find((t) => t.kode === r.kode)?.lastUpdate ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  )
}
