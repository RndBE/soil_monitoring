import { AppShell } from "@/components/dashboard/app-shell"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { CuacaTanahChart, DebitChart, MukaAirChart } from "@/components/dashboard/trend-charts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  getTitikRingkas,
  getTrendCuacaTanah,
  getTrendDebit,
  getTrendMukaAir,
} from "@/lib/backend/queries"

export const dynamic = "force-dynamic"

export default async function AnalisaDataPage() {
  const [titik, mukaAir, debit, cuaca] = await Promise.all([
    getTitikRingkas(),
    getTrendMukaAir(72),
    getTrendDebit(72),
    getTrendCuacaTanah(72),
  ])

  // korelasi sederhana: total hujan 24j vs delta muka air
  const lastHujan = cuaca.reduce(
    (sum, s) => sum + (s.data[s.data.length - 1]?.curahHujanMm ?? 0),
    0,
  )
  const deltaMukaAir = mukaAir.map((s) => {
    const last = s.data[s.data.length - 1]?.tinggiM ?? 0
    const before = s.data[0]?.tinggiM ?? 0
    return { kode: s.titikKode, nama: s.titikNama, delta: last - before }
  })

  return (
    <AppShell activePath="/analisa-data" title="Analisa Data">
      <SectionHeading
        title="Analisa Lintas Parameter"
        description="Perbandingan tren muka air, debit, dan cuaca/tanah dalam 72 jam terakhir."
      />

      <div className="grid gap-3">
        <MukaAirChart series={mukaAir} />
        <DebitChart series={debit} />
      </div>

      <CuacaTanahChart series={cuaca} />

      <Card>
        <CardHeader>
          <CardTitle>Korelasi Hujan vs Muka Air</CardTitle>
          <CardDescription>
            Delta muka air 72 jam terakhir per titik AWLR dengan total curah hujan 24j terkini ={" "}
            <span className="font-medium">{lastHujan.toFixed(1)} mm</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {deltaMukaAir.map((d) => (
            <div
              key={d.kode}
              className="space-y-1 rounded-lg border border-foreground/10 p-3"
            >
              <div className="text-sm font-medium">{d.nama}</div>
              <div className="text-xs text-muted-foreground">{d.kode}</div>
              <div className="text-2xl font-semibold">
                {d.delta >= 0 ? "+" : ""}
                {d.delta.toFixed(3)} m
              </div>
              <div className="text-[11px] text-muted-foreground">
                {d.delta > 0.05
                  ? "Kenaikan signifikan — perhatikan curah hujan"
                  : d.delta < -0.05
                    ? "Penurunan signifikan — periksa pintu hilir"
                    : "Relatif stabil"}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ringkasan Titik Aktif</CardTitle>
          <CardDescription>Total {titik.length} titik monitoring.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div>
              <div className="text-xs text-muted-foreground">AWLR</div>
              <div className="text-xl font-semibold">
                {titik.filter((t) => t.jenis === "AWLR").length}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Debit</div>
              <div className="text-xl font-semibold">
                {titik.filter((t) => t.jenis === "DEBIT").length}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Cuaca/Tanah</div>
              <div className="text-xl font-semibold">
                {titik.filter((t) => t.jenis === "CUACA_TANAH").length}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Status Normal</div>
              <div className="text-xl font-semibold">
                {titik.filter((t) => t.status === "Normal").length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  )
}
