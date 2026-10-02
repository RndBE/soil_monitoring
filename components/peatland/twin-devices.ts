// Model mini perangkat lapangan untuk scene [[digital-twin-scene]], mengikuti foto
// "komponen utama" referensi: tiang, panel surya, kotak logger, tripod, rangka pintu air,
// mast LoRaWAN, dll. Bagian statis tiap jenis digabung jadi satu BufferGeometry berwarna
// per-vertex (satu draw call; dipakai mesh aset twin dan InstancedMesh stasiun lain).
// Bagian yang bergerak (mangkuk AWS, kamera CCTV, cincin sinyal gateway, daun pintu air,
// tabung ukur muka air) dibuat di scene. 1 unit dunia ≈ 0,5 km: ukuran sengaja dibesarkan
// supaya terbaca sebagai marker.

import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"

import type { MarkerLayer } from "@/lib/peatland/map-points"

const C = {
  pole: "#cbd5e1",
  poleDark: "#64748b",
  box: "#e5e7eb",
  panel: "#1e3a8a",
  panelCell: "#2563eb",
  frame: "#94a3b8",
  concrete: "#a8a29e",
  base: "#57534e",
  white: "#f8fafc",
  red: "#dc2626",
  dark: "#111827",
}

type Part = THREE.BufferGeometry

const tmpColor = new THREE.Color()
function paint(g: Part, hex: string): Part {
  tmpColor.set(hex)
  const n = g.attributes.position.count
  const col = new Float32Array(n * 3)
  for (let i = 0; i < n; i += 1) {
    col[i * 3] = tmpColor.r
    col[i * 3 + 1] = tmpColor.g
    col[i * 3 + 2] = tmpColor.b
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3))
  return g
}

const M = new THREE.Matrix4()
const Q = new THREE.Quaternion()
const E = new THREE.Euler()
const ONE = new THREE.Vector3(1, 1, 1)
const P = new THREE.Vector3()
const UP = new THREE.Vector3(0, 1, 0)

/** Putar (Euler) lalu geser bagian yang berpusat di titik asal. */
function at(g: Part, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): Part {
  return g.applyMatrix4(M.compose(P.set(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), ONE))
}

const box = (w: number, h: number, d: number, c: string) => paint(new THREE.BoxGeometry(w, h, d), c)
const cyl = (rt: number, rb: number, h: number, c: string, seg = 10) => paint(new THREE.CylinderGeometry(rt, rb, h, seg), c)

/** Batang silinder dari titik a ke b. */
function strut(a: [number, number, number], b: [number, number, number], r: number, c: string): Part {
  const va = new THREE.Vector3(...a)
  const vb = new THREE.Vector3(...b)
  const dir = vb.clone().sub(va)
  const g = cyl(r, r, dir.length(), c, 6)
  return g.applyMatrix4(M.compose(va.add(vb).multiplyScalar(0.5), Q.setFromUnitVectors(UP, dir.normalize()), ONE))
}

function pole(h: number, x = 0, z = 0, r = 0.055, c = C.pole): Part {
  return at(cyl(r, r * 1.25, h, c), x, h / 2, z)
}

function base(r = 0.32, h = 0.12, x = 0, z = 0): Part {
  return at(cyl(r, r * 1.08, h, C.base, 12), x, h / 2, z)
}

/** Panel surya miring (bingkai + sel + garis sel). */
function solar(x: number, y: number, z: number, w = 0.9, d = 0.62, tilt = -0.62, ry = 0): Part[] {
  const parts = [at(box(w + 0.07, 0.03, d + 0.07, C.frame), x, y - 0.025, z, tilt, ry), at(box(w, 0.04, d, C.panel), x, y, z, tilt, ry)]
  for (const k of [-1, 1]) parts.push(at(box(0.02, 0.045, d, C.panelCell), x + (k * w) / 6, y, z, tilt, ry))
  return parts
}

/** Kotak logger dengan pita warna jenis di atas. */
function logger(x: number, y: number, z: number, accent: string, w = 0.34, h = 0.42): Part[] {
  return [at(box(w, h, 0.2, C.box), x, y, z), at(box(w + 0.01, 0.07, 0.21, accent), x, y + h / 2 - 0.04, z)]
}

/** Tripod tiga kaki dari puncak (tinggi `h`) ke kaki berjari-jari `r`. */
function tripod(h: number, r: number, c = C.poleDark): Part[] {
  return [0, 1, 2].map((k) => {
    const a = (k / 3) * Math.PI * 2 + Math.PI / 6
    return strut([0, h, 0], [Math.cos(a) * r, 0, Math.sin(a) * r], 0.035, c)
  })
}

export type DeviceModel = {
  geometry: THREE.BufferGeometry
  /** Tinggi puncak perangkat (posisi callout & kepala bergerak). */
  top: number
}

function build(type: MarkerLayer, accent: string): Part[] | null {
  switch (type) {
    case "borehole":
      // Stasiun TMA referensi: casing sumur + tiang, logger, panel surya, kabel ke sumur.
      return [
        at(cyl(0.16, 0.16, 0.5, C.white), 0, 0.25, 0),
        at(cyl(0.18, 0.18, 0.08, accent), 0, 0.52, 0),
        base(0.26, 0.1, 0.95, 0),
        pole(3.3, 0.95, 0),
        ...logger(0.95, 1.5, 0.14, accent),
        ...solar(0.95, 3.38, 0, 0.9, 0.6, -0.62),
        strut([0.95, 1.3, 0.1], [0.12, 0.5, 0], 0.025, C.dark),
      ]
    case "water-station":
      // AI visual TMA + peil scale: papan skala bergaris merah, tiang kamera ber-lengan, panel surya.
      return [
        at(box(0.24, 3, 0.05, C.white), -0.85, 1.5, 0),
        ...[0.35, 0.85, 1.35, 1.85, 2.35, 2.85].map((y) => at(box(0.14, 0.07, 0.06, C.red), -0.89, y, 0)),
        ...[0.6, 1.1, 1.6, 2.1, 2.6].map((y) => at(box(0.08, 0.04, 0.06, C.dark), -0.81, y, 0)),
        base(0.26, 0.1, 0.95, 0),
        pole(3.2, 0.95, 0),
        at(box(0.7, 0.06, 0.06, C.poleDark), 0.62, 3.05, 0),
        at(box(0.34, 0.18, 0.2, C.dark), 0.28, 3.0, 0),
        at(box(0.36, 0.04, 0.22, accent), 0.28, 3.11, 0),
        ...logger(0.95, 1.4, 0.14, accent),
        ...solar(0.95, 3.5, 0, 0.8, 0.55, -0.62),
      ]
    case "rain-gauge":
      // Penakar hujan tipping bucket: corong putih di tiang pendek + panel kecil + logger.
      return [
        base(0.28, 0.12),
        pole(1.55),
        at(cyl(0.3, 0.25, 0.55, C.white, 16), 0, 1.82, 0),
        at(cyl(0.305, 0.305, 0.09, accent, 16), 0, 1.62, 0),
        at(cyl(0.22, 0.05, 0.2, C.poleDark, 16), 0, 2.02, 0),
        ...logger(0, 0.85, 0.16, accent, 0.3, 0.36),
        ...solar(0, 1.2, -0.42, 0.55, 0.38, 0.62),
      ]
    case "water-gate":
      // Pintu air: dua pilar beton, balok atas, aktuator, ulir; daun pintu dibuat di scene.
      return [
        at(box(2.3, 0.14, 0.7, C.base), 0, 0.07, 0),
        at(box(0.34, 2.5, 0.42, C.concrete), -0.78, 1.25, 0),
        at(box(0.34, 2.5, 0.42, C.concrete), 0.78, 1.25, 0),
        at(box(1.95, 0.22, 0.46, C.concrete), 0, 2.56, 0),
        at(box(0.4, 0.32, 0.32, accent), 0, 2.83, 0),
        at(cyl(0.035, 0.035, 1.3, C.dark), 0, 2.0, 0),
        ...solar(0.62, 3.05, 0, 0.6, 0.42, -0.62),
      ]
    case "peat-station":
      // Stasiun kelembapan & suhu gambut: tripod, tiang, logger, panel surya, probe ke tanah.
      return [
        ...tripod(2.0, 0.72),
        pole(2.7),
        ...logger(0, 1.35, 0.13, accent),
        ...solar(0, 2.72, 0, 0.85, 0.58, -0.62),
        strut([0.3, 0.02, 0.25], [0.3, 0.55, 0.25], 0.03, accent),
        strut([0.3, 0.55, 0.25], [0.05, 1.2, 0.1], 0.02, C.dark),
      ]
    case "subsidence":
      // Tiang subsidence: pipa putih berskala di atas dudukan beton, cincin & tutup warna jenis.
      return [
        base(0.36, 0.14),
        at(cyl(0.13, 0.13, 2.1, C.white, 12), 0, 1.19, 0),
        ...[0.65, 1.15, 1.65].map((y) => at(cyl(0.165, 0.165, 0.05, accent, 12), 0, y, 0)),
        at(cyl(0.2, 0.2, 0.16, accent, 12), 0, 2.28, 0),
      ]
    case "gateway": {
      // Mast LoRaWAN 12 m: tiga kaki meruncing + bracing, antena, kotak perangkat, dua panel surya.
      const H = 7
      const legs: [number, number][] = [0, 1, 2].map((k) => {
        const a = (k / 3) * Math.PI * 2
        return [Math.cos(a), Math.sin(a)]
      })
      const r = (y: number) => 0.5 - (0.38 * y) / H
      const parts: Part[] = [base(0.62, 0.12)]
      for (const [cx, cz] of legs) parts.push(strut([cx * r(0), 0, cz * r(0)], [cx * r(H), H, cz * r(H)], 0.04, C.pole))
      for (let y = 1; y < H; y += 1.2) {
        for (let k = 0; k < 3; k += 1) {
          const [ax, az] = legs[k]
          const [bx, bz] = legs[(k + 1) % 3]
          parts.push(strut([ax * r(y), y, az * r(y)], [bx * r(y + 0.6), y + 0.6, bz * r(y + 0.6)], 0.018, C.poleDark))
        }
      }
      for (const [dx, dz] of [
        [0.14, 0],
        [-0.08, 0.12],
        [-0.08, -0.12],
      ]) parts.push(at(cyl(0.022, 0.022, 1.1, C.white, 6), dx, H + 0.4, dz))
      parts.push(...logger(0, 1.1, 0.5, accent, 0.42, 0.5))
      parts.push(...solar(0.15, 2.4, 0.55, 0.8, 0.55, -0.62), ...solar(0.55, 2.4, -0.2, 0.8, 0.55, -0.62, -2.1))
      return parts
    }
    case "aws":
      // AWS: tripod, tiang, pelindung radiasi bertingkat, ekor angin, logger, panel surya.
      return [
        ...tripod(1.6, 0.75),
        pole(4.3, 0, 0, 0.06),
        at(box(0.7, 0.05, 0.05, C.poleDark), 0.35, 3.1, 0),
        ...[0, 1, 2, 3].map((k) => at(cyl(0.15, 0.15, 0.045, C.white, 12), 0.68, 2.95 + k * 0.07, 0)),
        at(box(0.6, 0.04, 0.04, C.poleDark), -0.1, 4.0, 0),
        at(box(0.05, 0.22, 0.16, accent), -0.38, 4.0, 0),
        ...logger(0, 1.9, 0.14, accent),
        ...solar(0, 2.5, -0.5, 0.75, 0.5, 0.62),
      ]
    case "cctv":
      // CCTV: tiang, kotak sambungan, panel surya; kepala kamera (berputar) dibuat di scene.
      return [base(0.26, 0.1), pole(2.95, 0, 0, 0.06, C.poleDark), ...logger(0, 1.2, 0.13, accent, 0.3, 0.38), ...solar(0, 2.25, -0.4, 0.62, 0.42, 0.62)]
    case "repeater":
      // Repeater / field node: tiang, kotak radio, antena, panel surya.
      return [
        base(0.24, 0.1),
        pole(2.6),
        ...logger(0, 1.55, 0.13, accent, 0.3, 0.34),
        at(cyl(0.022, 0.022, 0.95, C.white, 6), 0, 3.05, 0),
        at(cyl(0.05, 0.05, 0.08, accent, 8), 0, 2.62, 0),
        ...solar(0, 2.2, -0.36, 0.6, 0.42, 0.62),
      ]
    default:
      // Hotspot satelit: bukan perangkat; pasak kecil saja untuk stasiun yang tidak dimodelkan.
      return [pole(1.6, 0, 0, 0.04, C.poleDark), at(paint(new THREE.ConeGeometry(0.3, 0.7, 12), accent), 0, 1.9, 0)]
  }
}

const TOP: Partial<Record<MarkerLayer, number>> = {
  borehole: 3.6,
  "water-station": 3.75,
  "rain-gauge": 2.25,
  "water-gate": 3.25,
  "peat-station": 3.05,
  subsidence: 2.4,
  gateway: 7.9,
  aws: 4.65,
  cctv: 3.15,
  repeater: 3.55,
  "fire-hotspot": 2.3,
}

/** Model statis satu jenis perangkat; panggil sekali per scene (geometri wajib di-dispose). */
export function buildDevice(type: MarkerLayer, accent: string): DeviceModel | null {
  const parts = build(type, accent)
  if (!parts) return null
  // mergeGeometries butuh atribut seragam: semua primitif three punya position/normal/uv + color.
  const geometry = mergeGeometries(parts, false)
  for (const p of parts) p.dispose()
  if (!geometry) return null
  return { geometry, top: TOP[type] ?? 3 }
}
