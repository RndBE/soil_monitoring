"use client"

/* eslint-disable @next/next/no-img-element -- snapshot CCTV "live", bukan aset statik yang perlu dioptimasi next/image */

import { useEffect, useState } from "react"
import { ExpandIcon, VideoIcon, VideoOffIcon, XIcon } from "lucide-react"

import { matchesBlock } from "@/lib/peatland/filter-logic"
import { useDashboardFilters } from "@/lib/peatland/filters"
import { cn } from "@/lib/utils"
import { Panel } from "./panel"

type Camera = {
  id: string
  name: string
  block: string
  src: string
  status: "online" | "offline"
}

// Snapshot diunduh dari Wikimedia Commons (lisensi bebas) ke /public/cctv.
// Ganti `src` dengan URL/endpoint snapshot CCTV asli bila sudah tersedia.
const CAMERAS: Camera[] = [
  { id: "CAM-01", name: "Aerial Estate Overview", block: "Block A", src: "/cctv/cam-01.jpg", status: "online" },
  { id: "CAM-02", name: "Plantation Block B", block: "Block B", src: "/cctv/cam-02.jpg", status: "online" },
  { id: "CAM-03", name: "Nursery & Replanting", block: "Block C", src: "/cctv/cam-03.jpg", status: "online" },
  { id: "CAM-04", name: "Peat Forest Edge", block: "Block C", src: "/cctv/cam-04.jpg", status: "offline" },
  { id: "CAM-05", name: "Main Canal · Water Gate", block: "Block D", src: "/cctv/cam-05.jpg", status: "online" },
  { id: "CAM-06", name: "Estate Access Road", block: "Block E", src: "/cctv/cam-06.jpg", status: "online" },
]

function useLiveClock() {
  const [time, setTime] = useState("")
  useEffect(() => {
    const pad = (n: number) => String(n).padStart(2, "0")
    const tick = () => {
      const d = new Date()
      setTime(`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`)
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])
  return time
}

function CornerTicks() {
  const base = "pointer-events-none absolute size-3 border-white/45"
  return (
    <>
      <span className={cn(base, "left-1.5 top-1.5 border-l border-t")} />
      <span className={cn(base, "right-1.5 top-1.5 border-r border-t")} />
      <span className={cn(base, "bottom-1.5 left-1.5 border-b border-l")} />
      <span className={cn(base, "bottom-1.5 right-1.5 border-b border-r")} />
    </>
  )
}

function FeedOverlay({ cam, time, big = false }: { cam: Camera; time: string; big?: boolean }) {
  const offline = cam.status === "offline"
  return (
    <>
      {/* gradien atas-bawah agar teks terbaca */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/70" />
      <CornerTicks />

      {/* baris atas: id + status */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-2.5 py-1.5">
        <span className={cn("font-mono font-semibold text-white/90 drop-shadow", big ? "text-[12px]" : "text-[10px]")}>
          {cam.id}
        </span>
        {offline ? (
          <span className="flex items-center gap-1 rounded-sm bg-black/55 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/55 ring-1 ring-white/15">
            <VideoOffIcon className="size-3" /> Offline
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-sm bg-black/45 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-red-400 ring-1 ring-red-500/30">
            <span className="cctv-rec size-1.5 rounded-full bg-red-500" /> REC
          </span>
        )}
      </div>

      {/* baris bawah: lokasi + timestamp */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 px-2.5 py-1.5">
        <span className={cn("truncate font-medium text-white/90 drop-shadow", big ? "text-[12.5px]" : "text-[10.5px]")}>
          {cam.name}
          <span className="ml-1 text-white/55">· {cam.block}</span>
        </span>
        <span className={cn("shrink-0 font-mono tabular-nums text-emerald-300/90 drop-shadow", big ? "text-[12px]" : "text-[9.5px]")}>
          {time || "--:--:--"}
        </span>
      </div>
    </>
  )
}

function CameraTile({ cam, time, onOpen }: { cam: Camera; time: string; onOpen: () => void }) {
  const offline = cam.status === "offline"
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative aspect-video w-full overflow-hidden rounded-lg bg-black ring-1 ring-white/10 transition-shadow hover:ring-emerald-400/40"
    >
      {offline ? (
        <div className="cctv-noise absolute inset-0 flex items-center justify-center">
          <span className="rounded bg-black/55 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/60 ring-1 ring-white/15">
            No Signal
          </span>
        </div>
      ) : (
        <>
          <img
            src={cam.src}
            alt={`${cam.id} — ${cam.name}`}
            loading="lazy"
            className="absolute inset-0 size-full object-cover brightness-[0.92] saturate-[0.9] transition-transform duration-300 group-hover:scale-105"
          />
          <div className="cctv-scanlines absolute inset-0" />
        </>
      )}
      <FeedOverlay cam={cam} time={time} />
      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
        <ExpandIcon className="size-4 text-white/80 drop-shadow" />
      </span>
    </button>
  )
}

export function CctvPanel() {
  const { division } = useDashboardFilters()
  const time = useLiveClock()
  const [active, setActive] = useState<Camera | null>(null)

  const cameras = CAMERAS.filter((c) => matchesBlock(c.block, division))
  const online = cameras.filter((c) => c.status === "online").length

  // Tutup modal dengan Escape
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setActive(null)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [active])

  return (
    <Panel>
      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-3.5">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-7 items-center justify-center rounded-lg bg-emerald-500/12 text-emerald-400 ring-1 ring-emerald-500/20">
            <VideoIcon className="size-4" />
          </span>
          <div>
            <h3 className="text-[14px] font-semibold text-white">CCTV Surveillance</h3>
            <p className="text-[11px] text-white/40">
              {online}/{cameras.length} kamera online · live snapshot
            </p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-1.5 font-mono text-[11.5px] tabular-nums text-white/70">
          <span className="cctv-rec size-1.5 rounded-full bg-red-500" />
          {time || "--:--:--"}
        </span>
      </div>

      <div className="px-4 pb-4">
        {cameras.length === 0 ? (
          <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-white/10 text-[12px] text-white/40">
            Tidak ada kamera di {division}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {cameras.map((cam) => (
              <CameraTile key={cam.id} cam={cam} time={time} onOpen={() => setActive(cam)} />
            ))}
          </div>
        )}
      </div>

      {/* Modal perbesar */}
      {active && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setActive(null)}
        >
          <div
            className="relative w-full max-w-3xl overflow-hidden rounded-xl bg-black ring-1 ring-white/15"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-video w-full">
              {active.status === "offline" ? (
                <div className="cctv-noise absolute inset-0 flex items-center justify-center">
                  <span className="rounded bg-black/55 px-3 py-1.5 text-[12px] font-semibold uppercase tracking-widest text-white/60 ring-1 ring-white/15">
                    No Signal
                  </span>
                </div>
              ) : (
                <>
                  <img src={active.src} alt={`${active.id} — ${active.name}`} className="absolute inset-0 size-full object-cover" />
                  <div className="cctv-scanlines absolute inset-0" />
                </>
              )}
              <FeedOverlay cam={active} time={time} big />
            </div>
            <button
              type="button"
              onClick={() => setActive(null)}
              aria-label="Tutup"
              className="absolute right-2.5 top-2.5 inline-flex size-8 items-center justify-center rounded-lg bg-black/55 text-white/80 ring-1 ring-white/15 transition-colors hover:bg-black/80 hover:text-white"
            >
              <XIcon className="size-4" />
            </button>
          </div>
        </div>
      )}
    </Panel>
  )
}
