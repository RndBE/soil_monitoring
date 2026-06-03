"use client"

import { useState } from "react"
import { toast } from "sonner"

import { PintuAirCard } from "@/components/dashboard/pintu-air-card"
import type { PintuAirRingkas } from "@/lib/types"

type Props = {
  initial: PintuAirRingkas[]
}

export function PintuAirGrid({ initial }: Props) {
  const [items, setItems] = useState(initial)

  const handleAktuasi = async (id: string, posisi: number) => {
    // optimistic update
    setItems((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, posisiPersen: posisi, lastUpdate: "Baru saja" } : p,
      ),
    )
    try {
      const res = await fetch(`/api/pintu-air/${id}/aktuasi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posisi, sumber: "MANUAL" }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success(`Bukaan diset ke ${posisi}%`, {
        description: "Aktuasi tercatat. Integrasi MQTT akan publish ke aktuator.",
      })
    } catch (err) {
      toast.error("Gagal mengirim perintah aktuasi", {
        description: err instanceof Error ? err.message : "Periksa koneksi server.",
      })
    }
  }

  const handleMode = (id: string, mode: PintuAirRingkas["mode"]) => {
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, mode } : p)))
    toast.message(`Mode pintu diubah ke ${mode}`)
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((p) => (
        <PintuAirCard
          key={p.id}
          pintu={p}
          onAktuasi={handleAktuasi}
          onModeChange={handleMode}
        />
      ))}
    </div>
  )
}
