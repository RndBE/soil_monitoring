// Titik stasiun & label block — koordinat di-generate agar BERADA DI DALAM
// polygon lahan gambut (Giam Siak Kecil), diuji point-in-polygon dengan margin tepi.
// Lihat [[lahan-gambut]]. Jangan diedit manual; regenerate bila polygon berubah.
export type MarkerKind = "normal" | "warning" | "critical" | "offline" | "gate"

// Tipe aset (layer) tiap titik. Dipakai panel "Map Layers" untuk filter marker.
// Selaras dengan key di `mapLayers` (lihat [[mock-data]]).
export type MarkerLayer =
  | "borehole"
  | "water-station"
  | "rain-gauge"
  | "water-gate"
  | "peat-station"
  | "fire-hotspot"

export const markerPoints: {
  id: string
  kind: MarkerKind
  layer: MarkerLayer
  block: string
  lat: number
  lng: number
}[] = [
  { "id": "m1", "kind": "warning", "layer": "water-station", "block": "Block A", "lat": 0.98476, "lng": 101.84802 },
  { "id": "m2", "kind": "normal", "layer": "borehole", "block": "Block A", "lat": 1.1032, "lng": 101.84802 },
  { "id": "m3", "kind": "normal", "layer": "rain-gauge", "block": "Block B", "lat": 1.07688, "lng": 101.7113 },
  { "id": "m4", "kind": "warning", "layer": "water-station", "block": "Block B", "lat": 1.11636, "lng": 101.58978 },
  { "id": "m5", "kind": "critical", "layer": "borehole", "block": "Block C", "lat": 1.05056, "lng": 101.77207 },
  { "id": "m6", "kind": "critical", "layer": "borehole", "block": "Block C", "lat": 1.28743, "lng": 101.52901 },
  { "id": "m7", "kind": "gate", "layer": "water-gate", "block": "Block A", "lat": 1.01108, "lng": 101.80245 },
  { "id": "m8", "kind": "critical", "layer": "peat-station", "block": "Block D", "lat": 1.24795, "lng": 101.62016 },
  { "id": "m9", "kind": "gate", "layer": "water-gate", "block": "Block C", "lat": 1.0374, "lng": 101.84802 },
  { "id": "m10", "kind": "normal", "layer": "rain-gauge", "block": "Block E", "lat": 1.14268, "lng": 101.7265 },
  { "id": "m11", "kind": "offline", "layer": "water-station", "block": "Block D", "lat": 1.169, "lng": 101.5594 },
  { "id": "m12", "kind": "warning", "layer": "peat-station", "block": "Block D", "lat": 1.34007, "lng": 101.52901 },
  { "id": "m13", "kind": "gate", "layer": "water-gate", "block": "Block D", "lat": 1.27427, "lng": 101.48344 },
  { "id": "m14", "kind": "warning", "layer": "fire-hotspot", "block": "Block D", "lat": 1.22163, "lng": 101.54421 },
  { "id": "m15", "kind": "critical", "layer": "fire-hotspot", "block": "Block D", "lat": 1.26111, "lng": 101.57459 },
  { "id": "m16", "kind": "normal", "layer": "peat-station", "block": "Block E", "lat": 1.18216, "lng": 101.66573 },
  { "id": "m17", "kind": "warning", "layer": "rain-gauge", "block": "Block B", "lat": 1.09004, "lng": 101.80245 },
]

export const blockPoints: { label: string; lat: number; lng: number }[] = [
  { "label": "Block A", "lat": 1.32691, "lng": 101.48344 },
  { "label": "Block C", "lat": 1.02424, "lng": 101.8936 },
  { "label": "Block E", "lat": 1.12952, "lng": 101.63535 },
  { "label": "Block E", "lat": 1.12952, "lng": 101.77207 },
]

// Jaringan kanal — polyline yang menghubungkan titik-titik (semua sudah terjamin
// di dalam polygon) sebagai waypoint, sehingga garis kanal ikut berada di dalam
// kawasan. Tiap segmen = [lat, lng]. Dipakai layer "canal".
export const canalLines: [number, number][][] = [
  // Kanal barat (mengikuti deretan stasiun sisi barat)
  [
    [1.27427, 101.48344],
    [1.28743, 101.52901],
    [1.26111, 101.57459],
    [1.22163, 101.54421],
    [1.169, 101.5594],
    [1.11636, 101.58978],
  ],
  // Kanal tengah
  [
    [1.24795, 101.62016],
    [1.18216, 101.66573],
    [1.14268, 101.7265],
    [1.07688, 101.7113],
    [1.05056, 101.77207],
  ],
  // Kanal timur
  [
    [1.1032, 101.84802],
    [1.09004, 101.80245],
    [1.0374, 101.84802],
    [1.01108, 101.80245],
    [0.98476, 101.84802],
  ],
]
