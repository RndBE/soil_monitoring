"use client"

import { useState } from "react"
import { DoorClosedIcon, DoorOpenIcon, GaugeIcon, MapPinIcon, PowerIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { StatusBadge } from "@/components/dashboard/status-badge"
import type { PintuAirRingkas } from "@/lib/types"

type Props = {
  pintu: PintuAirRingkas
  onAktuasi?: (id: string, posisi: number) => void
  onModeChange?: (id: string, mode: PintuAirRingkas["mode"]) => void
}

export function PintuAirCard({ pintu, onAktuasi, onModeChange }: Props) {
  const [target, setTarget] = useState(Math.round(pintu.posisiPersen))

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              {pintu.posisiPersen > 5 ? (
                <DoorOpenIcon className="size-4 text-emerald-500" />
              ) : (
                <DoorClosedIcon className="size-4 text-slate-500" />
              )}
              <CardTitle className="text-base">{pintu.nama}</CardTitle>
            </div>
            <CardDescription className="text-xs">
              {pintu.kode} · {pintu.saluran ?? "tanpa saluran"}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            <StatusBadge status={pintu.status} />
            <StatusBadge status={pintu.mode} className="text-[10px]" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Bukaan saat ini</span>
            <span className="font-medium">{pintu.posisiPersen.toFixed(0)}%</span>
          </div>
          <Progress value={pintu.posisiPersen} />
        </div>

        <dl className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <GaugeIcon className="size-3.5" />
            <span>Kap. {pintu.kapasitasM3s.toFixed(2)} m³/s</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPinIcon className="size-3.5" />
            <span>
              {pintu.latitude.toFixed(4)}, {pintu.longitude.toFixed(4)}
            </span>
          </div>
        </dl>

        <div className="rounded-md border border-dashed border-foreground/15 p-2">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium">Kontrol manual</span>
            <span className="text-muted-foreground">Target {target}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-sky-500"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setTarget(0)
                onAktuasi?.(pintu.id, 0)
              }}
            >
              Tutup
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setTarget(100)
                onAktuasi?.(pintu.id, 100)
              }}
            >
              Buka Penuh
            </Button>
            <Button
              size="sm"
              onClick={() => onAktuasi?.(pintu.id, target)}
              disabled={!onAktuasi}
            >
              Terapkan
            </Button>
            {onModeChange ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  onModeChange(
                    pintu.id,
                    pintu.mode === "Otomatis" ? "Manual" : "Otomatis",
                  )
                }
              >
                <PowerIcon className="mr-1 size-3.5" />
                {pintu.mode === "Otomatis" ? "Ke Manual" : "Ke Otomatis"}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="text-[11px] text-muted-foreground">Update: {pintu.lastUpdate}</div>
      </CardContent>
    </Card>
  )
}
