"use client"

import dynamic from "next/dynamic"

import type { PintuAirRingkas, SaluranRingkas, TitikMonitoringRingkas } from "@/lib/types"

const Map = dynamic(() => import("./peta-jaringan-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[320px] w-full items-center justify-center rounded-xl bg-muted/40 text-sm text-muted-foreground">
      Memuat peta jaringan...
    </div>
  ),
})

type Props = {
  titik: TitikMonitoringRingkas[]
  pintuAir: PintuAirRingkas[]
  saluran?: SaluranRingkas[]
  height?: string
}

export function PetaJaringan({ titik, pintuAir, saluran, height = "480px" }: Props) {
  return (
    <div className="h-full w-full" style={{ minHeight: 320, height }}>
      <Map titik={titik} pintuAir={pintuAir} saluran={saluran} height={height} />
    </div>
  )
}
