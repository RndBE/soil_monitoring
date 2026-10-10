"use client"

// Feed hotspot NASA FIRMS dari /api/firms/hotspots (lihat [[firms]]), diperbarui
// tiap 10 menit. Data NRT FIRMS tiba ≤ 3 jam setelah lintasan satelit, jadi
// interval lebih rapat tidak menambah deteksi baru.

import { useEffect, useState } from "react"

import type { FirmsFeed } from "./firms"

const REFRESH_MS = 10 * 60 * 1000

export type FirmsState = {
  feed: FirmsFeed | null
  error: string | null
  loading: boolean
}

export function useFirmsHotspots(): FirmsState {
  const [state, setState] = useState<FirmsState>({ feed: null, error: null, loading: true })

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const res = await fetch("/api/firms/hotspots", { cache: "no-store" })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)
        if (alive) setState({ feed: body as FirmsFeed, error: null, loading: false })
      } catch (err) {
        // Feed lama tetap ditampilkan; error hanya mengganti status.
        if (alive) setState((s) => ({ ...s, error: err instanceof Error ? err.message : String(err), loading: false }))
      }
    }
    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [])

  return state
}
