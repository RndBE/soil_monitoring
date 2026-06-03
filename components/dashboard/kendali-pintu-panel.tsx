"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import type { PintuAirRingkas } from "@/lib/types"

type Props = {
  pintu: PintuAirRingkas[]
}

export function KendaliPintuPanel({ pintu }: Props) {
  const [selectedId, setSelectedId] = useState(pintu[0]?.id ?? "")
  const selected = useMemo(
    () => pintu.find((p) => p.id === selectedId) ?? pintu[0],
    [pintu, selectedId],
  )
  const [target, setTarget] = useState(Math.round(selected?.posisiPersen ?? 0))

  function onSelect(id: string) {
    setSelectedId(id)
    const next = pintu.find((p) => p.id === id)
    if (next) setTarget(Math.round(next.posisiPersen))
  }

  async function sendCommand(posisi: number) {
    if (!selected) return
    try {
      const res = await fetch(`/api/pintu-air/${selected.id}/aktuasi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posisi, sumber: "MANUAL", operator: "Administrator" }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success(`${selected.nama} → bukaan ${posisi}%`, {
        description: "Perintah aktuasi tercatat.",
      })
    } catch (err) {
      toast.error("Gagal mengirim perintah", {
        description: err instanceof Error ? err.message : "Periksa koneksi server.",
      })
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[13px] font-semibold uppercase tracking-wide text-foreground/80">
            Kendali Pintu Air
          </CardTitle>
          <a className="text-[11px] font-medium text-sky-600 hover:underline" href="/pintu-air">
            Lihat Semua
          </a>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manual">Manual</TabsTrigger>
            <TabsTrigger value="otomatis">Otomatis</TabsTrigger>
            <TabsTrigger value="jadwal">Jadwal</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-3 pt-3">
            <div>
              <label className="mb-1 block text-[11.5px] text-muted-foreground">
                Pilih Pintu Air
              </label>
              <select
                value={selectedId}
                onChange={(e) => onSelect(e.target.value)}
                className="h-9 w-full rounded-md border border-foreground/15 bg-background px-3 text-[13px]"
              >
                {pintu.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.kode} - {p.nama}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-[11.5px]">
                <span className="text-muted-foreground">Posisi Saat Ini</span>
                <span className="font-mono font-semibold">
                  {selected?.posisiPersen.toFixed(0) ?? 0}%
                </span>
              </div>
              <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-sky-500"
                  style={{ width: `${selected?.posisiPersen ?? 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-[11.5px]">
                <span className="text-muted-foreground">Target Posisi</span>
                <span className="font-mono font-semibold">{target}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setTarget(100)
                  sendCommand(100)
                }}
                className="rounded-md bg-emerald-500 px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm hover:bg-emerald-600"
              >
                Buka Penuh
              </button>
              <button
                type="button"
                onClick={() => {
                  setTarget(0)
                  sendCommand(0)
                }}
                className="rounded-md bg-rose-500 px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm hover:bg-rose-600"
              >
                Tutup Penuh
              </button>
            </div>

            <button
              type="button"
              onClick={() => sendCommand(target)}
              className="w-full rounded-md bg-sky-600 px-3 py-2 text-[12.5px] font-semibold text-white shadow-sm hover:bg-sky-700"
            >
              Simpan Perintah
            </button>
          </TabsContent>

          <TabsContent value="otomatis" className="pt-3">
            <p className="text-[12px] text-muted-foreground">
              Mode otomatis akan menyesuaikan bukaan pintu berdasar ambang threshold dan
              kelembaban tanah. Atur threshold di menu Pengaturan.
            </p>
          </TabsContent>

          <TabsContent value="jadwal" className="pt-3">
            <p className="text-[12px] text-muted-foreground">
              Pintu mengikuti jadwal harian. Lihat dan ubah jadwal di halaman{" "}
              <a href="/pintu-air" className="text-sky-600 hover:underline">
                Pintu Air
              </a>
              .
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
