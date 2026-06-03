"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { ChevronDownIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { mapLayers } from "@/lib/peatland/mock-data"
import { cn } from "@/lib/utils"
import { Panel } from "./panel"

const EstateMapLeaflet = dynamic(() => import("./estate-map-leaflet"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#0c1612] text-[12px] text-white/40">
      Memuat peta estate…
    </div>
  ),
})

const legend = [
  { label: "Normal", color: "bg-emerald-500" },
  { label: "Warning", color: "bg-amber-500" },
  { label: "Critical", color: "bg-red-500" },
  { label: "Offline", color: "bg-slate-500" },
  { label: "Water Gate", color: "bg-sky-500" },
]

export function EstateMap() {
  const [layers, setLayers] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(mapLayers.map((l) => [l.key, l.enabled]))
  )
  const [panelOpen, setPanelOpen] = useState(true)

  const activeCount = Object.values(layers).filter(Boolean).length
  const allOn = activeCount === mapLayers.length

  const toggleLayer = (key: string, label: string) => {
    setLayers((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      toast(`Layer "${label}" ${next[key] ? "ditampilkan" : "disembunyikan"}`)
      return next
    })
  }

  const toggleAll = () => {
    const target = !allOn
    setLayers(Object.fromEntries(mapLayers.map((l) => [l.key, target])))
    toast(target ? "Semua layer ditampilkan" : "Semua layer disembunyikan")
  }

  return (
    <Panel className="h-full">
      <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
        <h3 className="text-[14px] font-semibold text-white">Estate Map Overview</h3>
        <button
          onClick={toggleAll}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11.5px] font-medium text-white/80 transition-colors hover:bg-white/[0.08]"
        >
          {allOn ? "All Layers" : `${activeCount}/${mapLayers.length} Layers`}
          <ChevronDownIcon className="size-3.5 text-white/40" />
        </button>
      </div>

      <div className="relative min-h-[400px] flex-1 overflow-hidden">
        {/* Peta Leaflet (basemap gelap, satu tema dengan dashboard) */}
        <div className="absolute inset-0">
          <EstateMapLeaflet />
        </div>

        {/* Map Layers panel */}
        {panelOpen ? (
          <div className="pointer-events-auto absolute left-3 top-3 z-[500] w-[185px] rounded-lg border border-white/10 bg-black/65 p-3 backdrop-blur-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11.5px] font-semibold text-white/90">Map Layers</span>
              <button onClick={() => setPanelOpen(false)} aria-label="Tutup panel layer">
                <XIcon className="size-3.5 text-white/40 transition-colors hover:text-white/80" />
              </button>
            </div>
            <div className="grid gap-1.5">
              {mapLayers.map((l) => {
                const on = layers[l.key]
                return (
                  <button
                    key={l.key}
                    onClick={() => toggleLayer(l.key, l.label)}
                    className="flex cursor-pointer items-center gap-2 text-left text-[11px] text-white/70 transition-colors hover:text-white/90"
                  >
                    <span
                      className={cn(
                        "flex size-3.5 shrink-0 items-center justify-center rounded-[4px] border",
                        on ? "border-emerald-500 bg-emerald-500" : "border-white/30"
                      )}
                    >
                      {on && (
                        <svg viewBox="0 0 12 12" className="size-2.5 text-white">
                          <path d="M2.5 6.2 5 8.5 9.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    {l.label}
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setPanelOpen(true)}
            className="pointer-events-auto absolute left-3 top-3 z-[500] rounded-lg border border-white/10 bg-black/65 px-3 py-1.5 text-[11px] font-medium text-white/80 backdrop-blur-sm transition-colors hover:bg-black/80"
          >
            Map Layers
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 border-t border-white/8 px-4 py-2.5">
        {legend.map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-full", l.color)} />
            <span className="text-[11px] text-white/55">{l.label}</span>
          </div>
        ))}
      </div>
    </Panel>
  )
}
