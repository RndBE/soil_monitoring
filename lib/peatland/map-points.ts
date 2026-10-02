// Titik stasiun & label block — koordinat di-generate agar BERADA DI DALAM
// wilayah block-nya (lihat [[block-zones]]), minimal ~1,8 km dari tepi block.
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
  | "subsidence"
  | "cctv"
  | "gateway"
  | "repeater"
  | "aws"

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
  { "id": "m3", "kind": "normal", "layer": "rain-gauge", "block": "Block B", "lat": 1.13948, "lng": 101.68145 },
  { "id": "m4", "kind": "warning", "layer": "water-station", "block": "Block B", "lat": 1.11636, "lng": 101.58978 },
  { "id": "m5", "kind": "critical", "layer": "borehole", "block": "Block C", "lat": 1.32525, "lng": 101.47977 },
  { "id": "m6", "kind": "critical", "layer": "borehole", "block": "Block C", "lat": 1.28743, "lng": 101.52901 },
  { "id": "m7", "kind": "gate", "layer": "water-gate", "block": "Block A", "lat": 1.01108, "lng": 101.80245 },
  { "id": "m8", "kind": "critical", "layer": "peat-station", "block": "Block D", "lat": 1.24795, "lng": 101.62016 },
  { "id": "m9", "kind": "gate", "layer": "water-gate", "block": "Block C", "lat": 1.30951, "lng": 101.50676 },
  { "id": "m10", "kind": "normal", "layer": "rain-gauge", "block": "Block E", "lat": 1.14268, "lng": 101.7265 },
  { "id": "m11", "kind": "offline", "layer": "water-station", "block": "Block D", "lat": 1.169, "lng": 101.5594 },
  { "id": "m12", "kind": "warning", "layer": "peat-station", "block": "Block D", "lat": 1.18896, "lng": 101.61457 },
  { "id": "m13", "kind": "gate", "layer": "water-gate", "block": "Block D", "lat": 1.22043, "lng": 101.60333 },
  { "id": "m14", "kind": "warning", "layer": "fire-hotspot", "block": "Block D", "lat": 1.22163, "lng": 101.54421 },
  { "id": "m15", "kind": "critical", "layer": "fire-hotspot", "block": "Block D", "lat": 1.19345, "lng": 101.54486 },
  { "id": "m16", "kind": "normal", "layer": "peat-station", "block": "Block E", "lat": 1.05575, "lng": 101.76411 },
  { "id": "m17", "kind": "warning", "layer": "rain-gauge", "block": "Block B", "lat": 1.18445, "lng": 101.66571 },
  { "id": "m18", "kind": "normal", "layer": "aws", "block": "Block B", "lat": 1.11677, "lng": 101.66189 },
  { "id": "m19", "kind": "normal", "layer": "gateway", "block": "Block A", "lat": 1.05945, "lng": 101.82303 },
  { "id": "m20", "kind": "normal", "layer": "gateway", "block": "Block B", "lat": 1.15454, "lng": 101.69967 },
  { "id": "m21", "kind": "normal", "layer": "gateway", "block": "Block C", "lat": 1.2787, "lng": 101.49394 },
  { "id": "m22", "kind": "normal", "layer": "gateway", "block": "Block D", "lat": 1.16579, "lng": 101.59995 },
  { "id": "m23", "kind": "normal", "layer": "gateway", "block": "Block E", "lat": 1.12207, "lng": 101.78323 },
  { "id": "m24", "kind": "normal", "layer": "cctv", "block": "Block C", "lat": 1.31468, "lng": 101.52992 },
  { "id": "m25", "kind": "normal", "layer": "cctv", "block": "Block D", "lat": 1.23099, "lng": 101.5986 },
]

// Satu label per block, di titik terdalam wilayah block (= BLOCK_ZONES[].label).
export const blockPoints: { label: string; lat: number; lng: number }[] = [
  { "label": "Block A", "lat": 1.04506, "lng": 101.85002 },
  { "label": "Block B", "lat": 1.14195, "lng": 101.66189 },
  { "label": "Block C", "lat": 1.30389, "lng": 101.51913 },
  { "label": "Block D", "lat": 1.19997, "lng": 101.57837 },
  { "label": "Block E", "lat": 1.09869, "lng": 101.75804 },
]

// Rantai relay data antar sensor twin (lintasan terpendek per wilayah). Tiap titik
// = [lat, lng] sebuah sensor. Dipakai link data di scene Digital Twin dan hitungan
// layer "canal" di Map View.
export const canalLines: [number, number][][] = [
  // Rantai barat laut (m5 → m9 → m6 → m14 → m15 → m11 → m12 → m13 → m8)
  [
    [1.32525, 101.47977],
    [1.30951, 101.50676],
    [1.28743, 101.52901],
    [1.22163, 101.54421],
    [1.19345, 101.54486],
    [1.169, 101.5594],
    [1.18896, 101.61457],
    [1.22043, 101.60333],
    [1.24795, 101.62016],
  ],
  // Rantai tengah (m4 → m17 → m3 → m10 → m16)
  [
    [1.11636, 101.58978],
    [1.18445, 101.66571],
    [1.13948, 101.68145],
    [1.14268, 101.7265],
    [1.05575, 101.76411],
  ],
  // Rantai tenggara (m2 → m7 → m1)
  [
    [1.1032, 101.84802],
    [1.01108, 101.80245],
    [0.98476, 101.84802],
  ],
]
