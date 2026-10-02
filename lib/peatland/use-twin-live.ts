"use client"

// State live digital twin (frame 10 Sep + callout & cuaca) untuk
// tampilan twin ringkas di halaman lain (mis. kartu peta dashboard). Halaman
// /digital-twin menghitung versi lengkapnya sendiri (timeline + skenario).

import { useMemo } from "react"

import type { TwinCallout, TwinWeather } from "@/components/peatland/digital-twin-scene"
import {
  TWIN_ASSETS,
  TWIN_BLOCKS,
  assetReading,
  blockEwsLevel,
  buildHistoryFrames,
  getBlockBaseline,
  type EwsLevel,
  type TwinFrame,
} from "./digital-twin"
import { gaugeRainfall, rainWeather } from "./stations"

export type TwinLive = {
  frame: TwinFrame
  callouts: Record<string, TwinCallout>
  weather: Record<string, TwinWeather>
  /** Level EWS tiap block (muka air block + hotspot aktif). */
  blockLevels: Record<string, EwsLevel>
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
    }
    for (const [code, mm] of Object.entries(gaugeRainfall(frame))) weather[code] = rainWeather(mm, true)
    const blockLevels = Object.fromEntries(
      TWIN_BLOCKS.map((b) => [
        b,
        blockEwsLevel(
          frame.blocks[b].waterTable,
          TWIN_ASSETS.filter((a) => a.block === b && a.layer === "fire-hotspot").map((a) => callouts[a.id].level)
        ),
      ])
    )
    return { frame, callouts, weather, blockLevels }
  }, [estate])
}
