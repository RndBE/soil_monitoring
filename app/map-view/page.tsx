"use client"

import { useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import {
  ActivityIcon,
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  BoxIcon,
  ClockIcon,
  LayersIcon,
  LayoutGridIcon,
  MapPinnedIcon,
  RadioTowerIcon,
  WifiOffIcon,
} from "lucide-react"
import { toast } from "sonner"

import { PeatShell } from "@/components/peatland/peat-shell"
import { Panel, PanelHeader, TableScroll, ViewAll, tableRow, tableTd, tableTh } from "@/components/peatland/panel"
import { BlockDetail } from "@/components/peatland/block-detail"
import { BlockStatusBoard } from "@/components/peatland/block-status"
import { EstateMap } from "@/components/peatland/estate-map"
import { SensorIcon } from "@/components/peatland/sensor-icon"
import { StatTile } from "@/components/peatland/stat-tile"
import { EwsPill, OFFLINE_COLOR, StatusDot, levelColor, levelLabel, type Tone } from "@/components/peatland/status"
import { tooltipStyle } from "@/components/peatland/chart-theme"
import { OpenInTwin } from "@/components/peatland/open-in-twin"
import { ASSET_TYPE_META, EWS_LEVELS, EWS_META, TWIN_BLOCKS } from "@/lib/peatland/digital-twin"
import { BLOCK_ZONES, KHG_AREA_HA, blockZone, zoneAt } from "@/lib/peatland/block-zones"
import { canalLines, type MarkerLayer } from "@/lib/peatland/map-points"
import { mapLayers, stations as fleet } from "@/lib/peatland/mock-data"
import {
  STATIONS,
  STATION_TYPES,
  STATION_TYPE_LABEL,
  formatLatLng,
  formatStationValue,
  stationByCode,
  type Station,
  type StationLevel,
  type StationSignal,
} from "@/lib/peatland/stations"
import { useDashboardFilters } from "@/lib/peatland/filters"
import { useTwinLive } from "@/lib/peatland/use-twin-live"
import { ALL_BLOCKS, DIVISION_OPTIONS, matchesBlock } from "@/lib/peatland/filter-logic"
import { cn } from "@/lib/utils"

const TYPES = STATION_TYPES
const isStationType = (key: string): key is MarkerLayer => key in STATION_TYPE_LABEL

// Warna layer di legenda: jenis aset pakai ASSET_TYPE_META (sama dengan twin 3D),
// kanal & label block mengikuti gaya peta.
const LAYER_COLOR: Record<string, string> = {
  ...Object.fromEntries(TYPES.map((t) => [t, ASSET_TYPE_META[t].color])),
  canal: "#7dd3fc",
  "plantation-block": "#6ee7b7",
}

// Level EWS marker peta 2D (titik di pojok ikon marker, lihat estate-map-leaflet).
const MARKER_STATUS: { level: StationLevel; label: string; color: string }[] = [
  ...EWS_LEVELS.map((l) => ({ level: l, label: EWS_META[l].label, color: EWS_META[l].color })),
  { level: "offline", label: "Offline", color: OFFLINE_COLOR },
]

const LEVEL_FILTERS: (StationLevel | "all")[] = ["all", "normal", "waspada", "siaga", "awas", "offline"]
const SEVERITY: Record<StationLevel, number> = { normal: 0, waspada: 1, siaga: 2, awas: 3, offline: 4 }

const READING_LABEL: Record<MarkerLayer, string> = {
  borehole: "Water level",
  "water-station": "Water table",
  "rain-gauge": "Rainfall 24h",
  "water-gate": "Gate opening",
  "peat-station": "Soil moisture",
  "fire-hotspot": "Fire radiative power",
  subsidence: "Subsidence rate",
  cctv: "Video stream",
  gateway: "Connected nodes",
  repeater: "Signal (RSSI)",
  aws: "Air temperature",
}

// Halaman modul per jenis stasiun (tautan dari panel detail).
const TYPE_PAGE: Partial<Record<MarkerLayer, string>> = {
  borehole: "/borehole-monitoring",
  "water-station": "/borehole-monitoring",
  "rain-gauge": "/weather-rainfall",
  "peat-station": "/peat-monitoring",
  "fire-hotspot": "/fire-risk",
  subsidence: "/peat-monitoring/subsidence",
  cctv: "/",
  aws: "/weather-rainfall",
}

const SIGNAL_TONE: Record<StationSignal, Tone> = { Good: "normal", Fair: "warning", Weak: "warning", "No signal": "offline" }

// Waktu live dashboard: 10 Sep 2024 09:37.
const LIVE_DAY = 10
const LIVE_MIN = 9 * 60 + 37

/** "09:36" (hari live) atau "8 Sep 13:20" → menit relatif 10 Sep 00:00; tak dikenal = sangat lama. */
function seenMinutes(s: string): number {
  const m = s.match(/^(?:(\d+) Sep )?(\d{1,2}):(\d{2})$/)
  if (!m) return -1e9
  const day = m[1] ? Number(m[1]) : LIVE_DAY
  return (day - LIVE_DAY) * 1440 + Number(m[2]) * 60 + Number(m[3])
}

function seenAgo(s: string): string {
  const t = seenMinutes(s)
  if (t <= -1e9) return "—"
  const d = LIVE_MIN - t
  if (d <= 1) return "just now"
  if (d < 60) return `${d} min ago`
  if (d < 1440) return `${Math.floor(d / 60)} h ago`
  return `${Math.floor(d / 1440)} d ago`
}

type SortKey = "code" | "type" | "block" | "level" | "lastSeen"
type SortState = { key: SortKey; dir: "asc" | "desc" }

const SORTERS: Record<SortKey, (a: Station, b: Station) => number> = {
  code: (a, b) => a.code.localeCompare(b.code, "en", { numeric: true }),
  type: (a, b) => STATION_TYPE_LABEL[a.type].localeCompare(STATION_TYPE_LABEL[b.type]),
  block: (a, b) => a.block.localeCompare(b.block),
  level: (a, b) => SEVERITY[a.level] - SEVERITY[b.level],
  lastSeen: (a, b) => seenMinutes(a.lastSeen) - seenMinutes(b.lastSeen),
}

const chipClass = (on: boolean) =>
  cn(
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
    on ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30" : "text-white/55 hover:bg-white/[0.04] hover:text-white/80"
  )

function SortTh({
  label,
  k,
  sort,
  onSort,
  className,
}: {
  label: string
  k: SortKey
  sort: SortState
  onSort: (k: SortKey) => void
  className?: string
}) {
  const active = sort.key === k
  const Icon = !active ? ArrowUpDownIcon : sort.dir === "asc" ? ArrowUpIcon : ArrowDownIcon
  return (
    <th className={cn(tableTh, className)} aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={() => onSort(k)}
        className={cn("inline-flex items-center gap-1 uppercase transition-colors hover:text-white/85", active && "text-emerald-300/90")}
      >
        {label}
        <Icon className="size-3" />
      </button>
    </th>
  )
}

function Fact({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn("min-w-0", wide && "col-span-2")}>
      <dt className="kicker text-white/50">{label}</dt>
      <dd className="mt-0.5 truncate text-[12px] text-white/85">{children}</dd>
    </div>
  )
}

/** Panel detail stasiun terpilih: bacaan, baterai, sinyal, terakhir terlihat, catatan + tautan twin. */
function StationDetail({ s }: { s: Station | undefined }) {
  if (!s) {
    return (
      <Panel>
        <PanelHeader kicker="Stasiun · detail" icon={RadioTowerIcon} title="Station Detail" subtitle="Select a station in the directory" />
      </Panel>
    )
  }
  const meta = ASSET_TYPE_META[s.type]
  const page = TYPE_PAGE[s.type]
  const sector = zoneAt(s.lat, s.lng)?.sector
  const batteryColor = s.battery >= 50 ? "#46d78f" : s.battery >= 20 ? "#ffd27a" : "#ff7a66"
  return (
    <Panel>
      <PanelHeader
        kicker={`Stasiun · ${meta.short}`}
        icon={RadioTowerIcon}
        title={s.code}
        subtitle={`${STATION_TYPE_LABEL[s.type]} · ${s.block}${sector ? ` · ${sector}` : ""}`}
        action={<EwsPill level={s.level} pulse={s.level === "awas" || s.level === "offline"} />}
      />
      <div className="flex flex-col gap-3 px-4 pb-4">
        <div className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2.5">
          <span className="kicker text-white/50">{READING_LABEL[s.type]}</span>
          <div className="mt-1 font-mono text-[24px] font-bold leading-none tabular-nums" style={{ color: levelColor(s.level) }}>
            {formatStationValue(s)}
          </div>
          {s.note && <p className="mt-1.5 text-[11.5px] text-white/60">{s.note}</p>}
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5">
          <Fact label="Battery">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-12 overflow-hidden rounded-full bg-white/10">
                <span className="block h-full rounded-full" style={{ width: `${s.battery}%`, background: batteryColor }} />
              </span>
              <span className="tabular-nums">{s.battery}%</span>
            </span>
          </Fact>
          <Fact label="Signal">
            <StatusDot tone={SIGNAL_TONE[s.signal]} label={s.signal} />
          </Fact>
          <Fact label="Last seen">
            {s.lastSeen} <span className="text-white/50">· {seenAgo(s.lastSeen)}</span>
          </Fact>
          <Fact label="Twin model">{s.twinId ? `3D asset · ${s.twinId}` : `Block view · ${s.block}`}</Fact>
          {s.peatDepth != null && <Fact label="Peat depth">{s.peatDepth} cm</Fact>}
          {s.soilTemp != null && <Fact label="Soil temp">{s.soilTemp.toFixed(1)} °C</Fact>}
          <Fact label="Coordinates" wide>
            <span className="font-mono text-[11.5px]">{formatLatLng(s.lat, s.lng)}</span>
          </Fact>
        </dl>

        <div className="flex flex-wrap items-center gap-2">
          <OpenInTwin asset={s.code} label={s.twinId ? "Buka di Twin" : `Buka ${s.block} di Twin`} />
          {page && (
            <Link href={page} className="text-[11.5px] font-medium text-emerald-400 transition-colors hover:text-emerald-300">
              Open module
            </Link>
          )}
        </div>
      </div>
    </Panel>
  )
}

export default function MapViewPage() {
  const { division, setDivision, estate } = useDashboardFilters()
  const { blockLevels } = useTwinLive(estate)
  const selectBlock = (block: string) => setDivision(division === block ? ALL_BLOCKS : block)
  // Sector terpilih hanya berlaku untuk block yang sedang dipilih.
  const [sectorSel, setSectorSel] = useState<{ block: string; id: string } | null>(null)
  const activeSector = sectorSel && sectorSel.block === division ? sectorSel.id : null
  const selectSector = (id: string | null) => setSectorSel(id ? { block: division, id } : null)

  // Visibilitas layer — sumber kebenaran tunggal yang mengendalikan peta (EstateMap)
  // sekaligus Layer Legend. true = tampil.
  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(mapLayers.map((l) => [l.key, true]))
  )
  const activeLayerCount = mapLayers.filter((l) => visibleLayers[l.key]).length

  const toggleLayer = (key: string) => setVisibleLayers((prev) => ({ ...prev, [key]: !prev[key] }))
  const toggleAllLayers = (target: boolean) => setVisibleLayers(Object.fromEntries(mapLayers.map((l) => [l.key, target])))

  // Registri stasiun (subset armada estate) yang lolos filter division.
  const registry = useMemo(() => STATIONS.filter((s) => matchesBlock(s.block, division)), [division])
  const registryOffline = STATIONS.filter((s) => s.level === "offline")

  // Marker yang benar-benar digambar peta (layer jenis tampil & lolos filter division).
  const drawnMarkers = useMemo(() => registry.filter((s) => visibleLayers[s.type]), [registry, visibleLayers])
  const markerBreakdown = MARKER_STATUS.map((s) => ({ ...s, count: drawnMarkers.filter((m) => m.level === s.level).length }))

  const zonesInScope = BLOCK_ZONES.filter((z) => matchesBlock(z.block, division))
  const legendRows = mapLayers.map((l) => {
    if (isStationType(l.key)) {
      const total = registry.filter((s) => s.type === l.key).length
      return { ...l, color: LAYER_COLOR[l.key], count: String(total) }
    }
    if (l.key === "canal") return { ...l, color: LAYER_COLOR.canal, count: String(canalLines.length) }
    return {
      ...l,
      color: LAYER_COLOR[l.key] ?? "#6ee7b7",
      count: `${zonesInScope.length} · ${zonesInScope.reduce((a, z) => a + z.sectors.length, 0)}`,
    }
  })

  // Luas dari polygon block (bukan luas tanam): seluruh KHG atau block terpilih.
  const zone = blockZone(division)
  const area = zone?.areaHa ?? KHG_AREA_HA

  // Papan status block: jumlah sensor registri per block & ringkasan sistem.
  const sensorsPerBlock = Object.fromEntries(BLOCK_ZONES.map((z) => [z.block, STATIONS.filter((s) => s.block === z.block).length]))
  const activeHotspots = STATIONS.filter((s) => s.type === "fire-hotspot" && s.level !== "normal" && s.level !== "offline")

  // Station directory: filter jenis/status/block, urutan, dan stasiun terpilih.
  const [typeFilter, setTypeFilter] = useState<MarkerLayer | "all">("all")
  const [levelFilter, setLevelFilter] = useState<StationLevel | "all">("all")
  const [sort, setSort] = useState<SortState>({ key: "code", dir: "asc" })
  const [selectedCode, setSelectedCode] = useState("BH-07")
  const [synced, setSynced] = useState(false)
  const directoryRef = useRef<HTMLDivElement>(null)

  const directory = useMemo(() => {
    const rows = registry.filter(
      (s) =>
        (typeFilter === "all" || s.type === typeFilter) &&
        (levelFilter === "all" || s.level === levelFilter) &&
        (!activeSector || s.sector === activeSector)
    )
    const cmp = SORTERS[sort.key]
    const sign = sort.dir === "asc" ? 1 : -1
    return [...rows].sort((a, b) => sign * cmp(a, b) || SORTERS.code(a, b))
  }, [registry, typeFilter, levelFilter, sort, activeSector])

  const typeCount = (t: MarkerLayer | "all") =>
    registry.filter((s) => (t === "all" || s.type === t) && (levelFilter === "all" || s.level === levelFilter)).length
  const levelCount = (l: StationLevel | "all") =>
    registry.filter((s) => (l === "all" || s.level === l) && (typeFilter === "all" || s.type === typeFilter)).length

  const onSort = (key: SortKey) =>
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "level" ? "desc" : "asc" }))

  const showOffline = () => {
    setTypeFilter("all")
    setLevelFilter("offline")
    directoryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const handleSync = () => {
    const id = toast.loading("Menyinkronkan stasiun…")
    setTimeout(() => {
      setSynced(true)
      toast.success("Data stasiun diperbarui", { id, description: `${STATIONS.length} stasiun registri · 10 Sep 2024 09:37` })
    }, 900)
  }

  const selected = stationByCode(selectedCode)

  // Cakupan twin: stasiun registri yang dimodelkan di scene 3D, per jenis.
  const modelled = registry.filter((s) => s.twinId != null).length
  const coverage = TYPES.map((t) => {
    const all = registry.filter((s) => s.type === t)
    return { type: t, total: all.length, inTwin: all.filter((s) => s.twinId != null).length }
  })

  return (
    <PeatShell title="Map View" subtitle="Estate-wide Asset & Sensor Map">
      {/* KPI row — armada estate (mock stations) vs subset registri twin dilabeli jelas */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile
          label="Total Stations"
          value={String(fleet.total)}
          icon={RadioTowerIcon}
          tone="info"
          status={`Estate-wide fleet · ${TWIN_BLOCKS.length} blocks`}
          foot={`Registry: ${STATIONS.filter((s) => s.type !== "fire-hotspot").length} devices + ${STATIONS.filter((s) => s.type === "fire-hotspot").length} hotspots`}
        />
        <StatTile
          label="Online"
          value={String(fleet.online)}
          unit={`/ ${fleet.total}`}
          icon={ActivityIcon}
          tone="normal"
          status={`${fleet.percent}% uptime`}
          foot="LoRaWAN · SCADA · GSM"
        />
        <StatTile
          label="Offline"
          value={String(fleet.offline)}
          icon={WifiOffIcon}
          tone="offline"
          status="Needs attention"
          foot={`${registryOffline.length} in registry · ${registryOffline.slice(0, 3).map((s) => s.code).join(", ")}${registryOffline.length > 3 ? " …" : ""}`}
          onClick={showOffline}
        />
        <StatTile
          label="Layers Active"
          value={String(activeLayerCount)}
          unit={`/ ${mapLayers.length}`}
          icon={LayersIcon}
          tone="info"
          foot={`${drawnMarkers.length} markers drawn on map`}
        />
        <StatTile
          label="Area Monitored"
          value={area.toLocaleString("en-US")}
          unit="ha"
          icon={MapPinnedIcon}
          tone="normal"
          foot={
            zone
              ? `${zone.block} · ${zone.sectors.length} sectors · of ${KHG_AREA_HA.toLocaleString("en-US")} ha`
              : `${BLOCK_ZONES.length} blocks · ${BLOCK_ZONES.length * 5} sectors · KHG Giam Siak Kecil`
          }
          href="/plantation-health"
        />
        <StatTile
          label="Last Sync"
          value="09:37"
          unit="WIB"
          icon={ClockIcon}
          tone="normal"
          status={synced ? "Synced just now" : "10 Sep 2024"}
          foot="Auto every 5 min"
        />
      </div>

      {/* Status per block (klik tile = fokus peta ke block) */}
      <Panel>
        <PanelHeader
          kicker="Block · status EWS"
          icon={LayoutGridIcon}
          title="Block Status"
          subtitle={`KHG Giam Siak Kecil · ${KHG_AREA_HA.toLocaleString("en-US")} ha · ${BLOCK_ZONES.length} blocks × 5 sectors · click a block to focus the map`}
          action={
            division !== ALL_BLOCKS ? (
              <button
                type="button"
                onClick={() => setDivision(ALL_BLOCKS)}
                className="text-[11.5px] font-medium text-emerald-400 transition-colors hover:text-emerald-300"
              >
                All blocks
              </button>
            ) : undefined
          }
        />
        <BlockStatusBoard
          className="px-4 pb-4"
          levels={blockLevels}
          sensors={sensorsPerBlock}
          selected={division}
          onSelect={selectBlock}
          stats={[
            { label: "Total sensor", value: String(fleet.total), sub: `${fleet.percent}% online` },
            {
              label: "Hotspot aktif",
              value: String(activeHotspots.length),
              sub: activeHotspots.map((s) => s.code).join(", ") || "—",
              color: activeHotspots.length ? EWS_META.awas.color : undefined,
            },
          ]}
        />
      </Panel>

      {/* Main map row */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        {/* xl: tinggi peta ikut kolom kanan (Legend + Quick Stats) supaya tidak ada celah */}
        <div className="h-[520px] xl:h-auto xl:min-h-[520px]">
          <EstateMap
            title="Estate Asset Map"
            subtitle={`Live sensor & infrastructure positions · ${drawnMarkers.length} markers`}
            headerAction={<ViewAll label="Export" onClick={() => toast.info("Mengekspor peta…")} />}
            layers={visibleLayers}
            onToggleLayer={toggleLayer}
            onToggleAll={toggleAllLayers}
            showLayerPanel={false}
            sector={activeSector}
            onSelectSector={selectSector}
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Panel>
            <PanelHeader kicker="Peta · layer" icon={LayersIcon} title="Layer Legend" subtitle="Icon = sensor type · click to show / hide" />
            <div className="flex items-center justify-between px-4 pb-1">
              <span className="kicker text-white/50">Layer</span>
              <span className="kicker text-white/50">Count</span>
            </div>
            <div className="flex flex-col gap-0.5 px-2 pb-2">
              {legendRows.map((l) => {
                const hidden = !visibleLayers[l.key]
                return (
                  <button
                    key={l.key}
                    type="button"
                    onClick={() => toggleLayer(l.key)}
                    aria-pressed={!hidden}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/[0.04]",
                      hidden && "opacity-45"
                    )}
                  >
                    <span className="flex items-center gap-2.5 text-[12px] text-white/75">
                      {isStationType(l.key) ? (
                        <SensorIcon type={l.key} style={{ color: l.color }} />
                      ) : (
                        <span
                          className={cn("w-3.5 shrink-0", l.key === "canal" ? "border-t-2" : "h-2.5 rounded-[3px] border-2")}
                          style={{ borderColor: l.color }}
                        />
                      )}
                      {l.label}
                    </span>
                    <span className="font-mono text-[11.5px] font-semibold tabular-nums text-white/85">{l.count}</span>
                  </button>
                )
              })}
            </div>
            <p className="border-t border-white/[0.06] px-4 py-2.5 text-[11px] text-white/50">
              Every registry station is drawn with its type icon; the dot on its corner is the EWS level (see Quick Stats).
              Block &amp; Sector counts blocks · sectors.
            </p>
          </Panel>

          <Panel>
            <PanelHeader kicker="Peta · status marker" title="Quick Stats" subtitle="Markers drawn on the map, by EWS level" />
            <div className="flex items-center gap-3 px-4 pb-4 pt-1">
              <div className="relative h-[110px] w-[110px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip {...tooltipStyle} formatter={(v) => `${v} markers`} />
                    <Pie
                      data={markerBreakdown.filter((s) => s.count > 0)}
                      dataKey="count"
                      nameKey="label"
                      innerRadius={32}
                      outerRadius={52}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {markerBreakdown
                        .filter((s) => s.count > 0)
                        .map((s) => (
                          <Cell key={s.level} fill={s.color} />
                        ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[18px] font-bold leading-none text-white">{drawnMarkers.length}</span>
                  <span className="text-[9px] uppercase tracking-wide text-white/50">markers</span>
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                {markerBreakdown.map((s) => (
                  <div key={s.level} className="flex items-center justify-between text-[12px]">
                    <span className="flex items-center gap-2 text-white/70">
                      <span className="size-2 rounded-full" style={{ background: s.color }} />
                      {s.label}
                    </span>
                    <span className="font-semibold tabular-nums text-white/85">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="border-t border-white/[0.06] px-4 py-2.5 text-[11px] text-white/50">
              Awas &amp; offline markers pulse. Click a block on the map (or a tile above) to focus it.
            </p>
          </Panel>
        </div>
      </div>

      {/* Detail block terpilih (setara "detail 1 cluster" referensi) */}
      {zone && (
        <Panel>
          <PanelHeader
            kicker="Block · detail"
            icon={LayoutGridIcon}
            title={`Detail ${zone.block}${activeSector ? ` · ${activeSector}` : ""}`}
            subtitle={`${zone.areaHa.toLocaleString("en-US")} ha · ${zone.sectors.length} sectors · ${STATIONS.filter((s) => s.block === zone.block).length} stations · status ${EWS_META[blockLevels[zone.block] ?? "normal"].label}`}
            action={
              <>
                <OpenInTwin variant="link" label="Open in twin" block={zone.block} />
                <button
                  type="button"
                  onClick={() => setDivision(ALL_BLOCKS)}
                  className="text-[11.5px] font-medium text-emerald-400 transition-colors hover:text-emerald-300"
                >
                  All blocks
                </button>
              </>
            }
          />
          <BlockDetail
            className="px-4 pb-4"
            block={zone.block}
            level={blockLevels[zone.block] ?? "normal"}
            selectedSector={activeSector}
            onSelectSector={selectSector}
          />
        </Panel>
      )}

      {/* Station directory + detail */}
      <div ref={directoryRef} className="grid scroll-mt-4 grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        <Panel>
          <PanelHeader
            kicker="Registri · stasiun"
            icon={RadioTowerIcon}
            title="Station Directory"
            subtitle={`Twin registry: ${registry.length} of ${fleet.total} estate stations${division === ALL_BLOCKS ? "" : ` · ${division}`}`}
            action={
              <>
                <button
                  type="button"
                  onClick={handleSync}
                  className="text-[11.5px] font-medium text-emerald-400 transition-colors hover:text-emerald-300"
                >
                  Sync
                </button>
                <ViewAll href="/alerts" label="Alerts" />
              </>
            }
          />

          <div className="flex flex-col gap-2 px-4 pb-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="kicker mr-1 w-12 text-white/50">Type</span>
              {(["all", ...TYPES] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  aria-pressed={typeFilter === t}
                  title={t === "all" ? "All types" : STATION_TYPE_LABEL[t]}
                  className={chipClass(typeFilter === t)}
                >
                  {t !== "all" && <span className="size-2 rounded-full" style={{ background: ASSET_TYPE_META[t].color }} />}
                  {t === "all" ? "All" : ASSET_TYPE_META[t].short}
                  <span className="tabular-nums text-white/50">{typeCount(t)}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="kicker mr-1 w-12 text-white/50">Status</span>
              {LEVEL_FILTERS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLevelFilter(l)}
                  aria-pressed={levelFilter === l}
                  className={chipClass(levelFilter === l)}
                >
                  {l !== "all" && <span className="size-2 rounded-full" style={{ background: levelColor(l) }} />}
                  {l === "all" ? "All" : levelLabel(l)}
                  <span className="tabular-nums text-white/50">{levelCount(l)}</span>
                </button>
              ))}
              <label className="ml-auto flex items-center gap-2">
                <span className="kicker text-white/50">Block</span>
                <select
                  value={division}
                  onChange={(e) => setDivision(e.target.value)}
                  className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-[11.5px] text-white/85 outline-none focus-visible:border-emerald-400/50"
                >
                  {DIVISION_OPTIONS.map((o) => (
                    <option key={o} value={o} className="bg-[#0c1612]">
                      {o}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <TableScroll>
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr>
                  <SortTh label="Code" k="code" sort={sort} onSort={onSort} />
                  <SortTh label="Type" k="type" sort={sort} onSort={onSort} />
                  <SortTh label="Block" k="block" sort={sort} onSort={onSort} />
                  <th className={tableTh}>Sector</th>
                  <th className={tableTh}>Coordinates</th>
                  <th className={cn(tableTh, "text-right")}>Reading</th>
                  <SortTh label="Status" k="level" sort={sort} onSort={onSort} />
                  <SortTh label="Last Seen" k="lastSeen" sort={sort} onSort={onSort} className="text-right" />
                  <th className={cn(tableTh, "text-right")}>Twin</th>
                </tr>
              </thead>
              <tbody>
                {directory.map((s) => {
                  const active = s.code === selectedCode
                  return (
                    <tr
                      key={s.code}
                      onClick={() => setSelectedCode(s.code)}
                      aria-selected={active}
                      className={cn(tableRow, "cursor-pointer", active && "bg-emerald-400/[0.07]")}
                    >
                      <td className={cn(tableTd, "whitespace-nowrap")}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedCode(s.code)
                          }}
                          className={cn(
                            "font-mono text-[12px] font-semibold transition-colors hover:text-emerald-300",
                            active ? "text-emerald-300" : "text-white/90"
                          )}
                        >
                          {s.code}
                        </button>
                        {s.twinId && (
                          <span className="ml-1.5 rounded border border-emerald-400/25 px-1 font-mono text-[9px] font-bold text-emerald-300/85">
                            3D
                          </span>
                        )}
                      </td>
                      <td className={cn(tableTd, "whitespace-nowrap text-white/70")}>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="size-2 rounded-full" style={{ background: ASSET_TYPE_META[s.type].color }} />
                          {STATION_TYPE_LABEL[s.type]}
                        </span>
                      </td>
                      <td className={cn(tableTd, "whitespace-nowrap text-white/75")}>{s.block}</td>
                      <td className={cn(tableTd, "whitespace-nowrap font-mono text-[11.5px] text-white/65")}>{s.sector ?? "—"}</td>
                      <td className={cn(tableTd, "whitespace-nowrap font-mono text-[11px] text-white/55")}>{formatLatLng(s.lat, s.lng)}</td>
                      <td className={cn(tableTd, "whitespace-nowrap text-right font-mono tabular-nums text-white/85")}>
                        {formatStationValue(s)}
                      </td>
                      <td className={tableTd}>
                        <EwsPill level={s.level} pulse={s.level === "awas" || s.level === "offline"} />
                      </td>
                      <td className={cn(tableTd, "whitespace-nowrap text-right")}>
                        <span className="text-white/80">{s.lastSeen}</span>
                        <span className="ml-1.5 text-[11px] text-white/50">{seenAgo(s.lastSeen)}</span>
                      </td>
                      <td className={cn(tableTd, "text-right")}>
                        <OpenInTwin asset={s.code} variant="icon" />
                      </td>
                    </tr>
                  )
                })}
                {directory.length === 0 && (
                  <tr className="border-t border-white/[0.06]">
                    <td className={cn(tableTd, "text-white/50")} colSpan={9}>
                      Tidak ada stasiun untuk filter ini
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableScroll>
        </Panel>

        <div className="grid grid-cols-1 content-start gap-4">
          <StationDetail s={selected} />

          <Panel>
            <PanelHeader
              kicker="Digital twin · 3D"
              icon={BoxIcon}
              title="Twin Coverage"
              subtitle="Registry stations modelled in the 3D scene"
              action={<OpenInTwin variant="link" label="Open twin" block={division === ALL_BLOCKS ? undefined : division} />}
            />
            <div className="px-4 pb-4">
              <div className="flex items-baseline gap-2">
                <span className="text-[24px] font-bold leading-none tabular-nums text-emerald-300">{modelled}</span>
                <span className="text-[12px] text-white/55">
                  / {registry.length} stations in 3D{registry.length ? ` · ${Math.round((modelled / registry.length) * 100)}%` : ""}
                </span>
              </div>
              <div className="mt-3 flex flex-col gap-1">
                {coverage.map((c) => (
                  <button
                    key={c.type}
                    type="button"
                    onClick={() => setTypeFilter(c.type)}
                    title={`Filter directory: ${STATION_TYPE_LABEL[c.type]}`}
                    className="grid grid-cols-[1fr_72px_36px] items-center gap-2 rounded-md px-1 py-1 text-left transition-colors hover:bg-white/[0.04]"
                  >
                    <span className="flex min-w-0 items-center gap-2 truncate text-[11.5px] text-white/75">
                      <span className="size-2 shrink-0 rounded-full" style={{ background: ASSET_TYPE_META[c.type].color }} />
                      {STATION_TYPE_LABEL[c.type]}
                    </span>
                    <span className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: c.total ? `${(c.inTwin / c.total) * 100}%` : 0, background: ASSET_TYPE_META[c.type].color }}
                      />
                    </span>
                    <span className="text-right font-mono text-[11px] tabular-nums text-white/80">
                      {c.inTwin}/{c.total}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-white/50">
                Stations without a 3D model open their block in the twin (3D badge in the directory).
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </PeatShell>
  )
}
