import { lahanGambut } from "./lahan-gambut"
import { waterways } from "./waterways"

// Garis OSM yang jauh dari kawasan (Sungai Mandau di barat daya, jaringan parit pesisir
// di timur laut — semuanya > 16 km dari batas KHG) tidak digambar; yang tersisa berjarak
// ≤ 11 km. Jarak kasar: vertex garis ke vertex batas, dihitung sekali saat modul dimuat.
// Dipakai peta 2D (Overview, Map View) dan scene Digital Twin.
const NEAR_BOUNDARY_KM = 12
const KM_PER_DEG = 111.32
const COS_LAT = Math.cos((1.16 * Math.PI) / 180)
const boundaryPts = lahanGambut.features[0].geometry.coordinates[0]

const nearBoundary = (coords: [number, number][]) =>
  coords.some(([lng, lat]) =>
    boundaryPts.some(
      ([bLng, bLat]) => Math.hypot((lng - bLng) * COS_LAT, lat - bLat) * KM_PER_DEG <= NEAR_BOUNDARY_KM
    )
  )

export const estateWaterways = waterways.filter((w) => w.inside || nearBoundary(w.coords))
