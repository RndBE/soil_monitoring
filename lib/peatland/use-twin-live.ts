"use client"

// State live digital twin (frame 10 Sep + callout & cuaca) untuk
// tampilan twin ringkas di halaman lain (mis. kartu peta dashboard). Halaman
// /digital-twin menghitung versi lengkapnya sendiri (timeline + skenario).

import { useMemo } from "react"

import type { TwinCallout, TwinWeather } from "@/components/peatland/digital-twin-scene"
import { TWIN_ASSETS, assetReading, buildHistoryFrames, getBlockBaseline, type TwinFrame } from "./digital-twin"

export type TwinLive = {
  frame: TwinFrame
  callouts: Record<string, TwinCallout>
  weather: Record<string, TwinWeather>
}

export function useTwinLive(estate: string): TwinLive {
  return useMemo(() => {
    const baseline = getBlockBaseline(estate)
    const history = buildHistoryFrames(baseline)
    const frame = history[history.length - 1]
    const callouts: Record<string, TwinCallout> = {}
    const weather: Record<string, TwinWeather> = {}
    for (const a of TWIN_ASSETS) {
      const r = assetReading(a, frame, frame)
      callouts[a.id] = { text: r.text, level: r.level, value: r.value }
      if (a.layer === "rain-gauge") {
        const mm = r.value ?? 0
        weather[a.id] = mm >= 25 ? "alarm" : mm > 0.5 ? "warn" : "ok"
      }
    }
    return { frame, callouts, weather }
  }, [estate])
}
