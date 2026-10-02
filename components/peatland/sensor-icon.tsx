// Ikon jenis sensor (glyph garis 24×24, warna = currentColor). Satu sumber untuk
// marker peta 2D (string SVG di divIcon Leaflet), callout twin 3D, dan legenda.

import type { CSSProperties } from "react"

import type { MarkerLayer } from "@/lib/peatland/map-points"
import { cn } from "@/lib/utils"

export const SENSOR_GLYPH: Record<MarkerLayer, string> = {
  // Sumur pantau muka air (pressure sensor)
  borehole: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>',
  // Stasiun muka air (gelombang)
  "water-station":
    '<path d="M3 8c1.5 0 2.25-1.5 4.5-1.5S10.5 8 12 8s2.25-1.5 4.5-1.5S19.5 8 21 8"/><path d="M3 12.5c1.5 0 2.25-1.5 4.5-1.5s3 1.5 4.5 1.5 2.25-1.5 4.5-1.5 3 1.5 4.5 1.5"/><path d="M3 17c1.5 0 2.25-1.5 4.5-1.5S10.5 17 12 17s2.25-1.5 4.5-1.5S19.5 17 21 17"/>',
  // Penakar hujan (awan + tetes)
  "rain-gauge":
    '<path d="M6.8 14.5a4 4 0 0 1 .3-8A5.5 5.5 0 0 1 17.5 7a3.75 3.75 0 0 1 0 7.5Z"/><path d="m8.5 18-1 2.5M12.5 18l-1 2.5M16.5 18l-1 2.5"/>',
  // Pintu air (daun pintu berjeruji)
  "water-gate": '<rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M9.3 4v16M14.7 4v16M4 11.5h16"/>',
  // Stasiun gambut (tunas di atas lapisan tanah)
  "peat-station":
    '<path d="M12 20v-7"/><path d="M12 13c0-3.3 2.2-5.5 6.5-5.5 0 3.3-2.2 5.5-6.5 5.5Z"/><path d="M12 15.5c0-2.8-1.9-4.6-5.5-4.6 0 2.8 1.9 4.6 5.5 4.6Z"/><path d="M5 20h14"/>',
  // Hotspot satelit (api)
  "fire-hotspot":
    '<path d="M12 3c.6 3.2 5.5 5.4 5.5 10.2a5.5 5.5 0 0 1-11 .4c0-2.3 1.1-3.9 2.5-5 .1 2 1 3.2 2.3 3.6C11 9 10.7 6 12 3Z"/>',
  // Tiang subsidence (pipa berskala + panah turun)
  subsidence: '<path d="M12 3v12"/><path d="M8.5 6.5h7M9.5 10h5"/><path d="m8 15.5 4 4.5 4-4.5"/>',
  // Kamera CCTV
  cctv: '<path d="M3.5 8 15 4.8l1.8 6.2L5.3 14.2Z"/><path d="m16.5 7.8 3.5-1v5.5l-3-.8"/><path d="M8 13.5 7 20h4"/>',
  // Gateway LoRaWAN (mast + gelombang)
  gateway:
    '<path d="m8.5 21 3.5-12 3.5 12M9.6 17h4.8"/><circle cx="12" cy="6.5" r="1.6"/><path d="M8.2 3.3a5 5 0 0 0 0 6.4M15.8 3.3a5 5 0 0 1 0 6.4"/>',
  // Repeater / field node
  repeater: '<path d="M12 3 20.5 12 12 21 3.5 12Z"/><circle cx="12" cy="12" r="2.4"/>',
  // AWS (tiang + mangkuk anemometer)
  aws: '<path d="M12 21V8.5M6 8.5h12"/><circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="4" r="2"/><path d="M9 21h6"/>',
}

/** SVG lengkap (string) untuk elemen DOM non-React (divIcon Leaflet, label CSS2D). */
export function sensorSvg(type: MarkerLayer, size = 14): string {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SENSOR_GLYPH[type]}</svg>`
}

export function SensorIcon({
  type,
  className,
  style,
}: {
  type: MarkerLayer
  className?: string
  style?: CSSProperties
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("size-3.5 shrink-0", className)}
      style={style}
      dangerouslySetInnerHTML={{ __html: SENSOR_GLYPH[type] }}
    />
  )
}
