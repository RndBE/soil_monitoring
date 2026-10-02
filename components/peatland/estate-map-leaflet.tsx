"use client"

import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import L from "leaflet"
import { BoxIcon } from "lucide-react"
import {
  Circle,
  GeoJSON,
  MapContainer,
  Marker,
  Pane,
  Polygon,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet"

import { ASSET_TYPE_META, BLOCK_COLOR, EWS_META, burnRadiusM, type EwsLevel } from "@/lib/peatland/digital-twin"
import { BLOCK_ZONES, zoneBounds } from "@/lib/peatland/block-zones"
import { lahanGambut } from "@/lib/peatland/lahan-gambut"
import { estateWaterways } from "@/lib/peatland/estate-waterways"
import { matchesBlock } from "@/lib/peatland/filter-logic"
import { STATIONS, STATION_TYPE_LABEL, formatStationValue, sectorSummaries, twinHref, type Station } from "@/lib/peatland/stations"
import { sensorSvg } from "./sensor-icon"
import { EwsPill, levelColor } from "./status"

// Area lahan gambut nyata: Suaka Margasatwa Giam Siak Kecil (Bengkalis, Riau).
const CENTER: [number, number] = [1.1624, 101.6885]
// [south, west], [north, east] — batas penuh kawasan, dipakai untuk fitBounds.
const GAMBUT_BOUNDS: [[number, number], [number, number]] = [
  [0.965, 101.46],
  [1.36, 101.92],
]
// Label sector (S1–S5) baru tampil mulai zoom ini, kecuali di block terpilih.
const SECTOR_LABEL_ZOOM = 11

// Renderer canvas bersama untuk ratusan garis sungai/parit (SVG terlalu berat).
const waterRenderer = L.canvas({ padding: 0.5 })

const latLng = (ring: [number, number][]) => ring.map(([lng, lat]) => [lat, lng] as [number, number])

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

// Batas KHG. Saat zona block tampil, isiannya dimatikan (block sudah berwarna sendiri).
const gambutStyle = (zones: boolean): L.PathOptions => ({
  color: "#5eead4",
  weight: 2,
  opacity: 0.9,
  fillColor: "#22c55e",
  fillOpacity: zones ? 0 : 0.12,
  dashArray: "5 4",
})

// Bingkai peta: seluruh KHG, block terpilih, atau sector terpilih.
function frameBounds(division: string, sector: string | null): [[number, number], [number, number]] {
  const z = BLOCK_ZONES.find((b) => b.block === division)
  if (!z) return GAMBUT_BOUNDS
  const s = sector ? z.sectors.find((x) => x.id === sector) : undefined
  return zoneBounds(s ?? z)
}

// Leaflet menghitung ukuran container saat init. Karena komponen ini di-load
// lewat dynamic import (ssr:false), ukurannya bisa terbaca 0 → tile tidak diminta.
// invalidateSize() memaksa Leaflet mengukur ulang & memuat tile, lalu fitBounds
// membingkai kawasan. Selama pengguna belum menggeser/zoom, perubahan ukuran wadah
// (kolom kanan yang ikut tumbuh) membingkai ulang. Ganti block / sector = terbang ke sana.
function MapFraming({ division, sector }: { division: string; sector: string | null }) {
  const map = useMap()
  const target = useRef({ division, sector })
  const last = useRef(`${division}|${sector}`)

  useEffect(() => {
    target.current = { division, sector }
  }, [division, sector])

  useEffect(() => {
    let touched = false
    const refit = () => {
      map.invalidateSize()
      if (!touched) map.fitBounds(frameBounds(target.current.division, target.current.sector), { padding: [24, 24] })
    }
    const t1 = setTimeout(refit, 150)
    const t2 = setTimeout(refit, 600)
    const onTouch = () => {
      touched = true
    }
    const el = map.getContainer()
    el.addEventListener("pointerdown", onTouch)
    el.addEventListener("wheel", onTouch, { passive: true })
    const ro = new ResizeObserver(refit)
    ro.observe(el)
    const onResize = () => map.invalidateSize()
    window.addEventListener("resize", onResize)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      el.removeEventListener("pointerdown", onTouch)
      el.removeEventListener("wheel", onTouch)
      ro.disconnect()
      window.removeEventListener("resize", onResize)
    }
  }, [map])

  useEffect(() => {
    const key = `${division}|${sector}`
    if (last.current === key) return
    last.current = key
    map.flyToBounds(frameBounds(division, sector), { padding: division in BLOCK_COLOR ? [36, 36] : [24, 24], duration: 0.8 })
  }, [division, sector, map])
  return null
}

function ZoomWatch({ onZoom }: { onZoom: (z: number) => void }) {
  const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) })
  return null
}

// Badge block (nama + luas + titik level EWS), gaya label cluster referensi. Block
// terpilih: badge duduk di atas titik paling utara batas block supaya tidak menutupi sensor.
function zoneIcon(block: string, areaHa: number, level: EwsLevel, active: boolean) {
  return L.divIcon({
    className: "peat-zone-icon",
    html: `<span class="peat-zone${active ? " is-active" : ""}" style="--bc:${BLOCK_COLOR[block]};--lv:${EWS_META[level].color}"><b>${block}</b><small><i></i>${areaHa.toLocaleString("id-ID")} ha · ${EWS_META[level].label}</small></span>`,
    iconSize: [132, 40],
    iconAnchor: active ? [66, 46] : [66, 20],
  })
}

const ZONE_TOP: Record<string, [number, number]> = Object.fromEntries(
  BLOCK_ZONES.map((z) => {
    const [lng, lat] = z.ring.reduce((a, p) => (p[1] > a[1] ? p : a))
    return [z.block, [lat, lng]]
  })
)

// Overview (tanpa block terpilih) & zoom jauh: marker ringkas (titik warna jenis, cincin
// level bila tidak normal) supaya 140-an stasiun tidak menumpuk; ikon penuh saat block
// dipilih atau zoom dekat.
const COMPACT_ZOOM = 12

const SECTOR_ICONS: Record<string, L.DivIcon> = Object.fromEntries(
  ["S1", "S2", "S3", "S4", "S5"].map((id) => [
    id,
    L.divIcon({ className: "peat-sector-icon", html: `<span class="peat-sector">${id}</span>`, iconSize: [28, 16], iconAnchor: [14, 8] }),
  ])
)

// Marker stasiun: lencana gelap ber-ikon jenis (warna jenis) + titik level EWS di pojok;
// Awas/offline mendapat cincin denyut. Lihat .peat-sensor di globals.css.
// Teks sr-only memberi nama aksesibel pada ikon (Leaflet menjadikannya role=button).
function stationIcon(s: Station) {
  const pulse = s.level === "awas" || s.level === "offline"
  const cls = ["peat-sensor", pulse && "peat-sensor--pulse", s.level === "offline" && "peat-sensor--off"].filter(Boolean).join(" ")
  return L.divIcon({
    className: "peat-marker-icon",
    html: `<span class="${cls}" style="--tc:${ASSET_TYPE_META[s.type].color};--lv:${levelColor(s.level)}">${sensorSvg(s.type, 13)}<i class="peat-sensor__lv"></i></span><span class="sr-only">${s.code} · ${formatStationValue(s)}</span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    tooltipAnchor: [0, -10],
    popupAnchor: [0, -8],
  })
}

function stationDot(s: Station) {
  const pulse = s.level === "awas" || s.level === "offline"
  const ring = s.level !== "normal"
  return L.divIcon({
    className: "peat-marker-icon",
    html: `<span class="peat-dot${ring ? " peat-dot--ring" : ""}${pulse ? " peat-sensor--pulse" : ""}" style="--tc:${ASSET_TYPE_META[s.type].color};--lv:${levelColor(s.level)}"></span><span class="sr-only">${s.code} · ${formatStationValue(s)}</span>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    tooltipAnchor: [0, -5],
    popupAnchor: [0, -4],
  })
}

const STATION_ICONS: Record<string, L.DivIcon> = Object.fromEntries(STATIONS.map((s) => [s.code, stationIcon(s)]))

// Hotspot yang masih aktif (Siaga/Awas) digambar sebagai api + asap; ukuran ikut FRP.
const ACTIVE_FIRES = STATIONS.filter((s) => s.type === "fire-hotspot" && (s.level === "siaga" || s.level === "awas"))

function fireIcon(s: Station) {
  const k = Math.min(1.35, Math.max(0.8, 0.7 + (s.value ?? 0) / 25))
  const w = Math.round(46 * k)
  const h = Math.round(64 * k)
  return L.divIcon({
    className: "peat-fire-icon",
    html:
      `<span class="peat-fire" style="width:${w}px;height:${h}px">` +
      '<i class="peat-fire__smoke"></i><i class="peat-fire__smoke"></i><i class="peat-fire__smoke"></i><i class="peat-fire__glow"></i>' +
      '<svg class="peat-fire__flame" viewBox="0 0 32 40" aria-hidden="true">' +
      '<path class="peat-fire__outer" d="M16 1.5c1.6 7 11.5 11 11.5 23A11.5 11.5 0 0 1 4.5 25c0-5.5 2.8-9.4 5.8-11.6 0 4 1.9 6.9 4.8 7.9C13.2 14.6 13.7 7.4 16 1.5Z"/>' +
      '<path class="peat-fire__inner" d="M16.5 15c.8 3.5 6 6 6 11.5a6.5 6.5 0 0 1-13 .2c0-3 1.6-5.2 3.3-6.4.1 2.2 1.1 3.8 2.7 4.3-.9-3.4-.5-6.6 1-9.6Z"/>' +
      "</svg></span>",
    iconSize: [w, h],
    iconAnchor: [w / 2, h - 6],
  })
}
const FIRE_ICONS: Record<string, L.DivIcon> = Object.fromEntries(ACTIVE_FIRES.map((s) => [s.code, fireIcon(s)]))
const STATION_DOTS: Record<string, L.DivIcon> = Object.fromEntries(STATIONS.map((s) => [s.code, stationDot(s)]))

/** Isi popup stasiun: kode, jenis, block · sector, bacaan, level EWS, dan tautan ke Digital Twin. */
function StationPopup({ s }: { s: Station }) {
  const { sector } = s
  return (
    <div className="grid min-w-[190px] gap-2">
      <div>
        <span className="kicker block text-emerald-300/75">
          {STATION_TYPE_LABEL[s.type]} · {s.block}
          {sector ? ` · ${sector}` : ""}
        </span>
        <div className="mt-0.5 flex items-center justify-between gap-3">
          <span className="font-mono text-[15px] font-bold text-white">{s.code}</span>
          <EwsPill level={s.level} pulse={s.level === "awas" || s.level === "offline"} />
        </div>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[11px]">
        <dt className="text-white/55">Reading</dt>
        <dd className="text-right font-semibold tabular-nums" style={{ color: levelColor(s.level) }}>
          {formatStationValue(s)}
        </dd>
        <dt className="text-white/55">Last seen</dt>
        <dd className="text-right tabular-nums text-white/80">{s.lastSeen}</dd>
        <dt className="text-white/55">Battery · Signal</dt>
        <dd className="text-right tabular-nums text-white/80">
          {s.battery}% · {s.signal}
        </dd>
      </dl>
      {s.note && <span className="block text-[10.5px] leading-snug text-white/60">{s.note}</span>}
      <Link
        href={twinHref({ asset: s.code })}
        className="peat-popup-link inline-flex items-center gap-1 border-t border-white/10 pt-2 text-[11.5px] font-semibold"
      >
        <BoxIcon className="size-3.5" />
        {s.twinId ? "Buka di Digital Twin" : `Buka ${s.block} di Digital Twin`}
      </Link>
    </div>
  )
}

// Peta menerima peta visibilitas layer (key → boolean). Layer yang tidak ada di
// objek dianggap tampil (true), agar pemakaian tanpa prop tetap menampilkan semua.
export default function EstateMapLeaflet({
  layers,
  division = "",
  levels,
  onSelectBlock,
  sector = null,
  onSelectSector,
}: {
  layers?: Record<string, boolean>
  division?: string
  /** Level EWS tiap block (warna titik badge & tooltip). */
  levels?: Record<string, EwsLevel>
  /** Klik wilayah / badge block. */
  onSelectBlock?: (block: string) => void
  /** Sector terpilih di block aktif (S1–S5). */
  sector?: string | null
  /** Klik sector di block aktif (id sama = batal). */
  onSelectSector?: (id: string | null) => void
}) {
  const isVisible = (key: string) => layers?.[key] ?? true
  const inBlock = (block: string) => matchesBlock(block, division)
  const showZones = isVisible("plantation-block")
  const activeZone = BLOCK_ZONES.find((z) => z.block === division)
  const anyActive = activeZone != null
  const activeSectors = useMemo(() => (activeZone ? sectorSummaries(activeZone.block) : []), [activeZone])
  const [zoom, setZoom] = useState(10)
  const compact = !anyActive && zoom < COMPACT_ZOOM

  const zoneIcons = useMemo(
    () =>
      Object.fromEntries(
        BLOCK_ZONES.map((z) => [z.block, zoneIcon(z.block, z.areaHa, levels?.[z.block] ?? "normal", z.block === division)])
      ),
    [levels, division]
  )

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
        <MapFraming division={division} sector={activeZone ? sector : null} />
        <ZoomWatch onZoom={setZoom} />

        {/* Batas lahan gambut nyata (OpenStreetMap) */}
        <GeoJSON
          key={showZones ? "khg-zones" : "khg"}
          data={lahanGambut}
          style={gambutStyle(showZones)}
          interactive={!showZones}
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
          estateWaterways.map((w, i) => (
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

        {/* Wilayah block + garis sector — layer "plantation-block". Pane sendiri di atas
            canvas sungai supaya wilayah bisa diklik (klik = fokus ke block). */}
        {showZones && (
          <Pane name="zones" style={{ zIndex: 405 }}>
            {BLOCK_ZONES.map((z) => {
              const active = z.block === division
              const dim = anyActive && !active
              const fill = active ? 0.12 : dim ? 0.02 : 0.06
              const level = levels?.[z.block] ?? "normal"
              return (
                <Polygon
                  key={z.block}
                  positions={latLng(z.ring)}
                  pathOptions={{
                    color: BLOCK_COLOR[z.block],
                    weight: active ? 3.4 : 2.4,
                    opacity: dim ? 0.4 : 0.95,
                    fillColor: BLOCK_COLOR[z.block],
                    fillOpacity: fill,
                  }}
                  eventHandlers={{
                    click: () => onSelectBlock?.(z.block),
                    mouseover: (e) => e.target.setStyle({ fillOpacity: fill + 0.08 }),
                    mouseout: (e) => e.target.setStyle({ fillOpacity: fill }),
                  }}
                >
                  <Tooltip sticky direction="top" offset={[0, -8]}>
                    <span style={{ fontWeight: 600 }}>{z.block}</span> · {z.areaHa.toLocaleString("id-ID")} ha ·{" "}
                    <span style={{ color: EWS_META[level].color }}>{EWS_META[level].label}</span>
                    <br />
                    <span style={{ opacity: 0.6 }}>{active ? "Klik untuk semua block" : "Klik untuk fokus"}</span>
                  </Tooltip>
                </Polygon>
              )
            })}
            {/* Sector block aktif: warna = level EWS terburuk sensornya; klik = fokus sector */}
            {activeZone &&
              activeZone.sectors.map((s) => {
                const sum = activeSectors.find((x) => x.id === s.id)
                const level = sum?.level ?? "normal"
                const on = s.id === sector
                const fill = on ? 0.26 : 0.13
                return (
                  <Polygon
                    key={`${activeZone.block}-${s.id}`}
                    positions={latLng(s.ring)}
                    pathOptions={{
                      color: on ? "#ffffff" : EWS_META[level].color,
                      weight: on ? 2.6 : 0,
                      opacity: 0.95,
                      fillColor: EWS_META[level].color,
                      fillOpacity: fill,
                    }}
                    eventHandlers={{
                      click: () => onSelectSector?.(on ? null : s.id),
                      mouseover: (e) => e.target.setStyle({ fillOpacity: fill + 0.08 }),
                      mouseout: (e) => e.target.setStyle({ fillOpacity: fill }),
                    }}
                  >
                    <Tooltip sticky direction="top" offset={[0, -8]}>
                      <span style={{ fontWeight: 600 }}>
                        {activeZone.block} · {s.id}
                      </span>{" "}
                      · {s.areaHa.toLocaleString("id-ID")} ha · {sum?.stations.length ?? 0} sensor ·{" "}
                      <span style={{ color: EWS_META[level].color }}>{EWS_META[level].label}</span>
                      <br />
                      <span style={{ opacity: 0.6 }}>{on ? "Klik untuk seluruh block" : "Klik untuk fokus sector"}</span>
                    </Tooltip>
                  </Polygon>
                )
              })}
            {BLOCK_ZONES.filter((z) => !anyActive || z.block === division).map((z) =>
              z.sectorLines.map(([a, b], i) => (
                <Polyline
                  key={`${z.block}-sl-${i}`}
                  positions={latLng([a, b])}
                  pathOptions={{ color: "#ffffff", weight: 1.2, opacity: zoom >= SECTOR_LABEL_ZOOM ? 0.7 : 0.45, dashArray: "4 5" }}
                  interactive={false}
                />
              ))
            )}
          </Pane>
        )}

        {/* Label sector & badge block */}
        {showZones &&
          BLOCK_ZONES.filter((z) => z.block === division || (!anyActive && zoom >= SECTOR_LABEL_ZOOM)).map((z) =>
            z.sectors.map((s) => (
              <Marker
                key={`${z.block}-${s.id}`}
                position={[s.label.lat, s.label.lng]}
                icon={SECTOR_ICONS[s.id]}
                interactive={false}
                keyboard={false}
              />
            ))
          )}
        {showZones &&
          BLOCK_ZONES.filter((z) => inBlock(z.block)).map((z) => (
            <Marker
              key={`blk-${z.block}`}
              position={z.block === division ? ZONE_TOP[z.block] : [z.label.lat, z.label.lng]}
              icon={zoneIcons[z.block]}
              title={`${z.block} · ${z.areaHa.toLocaleString("id-ID")} ha`}
              eventHandlers={{ click: () => onSelectBlock?.(z.block) }}
              zIndexOffset={1000}
            />
          ))}

        {/* Ilustrasi kebakaran di hotspot aktif (Siaga/Awas): lingkaran perkiraan area terbakar
            (dari FRP) + api & asap beranimasi. Ikut layer "fire-hotspot" & filter division. */}
        {isVisible("fire-hotspot") &&
          ACTIVE_FIRES.filter((s) => inBlock(s.block)).map((s) => {
            const r = burnRadiusM(s.value ?? 0)
            const ha = Math.round((Math.PI * r * r) / 1e4)
            return (
              <Fragment key={`fire-${s.code}`}>
                <Circle
                  center={[s.lat, s.lng]}
                  radius={r}
                  pathOptions={{ className: "peat-fire-zone", color: "#fb923c", weight: 1.6, dashArray: "5 4", fillColor: "#ef4444", fillOpacity: 0.2 }}
                >
                  <Tooltip sticky direction="top" offset={[0, -8]}>
                    <span style={{ fontWeight: 600, color: "#fdba74" }}>Kebakaran · {s.code}</span> · {s.block}
                    {s.sector ? ` · ${s.sector}` : ""}
                    <br />
                    FRP {formatStationValue(s)} · perkiraan area terbakar ±{ha.toLocaleString("id-ID")} ha
                  </Tooltip>
                </Circle>
                <Marker position={[s.lat, s.lng]} icon={FIRE_ICONS[s.code]} interactive={false} keyboard={false} zIndexOffset={-200} />
              </Fragment>
            )
          })}

        {/* Stasiun registri — difilter per layer jenis & division; klik = popup detail */}
        {STATIONS.filter((s) => isVisible(s.type) && inBlock(s.block)).map((s) => (
          <Marker key={s.code} position={[s.lat, s.lng]} icon={(compact ? STATION_DOTS : STATION_ICONS)[s.code]}>
            <Tooltip direction="top" offset={[0, -6]}>
              <span style={{ fontWeight: 600 }}>{s.code}</span> · {formatStationValue(s)}
            </Tooltip>
            <Popup className="peat-popup" offset={[0, 0]} maxWidth={260}>
              <StationPopup s={s} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </>
  )
}
