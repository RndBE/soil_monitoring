"use client"

import { Fragment, useEffect } from "react"
import L from "leaflet"
import {
  GeoJSON,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  ZoomControl,
  useMap,
} from "react-leaflet"

import { lahanGambut } from "@/lib/peatland/lahan-gambut"
import { blockPoints, canalLines, markerPoints, type MarkerKind } from "@/lib/peatland/map-points"
import { matchesBlock } from "@/lib/peatland/filter-logic"

// Area lahan gambut nyata: Suaka Margasatwa Giam Siak Kecil (Bengkalis, Riau).
const CENTER: [number, number] = [1.1624, 101.6885]
// [south, west], [north, east] — batas penuh kawasan, dipakai untuk fitBounds.
const GAMBUT_BOUNDS: [[number, number], [number, number]] = [
  [0.965, 101.46],
  [1.36, 101.92],
]

const markerColor: Record<MarkerKind, string> = {
  normal: "#22c55e",
  warning: "#f59e0b",
  critical: "#ef4444",
  offline: "#64748b",
  gate: "#38bdf8",
}

const markerLabel: Record<MarkerKind, string> = {
  normal: "Normal",
  warning: "Warning",
  critical: "Critical",
  offline: "Offline",
  gate: "Water Gate",
}

const gambutStyle: L.PathOptions = {
  color: "#5eead4",
  weight: 2,
  opacity: 0.9,
  fillColor: "#22c55e",
  fillOpacity: 0.12,
  dashArray: "5 4",
}

// Leaflet menghitung ukuran container saat init. Karena komponen ini di-load
// lewat dynamic import (ssr:false), ukurannya bisa terbaca 0 → tile tidak diminta.
// invalidateSize() memaksa Leaflet mengukur ulang & memuat tile, lalu fitBounds
// membingkai kawasan gambut.
function MapInit() {
  const map = useMap()
  useEffect(() => {
    const refit = () => {
      map.invalidateSize()
      map.fitBounds(GAMBUT_BOUNDS, { padding: [24, 24] })
    }
    const t1 = setTimeout(refit, 150)
    const t2 = setTimeout(refit, 600)
    const onResize = () => map.invalidateSize()
    const ro = new ResizeObserver(onResize)
    ro.observe(map.getContainer())
    window.addEventListener("resize", onResize)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      ro.disconnect()
      window.removeEventListener("resize", onResize)
    }
  }, [map])
  return null
}

function blockIcon(label: string) {
  return L.divIcon({
    className: "peat-block-label",
    html: `<span>${label}</span>`,
    iconSize: [84, 22],
    iconAnchor: [42, 11],
  })
}

// Bead stasiun: lingkaran mengilap dengan glow sesuai status; status genting
// (critical/offline) mendapat cincin denyut. Lihat .peat-marker di globals.css.
function stationIcon(kind: MarkerKind) {
  const pulse = kind === "critical" || kind === "offline"
  return L.divIcon({
    className: "peat-marker-icon",
    html: `<span class="peat-marker${pulse ? " peat-marker--pulse" : ""}" style="--mk:${markerColor[kind]}"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    tooltipAnchor: [0, -6],
  })
}

// Peta menerima peta visibilitas layer (key → boolean). Layer yang tidak ada di
// objek dianggap tampil (true), agar pemakaian tanpa prop tetap menampilkan semua.
export default function EstateMapLeaflet({
  layers,
  division,
}: {
  layers?: Record<string, boolean>
  division?: string
}) {
  const isVisible = (key: string) => layers?.[key] ?? true
  const inBlock = (block: string) => matchesBlock(block, division ?? "")

  return (
    <MapContainer
      center={CENTER}
      zoom={10}
      scrollWheelZoom
      zoomControl={false}
      className="peat-map h-full w-full"
      style={{ background: "#0c1612" }}
    >
      <TileLayer
        url="https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
        subdomains={["mt0", "mt1", "mt2", "mt3"]}
        attribution="&copy; Google"
        maxZoom={20}
      />

      <ZoomControl position="topright" />
      <MapInit />

      {/* Batas lahan gambut nyata (OpenStreetMap) */}
      <GeoJSON
        data={lahanGambut}
        style={gambutStyle}
        onEachFeature={(feature, layer) => {
          const p = feature.properties as { name?: string; type?: string; region?: string } | null
          if (p?.name) {
            layer.bindTooltip(
              `<b>${p.name}</b><br/>${p.type ?? ""}${p.region ? ` · ${p.region}` : ""}`,
              { sticky: true }
            )
          }
        }}
      />

      {/* Jaringan kanal — layer "canal" (halo lembut + garis putus mengilap) */}
      {isVisible("canal") &&
        canalLines.map((seg, i) => (
          <Fragment key={`canal-${i}`}>
            <Polyline
              positions={seg}
              pathOptions={{ color: "#0ea5e9", weight: 7, opacity: 0.14, lineCap: "round", lineJoin: "round" }}
            />
            <Polyline
              positions={seg}
              pathOptions={{ color: "#7dd3fc", weight: 2, opacity: 0.9, dashArray: "1 7", lineCap: "round" }}
            />
          </Fragment>
        ))}

      {/* Label block — layer "plantation-block", difilter per division */}
      {isVisible("plantation-block") &&
        blockPoints
          .filter((b) => inBlock(b.label))
          .map((b, i) => (
            <Marker key={`blk-${i}`} position={[b.lat, b.lng]} icon={blockIcon(b.label)} interactive={false} />
          ))}

      {/* Titik stasiun — difilter per layer aset & division */}
      {markerPoints
        .filter((m) => isVisible(m.layer) && inBlock(m.block))
        .map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={stationIcon(m.kind)}>
            <Tooltip direction="top" offset={[0, -6]}>
              <span style={{ fontWeight: 600 }}>{m.id.toUpperCase()}</span> — {markerLabel[m.kind]}
            </Tooltip>
          </Marker>
        ))}
    </MapContainer>
  )
}
