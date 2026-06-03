"use client"

import { createContext, useContext, useState } from "react"

import { dashboardMeta } from "./mock-data"
import { ALL_BLOCKS, type DashboardFilterState } from "./filter-logic"

type DashboardFiltersContextValue = DashboardFilterState & {
  setEstate: (v: string) => void
  setDivision: (v: string) => void
  setDateRange: (v: string) => void
}

const DashboardFiltersContext = createContext<DashboardFiltersContextValue | null>(null)

/**
 * Menyediakan state filter global (estate / division / date range) ke seluruh
 * halaman dashboard peatland. Dipasang di [[peat-shell]]. Header mengisinya,
 * komponen data membacanya lewat {@link useDashboardFilters}.
 */
export function DashboardFiltersProvider({ children }: { children: React.ReactNode }) {
  const [estate, setEstate] = useState(dashboardMeta.estate)
  const [division, setDivision] = useState(ALL_BLOCKS)
  const [dateRange, setDateRange] = useState(dashboardMeta.dateRange)

  return (
    <DashboardFiltersContext.Provider
      value={{ estate, division, dateRange, setEstate, setDivision, setDateRange }}
    >
      {children}
    </DashboardFiltersContext.Provider>
  )
}

export function useDashboardFilters(): DashboardFiltersContextValue {
  const ctx = useContext(DashboardFiltersContext)
  if (!ctx) {
    throw new Error("useDashboardFilters harus dipakai di dalam <DashboardFiltersProvider>")
  }
  return ctx
}
