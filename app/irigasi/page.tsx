import { AppShell } from "@/components/dashboard/app-shell"
import { AnalitikInsight } from "@/components/dashboard/analitik-insight"
import { DashboardKpiRow } from "@/components/dashboard/dashboard-kpi-row"
import { DataRealtimeTable } from "@/components/dashboard/data-realtime-table"
import { GrafikDebit, GrafikMukaAir } from "@/components/dashboard/dashboard-charts"
import { KendaliPintuPanel } from "@/components/dashboard/kendali-pintu-panel"
import { KondisiAktual } from "@/components/dashboard/kondisi-aktual"
import { MiniTrendList } from "@/components/dashboard/mini-trend"
import { PeringatanNotifikasi } from "@/components/dashboard/peringatan-notifikasi"
import { PetaCisadaneInteraktif } from "@/components/dashboard/peta-cisadane-interaktif"
import { RekapPintuTable } from "@/components/dashboard/rekap-pintu-table"
import { SistemPerangkat } from "@/components/dashboard/sistem-perangkat"
import { StatusPintuDonut } from "@/components/dashboard/status-pintu-donut"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  getAlarmAktif,
  getDashboardDetail,
  getPintuAirRingkas,
  getTrendDebit,
  getTrendMukaAir,
} from "@/lib/backend/queries"
import { getPetaCisadaneLayout } from "@/lib/peta-cisadane-layout"

export const dynamic = "force-dynamic"

export default async function DashboardIrigasi() {
  const [detail, alarmAktif, pintu, trendMukaAir, trendDebit, petaLayout] = await Promise.all([
    getDashboardDetail(),
    getAlarmAktif(),
    getPintuAirRingkas(),
    getTrendMukaAir(24),
    getTrendDebit(24),
    getPetaCisadaneLayout(),
  ])

  return (
    <AppShell activePath="/irigasi" title="Dashboard Irigasi" contentPadding={false}>
      <div className="flex flex-col gap-4 px-4 py-4 lg:px-6">
        {/* Baris 1: KPI cards + tanggal/export */}
        <DashboardKpiRow kpis={detail.kpis as unknown as Parameters<typeof DashboardKpiRow>[0]["kpis"]} />

        {/* Baris 2: Peta jaringan (kiri besar) + sidebar kanan (status/kendali) */}
        <div className="grid items-stretch gap-4 xl:grid-cols-[1fr_320px]">
          <Card className="flex h-full overflow-hidden p-0">
            <CardHeader className="border-b border-foreground/5 px-4 pb-3 pt-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-[13px] font-semibold uppercase tracking-[0.12em] text-foreground/90">
                    Peta Jaringan Irigasi
                  </CardTitle>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Update terakhir: {detail.jamLabel.split(" ")[0]}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative min-h-[360px] flex-1 p-0 xl:min-h-0">
              <div className="absolute inset-0">
                <PetaCisadaneInteraktif height="100%" layout={petaLayout} />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
            <StatusPintuDonut {...detail.statusPintu} />
            <KendaliPintuPanel pintu={pintu} />
          </div>
        </div>

        {/* Baris 3: Ringkasan trend dan kondisi aktual */}
        <div className="grid gap-4 md:grid-cols-2">
          <MiniTrendList
            title="Trend Muka Air Hari Ini"
            href="/muka-air"
            series={detail.miniTrendsMukaAir}
            unit="m"
            decimals={2}
          />
          <KondisiAktual {...detail.kondisi} />
        </div>

        {/* Baris 4: Chart muka air + chart debit + data realtime + rekap pintu */}
        <div className="grid gap-4 xl:grid-cols-4">
          <GrafikMukaAir series={trendMukaAir} />
          <GrafikDebit series={trendDebit} />
          <DataRealtimeTable rows={detail.dataRealtime} />
          <RekapPintuTable rows={detail.rekapPintu} total={detail.rekapPintuTotal} />
        </div>

        {/* Baris 5: Peringatan + Analitik insight + Sistem perangkat */}
        <div className="grid gap-4 xl:grid-cols-[1fr_1.5fr_1fr]">
          <PeringatanNotifikasi items={alarmAktif} />
          <AnalitikInsight cards={detail.analitikInsight} />
          <SistemPerangkat {...detail.sistem} />
        </div>
      </div>
    </AppShell>
  )
}
