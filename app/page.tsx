import { AlertCenter } from "@/components/peatland/alert-center"
import { CctvPanel } from "@/components/peatland/cctv-panel"
import { FireRiskChart, RainfallCorrelationChart, WaterTableChart } from "@/components/peatland/charts"
import { BoreholeTable, NdviTable, PeatTable } from "@/components/peatland/data-tables"
import { EstateMap } from "@/components/peatland/estate-map"
import { KpiCards } from "@/components/peatland/kpi-cards"
import { PeatShell } from "@/components/peatland/peat-shell"

export const metadata = {
  title: "Peatland & Plantation Monitoring Dashboard",
}

export default function Home() {
  return (
    <PeatShell title="Peatland & Plantation Monitoring Dashboard">
      <KpiCards />

      {/* Map + Alert/AI */}
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <EstateMap />
        <AlertCenter />
      </div>

      {/* CCTV */}
      <CctvPanel />

      {/* Charts */}
      <div className="grid gap-4 xl:grid-cols-3">
        <WaterTableChart />
        <RainfallCorrelationChart />
        <FireRiskChart />
      </div>

      {/* Tables */}
      <div className="grid gap-4 xl:grid-cols-3">
        <BoreholeTable />
        <PeatTable />
        <NdviTable />
      </div>
    </PeatShell>
  )
}
