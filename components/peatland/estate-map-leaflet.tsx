"use client"

import { Fragment, useEffect } from "react"
import Link from "next/link"
import L from "leaflet"
import { BoxIcon } from "lucide-react"
import {
  GeoJSON,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  ZoomControl,
  useMap,
} from "react-leaflet"

import { TWIN_ASSETS } from "@/lib/peatland/digital-twin"
import { lahanGambut } from "@/lib/peatland/lahan-gambut"
import { blockPoints, markerPoints, type MarkerKind, type MarkerLayer } from "@/lib/peatland/map-points"
import { waterways } from "@/lib/peatland/waterways"
import { matchesBlock } from "@/lib/peatland/filter-logic"
import {
  STATIONS,
  STATION_TYPE_LABEL,
  formatStationValue,
  twinHref,
  type Station,
  type StationLevel,
} from "@/lib/peatland/stations"
import { EwsPill, levelColor } from "./status"

// Area lahan gambut nyata: Suaka Margasatwa Giam Siak Kecil (Bengkalis, Riau).
const CENTER: [number, number] = [1.1624, 101.6885]
// [south, west], [north, east] — batas penuh kawasan, dipakai untuk fitBounds.
const GAMBUT_BOUNDS: [[number, number], [number, number]] = [
  [0.965, 101.46],
  [1.36, 101.92],
]

// Renderer canvas bersama untuk ratusan garis sungai/parit (SVG terlalu berat).
const waterRenderer = L.canvas({ padding: 0.5 })

const markerColor: Record<MarkerKind, string> = {
  normal: "#22c55e",
  warning: "#f59e0b",
  critical: "#ef4444",
  offline: "#64748b",
  gate: "#38bdf8",
}

// Info tiap marker: kode aset twin (BH-07, WTG-01, …) + bacaan & level dari registri stasiun.
type MarkerInfo = {
  code: string
  reading: string
  level: StationLevel
  station?: Station
}

const MARKER_INFO: Record<string, MarkerInfo> = Object.fromEntries(
  markerPoints.map((m) => {
    const asset = TWIN_ASSETS.find((a) => a.id === m.id)
    const station = STATIONS.find((s) => s.twinId === m.id)
    const code = asset?.code ?? station?.code ?? m.id.toUpperCase()
    const reading = station
      ? formatStationValue(station)
      : asset?.primary
        ? formatStationValue({ value: asset.primary.value, unit: asset.primary.unit })
        : "—"
    const level: StationLevel = station?.level ?? (m.kind === "offline" ? "offline" : "normal")
    return [m.id, { code, reading, level, station }]
  })
)

// Popup dirender di DOM Leaflet (bawaan putih) — ditimpa gelap, hanya untuk .peat-popup.
const POPUP_CSS = [
  ".peat-map .peat-popup .leaflet-popup-content-wrapper{background:rgba(5,16,11,.96);color:rgba(255,255,255,.9);border:1px solid rgba(110,231,183,.22);border-radius:12px;box-shadow:0 14px 34px rgba(0,0,0,.5)}",
  ".peat-map .peat-popup .leaflet-popup-tip{background:rgba(5,16,11,.96);box-shadow:none}",
  ".peat-map .peat-popup .leaflet-popup-content{margin:12px 14px;font-size:12px;line-height:1.4}",
  ".peat-map .peat-popup a.leaflet-popup-close-button{color:rgba(255,255,255,.6);top:4px;right:4px}",
  ".peat-map .peat-popup a.leaflet-popup-close-button:hover{color:#fff}",
  ".peat-map .peat-popup a.peat-popup-link{color:#6ee7b7}",
  ".peat-map .peat-popup a.peat-popup-link:hover{color:#a7f3d0}",
].join("\n")

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
// Teks sr-only memberi nama aksesibel pada ikon (Leaflet menjadikannya role=button).
function stationIcon(kind: MarkerKind, label: string) {
  const pulse = kind === "critical" || kind === "offline"
  return L.divIcon({
    className: "peat-marker-icon",
    html: `<span class="peat-marker${pulse ? " peat-marker--pulse" : ""}" style="--mk:${markerColor[kind]}"></span><span class="sr-only">${label}</span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    tooltipAnchor: [0, -6],
  })
}

const MARKER_ICONS: Record<string, L.DivIcon> = Object.fromEntries(
  markerPoints.map((m) => [m.id, stationIcon(m.kind, `${MARKER_INFO[m.id].code} · ${MARKER_INFO[m.id].reading}`)])
)

/** Isi popup marker: kode, jenis, block, bacaan, level EWS, dan tautan ke Digital Twin. */
function MarkerPopup({ id, layer, block }: { id: string; layer: MarkerLayer; block: string }) {
  const info = MARKER_INFO[id]
  const st = info.station
  return (
    <div className="grid min-w-[190px] gap-2">
      <div>
        <span className="kicker block text-emerald-300/75">
          {STATION_TYPE_LABEL[layer]} · {block}
        </span>
        <div className="mt-0.5 flex items-center justify-between gap-3">
          <span className="font-mono text-[15px] font-bold text-white">{info.code}</span>
          <EwsPill level={info.level} pulse={info.level === "awas" || info.level === "offline"} />
        </div>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[11px]">
        <dt className="text-white/55">Reading</dt>
        <dd className="text-right font-semibold tabular-nums" style={{ color: levelColor(info.level) }}>
          {info.reading}
        </dd>
        {st && (
          <>
            <dt className="text-white/55">Last seen</dt>
            <dd className="text-right tabular-nums text-white/80">{st.lastSeen}</dd>
            <dt className="text-white/55">Battery · Signal</dt>
            <dd className="text-right tabular-nums text-white/80">
              {st.battery}% · {st.signal}
            </dd>
          </>
        )}
      </dl>
      {st?.note && <span className="block text-[10.5px] leading-snug text-white/60">{st.note}</span>}
      <Link
        href={twinHref({ asset: id })}
        className="peat-popup-link inline-flex items-center gap-1 border-t border-white/10 pt-2 text-[11.5px] font-semibold"
      >
        <BoxIcon className="size-3.5" />
        Buka di Digital Twin
      </Link>
    </div>
  )
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
    <>
      <style href="peat-map-popup" precedence="default">
        {POPUP_CSS}
      </style>
      <MapContainer
        center={CENTER}
        zoom={10}
        scrollWheelZoom
        zoomControl={false}
        className="peat-map h-full w-full"
        style={{ background: "#0c1612" }}
      >
        {/* Citra satelit Esri World Imagery (tanpa API key) */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Imagery &copy; Esri, Maxar, Earthstar Geographics · Batas &amp; sungai &copy; OpenStreetMap contributors"
          maxNativeZoom={18}
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

        {/* Sungai, kanal & parit (OpenStreetMap) — layer "canal". Sungai bernama tebal dengan halo,
            parit tipis; digambar di canvas karena jumlah garisnya ratusan. */}
        {isVisible("canal") &&
          waterways.map((w, i) => (
            <Fragment key={`ww-${i}`}>
              {w.rank === 1 && (
                <Polyline
                  positions={w.coords.map(([lng, lat]) => [lat, lng] as [number, number])}
                  pathOptions={{ color: "#0ea5e9", weight: 8, opacity: 0.16, lineCap: "round", lineJoin: "round", renderer: waterRenderer }}
                  interactive={false}
                />
              )}
              <Polyline
                positions={w.coords.map(([lng, lat]) => [lat, lng] as [number, number])}
                pathOptions={{
                  color: w.rank === 1 ? "#38bdf8" : w.rank === 2 ? "#0ea5e9" : "#7dd3fc",
                  weight: w.rank === 1 ? 2.6 : w.rank === 2 ? 1.5 : 0.8,
                  opacity: w.rank === 1 ? 0.95 : w.rank === 2 ? 0.75 : 0.45,
                  lineCap: "round",
                  lineJoin: "round",
                  renderer: waterRenderer,
                }}
                interactive={false}
              />
            </Fragment>
          ))}

        {/* Label block — layer "plantation-block", difilter per division */}
        {isVisible("plantation-block") &&
          blockPoints
            .filter((b) => inBlock(b.label))
            .map((b) => (
              <Marker key={`blk-${b.label}`} position={[b.lat, b.lng]} icon={blockIcon(b.label)} interactive={false} />
            ))}

        {/* Titik stasiun — difilter per layer aset & division; klik = popup detail */}
        {markerPoints
          .filter((m) => isVisible(m.layer) && inBlock(m.block))
          .map((m) => (
            <Marker key={m.id} position={[m.lat, m.lng]} icon={MARKER_ICONS[m.id]}>
              <Tooltip direction="top" offset={[0, -6]}>
                <span style={{ fontWeight: 600 }}>{MARKER_INFO[m.id].code}</span> · {MARKER_INFO[m.id].reading}
              </Tooltip>
              <Popup className="peat-popup" offset={[0, 0]} maxWidth={260}>
                <MarkerPopup id={m.id} layer={m.layer} block={m.block} />
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </>
  )
}
