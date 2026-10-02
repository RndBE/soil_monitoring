"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"

import { useDashboardFilters } from "@/lib/peatland/filters"
import { twinHref } from "@/lib/peatland/stations"
import { useTwinLive } from "@/lib/peatland/use-twin-live"
import { EWS_LEVELS, EWS_META } from "@/lib/peatland/digital-twin"
import type { TwinOverlays, TwinView } from "./digital-twin-scene"
import { OpenInTwin } from "./open-in-twin"

const DigitalTwinScene = dynamic(() => import("./digital-twin-scene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#040d09] font-mono text-[11px] tracking-[0.08em] text-white/50">
      MEMUAT DIGITAL TWIN…
    </div>
  ),
})

const OVERLAYS: TwinOverlays = {
  imagery: true,
  canals: true,
  blocks: true,
  fleet: true,
  fire: true,
  zones: true,
  theme: false,
  rain: true,
  links: false,
  labels: true,
  bloom: false,
}
const VIEW: TwinView = { mode: "reset", nonce: 0 }
const noop = () => {}

/**
 * Twin 3D ringkas (state live) untuk ditanam di kartu lain. Klik sensor →
 * halaman Digital Twin dengan sensor itu terpilih.
 */
export function TwinPreview() {
  const router = useRouter()
  const { estate, division } = useDashboardFilters()
  const live = useTwinLive(estate)
  const [autoRotate, setAutoRotate] = useState(true)

  return (
    <div className="absolute inset-0 bg-[#040d09]">
      <DigitalTwinScene
        frame={live.frame}
        layer="waterTable"
        overlays={OVERLAYS}
        night={false}
        division={division}
        selectedId={null}
        autoRotate={autoRotate}
        view={VIEW}
        callouts={live.callouts}
        weather={live.weather}
        blockLevels={live.blockLevels}
        monoFont="var(--font-jetbrains-mono), ui-monospace, monospace"
        onSelect={(id) => router.push(twinHref({ asset: id }))}
        onSelectBlock={(block) => router.push(twinHref({ block }))}
        onAzimuth={noop}
        onUserOrbit={() => setAutoRotate(false)}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[4] h-24 bg-gradient-to-b from-[rgba(4,13,9,0.8)] to-transparent" />
      <div className="pointer-events-none absolute left-3 top-3 z-[5] grid gap-0.5">
        <span className="kicker inline-flex items-center gap-2 text-[#6ee7b7]">
          <span className="twin-live-dot" />
          Digital Twin · Live 10 Sep
        </span>
        <span className="text-[11px] text-white/60">Klik sensor untuk membuka detailnya di Digital Twin</span>
      </div>
      <div className="absolute bottom-3 left-3 right-3 z-[5] flex flex-wrap items-end justify-between gap-2">
        <div className="pointer-events-none flex flex-wrap gap-2 rounded-[10px] border border-emerald-200/[0.12] bg-[rgba(4,16,11,0.86)] px-2.5 py-1.5 font-mono text-[10px] tracking-[0.06em] text-white/70">
          {EWS_LEVELS.map((l) => (
            <span key={l} className="inline-flex items-center gap-1.5">
              <i className="size-2 rounded-full" style={{ background: EWS_META[l].color }} />
              {EWS_META[l].label.toUpperCase()}
            </span>
          ))}
        </div>
        <OpenInTwin label="Buka Digital Twin" className="shadow-[0_8px_24px_rgba(0,0,0,0.4)]" />
      </div>
    </div>
  )
}
