"use client"

// Scene three.js digital twin estate gambut. Polanya mengikuti twin Beacon
// Command Center (beacon-compro: demo-dashboard/twin/scene.ts): tanah = satu
// bidang citra satelit ber-shader dengan mask kawasan, "tirai" batas, pita kanal
// beraliran, pin sensor ber-halo, sel cuaca per penakar hujan, dan patch citra
// z14 saat kamera mendekat. Imperatif: halaman memegang state, props diteruskan
// lewat apiRef.

import { useEffect, useLayoutEffect, useRef } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js"
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js"
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js"
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js"
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js"
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js"

import {
  ASSET_TYPE_META,
  LIVE_GATE_OPENING,
  TWIN_ASSETS,
  TWIN_BLOCKS,
  WT_COMPLIANCE,
  WT_CRITICAL,
  WT_FLOOD,
  clamp,
  fireRiskIndex,
  rampColor,
  type EwsLevel,
  type TwinAsset,
  type TwinFrame,
  type TwinLayer,
} from "@/lib/peatland/digital-twin"
import { matchesBlock } from "@/lib/peatland/filter-logic"
import { lahanGambut } from "@/lib/peatland/lahan-gambut"
import { canalLines } from "@/lib/peatland/map-points"
import { waterways } from "@/lib/peatland/waterways"

export type TwinOverlays = {
  imagery: boolean
  canals: boolean
  zones: boolean
  theme: boolean
  rain: boolean
  links: boolean
  labels: boolean
  /** Efek pendar (bloom) seperti twin referensi. */
  bloom: boolean
}
/** Perintah kamera: utara, reset, fokus ke aset (`id` = m1..m17) atau ke block (`id` = "Block C"). */
export type TwinView = { mode: "north" | "reset" | "focus" | "block"; nonce: number; id?: string }
/** Teks, level EWS, dan nilai numerik (muka air untuk tabung ukur) per callout. */
export type TwinCallout = { text: string; level: EwsLevel | "offline"; value?: number | null }
/** Cuaca di atas penakar hujan: ok = cerah, warn = gerimis, alarm = deras. */
export type TwinWeather = "ok" | "warn" | "alarm"
type SceneProps = {
  frame: TwinFrame
  layer: TwinLayer
  overlays: TwinOverlays
  night: boolean
  division: string
  selectedId: string | null
  autoRotate: boolean
  view: TwinView
  callouts: Record<string, TwinCallout>
  weather: Record<string, TwinWeather>
  monoFont: string
  onSelect: (assetId: string) => void
  /** Dipanggil tiap frame dengan azimut kamera (derajat) untuk jarum kompas. */
  onAzimuth?: (deg: number) => void
  /** Progres pemuatan tile citra satelit. */
  onTiles?: (loaded: number, total: number) => void
  /** Pengguna mulai memutar/menggeser kamera (rotasi otomatis dimatikan). */
  onUserOrbit?: () => void
  /** Id aset yang labelnya tampil (null = semua); aset terpilih selalu tampil. */
  labelIds?: string[] | null
}

// Skala dunia: lebar kawasan ≈ 100 unit (1 unit ≈ 0,5 km).
const WIDTH = 100
// Kamera dari barat daya, elevasi ~38° seperti twin referensi: sumbu panjang kawasan
// (barat laut → tenggara) tampil mendatar, sisi jauh memudar ke latar.
const HOME_DIR = new THREE.Vector3(-0.56, 0.62, 0.56).normalize()
const LOOK_AT = new THREE.Vector3(-8, 0, 2)
// Area aman layar (NDC) untuk framing awal: sisakan ruang HUD kanan & timeline bawah.
const FIT_BOX = { x0: -0.96, x1: 0.92, y0: -0.56, y1: 0.72 }

const TILE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile"
const TILE_ZOOM = 12
const TILE_MARGIN = 0.07
const PATCH_Z = 14
const PATCH_N = 5

const BG = "#040d09"
const CURTAIN_H = 1.8
const GRID_STEP = 10
const DRAPE_W = 220
const FIELD_W = 560
/** Durasi (detik) data drape mengejar frame baru. */
const FRAME_TWEEN = 0.3
// Tabung ukur borehole: atas = permukaan (0 cm), bawah = -100 cm.
const GAUGE_H = 4
const GAUGE_RANGE = 100
const RAIN_H = 8.5
/** Rentang jarak ke sungai yang disimpan di tekstur field (unit dunia, ~4 km). */
const DIST_MAX = 8
/** Jangkauan genangan dari sungai saat banjir penuh (unit dunia, ~2,5 km). */
const FLOOD_WIDTH = 5
const LABEL_SHIFTS = [0, -26, -52, -78]

const STATUS_HEX: Record<EwsLevel | "offline", string> = {
  normal: "#46d78f",
  waspada: "#ffd27a",
  siaga: "#ffb454",
  awas: "#ff7a66",
  offline: "#64748b",
}

const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2)

type Ring = [number, number][]

/** Douglas-Peucker untuk ring [lng, lat]. */
function simplify(pts: Ring, tol: number): Ring {
  if (pts.length < 3) return pts
  const keep = new Uint8Array(pts.length)
  keep[0] = keep[pts.length - 1] = 1
  const stack: [number, number][] = [[0, pts.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()!
    const [ax, ay] = pts[a]
    const [bx, by] = pts[b]
    const dx = bx - ax
    const dy = by - ay
    const len2 = dx * dx + dy * dy || 1e-18
    let maxD = 0
    let idx = -1
    for (let i = a + 1; i < b; i += 1) {
      const [px, py] = pts[i]
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2))
      const d = (ax + t * dx - px) ** 2 + (ay + t * dy - py) ** 2
      if (d > maxD) {
        maxD = d
        idx = i
      }
    }
    if (idx >= 0 && maxD > tol * tol) {
      keep[idx] = 1
      stack.push([a, idx], [idx, b])
    }
  }
  return pts.filter((_, i) => keep[i])
}

function pointInRing(x: number, z: number, ring: [number, number][]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i]
    const [xj, zj] = ring[j]
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside
  }
  return inside
}

const DEG = Math.PI / 180
const tileX = (lng: number, z: number) => ((lng + 180) / 360) * 2 ** z
const tileY = (lat: number, z: number) => ((1 - Math.log(Math.tan(lat * DEG) + 1 / Math.cos(lat * DEG)) / Math.PI) / 2) * 2 ** z
const tileLng = (x: number, z: number) => (x / 2 ** z) * 360 - 180
const tileLat = (y: number, z: number) => Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** z))) / DEG

const NOISE_GLSL = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }`

function levelClass(level: EwsLevel | "offline"): string {
  if (level === "offline") return "twin-label--off"
  if (level === "awas") return "twin-label--alarm"
  if (level === "siaga") return "twin-label--warn"
  if (level === "waspada") return "twin-label--waspada"
  return ""
}

export default function DigitalTwinScene(props: SceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const propsRef = useRef(props)
  useLayoutEffect(() => {
    propsRef.current = props
  })
  const apiRef = useRef<{
    refreshState: () => void
    refreshCallouts: () => void
    select: (id: string | null) => void
    setAutoRotate: (on: boolean) => void
    setView: (view: TwinView) => void
  } | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let disposed = false
    const disposables: { dispose(): void }[] = []
    const track = <T extends { dispose(): void }>(o: T) => (disposables.push(o), o)

    // --- Proyeksi lat/lng → bidang x/z ------------------------------------
    const lngLat = (lahanGambut.features[0].geometry.coordinates[0] as number[][]).map(([a, b]) => [a, b] as [number, number])
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity
    for (const [lng, lat] of lngLat) {
      minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng)
      minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat)
    }
    const lat0 = (minLat + maxLat) / 2
    const lng0 = (minLng + maxLng) / 2
    const kx = Math.cos(lat0 * DEG)
    const scale = WIDTH / ((maxLng - minLng) * kx)
    const project = (lng: number, lat: number): [number, number] => [(lng - lng0) * kx * scale, -(lat - lat0) * scale]
    const unproject = (x: number, z: number) => ({ lng: x / (kx * scale) + lng0, lat: -z / scale + lat0 })

    const boundaryLngLat = simplify(lngLat, 0.0012)
    const ring = lngLat.map(([lng, lat]) => project(lng, lat))
    const xMin = project(minLng, lat0)[0]
    const xMax = project(maxLng, lat0)[0]
    const zMin = project(lng0, maxLat)[1]
    const zMax = project(lng0, minLat)[1]
    const canals = canalLines.map((line) => line.map(([lat, lng]) => project(lng, lat)))
    const assetsXZ = TWIN_ASSETS.map((a) => ({ asset: a, xz: project(a.lng, a.lat) }))

    // --- Renderer, kamera, kontrol -------------------------------------------
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    // Catatan: kualitas adaptif di loop bisa menurunkan pixel ratio ini (lihat `quality`).
    renderer.outputColorSpace = THREE.SRGBColorSpace
    // Sama seperti twin referensi: canvas di luar alur dokumen (absolute, memenuhi wadah).
    renderer.domElement.style.position = "absolute"
    renderer.domElement.style.inset = "0"
    renderer.domElement.style.display = "block"
    renderer.domElement.style.cursor = "grab"
    container.appendChild(renderer.domElement)

    const labelRenderer = new CSS2DRenderer()
    labelRenderer.domElement.style.position = "absolute"
    labelRenderer.domElement.style.inset = "0"
    labelRenderer.domElement.style.zIndex = "3"
    labelRenderer.domElement.style.pointerEvents = "none"
    container.appendChild(labelRenderer.domElement)

    const scene = new THREE.Scene()
    const bg = new THREE.Color(BG)
    scene.background = bg

    const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 1000)
    let home = { pos: LOOK_AT.clone().addScaledVector(HOME_DIR, 150), tgt: LOOK_AT.clone() }

    // Bloom setelan twin referensi: resolusi rendah, hanya bagian paling terang yang berpendar.
    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    // Satu piksel NaN/Inf di buffer HDR (mis. pow() dengan argumen negatif di tepi pita) menyebar lewat
    // blur bloom menjadi blok hitam; clamp membuang nilai itu sebelum bloom (max(NaN, 0) = 0 di GPU).
    composer.addPass(
      new ShaderPass({
        uniforms: { tDiffuse: { value: null } },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform sampler2D tDiffuse;
          varying vec2 vUv;
          void main() { gl_FragColor = clamp(texture2D(tDiffuse, vUv), 0.0, 64.0); }`,
      }),
    )
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.38, 0.62))
    composer.addPass(new OutputPass())
    track(composer)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.copy(LOOK_AT)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = 8
    controls.maxDistance = 320
    controls.minPolarAngle = 0.12
    controls.maxPolarAngle = 1.3
    controls.zoomToCursor = true
    controls.autoRotateSpeed = 0.35
    controls.autoRotate = propsRef.current.autoRotate
    let userMoved = false
    let fly: { t0: number; dur: number; p0: THREE.Vector3; p1: THREE.Vector3; t0v: THREE.Vector3; t1v: THREE.Vector3 } | null = null
    controls.addEventListener("start", () => {
      controls.autoRotate = false
      userMoved = true
      fly = null
      propsRef.current.onUserOrbit?.()
    })

    // --- Tanah: citra satelit + mask kawasan (shader) ------------------------
    const trX0 = Math.floor(tileX(minLng - TILE_MARGIN, TILE_ZOOM))
    const trX1 = Math.floor(tileX(maxLng + TILE_MARGIN, TILE_ZOOM))
    const trY0 = Math.floor(tileY(maxLat + TILE_MARGIN, TILE_ZOOM))
    const trY1 = Math.floor(tileY(minLat - TILE_MARGIN, TILE_ZOOM))
    const gWest = tileLng(trX0, TILE_ZOOM)
    const gEast = tileLng(trX1 + 1, TILE_ZOOM)
    const gNorth = tileLat(trY0, TILE_ZOOM)
    const gSouth = tileLat(trY1 + 1, TILE_ZOOM)
    const [nwX, nwZ] = project(gWest, gNorth)
    const [seX, seZ] = project(gEast, gSouth)
    const groundW = seX - nwX
    const groundD = seZ - nwZ

    const tilesX = trX1 - trX0 + 1
    const tilesY = trY1 - trY0 + 1
    const imgCanvas = document.createElement("canvas")
    imgCanvas.width = tilesX * 256
    imgCanvas.height = tilesY * 256
    const imgCtx = imgCanvas.getContext("2d")!
    imgCtx.fillStyle = "#15231c"
    imgCtx.fillRect(0, 0, imgCanvas.width, imgCanvas.height)
    const imgTex = track(new THREE.CanvasTexture(imgCanvas))
    imgTex.colorSpace = THREE.SRGBColorSpace
    imgTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
    let imgDirty = false
    let imgLoaded = 0
    const imgTotal = tilesX * tilesY
    let tilesChanged = true
    const pendingImages: HTMLImageElement[] = []
    for (let ty = trY0; ty <= trY1; ty += 1) {
      for (let tx = trX0; tx <= trX1; tx += 1) {
        const im = new Image()
        im.crossOrigin = "anonymous"
        im.decoding = "async"
        const done = () => {
          imgLoaded += 1
          tilesChanged = true
        }
        im.onload = () => {
          if (disposed) return
          imgCtx.drawImage(im, (tx - trX0) * 256, (ty - trY0) * 256)
          imgDirty = true
          groundUniforms.uHasMap.value = 1
          done()
        }
        im.onerror = done
        im.src = `${TILE_URL}/${TILE_ZOOM}/${ty}/${tx}`
        pendingImages.push(im)
      }
    }

    // Jarak (piksel) ke garis yang digambar `draw`, lewat rasterisasi kanvas + chamfer 2 lintasan.
    // Baris 0 = sisi utara (atas kanvas).
    const distanceField = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
      const cv = document.createElement("canvas")
      cv.width = w
      cv.height = h
      const cx = cv.getContext("2d", { willReadFrequently: true })!
      cx.strokeStyle = "#fff"
      cx.lineWidth = 1.5
      cx.lineCap = "round"
      cx.lineJoin = "round"
      draw(cx)
      const data = cx.getImageData(0, 0, w, h).data
      const d = new Float32Array(w * h)
      for (let k = 0; k < d.length; k += 1) d[k] = data[k * 4 + 3] > 60 ? 0 : 1e9
      const relax = (k: number, n: number, c: number) => {
        if (d[n] + c < d[k]) d[k] = d[n] + c
      }
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          const k = y * w + x
          if (x > 0) relax(k, k - 1, 1)
          if (y > 0) {
            relax(k, k - w, 1)
            if (x > 0) relax(k, k - w - 1, Math.SQRT2)
            if (x < w - 1) relax(k, k - w + 1, Math.SQRT2)
          }
        }
      }
      for (let y = h - 1; y >= 0; y -= 1) {
        for (let x = w - 1; x >= 0; x -= 1) {
          const k = y * w + x
          if (x < w - 1) relax(k, k + 1, 1)
          if (y < h - 1) {
            relax(k, k + w, 1)
            if (x < w - 1) relax(k, k + w + 1, Math.SQRT2)
            if (x > 0) relax(k, k + w - 1, Math.SQRT2)
          }
        }
      }
      return d
    }
    const strokeLines = (ctx: CanvasRenderingContext2D, lines: [number, number][][], toPx: (lng: number, lat: number) => [number, number]) => {
      ctx.beginPath()
      for (const line of lines) {
        line.forEach(([lng, lat], i) => {
          const [px, py] = toPx(lng, lat)
          if (i) ctx.lineTo(px, py)
          else ctx.moveTo(px, py)
        })
      }
      ctx.stroke()
    }
    const riverLines = waterways.filter((w) => w.kind === "river" || w.kind === "stream").map((w) => w.coords)
    const drainLines = waterways.filter((w) => w.kind !== "river" && w.kind !== "stream").map((w) => w.coords)

    // Mask "di dalam kawasan" pada grid tanah (baris DataTexture 0 = selatan).
    const FH = Math.round((FIELD_W * groundD) / groundW)
    const scratch = document.createElement("canvas")
    scratch.width = FIELD_W
    scratch.height = FH
    const sctx = scratch.getContext("2d", { willReadFrequently: true })!
    sctx.fillStyle = "#fff"
    sctx.beginPath()
    lngLat.forEach(([lng, lat], i) => {
      const px = ((lng - gWest) / (gEast - gWest)) * FIELD_W
      const py = ((gNorth - lat) / (gNorth - gSouth)) * FH
      if (i) sctx.lineTo(px, py)
      else sctx.moveTo(px, py)
    })
    sctx.closePath()
    sctx.fill()
    const insideData = sctx.getImageData(0, 0, FIELD_W, FH).data
    // G = jarak ke sungai (untuk genangan), dinormalisasi ke DIST_MAX.
    const fieldPx = groundW / FIELD_W
    const riverDist = distanceField(FIELD_W, FH, (ctx) =>
      strokeLines(ctx, riverLines, (lng, lat) => [((lng - gWest) / (gEast - gWest)) * FIELD_W, ((gNorth - lat) / (gNorth - gSouth)) * FH]),
    )
    const fieldBytes = new Uint8Array(FIELD_W * FH * 4)
    for (let y = 0; y < FH; y += 1) {
      const row = FH - 1 - y
      for (let x = 0; x < FIELD_W; x += 1) {
        const o = (row * FIELD_W + x) * 4
        fieldBytes[o] = insideData[(y * FIELD_W + x) * 4 + 3]
        fieldBytes[o + 1] = Math.round(clamp((riverDist[y * FIELD_W + x] * fieldPx) / DIST_MAX, 0, 1) * 255)
        fieldBytes[o + 3] = 255
      }
    }
    const fieldTex = track(new THREE.DataTexture(fieldBytes, FIELD_W, FH, THREE.RGBAFormat))
    fieldTex.magFilter = fieldTex.minFilter = THREE.LinearFilter
    fieldTex.needsUpdate = true

    const groundUniforms = {
      uMap: { value: imgTex as THREE.Texture },
      uHasMap: { value: 0 },
      uImagery: { value: 1 },
      uNatural: { value: 1 },
      uIsPatch: { value: 0 },
      uFade: { value: 1 },
      uGround: { value: new THREE.Vector4(nwX, nwZ, groundW, groundD) },
      uField: { value: fieldTex },
      uGridStep: { value: GRID_STEP },
      uDeep: { value: new THREE.Color("#03110b") },
      uMid: { value: new THREE.Color("#0f3a2a") },
      uHi: { value: new THREE.Color("#6fd6a8") },
      uGrid: { value: new THREE.Color("#2dd4a0") },
      uBg: { value: bg },
      uCloud: { value: 0.9 },
      uTime: { value: 0 },
      uFlood: { value: 0 },
      uWaterA: { value: new THREE.Color("#0b3f73") },
      uWaterB: { value: new THREE.Color("#5cc8f0") },
    }
    const groundVert = /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorld;
      void main() {
        vUv = uv;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`
    const groundFrag = /* glsl */ `
      uniform sampler2D uMap, uField;
      uniform float uHasMap, uImagery, uNatural, uIsPatch, uFade, uGridStep, uCloud, uTime, uFlood;
      uniform vec4 uGround;
      uniform vec3 uDeep, uMid, uHi, uGrid, uBg, uWaterA, uWaterB;
      varying vec2 vUv;
      varying vec3 vWorld;
      const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
      ${NOISE_GLSL}
      void main() {
        vec2 fuv = vec2((vWorld.x - uGround.x) / uGround.z, 1.0 - (vWorld.z - uGround.y) / uGround.w);
        vec4 field = texture2D(uField, fuv);
        float inside = field.r;
        vec4 texel = texture2D(uMap, vUv);
        vec3 img = texel.rgb;
        // Patch: piksel tile yang belum termuat berwarna hitam & transparan. Filter bilinear/mipmap
        // mencampurnya dengan tepi tile yang sudah termuat sehingga jadi blok gelap setengah
        // transparan; bagi dengan alpha untuk mengembalikan warna aslinya.
        if (uIsPatch > 0.5) img = min(texel.rgb / max(texel.a, 0.02), vec3(1.0));
        // Peredam awan: piksel terang & tak berwarna (awan) ditarik ke warna lahan sekitar.
        float cMax = max(img.r, max(img.g, img.b));
        float cMin = min(img.r, min(img.g, img.b));
        float cloud = smoothstep(0.4, 0.68, dot(img, LUMA)) * (1.0 - smoothstep(0.08, 0.22, cMax - cMin));
        img = mix(img, vec3(0.1, 0.14, 0.08), cloud * uCloud);
        float has = uHasMap * uImagery;
        float fallback = 0.35 + 0.2 * noise(vWorld.xz * 0.09) + 0.1 * noise(vWorld.xz * 0.5);

        // Malam: luminans citra dipetakan ke palet emerald gelap.
        float lum = clamp((pow(dot(img, LUMA), 0.45) - 0.1) / 0.34, 0.0, 1.0);
        lum = mix(fallback, lum, has);
        vec3 tint = mix(uDeep, uMid, smoothstep(0.0, 0.55, lum));
        tint = mix(tint, uHi, smoothstep(0.55, 1.0, lum));
        vec3 night = mix(tint * 0.3 + uDeep * 0.45, tint * 1.15, inside);

        // Natural: warna asli, sedikit didinginkan agar menyatu dengan UI.
        // Hutan gambut di citra cenderung gelap: diangkat sedikit (gamma) agar terbaca.
        // Kurva lembut (Reinhard) supaya awan putih tidak terbakar saat citra diterangkan.
        vec3 nat = pow(mix(vec3(dot(img, LUMA)), img, 0.95), vec3(0.78)) * vec3(0.95, 1.04, 1.0) * 1.55;
        nat = nat / (1.0 + 0.38 * nat);
        nat = mix(uDeep + uMid * fallback * 0.6, nat, has);
        vec3 outsideNat = mix(vec3(dot(nat, LUMA)), nat, 0.72) * 0.82 + uDeep * 0.05;
        vec3 natural = mix(outsideNat, nat, inside);

        vec3 col = mix(night, natural, uNatural);

        vec2 gp = vWorld.xz / uGridStep;
        vec2 gd = abs(fract(gp - 0.5) - 0.5) / fwidth(gp);
        float line = 1.0 - min(min(gd.x, gd.y), 1.0);
        col += uGrid * line * (0.025 + 0.05 * inside) * (1.0 - 0.55 * uNatural);

        // Genangan menyebar dari sungai saat hujan tinggi (seperti simulasi banjir referensi).
        if (uFlood > 0.01) {
        float dist = field.g * ${DIST_MAX.toFixed(1)};
        float reach = uFlood * ${FLOOD_WIDTH.toFixed(1)};
        float fn = (noise(vWorld.xz * 0.55) - 0.5) * 1.2 + (noise(vWorld.xz * 2.2) - 0.5) * 0.45;
        float front = reach - dist + fn * min(reach, 1.2);
        float wet = smoothstep(0.0, 0.35, front) * step(0.05, reach) * max(inside, 0.35);
        float ripple = 0.5 + 0.5 * sin(uTime * 1.7 + vWorld.x * 2.1 + vWorld.z * 1.3 + noise(vWorld.xz * 1.1) * 6.0);
        vec3 water = mix(uWaterA, uWaterB, 0.18 + ripple * 0.3);
        float rim = smoothstep(0.35, 0.0, abs(front - 0.18)) * step(0.05, reach) * max(inside, 0.35);
        col = mix(col, water, wet * 0.7);
        col += uWaterB * rim * 0.22;
        }

        float e = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
        float alpha = 1.0;
        if (uIsPatch > 0.5) alpha = texel.a * smoothstep(0.0, 0.14, e) * uFade * uImagery;
        else col = mix(uBg, col, smoothstep(0.0, 0.08, e));
        gl_FragColor = vec4(col, alpha);
      }`
    const groundMat = track(new THREE.ShaderMaterial({ uniforms: groundUniforms, vertexShader: groundVert, fragmentShader: groundFrag }))
    const ground = new THREE.Mesh(track(new THREE.PlaneGeometry(groundW, groundD, 1, 1)), groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.set((nwX + seX) / 2, 0, (nwZ + seZ) / 2)
    scene.add(ground)

    // --- Patch citra z14 di sekitar titik orbit (muncul saat kamera mendekat) --
    const patchCanvas = document.createElement("canvas")
    patchCanvas.width = patchCanvas.height = PATCH_N * 256
    const pctx = patchCanvas.getContext("2d")!
    const patchTex = track(new THREE.CanvasTexture(patchCanvas))
    patchTex.colorSpace = THREE.SRGBColorSpace
    patchTex.anisotropy = imgTex.anisotropy
    const patchMat = track(
      new THREE.ShaderMaterial({
        uniforms: { ...groundUniforms, uMap: { value: patchTex }, uIsPatch: { value: 1 }, uFade: { value: 0 } },
        vertexShader: groundVert,
        fragmentShader: groundFrag,
        transparent: true,
        depthWrite: false,
      }),
    )
    const patch = new THREE.Mesh(track(new THREE.PlaneGeometry(1, 1)), patchMat)
    patch.rotation.x = -Math.PI / 2
    patch.renderOrder = -1
    patch.visible = false
    scene.add(patch)
    let patchAt: { x: number; y: number } | null = null
    let patchImgs: HTMLImageElement[] = []
    let patchDirty = false

    const loadPatch = (cx: number, cy: number) => {
      const x0 = cx - (PATCH_N >> 1)
      const y0 = cy - (PATCH_N >> 1)
      for (const im of patchImgs) im.onload = null
      patchImgs = []
      // Bagian yang tumpang tindih dengan patch lama dipertahankan agar tidak berkedip.
      if (patchAt) {
        const copy = document.createElement("canvas")
        copy.width = copy.height = patchCanvas.width
        copy.getContext("2d")!.drawImage(patchCanvas, 0, 0)
        pctx.clearRect(0, 0, patchCanvas.width, patchCanvas.height)
        pctx.drawImage(copy, (patchAt.x - (PATCH_N >> 1) - x0) * 256, (patchAt.y - (PATCH_N >> 1) - y0) * 256)
      }
      patchAt = { x: cx, y: cy }
      const [ax, az] = project(tileLng(x0, PATCH_Z), tileLat(y0, PATCH_Z))
      const [bx, bz] = project(tileLng(x0 + PATCH_N, PATCH_Z), tileLat(y0 + PATCH_N, PATCH_Z))
      patch.position.set((ax + bx) / 2, 0.012, (az + bz) / 2)
      patch.scale.set(bx - ax, bz - az, 1)
      patch.visible = true
      // Posisi patch berpindah sekarang, jadi isi tekstur harus ikut sekarang juga; menunggu jadwal
      // unggah berkala membuat citra lama tampil di tempat baru selama ~250 ms (terlihat berkedip).
      patchTex.needsUpdate = true
      patchDirty = false
      for (let ty = y0; ty < y0 + PATCH_N; ty += 1) {
        for (let tx = x0; tx < x0 + PATCH_N; tx += 1) {
          const im = new Image()
          im.crossOrigin = "anonymous"
          im.decoding = "async"
          im.onload = () => {
            if (disposed) return
            pctx.clearRect((tx - x0) * 256, (ty - y0) * 256, 256, 256)
            pctx.drawImage(im, (tx - x0) * 256, (ty - y0) * 256)
            patchDirty = true
          }
          im.src = `${TILE_URL}/${PATCH_Z}/${ty}/${tx}`
          patchImgs.push(im)
        }
      }
    }
    const updatePatch = () => {
      const d = camera.position.distanceTo(controls.target)
      const fade = 1 - THREE.MathUtils.smoothstep(d, 34, 58)
      patchMat.uniforms.uFade.value = fade
      patch.visible = patchAt !== null && fade > 0.01
      if (fade <= 0.01) return
      const { lng, lat } = unproject(controls.target.x, controls.target.z)
      const cx = Math.floor(tileX(lng, PATCH_Z))
      const cy = Math.floor(tileY(lat, PATCH_Z))
      if (patchAt && Math.abs(cx - patchAt.x) <= 1 && Math.abs(cy - patchAt.y) <= 1) return
      loadPatch(cx, cy)
    }

    // --- Drape data: zona kritis / tema data (CPU, dianimasikan antar frame) ----
    const drapeH = Math.round((DRAPE_W * (zMax - zMin)) / (xMax - xMin))
    const drapeCanvas = document.createElement("canvas")
    drapeCanvas.width = DRAPE_W
    drapeCanvas.height = drapeH
    const drapeCtx = drapeCanvas.getContext("2d")!
    const drapeImage = drapeCtx.createImageData(DRAPE_W, drapeH)
    const drapeTexture = track(new THREE.CanvasTexture(drapeCanvas))
    drapeTexture.colorSpace = THREE.SRGBColorSpace
    type Px = { idx: number; weights: number[]; block: string; canalDist: number; noise: number }
    const pixels: Px[] = []
    // Jarak ke parit/kanal drainase (OSM) di grid drape; 1 piksel = (xMax − xMin) / DRAPE_W unit.
    const drainDist = distanceField(DRAPE_W, drapeH, (ctx) =>
      strokeLines(ctx, drainLines, (lng, lat) => {
        const [x, z] = project(lng, lat)
        return [((x - xMin) / (xMax - xMin)) * DRAPE_W, ((z - zMin) / (zMax - zMin)) * drapeH]
      }),
    )
    const drapePx = (xMax - xMin) / DRAPE_W
    for (let j = 0; j < drapeH; j += 1) {
      for (let i = 0; i < DRAPE_W; i += 1) {
        const x = xMin + ((i + 0.5) / DRAPE_W) * (xMax - xMin)
        const z = zMin + ((j + 0.5) / drapeH) * (zMax - zMin)
        if (!pointInRing(x, z, ring)) continue
        const weights = TWIN_BLOCKS.map(() => 0)
        let nearest = Infinity
        let block = TWIN_BLOCKS[0]
        for (const { asset, xz } of assetsXZ) {
          const d2 = (xz[0] - x) ** 2 + (xz[1] - z) ** 2
          weights[Math.max(0, TWIN_BLOCKS.indexOf(asset.block))] += 1 / (d2 + 4)
          if (d2 < nearest) {
            nearest = d2
            block = asset.block
          }
        }
        const sum = weights.reduce((a, b) => a + b, 0)
        pixels.push({
          idx: (j * DRAPE_W + i) * 4,
          weights: weights.map((w) => w / sum),
          block,
          canalDist: drainDist[j * DRAPE_W + i] * drapePx,
          noise: (Math.sin(x * 0.31 + 1.3) * Math.cos(z * 0.27 - 0.4) + 0.5 * Math.sin(x * 0.83 - z * 0.61 + 2.1)) / 1.5,
        })
      }
    }
    const shape = new THREE.Shape(ring.map(([x, z]) => new THREE.Vector2(x, -z)))
    const drapeGeometry = track(new THREE.ShapeGeometry(shape))
    drapeGeometry.rotateX(-Math.PI / 2)
    {
      const pos = drapeGeometry.attributes.position
      const uv = drapeGeometry.attributes.uv
      for (let i = 0; i < pos.count; i += 1) {
        uv.setXY(i, (pos.getX(i) - xMin) / (xMax - xMin), (zMax - pos.getZ(i)) / (zMax - zMin))
      }
    }
    const drape = new THREE.Mesh(
      drapeGeometry,
      track(new THREE.MeshBasicMaterial({ map: drapeTexture, transparent: true, depthWrite: false, toneMapped: false })),
    )
    drape.position.y = 0.03
    scene.add(drape)

    // --- Tirai batas kawasan -------------------------------------------------------
    const curtainPos: number[] = []
    const curtainV: number[] = []
    const bPts = boundaryLngLat.map(([lng, lat]) => project(lng, lat))
    for (let i = 0; i < bPts.length; i += 1) {
      const [ax, az] = bPts[i]
      const [bx, bz] = bPts[(i + 1) % bPts.length]
      curtainPos.push(ax, 0, az, bx, 0, bz, bx, CURTAIN_H, bz, ax, 0, az, bx, CURTAIN_H, bz, ax, CURTAIN_H, az)
      curtainV.push(0, 0, 1, 0, 1, 1)
    }
    const curtainGeo = track(new THREE.BufferGeometry())
    curtainGeo.setAttribute("position", new THREE.Float32BufferAttribute(curtainPos, 3))
    curtainGeo.setAttribute("aV", new THREE.Float32BufferAttribute(curtainV, 1))
    const curtainMat = track(
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color("#2dd4bf") }, uGain: { value: 1 } },
        vertexShader: /* glsl */ `
          attribute float aV;
          varying float vV;
          varying float vH;
          void main() {
            vV = aV;
            vH = position.x * 0.35 + position.z * 0.2;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform float uTime, uGain;
          uniform vec3 uColor;
          varying float vV;
          varying float vH;
          void main() {
            float fade = pow(1.0 - vV, 2.2);
            float scan = 0.5 + 0.5 * sin(vV * 18.0 - uTime * 2.4 + vH * 0.2);
            gl_FragColor = vec4(uColor, fade * (0.32 + 0.18 * scan) * uGain);
          }`,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    )
    scene.add(new THREE.Mesh(curtainGeo, curtainMat))

    // --- Pita garis batas KHG ---------------------------------------------------------
    // Pita datar di tanah; vertex shader melebarkannya sebanding jarak kamera sehingga
    // tebalnya tetap dalam piksel.
    const pxWorld = { value: 0.001 }
    type DashBuf = { pos: number[]; dir: number[]; side: number[]; along: number[]; pair: number[]; idx: number[] }
    const newDashBuf = (): DashBuf => ({ pos: [], dir: [], side: [], along: [], pair: [], idx: [] })
    const pushDash = (buf: DashBuf, pts: [number, number][], closed: boolean, pair: [number, number], y: number) => {
      const n = pts.length
      const first = buf.pos.length / 3
      const count = closed ? n + 1 : n
      let along = 0
      for (let i = 0; i < count; i += 1) {
        const [px, pz] = pts[i % n]
        if (i > 0) {
          const [qx, qz] = pts[(i - 1) % n]
          along += Math.hypot(px - qx, pz - qz)
        }
        const prev = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)]
        const next = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)]
        const tl = Math.hypot(next[0] - prev[0], next[1] - prev[1]) || 1
        for (const s of [-1, 1]) {
          buf.pos.push(px, y, pz)
          buf.dir.push((next[0] - prev[0]) / tl, (next[1] - prev[1]) / tl)
          buf.side.push(s)
          buf.along.push(along)
          buf.pair.push(pair[0], pair[1])
        }
        if (i < count - 1) {
          const k = first + i * 2
          buf.idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2)
        }
      }
    }
    const dashGeometry = (buf: DashBuf) => {
      const g = track(new THREE.BufferGeometry())
      g.setAttribute("position", new THREE.Float32BufferAttribute(buf.pos, 3))
      g.setAttribute("aDir", new THREE.Float32BufferAttribute(buf.dir, 2))
      g.setAttribute("aSide", new THREE.Float32BufferAttribute(buf.side, 1))
      g.setAttribute("aAlong", new THREE.Float32BufferAttribute(buf.along, 1))
      g.setAttribute("aPair", new THREE.Float32BufferAttribute(buf.pair, 2))
      g.setIndex(buf.idx)
      return g
    }
    // Batas KHG: garis bercahaya seperti twin referensi. Cahaya dibuat dari pita lebar
    // ber-falloff Gauss (bukan bloom) supaya halus dan ringan; warna mengikuti tema emerald.
    const outlineBuf = newDashBuf()
    const [fx0, fz0] = bPts[0]
    const [fx1, fz1] = bPts[bPts.length - 1]
    pushDash(outlineBuf, fx0 === fx1 && fz0 === fz1 ? bPts.slice(0, -1) : bPts, true, [-9, -9], 0.05)
    const outlineGeo = dashGeometry(outlineBuf)
    const makeGlowMat = (hex: string, width: number, opacity: number, core: boolean) =>
      track(
        new THREE.ShaderMaterial({
          uniforms: { uPx: pxWorld, uWidth: { value: width }, uColor: { value: new THREE.Color(hex) }, uOpacity: { value: opacity } },
          vertexShader: /* glsl */ `
            attribute vec2 aDir;
            attribute float aSide;
            uniform float uPx, uWidth;
            varying float vSide;
            void main() {
              vec4 w = modelMatrix * vec4(position, 1.0);
              float d = distance(cameraPosition, w.xyz);
              w.xz += vec2(-aDir.y, aDir.x) * aSide * uWidth * 0.5 * uPx * d;
              vSide = aSide;
              gl_Position = projectionMatrix * viewMatrix * w;
            }`,
          fragmentShader: core
            ? /* glsl */ `
              uniform vec3 uColor;
              uniform float uOpacity;
              varying float vSide;
              void main() { gl_FragColor = vec4(uColor, (1.0 - smoothstep(0.45, 1.0, abs(vSide))) * uOpacity); }`
            : /* glsl */ `
              uniform vec3 uColor;
              uniform float uOpacity;
              varying float vSide;
              void main() { gl_FragColor = vec4(uColor, exp(-vSide * vSide * 4.5) * uOpacity); }`,
          transparent: true,
          depthWrite: false,
          blending: core ? THREE.NormalBlending : THREE.AdditiveBlending,
        }),
      )
    const glowWide = makeGlowMat("#14b8a6", 30, 0.3, false)
    const glowNear = makeGlowMat("#5eead4", 9, 0.5, false)
    const glowCore = makeGlowMat("#ccfbf1", 1.9, 0.92, true)
    for (const [m, order] of [
      [glowWide, 2],
      [glowNear, 3],
      [glowCore, 4],
    ] as const) {
      const mesh = new THREE.Mesh(outlineGeo, m)
      mesh.renderOrder = order
      scene.add(mesh)
    }

    // --- Framing kamera awal ---------------------------------------------------------------
    // Jarak dicari (bagi dua) agar batas KHG pas di FIT_BOX, lalu titik orbit digeser
    // supaya kawasan berada di tengah area aman. Dihitung ulang tiap ukuran berubah.
    const fitPts = bPts.map(([x, z]) => new THREE.Vector3(x, 0, z))
    const fitCam = new THREE.PerspectiveCamera()
    const ndcV = new THREE.Vector3()
    const fitRight = new THREE.Vector3()
    const fitFwd = new THREE.Vector3(-HOME_DIR.x, 0, -HOME_DIR.z).normalize()
    const placeFit = (tgt: THREE.Vector3, d: number) => {
      fitCam.position.copy(tgt).addScaledVector(HOME_DIR, d)
      fitCam.lookAt(tgt)
      fitCam.updateMatrixWorld(true)
    }
    const fitBounds = () => {
      const b = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity }
      for (const p of fitPts) {
        ndcV.copy(p).project(fitCam)
        b.x0 = Math.min(b.x0, ndcV.x)
        b.x1 = Math.max(b.x1, ndcV.x)
        b.y0 = Math.min(b.y0, ndcV.y)
        b.y1 = Math.max(b.y1, ndcV.y)
      }
      return b
    }
    const computeHome = () => {
      fitCam.fov = camera.fov
      fitCam.aspect = camera.aspect
      fitCam.near = camera.near
      fitCam.far = camera.far
      fitCam.updateProjectionMatrix()
      const tgt = new THREE.Vector3()
      const boxW = FIT_BOX.x1 - FIT_BOX.x0
      const boxH = FIT_BOX.y1 - FIT_BOX.y0
      let d = 150
      for (let iter = 0; iter < 4; iter += 1) {
        let lo = 10
        let hi = 600
        for (let k = 0; k < 22; k += 1) {
          const m = (lo + hi) / 2
          placeFit(tgt, m)
          const b = fitBounds()
          if (b.x1 - b.x0 <= boxW && b.y1 - b.y0 <= boxH) hi = m
          else lo = m
        }
        d = hi
        placeFit(tgt, d)
        const b = fitBounds()
        const halfH = Math.tan(THREE.MathUtils.degToRad(fitCam.fov / 2)) * d
        fitRight.setFromMatrixColumn(fitCam.matrixWorld, 0).setY(0).normalize()
        tgt.addScaledVector(fitRight, -((FIT_BOX.x0 + FIT_BOX.x1) / 2 - (b.x0 + b.x1) / 2) * halfH * fitCam.aspect)
        tgt.addScaledVector(fitFwd, -(((FIT_BOX.y0 + FIT_BOX.y1) / 2 - (b.y0 + b.y1) / 2) * halfH) / HOME_DIR.y)
      }
      home = { pos: tgt.clone().addScaledVector(HOME_DIR, d), tgt }
    }

    // --- Sungai & parit (OpenStreetMap) sebagai pita beraliran --------------------------
    // Arah garis OSM = arah hilir. Sungai bernama paling lebar; parit drainase tipis dan
    // alirannya mengikuti bukaan pintu air. Di luar KHG diredupkan (mask field).
    const rPos: number[] = []
    const rAlong: number[] = []
    const rSide: number[] = []
    const rRank: number[] = []
    const rIdx: number[] = []
    let base = 0
    for (const ww of waterways) {
      const pts = ww.coords.map(([lng, lat]) => project(lng, lat))
      if (pts.length < 2) continue
      const w = ww.rank === 1 ? 0.7 : ww.rank === 2 ? 0.3 : 0.14
      const y = ww.rank === 1 ? 0.05 : ww.rank === 2 ? 0.045 : 0.04
      let along = 0
      for (let i = 0; i < pts.length; i += 1) {
        const [px, pz] = pts[i]
        const [ax, az] = pts[Math.max(0, i - 1)]
        const [bx, bz] = pts[Math.min(pts.length - 1, i + 1)]
        const tl = Math.hypot(bx - ax, bz - az) || 1
        const tx = (bx - ax) / tl
        const tz = (bz - az) / tl
        if (i > 0) along += Math.hypot(px - pts[i - 1][0], pz - pts[i - 1][1])
        const nx = -tz * (w / 2)
        const nz = tx * (w / 2)
        rPos.push(px + nx, y, pz + nz, px - nx, y, pz - nz)
        rAlong.push(along, along)
        rSide.push(-1, 1)
        rRank.push(ww.rank, ww.rank)
        if (i < pts.length - 1) {
          const k = base + i * 2
          rIdx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2)
        }
      }
      base += pts.length * 2
    }
    const waterGeo = track(new THREE.BufferGeometry())
    waterGeo.setAttribute("position", new THREE.Float32BufferAttribute(rPos, 3))
    waterGeo.setAttribute("aAlong", new THREE.Float32BufferAttribute(rAlong, 1))
    waterGeo.setAttribute("aSide", new THREE.Float32BufferAttribute(rSide, 1))
    waterGeo.setAttribute("aRank", new THREE.Float32BufferAttribute(rRank, 1))
    waterGeo.setIndex(rIdx)
    const waterMat = track(
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uFlowDrain: { value: 0 },
          uField: { value: fieldTex },
          uGround: { value: new THREE.Vector4(nwX, nwZ, groundW, groundD) },
          uA: { value: new THREE.Color("#1c78d8") },
          uB: { value: new THREE.Color("#7fe7ff") },
        },
        vertexShader: /* glsl */ `
          attribute float aAlong;
          attribute float aSide;
          attribute float aRank;
          uniform vec4 uGround;
          varying float vAlong;
          varying float vSide;
          varying float vRank;
          varying vec2 vFieldUv;
          void main() {
            vAlong = aAlong;
            vSide = aSide;
            vRank = aRank;
            vFieldUv = vec2((position.x - uGround.x) / uGround.z, 1.0 - (position.z - uGround.y) / uGround.w);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform float uTime, uFlowDrain;
          uniform sampler2D uField;
          uniform vec3 uA, uB;
          varying float vAlong;
          varying float vSide;
          varying float vRank;
          varying vec2 vFieldUv;
          void main() {
            float inside = texture2D(uField, vFieldUv).r;
            float phase = vRank > 2.5 ? uFlowDrain : uTime * (vRank < 1.5 ? 0.9 : 0.6) * 0.35;
            float f = fract(vAlong * (vRank < 1.5 ? 0.22 : 0.35) - phase);
            float streak = smoothstep(0.0, 0.08, f) * smoothstep(0.42, 0.08, f);
            float edge = pow(1.0 - abs(vSide), 0.7);
            vec3 c = mix(uA, uB, 0.25 + streak * 0.75);
            float a = edge * mix(vRank > 2.5 ? 0.18 : 0.3, vRank < 1.5 ? 1.0 : vRank < 2.5 ? 0.85 : 0.6, inside);
            gl_FragColor = vec4(c * (0.75 + 0.5 * inside), a);
          }`,
        transparent: true,
        depthWrite: false,
        // Urutan titik pita membuat segitiga menghadap ke bawah; dua sisi supaya tidak ter-cull.
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    )
    const waterMesh = new THREE.Mesh(waterGeo, waterMat)
    waterMesh.frustumCulled = false
    scene.add(waterMesh)

    // --- Sensor: halo riak, cincin status, badan per jenis, callout ------------------
    const haloGeo = track(new THREE.CircleGeometry(1.6, 48))
    const ringGeo = track(new THREE.RingGeometry(0.55, 0.7, 48))
    const beamGeo = track(new THREE.CylinderGeometry(0.06, 0.06, 1, 10, 1, true))
    const headGeo = track(new THREE.SphereGeometry(0.3, 20, 14))
    const pickGeo = track(new THREE.CylinderGeometry(0.9, 0.9, 1, 8))
    const offRingGeo = track(new THREE.RingGeometry(1.15, 1.4, 48))
    const offBeaconGeo = track(new THREE.OctahedronGeometry(0.26))
    const pickMat = track(new THREE.MeshBasicMaterial({ visible: false }))

    const makeHaloMat = (hex: string) =>
      track(
        new THREE.ShaderMaterial({
          uniforms: { uColor: { value: new THREE.Color(hex) }, uTime: { value: 0 }, uAlarm: { value: 0 } },
          vertexShader: /* glsl */ `
            varying vec2 vUv;
            void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
          fragmentShader: /* glsl */ `
            uniform vec3 uColor;
            uniform float uTime, uAlarm;
            varying vec2 vUv;
            void main() {
              float d = length(vUv - 0.5) * 2.0;
              float wave = fract(uTime * (0.45 + uAlarm * 0.5));
              float ringW = smoothstep(wave - 0.12, wave, d) * smoothstep(wave + 0.02, wave, d);
              float core = smoothstep(1.0, 0.0, d) * 0.22;
              gl_FragColor = vec4(uColor, (ringW * (1.0 - wave) * 0.9 + core) * (1.0 - smoothstep(0.92, 1.0, d)));
            }`,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      )
    const makeBeamMat = (hex: string) =>
      track(
        new THREE.ShaderMaterial({
          uniforms: { uColor: { value: new THREE.Color(hex) } },
          vertexShader: /* glsl */ `
            varying float vY;
            void main() { vY = position.y + 0.5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
          fragmentShader: /* glsl */ `
            uniform vec3 uColor;
            varying float vY;
            void main() { gl_FragColor = vec4(uColor, 0.25 + 0.75 * (1.0 - vY)); }`,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      )

    type NodeType = TwinAsset["layer"]
    type SensorNode = {
      id: string
      type: NodeType
      block: string | null
      x: number
      z: number
      group: THREE.Group
      top: number
      ring: THREE.Mesh
      ringMat: THREE.MeshBasicMaterial
      haloMat: THREE.ShaderMaterial
      fill?: THREE.Mesh
      fillMat?: THREE.MeshBasicMaterial
      spin?: THREE.Object3D
      label: CSS2DObject
      root: HTMLDivElement
      valueEl: HTMLSpanElement
      level: EwsLevel | "offline"
      dy: number
      hidden: boolean
      /** 0–1, naik saat paket data tiba lalu meluruh. */
      flash: number
      /** Penanda stasiun offline (cincin berkedip + lampu suar), tampil saat level offline. */
      offMark: THREE.Group
      offRing: THREE.Mesh
      offRingMat: THREE.MeshBasicMaterial
      offBeaconMat: THREE.MeshBasicMaterial
    }
    const nodes: SensorNode[] = []
    const pickables: THREE.Object3D[] = []

    const makeNode = (id: string, code: string, type: NodeType, block: string | null, x: number, z: number) => {
      const color = ASSET_TYPE_META[type].color
      const group = new THREE.Group()
      group.position.set(x, 0, z)
      scene.add(group)

      const haloMat = makeHaloMat(STATUS_HEX.normal)
      const halo = new THREE.Mesh(haloGeo, haloMat)
      halo.rotation.x = -Math.PI / 2
      halo.position.y = 0.07
      group.add(halo)
      const ringMat = track(new THREE.MeshBasicMaterial({ color: STATUS_HEX.normal, transparent: true, opacity: 0.9, side: THREE.DoubleSide }))
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.rotation.x = -Math.PI / 2
      ring.position.y = 0.08
      group.add(ring)

      const headMat = track(new THREE.MeshBasicMaterial({ color }))
      let top = type === "rain-gauge" ? 4.4 : type === "fire-hotspot" ? 2.6 : 3.1
      let fill: THREE.Mesh | undefined
      let fillMat: THREE.MeshBasicMaterial | undefined
      let spin: THREE.Object3D | undefined

      if (type === "borehole" || type === "water-station") {
        // Tabung ukur: atas = permukaan gambut, isi = kolom air tanah.
        top = GAUGE_H + 0.35
        const tube = new THREE.Mesh(
          track(new THREE.CylinderGeometry(0.42, 0.42, GAUGE_H, 20, 1, true)),
          track(new THREE.MeshBasicMaterial({ color: "#a7f3d0", transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false })),
        )
        tube.position.y = GAUGE_H / 2
        group.add(tube)
        const cap = new THREE.Mesh(track(new THREE.TorusGeometry(0.42, 0.03, 6, 28)), headMat)
        cap.rotation.x = Math.PI / 2
        cap.position.y = GAUGE_H
        group.add(cap)
        for (const [lvl, hex] of [
          [WT_COMPLIANCE, STATUS_HEX.siaga],
          [WT_CRITICAL, STATUS_HEX.awas],
        ] as const) {
          const t = new THREE.Mesh(track(new THREE.TorusGeometry(0.47, 0.035, 6, 28)), track(new THREE.MeshBasicMaterial({ color: hex })))
          t.rotation.x = Math.PI / 2
          t.position.y = ((GAUGE_RANGE + lvl) / GAUGE_RANGE) * GAUGE_H
          group.add(t)
        }
        fillMat = track(new THREE.MeshBasicMaterial({ color: STATUS_HEX.normal, transparent: true, opacity: 0.85 }))
        fill = new THREE.Mesh(track(new THREE.CylinderGeometry(0.34, 0.34, 1, 20)), fillMat)
        fill.scale.y = 0.01
        group.add(fill)
      } else {
        const beam = new THREE.Mesh(beamGeo, makeBeamMat(color))
        beam.scale.y = top
        beam.position.y = top / 2
        group.add(beam)
        let head: THREE.Mesh
        if (type === "peat-station") head = new THREE.Mesh(track(new THREE.OctahedronGeometry(0.42)), headMat)
        else if (type === "water-gate") head = new THREE.Mesh(track(new THREE.BoxGeometry(0.7, 0.5, 0.35)), headMat)
        else if (type === "fire-hotspot") head = new THREE.Mesh(track(new THREE.ConeGeometry(0.38, 0.9, 14)), headMat)
        else head = new THREE.Mesh(headGeo, headMat)
        head.position.y = top
        group.add(head)
        if (type !== "rain-gauge") spin = head
      }

      // Penanda offline: cincin tanah berkedip + lampu suar di atas sensor (tersembunyi bila online).
      const offMark = new THREE.Group()
      offMark.visible = false
      const offRingMat = track(new THREE.MeshBasicMaterial({ color: "#fb7185", transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }))
      const offRing = new THREE.Mesh(offRingGeo, offRingMat)
      offRing.rotation.x = -Math.PI / 2
      offRing.position.y = 0.1
      offMark.add(offRing)
      const offBeaconMat = track(new THREE.MeshBasicMaterial({ color: "#fb7185", transparent: true, opacity: 1 }))
      const offBeacon = new THREE.Mesh(offBeaconGeo, offBeaconMat)
      offBeacon.position.y = top + 1.35
      offMark.add(offBeacon)
      group.add(offMark)

      const pick = new THREE.Mesh(pickGeo, pickMat)
      pick.scale.y = top + 0.6
      pick.position.y = (top + 0.6) / 2
      pick.userData.id = id
      group.add(pick)
      pickables.push(pick)

      const root = document.createElement("div")
      root.className = "twin-label"
      root.style.setProperty("--c", color)
      root.style.fontFamily = propsRef.current.monoFont
      const dot = document.createElement("span")
      dot.className = "twin-label__dot"
      const codeEl = document.createElement("b")
      codeEl.textContent = code
      const valueEl = document.createElement("span")
      valueEl.className = "twin-label__v"
      root.append(dot, codeEl, valueEl)
      root.addEventListener("pointerdown", (e) => e.stopPropagation())
      root.addEventListener("click", () => propsRef.current.onSelect(id))
      // CSS2DRenderer memegang transform wadah; pil di dalamnya bebas digeser (--dy).
      const anchor = document.createElement("div")
      anchor.className = "twin-label-anchor"
      anchor.append(root)
      const label = new CSS2DObject(anchor)
      label.center.set(0.5, 1.15)
      label.position.set(0, top + 0.5, 0)
      group.add(label)

      const node: SensorNode = {
        id, type, block, x, z, group, top, ring, ringMat, haloMat, fill, fillMat, spin, label, root, valueEl,
        level: "normal", dy: 0, hidden: false, flash: 0, offMark, offRing, offRingMat, offBeaconMat,
      }
      nodes.push(node)
      return node
    }
    for (const { asset, xz } of assetsXZ) makeNode(asset.id, asset.code, asset.layer, asset.block, xz[0], xz[1])

    // --- Link data: lompatan antar sensor sepanjang kanal -----------------------------------
    // Tiap kanal = rantai relay: data melompat dari satu sensor ke sensor berikutnya lewat
    // busur rendah yang mengikuti garis kanal. Hotspot VIIRS bukan perangkat, jadi hanya
    // dilewati. Rantai tetap tersambung penuh; stasiun offline ditandai cincin & lampu suar
    // berkedip (lihat offMark). Sensor penerima berkedip saat paket tiba.
    const dataFlow = new THREE.Group()
    scene.add(dataFlow)
    const DATA_Y = 0.35
    const DATA_SPEED = 3.4
    type Hop = { from: SensorNode; to: SensorNode; pts: THREE.Vector3[]; cum: number[]; len: number; ok: boolean }
    const deviceAt = (x: number, z: number) =>
      nodes.find((n) => n.type !== "fire-hotspot" && Math.hypot(n.x - x, n.z - z) < 0.05)
    const makeHop = (from: SensorNode, to: SensorNode, path: [number, number][]): Hop => {
      const seg = path.slice(1).map((q, k) => Math.hypot(q[0] - path[k][0], q[1] - path[k][1]))
      const flat = seg.reduce((a, b) => a + b, 0) || 1
      const lift = clamp(flat * 0.07, 0.5, 2)
      const steps = Math.max(16, Math.ceil(flat / 0.35))
      const pts: THREE.Vector3[] = []
      for (let k = 0; k <= steps; k += 1) {
        const d = (k / steps) * flat
        let acc = 0
        let m = 0
        while (m < seg.length - 1 && acc + seg[m] < d) {
          acc += seg[m]
          m += 1
        }
        const t = seg[m] ? clamp((d - acc) / seg[m], 0, 1) : 0
        pts.push(
          new THREE.Vector3(
            path[m][0] + (path[m + 1][0] - path[m][0]) * t,
            DATA_Y + lift * Math.sin((Math.PI * k) / steps),
            path[m][1] + (path[m + 1][1] - path[m][1]) * t,
          ),
        )
      }
      const cum = [0]
      for (let k = 1; k < pts.length; k += 1) cum.push(cum[k - 1] + pts[k].distanceTo(pts[k - 1]))
      return { from, to, pts, cum, len: cum[cum.length - 1] || 1, ok: true }
    }
    const hopsByCanal: Hop[][] = canals.map((line) => {
      const hops: Hop[] = []
      let prev: SensorNode | undefined
      let prevK = 0
      for (let k = 0; k < line.length; k += 1) {
        const n = deviceAt(line[k][0], line[k][1])
        if (!n) continue
        if (prev) hops.push(makeHop(prev, n, line.slice(prevK, k + 1)))
        prev = n
        prevK = k
      }
      return hops
    })

    // Busur lompatan sebagai pita lebar-piksel tetap: inti terang + cahaya, arus bergerak ke penerima.
    const hopMat = track(
      new THREE.ShaderMaterial({
        uniforms: {
          uPx: pxWorld,
          uWidth: { value: 10 },
          uTime: { value: 0 },
          uOk: { value: new THREE.Color("#5eead4") },
          uOff: { value: new THREE.Color("#8a9a92") },
        },
        vertexShader: /* glsl */ `
          attribute vec2 aDir;
          attribute float aSide;
          attribute float aU;
          attribute float aLen;
          attribute float aOk;
          uniform float uPx, uWidth;
          varying float vSide;
          varying float vS;
          varying float vU;
          varying float vOk;
          void main() {
            vec4 w = modelMatrix * vec4(position, 1.0);
            float d = distance(cameraPosition, w.xyz);
            w.xz += vec2(-aDir.y, aDir.x) * aSide * uWidth * 0.5 * uPx * d;
            vSide = aSide;
            vS = aU * aLen;
            vU = aU;
            vOk = aOk;
            gl_Position = projectionMatrix * viewMatrix * w;
          }`,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform vec3 uOk, uOff;
          varying float vSide;
          varying float vS;
          varying float vU;
          varying float vOk;
          void main() {
            float core = exp(-vSide * vSide * 5.0);
            float ends = smoothstep(0.0, 0.05, vU) * smoothstep(1.0, 0.95, vU);
            if (vOk > 0.5) {
              float flow = pow(fract(vS * 0.35 - uTime * 1.1), 3.0);
              gl_FragColor = vec4(uOk * (0.9 + 0.6 * flow), core * (0.42 + 0.58 * flow) * ends);
            } else {
              float dash = step(0.55, fract(vS * 0.9));
              gl_FragColor = vec4(uOff, core * 0.55 * dash * ends);
            }
          }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )
    {
      const pos: number[] = []
      const dir: number[] = []
      const side: number[] = []
      const u: number[] = []
      const len: number[] = []
      const ok: number[] = []
      const idx: number[] = []
      for (const hop of hopsByCanal.flat()) {
        const first = pos.length / 3
        hop.pts.forEach((q, k) => {
          const a = hop.pts[Math.max(0, k - 1)]
          const b = hop.pts[Math.min(hop.pts.length - 1, k + 1)]
          const tl = Math.hypot(b.x - a.x, b.z - a.z) || 1
          for (const sd of [-1, 1]) {
            pos.push(q.x, q.y, q.z)
            dir.push((b.x - a.x) / tl, (b.z - a.z) / tl)
            side.push(sd)
            u.push(hop.cum[k] / hop.len)
            len.push(hop.len)
            ok.push(hop.ok ? 1 : 0)
          }
          if (k < hop.pts.length - 1) {
            const v = first + k * 2
            idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2)
          }
        })
      }
      const g = track(new THREE.BufferGeometry())
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
      g.setAttribute("aDir", new THREE.Float32BufferAttribute(dir, 2))
      g.setAttribute("aSide", new THREE.Float32BufferAttribute(side, 1))
      g.setAttribute("aU", new THREE.Float32BufferAttribute(u, 1))
      g.setAttribute("aLen", new THREE.Float32BufferAttribute(len, 1))
      g.setAttribute("aOk", new THREE.Float32BufferAttribute(ok, 1))
      g.setIndex(idx)
      const mesh = new THREE.Mesh(g, hopMat)
      mesh.frustumCulled = false
      mesh.renderOrder = 5
      dataFlow.add(mesh)
    }

    // Paket: titik bercahaya berjalan di rangkaian lompatan yang masih tersambung (run).
    type Run = { pts: THREE.Vector3[]; cum: number[]; len: number; stops: { at: number; node: SensorNode }[] }
    const runs: Run[] = []
    for (const hops of hopsByCanal) {
      let cur: Run | null = null
      for (const hop of hops) {
        if (!hop.ok) {
          cur = null
          continue
        }
        if (!cur) {
          cur = { pts: [hop.pts[0]], cum: [0], len: 0, stops: [] }
          runs.push(cur)
        }
        for (let k = 1; k < hop.pts.length; k += 1) {
          cur.len += hop.pts[k].distanceTo(hop.pts[k - 1])
          cur.pts.push(hop.pts[k])
          cur.cum.push(cur.len)
        }
        cur.stops.push({ at: cur.len, node: hop.to })
      }
    }
    const packets = runs.flatMap((run, ri) => {
      const count = Math.max(1, Math.round(run.len / 10))
      return Array.from({ length: count }, (_, k) => ({ run, offset: (k / count + ri * 0.29) % 1, last: -1 }))
    })
    const packetPos = new Float32Array(Math.max(1, packets.length) * 3)
    const packetGeo = track(new THREE.BufferGeometry())
    packetGeo.setAttribute("position", new THREE.BufferAttribute(packetPos, 3))
    const packetSize = { value: 16 }
    const packetMat = track(
      new THREE.ShaderMaterial({
        uniforms: { uSize: packetSize, uColor: { value: new THREE.Color("#ccfbf1") } },
        vertexShader: /* glsl */ `
          uniform float uSize;
          void main() {
            gl_PointSize = uSize;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          void main() {
            float r = length(gl_PointCoord - 0.5) * 2.0;
            float a = exp(-r * r * 5.0) * 0.9 + smoothstep(0.32, 0.0, r) * 0.9;
            if (a < 0.02) discard;
            gl_FragColor = vec4(uColor, a);
          }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )
    const packetPoints = new THREE.Points(packetGeo, packetMat)
    packetPoints.frustumCulled = false
    packetPoints.renderOrder = 6
    dataFlow.add(packetPoints)
    const runPoint = (run: Run, d: number, out: THREE.Vector3) => {
      let k = 1
      while (k < run.cum.length - 1 && run.cum[k] < d) k += 1
      const a = run.cum[k - 1]
      const b = run.cum[k]
      return out.lerpVectors(run.pts[k - 1], run.pts[k], b > a ? (d - a) / (b - a) : 0)
    }
    const packetTmp = new THREE.Vector3()
    const stepData = (t: number) => {
      hopMat.uniforms.uTime.value = t
      if (!dataFlow.visible) return
      packets.forEach((pk, k) => {
        const d = (pk.offset * pk.run.len + t * DATA_SPEED) % pk.run.len
        runPoint(pk.run, d, packetTmp)
        packetPos.set([packetTmp.x, packetTmp.y, packetTmp.z], k * 3)
        // Sensor penerima berkedip saat paket melewati titiknya.
        if (pk.last >= 0 && d > pk.last) {
          for (const st of pk.run.stops) if (st.at > pk.last && st.at <= d) st.node.flash = 1
        }
        pk.last = d
      })
      packetGeo.attributes.position.needsUpdate = true
    }

    // --- Cuaca per penakar hujan -----------------------------------------------------
    // Parameter mengejar target tiap frame; fase jatuh & cipratan diintegrasikan di
    // CPU sehingga perubahan kecepatan tidak membuat tetes melompat.
    type WeatherTarget = { density: number; speed: number; len: number; alpha: number; wind: number; cover: number; dark: number; splash: number }
    const WEATHER: Record<TwinWeather, WeatherTarget> = {
      ok: { density: 0, speed: 10, len: 0.25, alpha: 0, wind: 0.08, cover: 0, dark: 0, splash: 0.8 },
      warn: { density: 0.22, speed: 11, len: 0.28, alpha: 0.42, wind: 0.1, cover: 0.55, dark: 0.25, splash: 0.9 },
      alarm: { density: 1, speed: 27, len: 0.9, alpha: 0.72, wind: 0.3, cover: 1, dark: 1, splash: 1.7 },
    }
    type RainCell = {
      id: string
      cx: number
      cz: number
      radius: number
      cur: WeatherTarget
      u: {
        uTime: { value: number }
        uFall: { value: number }
        uPhase: { value: number }
        uDensity: { value: number }
        uLen: { value: number }
        uAlpha: { value: number }
        uWind: { value: THREE.Vector3 }
        uCover: { value: number }
        uDark: { value: number }
        uFlash: { value: number }
      }
      boltPos: THREE.BufferAttribute
      boltMat: THREE.LineBasicMaterial
      nextFlash: number
      objects: THREE.Object3D[]
    }
    const rainCells: RainCell[] = []
    const rainScale = { value: 1000 }
    const splashSquash = { value: 0.6 }
    for (const { asset, xz } of assetsXZ.filter((a) => a.asset.layer === "rain-gauge")) {
      const [px, pz] = xz
      const R = 10
      const start = WEATHER[propsRef.current.weather?.[asset.id] ?? "ok"]
      const u = {
        uTime: { value: 0 },
        uFall: { value: 0 },
        uPhase: { value: 0 },
        uDensity: { value: start.density },
        uLen: { value: start.len },
        uAlpha: { value: start.alpha },
        uWind: { value: new THREE.Vector3(start.wind, 0, start.wind * 0.55) },
        uCover: { value: start.cover },
        uDark: { value: start.dark },
        uFlash: { value: 0 },
      }
      const N = 2600
      const pos = new Float32Array(N * 2 * 3)
      const endAttr = new Float32Array(N * 2)
      const rnd = new Float32Array(N * 2)
      for (let i = 0; i < N; i += 1) {
        const a = Math.random() * Math.PI * 2
        const r = Math.sqrt(Math.random()) * R
        const x = px + Math.cos(a) * r
        const y = Math.random() * RAIN_H
        const z = pz + Math.sin(a) * r
        const k = Math.random()
        for (let v = 0; v < 2; v += 1) {
          const o = i * 2 + v
          pos.set([x, y, z], o * 3)
          endAttr[o] = v
          rnd[o] = k
        }
      }
      const g = track(new THREE.BufferGeometry())
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3))
      g.setAttribute("aEnd", new THREE.BufferAttribute(endAttr, 1))
      g.setAttribute("aRnd", new THREE.BufferAttribute(rnd, 1))
      const dropsMat = track(
        new THREE.ShaderMaterial({
          uniforms: { ...u, uColor: { value: new THREE.Color("#b4dcff") } },
          vertexShader: /* glsl */ `
            attribute float aEnd;
            attribute float aRnd;
            uniform float uFall, uDensity, uLen, uAlpha;
            uniform vec3 uWind;
            varying float vAlpha;
            const float H = ${RAIN_H.toFixed(1)};
            void main() {
              float y = mod(position.y - uFall * (0.8 + aRnd * 0.45), H);
              vec3 dir = normalize(vec3(uWind.x, -1.0, uWind.z));
              vec3 head = vec3(position.x, y, position.z) + vec3(uWind.x, 0.0, uWind.z) * (H - y);
              vec3 q = head - dir * uLen * (0.7 + aRnd * 0.6) * aEnd;
              vAlpha = step(aRnd, uDensity) * (1.0 - aEnd) * uAlpha * smoothstep(0.0, 0.5, y) * smoothstep(H, H - 1.6, y);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(q, 1.0);
            }`,
          fragmentShader: /* glsl */ `
            uniform vec3 uColor;
            varying float vAlpha;
            void main() {
              if (vAlpha < 0.01) discard;
              gl_FragColor = vec4(uColor, vAlpha);
            }`,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      )
      const drops = new THREE.LineSegments(g, dropsMat)
      drops.frustumCulled = false
      scene.add(drops)

      const M = 700
      const spos = new Float32Array(M * 3)
      const srnd = new Float32Array(M)
      for (let i = 0; i < M; i += 1) {
        const a = Math.random() * Math.PI * 2
        const r = Math.sqrt(Math.random()) * R * 0.95
        spos.set([px + Math.cos(a) * r, 0.06, pz + Math.sin(a) * r], i * 3)
        srnd[i] = Math.random()
      }
      const sg = track(new THREE.BufferGeometry())
      sg.setAttribute("position", new THREE.BufferAttribute(spos, 3))
      sg.setAttribute("aRnd", new THREE.BufferAttribute(srnd, 1))
      const splashMat = track(
        new THREE.ShaderMaterial({
          uniforms: { ...u, uScale: rainScale, uSquash: splashSquash, uColor: { value: new THREE.Color("#9fd6ff") } },
          vertexShader: /* glsl */ `
            attribute float aRnd;
            uniform float uPhase, uDensity, uAlpha, uScale;
            uniform vec3 uWind;
            varying float vT;
            varying float vVis;
            void main() {
              vT = fract(uPhase * (0.8 + aRnd * 0.7) + aRnd * 13.0);
              vVis = step(aRnd, uDensity) * uAlpha;
              vec3 p = position + vec3(uWind.x, 0.0, uWind.z) * ${RAIN_H.toFixed(1)};
              vec4 mv = modelViewMatrix * vec4(p, 1.0);
              gl_PointSize = uScale * (0.05 + 0.3 * vT) / -mv.z;
              gl_Position = projectionMatrix * mv;
            }`,
          fragmentShader: /* glsl */ `
            uniform vec3 uColor;
            uniform float uSquash;
            varying float vT;
            varying float vVis;
            void main() {
              vec2 c = gl_PointCoord - 0.5;
              c.y /= max(uSquash, 0.2);
              float d = length(c) * 2.0;
              float ringA = smoothstep(0.62, 0.86, d) * smoothstep(1.0, 0.86, d);
              float a = ringA * (1.0 - vT) * vVis;
              if (a < 0.02) discard;
              gl_FragColor = vec4(uColor, a);
            }`,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      )
      const splashes = new THREE.Points(sg, splashMat)
      scene.add(splashes)

      const cloudMat = track(
        new THREE.ShaderMaterial({
          uniforms: u,
          vertexShader: /* glsl */ `
            varying vec2 vUv;
            void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
          fragmentShader: /* glsl */ `
            uniform float uTime, uCover, uDark, uFlash;
            varying vec2 vUv;
            ${NOISE_GLSL}
            void main() {
              vec2 q = vUv * 5.0 + vec2(uTime * 0.04, uTime * 0.015);
              float n = noise(q) * 0.55 + noise(q * 2.1) * 0.3 + noise(q * 4.7) * 0.15;
              float d = length(vUv - 0.5) * 2.0;
              float shapeA = smoothstep(1.0, 0.25, d) * smoothstep(0.62 - 0.4 * uCover, 0.9 - 0.3 * uCover, n);
              float a = shapeA * uCover * (0.35 + 0.35 * uDark);
              vec3 light = mix(vec3(0.62, 0.7, 0.72), vec3(0.4, 0.47, 0.5), n);
              vec3 dark = mix(vec3(0.1, 0.12, 0.13), vec3(0.24, 0.28, 0.3), n);
              vec3 c = mix(light, dark, uDark) + vec3(0.75, 0.82, 1.0) * uFlash * (0.4 + 0.6 * n);
              gl_FragColor = vec4(c, min(1.0, a + uFlash * shapeA * 0.35));
            }`,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      )
      const cloud = new THREE.Mesh(track(new THREE.CircleGeometry(R * 1.2, 48)), cloudMat)
      cloud.rotation.x = -Math.PI / 2
      cloud.position.set(px, RAIN_H + 0.4, pz)
      scene.add(cloud)

      const boltPos = new THREE.BufferAttribute(new Float32Array(12 * 3), 3)
      const boltGeo = track(new THREE.BufferGeometry())
      boltGeo.setAttribute("position", boltPos)
      const boltMat = track(
        new THREE.LineBasicMaterial({ color: "#e8f1ff", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
      )
      const bolt = new THREE.Line(boltGeo, boltMat)
      bolt.frustumCulled = false
      scene.add(bolt)

      rainCells.push({
        id: asset.id, cx: px, cz: pz, radius: R, cur: { ...start }, u, boltPos, boltMat,
        nextFlash: 2 + Math.random() * 3, objects: [drops, splashes, cloud, bolt],
      })
    }
    const strike = (r: RainCell) => {
      const a = Math.random() * Math.PI * 2
      const rr = Math.sqrt(Math.random()) * r.radius * 0.7
      const gx = r.cx + Math.cos(a) * rr
      const gz = r.cz + Math.sin(a) * rr
      const n = r.boltPos.count
      for (let i = 0; i < n; i += 1) {
        const k = i / (n - 1)
        const jitter = i === 0 || i === n - 1 ? 0 : (Math.random() - 0.5) * 1.1
        r.boltPos.setXYZ(i, gx + jitter + (1 - k) * 0.6, RAIN_H * (1 - k), gz + (Math.random() - 0.5) * 0.6 * (1 - k))
      }
      r.boltPos.needsUpdate = true
      r.u.uFlash.value = 1
    }
    // Kualitas adaptif (0 = penuh): FPS rendah → resolusi & kepadatan hujan diturunkan.
    let quality = 0
    const RAIN_Q = [1, 0.6, 0.35]
    const stepWeather = (t: number, dt: number) => {
      const { weather } = propsRef.current
      const ease = 1 - Math.exp(-dt * 2.2)
      for (const r of rainCells) {
        const level = weather?.[r.id] ?? "ok"
        const tgt = WEATHER[level]
        const c = r.cur
        for (const k of Object.keys(tgt) as (keyof WeatherTarget)[]) c[k] += (tgt[k] - c[k]) * ease
        r.u.uTime.value = t
        r.u.uFall.value += dt * c.speed
        r.u.uPhase.value += dt * c.splash
        r.u.uDensity.value = c.density * RAIN_Q[quality]
        r.u.uLen.value = c.len
        r.u.uAlpha.value = c.alpha
        r.u.uWind.value.set(c.wind, 0, c.wind * 0.55)
        r.u.uCover.value = c.cover
        r.u.uDark.value = c.dark
        if (level === "alarm" && t > r.nextFlash) {
          strike(r)
          r.nextFlash = t + 2.5 + Math.random() * 5
        }
        r.u.uFlash.value *= Math.exp(-dt * 7)
        r.boltMat.opacity = r.u.uFlash.value > 0.55 ? r.u.uFlash.value : 0
      }
    }

    // --- Data drape: berpindah halus ke frame tujuan ------------------------------------
    type Shown = { wt: number[]; moist: number[]; ndvi: number[]; peat: number[]; rain3d: number; gate: number }
    const shownOf = (f: TwinFrame): Shown => ({
      wt: TWIN_BLOCKS.map((b) => f.blocks[b].waterTable),
      moist: TWIN_BLOCKS.map((b) => f.blocks[b].soilMoisture),
      ndvi: TWIN_BLOCKS.map((b) => f.blocks[b].ndvi),
      peat: TWIN_BLOCKS.map((b) => f.blocks[b].peatDepth),
      rain3d: f.rain3d,
      gate: f.gateOpening,
    })
    const mix = (a: number, b: number, t: number) => a + (b - a) * t
    const mixShown = (a: Shown, b: Shown, t: number): Shown => ({
      wt: a.wt.map((v, i) => mix(v, b.wt[i], t)),
      moist: a.moist.map((v, i) => mix(v, b.moist[i], t)),
      ndvi: a.ndvi.map((v, i) => mix(v, b.ndvi[i], t)),
      peat: a.peat.map((v, i) => mix(v, b.peat[i], t)),
      rain3d: mix(a.rain3d, b.rain3d, t),
      gate: mix(a.gate, b.gate, t),
    })
    let shown = shownOf(propsRef.current.frame)
    let tweenFrom = shown
    let tweenTo = shown
    let tweenT = 1

    const drawDrape = (st: Shown) => {
      const { layer, overlays, division } = propsRef.current
      const img = drapeImage.data
      img.fill(0)
      const drawFactor = st.gate / LIVE_GATE_OPENING
      if (overlays.theme || overlays.zones) {
        for (const p of pixels) {
          let wt = 0, moist = 0, ndvi = 0, peat = 0
          for (let b = 0; b < TWIN_BLOCKS.length; b += 1) {
            wt += p.weights[b] * st.wt[b]
            moist += p.weights[b] * st.moist[b]
            ndvi += p.weights[b] * st.ndvi[b]
            peat += p.weights[b] * st.peat[b]
          }
          const localWt = wt - 14 * Math.exp(-p.canalDist / 4) * drawFactor + p.noise * 3
          let rgb: [number, number, number] | null = null
          let alpha = 0
          if (overlays.theme) {
            const value =
              layer === "soilMoisture" ? moist + (localWt - wt) * 0.6
              : layer === "fireRisk" ? fireRiskIndex(localWt, st.rain3d)
              : layer === "ndvi" ? ndvi + p.noise * 0.04
              : layer === "peatDepth" ? peat + p.noise * 12
              : localWt
            rgb = rampColor(layer, value)
            alpha = 0.7
          } else if (localWt < WT_COMPLIANCE) {
            rgb = [1, 0.48, 0.4]
            alpha = 0.05 + 0.28 * clamp((WT_COMPLIANCE - localWt) / 25, 0, 1)
          } else if (localWt > WT_FLOOD) {
            rgb = [0.35, 0.72, 1]
            alpha = 0.2 + 0.45 * clamp((localWt - WT_FLOOD) / 12, 0, 1)
          }
          if (!rgb) continue
          if (!matchesBlock(p.block, division)) alpha *= 0.25
          img[p.idx] = rgb[0] * 255
          img[p.idx + 1] = rgb[1] * 255
          img[p.idx + 2] = rgb[2] * 255
          img[p.idx + 3] = alpha * 255
        }
      }
      drapeCtx.putImageData(drapeImage, 0, 0)
      drapeTexture.needsUpdate = true
      drape.visible = overlays.theme || overlays.zones
    }

    // --- Sinkronisasi state dari props ------------------------------------------------
    const refreshCallouts = () => {
      const { callouts, selectedId, overlays, labelIds } = propsRef.current
      for (const n of nodes) {
        const c = callouts[n.id] ?? { text: "—", level: "normal" as const }
        n.valueEl.textContent = c.text
        n.root.className = ["twin-label", levelClass(c.level), n.id === selectedId ? "is-selected" : "", n.hidden ? "is-hidden" : ""]
          .filter(Boolean)
          .join(" ")
        n.label.visible = (overlays.labels && (!labelIds || labelIds.includes(n.id))) || n.id === selectedId
        if (c.level !== n.level) {
          n.level = c.level
          const hex = STATUS_HEX[c.level]
          n.ringMat.color.set(hex)
          ;(n.haloMat.uniforms.uColor.value as THREE.Color).set(hex)
          n.haloMat.uniforms.uAlarm.value = c.level === "awas" || c.level === "offline" ? 1 : 0
          n.fillMat?.color.set(hex)
          n.offMark.visible = c.level === "offline"
        }
        if (n.fill) {
          const wt = typeof c.value === "number" ? c.value : -GAUGE_RANGE
          const h = clamp((GAUGE_RANGE + wt) / GAUGE_RANGE, 0, 1) * GAUGE_H
          n.fill.scale.y = Math.max(0.01, h)
          n.fill.position.y = n.fill.scale.y / 2
        }
      }
    }

    const refreshState = () => {
      const { frame, overlays, night, division } = propsRef.current
      const next = shownOf(frame)
      if (JSON.stringify(next) !== JSON.stringify(tweenTo)) {
        tweenFrom = shown
        tweenTo = next
        tweenT = 0
      }
      groundUniforms.uImagery.value = overlays.imagery ? 1 : 0
      groundUniforms.uNatural.value = night ? 0 : 1
      curtainMat.uniforms.uGain.value = night ? 1.25 : 1
      // Dengan bloom, pita cahaya diredam supaya garis batas tidak terlalu silau.
      glowWide.uniforms.uOpacity.value = (night ? 0.42 : 0.3) * (overlays.bloom ? 0.55 : 1)
      glowNear.uniforms.uOpacity.value = (night ? 0.62 : 0.5) * (overlays.bloom ? 0.7 : 1)
      waterMesh.visible = overlays.canals
      dataFlow.visible = overlays.links
      for (const r of rainCells) for (const o of r.objects) o.visible = overlays.rain
      for (const n of nodes) n.group.visible = n.block == null || matchesBlock(n.block, division)
      drawDrape(shown)
      refreshCallouts()
    }

    // --- Label anti-tumpang: geser ke atas; histeresis agar tidak loncat -----------------
    const projected = new THREE.Vector3()
    const declutter = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      const { selectedId } = propsRef.current
      const rank = (n: SensorNode) =>
        n.id === selectedId ? 0 : n.level === "awas" || n.level === "offline" ? 1 : n.level === "siaga" ? 2 : 3
      const items = nodes
        .filter((n) => n.group.visible && n.label.visible)
        .map((n) => {
          n.label.getWorldPosition(projected).project(camera)
          return {
            n,
            x: ((projected.x + 1) / 2) * w,
            y: ((1 - projected.y) / 2) * h,
            behind: projected.z > 1,
            bw: n.root.offsetWidth || 90,
            bh: n.root.offsetHeight || 22,
          }
        })
        .sort((a, b) => rank(a.n) - rank(b.n) || a.y - b.y)
      const placed: { x0: number; x1: number; y0: number; y1: number }[] = []
      for (const it of items) {
        if (it.behind) continue
        let chosen: number | null = null
        const pad = it.n.hidden ? 4 : -3
        const prev = it.n.dy
        for (const dy of [prev, ...LABEL_SHIFTS.filter((d) => d !== prev)]) {
          const box = {
            x0: it.x - it.bw / 2 - pad,
            x1: it.x + it.bw / 2 + pad,
            y0: it.y - it.bh * 1.15 + dy - pad,
            y1: it.y - it.bh * 0.15 + dy + pad,
          }
          if (!placed.some((p) => box.x0 < p.x1 && box.x1 > p.x0 && box.y0 < p.y1 && box.y1 > p.y0)) {
            chosen = dy
            placed.push(box)
            break
          }
        }
        // Yang terpilih & berstatus genting selalu tampil; sisanya boleh disembunyikan.
        it.n.hidden = chosen == null && rank(it.n) > 1
        it.n.root.classList.toggle("is-hidden", it.n.hidden)
        const dy = chosen ?? it.n.dy
        it.n.dy = dy
        it.n.root.style.setProperty("--dy", `${dy}px`)
        it.n.root.style.setProperty("--lead", `${Math.max(0, -dy)}px`)
      }
    }

    // --- Pilih & terbang ke sensor -----------------------------------------------------
    const clock = new THREE.Clock()
    const flyTo = (pos: THREE.Vector3, target: THREE.Vector3, dur = 1.3) => {
      fly = { t0: clock.elapsedTime, dur, p0: camera.position.clone(), p1: pos, t0v: controls.target.clone(), t1v: target }
    }
    const select = (id: string | null) => {
      const n = nodes.find((x) => x.id === id)
      if (!n) return
      const tgt = new THREE.Vector3(n.x, 1.2, n.z)
      const dir = camera.position.clone().sub(controls.target).normalize()
      if (dir.y < 0.45) dir.y = 0.45
      dir.normalize()
      flyTo(tgt.clone().add(dir.multiplyScalar(30)), tgt)
    }

    const flyToBlock = (b: number) => {
      const own = assetsXZ.filter(({ asset }) => asset.block === TWIN_BLOCKS[b])
      if (!own.length) return
      const tgt = new THREE.Vector3(
        own.reduce((a, o) => a + o.xz[0], 0) / own.length,
        0.5,
        own.reduce((a, o) => a + o.xz[1], 0) / own.length,
      )
      const dir = camera.position.clone().sub(controls.target).normalize()
      if (dir.y < 0.55) dir.y = 0.55
      dir.normalize()
      flyTo(tgt.clone().add(dir.multiplyScalar(46)), tgt)
    }

    const raycaster = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    let downX = 0
    let downY = 0
    // Hover: posisi kursor diproses di loop (maks. sekali per frame).
    let pointer: { x: number; y: number } | null = null
    let dragging = false
    let hoverDirty = false
    const onMove = (e: PointerEvent) => {
      pointer = { x: e.clientX, y: e.clientY }
      hoverDirty = true
    }
    const onLeave = () => {
      pointer = null
    }
    const onDown = (e: PointerEvent) => {
      downX = e.clientX
      downY = e.clientY
      dragging = true
    }
    const onUp = (e: PointerEvent) => {
      dragging = false
      hoverDirty = true
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 5) return
      const rect = renderer.domElement.getBoundingClientRect()
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
      raycaster.setFromCamera(ndc, camera)
      const hit = raycaster.intersectObjects(pickables.filter((p) => p.parent?.visible), false)[0]
      if (hit) propsRef.current.onSelect(hit.object.userData.id as string)
    }
    renderer.domElement.addEventListener("pointerdown", onDown)
    renderer.domElement.addEventListener("pointerup", onUp)
    renderer.domElement.addEventListener("pointermove", onMove)
    renderer.domElement.addEventListener("pointerleave", onLeave)

    // --- Ruang warna saat bloom ------------------------------------------------------------
    // Shader kustom menulis warna yang sudah dalam ruang layar (sRGB). Saat bloom aktif, scene
    // dirender ke target linear lalu OutputPass mengonversi ke sRGB — tanpa koreksi, warnanya
    // terkonversi dua kali (pucat). uOutLinear = 1 mengubah output shader kustom ke linear dulu.
    const outLinear = { value: 0 }
    {
      const done = new Set<THREE.Material>()
      scene.traverse((o) => {
        const mats = (o as THREE.Mesh).material
        for (const m of Array.isArray(mats) ? mats : mats ? [mats] : []) {
          if (!(m instanceof THREE.ShaderMaterial) || done.has(m)) continue
          done.add(m)
          m.uniforms.uOutLinear = outLinear
          const end = m.fragmentShader.lastIndexOf("}")
          m.fragmentShader =
            "uniform float uOutLinear;\n" +
            m.fragmentShader.slice(0, end) +
            "  gl_FragColor.rgb = mix(gl_FragColor.rgb, pow(max(gl_FragColor.rgb, vec3(0.0)), vec3(2.2)), uOutLinear);\n}" +
            m.fragmentShader.slice(end + 1)
        }
      })
    }

    // --- Ukuran & loop -------------------------------------------------------------------
    // Diagnostik kedip hitam: buka /digital-twin?glitch=1. Tiap frame, sesaat setelah dirender dan sebelum
    // ditampilkan, 35 titik buffer WebGL dibaca; titik hitam murni (0,0,0) yang banyak = frame tidak selesai
    // digambar oleh scene. Bila kedip terlihat tapi hitungan tidak naik, masalahnya setelah gambar (browser).
    const probeOn = new URLSearchParams(window.location.search).has("glitch")
    let probeFrames = 0
    let probeBad = 0
    const probeBuf = new Uint8Array(4)
    let probeEl: HTMLDivElement | null = null
    if (probeOn) {
      probeEl = document.createElement("div")
      probeEl.style.cssText =
        "position:absolute;left:12px;bottom:70px;z-index:9;padding:4px 8px;border-radius:6px;background:rgba(0,0,0,.8);color:#a7f3d0;font:11px ui-monospace,monospace;pointer-events:none"
      container.appendChild(probeEl)
    }
    const probe = () => {
      const gl = renderer.getContext()
      const W = gl.drawingBufferWidth
      const H = gl.drawingBufferHeight
      let zero = 0
      const cols: number[] = []
      for (let yi = 1; yi <= 5; yi += 1) {
        for (let xi = 1; xi <= 7; xi += 1) {
          gl.readPixels(Math.floor((W * xi) / 8), Math.floor((H * yi) / 6), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, probeBuf)
          if (probeBuf[0] + probeBuf[1] + probeBuf[2] === 0) {
            zero += 1
            cols.push(xi)
          }
        }
      }
      probeFrames += 1
      if (zero >= 5) {
        probeBad += 1
        console.warn("[twin glitch]", { frame: probeFrames, zero, of: 35, columns: cols, quality, bloom: propsRef.current.overlays.bloom })
      }
      if (probeEl) probeEl.textContent = `GLITCH ${probeBad} / ${probeFrames} frame`
    }
    const renderFrame = () => {
      // Bloom hanya di kualitas penuh (dimatikan otomatis bila FPS rendah).
      const bloomOn = propsRef.current.overlays.bloom && quality === 0
      outLinear.value = bloomOn ? 1 : 0
      // Campuran transparan di ruang linear terlihat lebih pekat; arsiran drape diimbangi.
      ;(drape.material as THREE.MeshBasicMaterial).opacity = bloomOn ? 0.6 : 1
      if (bloomOn) composer.render()
      else renderer.render(scene, camera)
      labelRenderer.render(scene, camera)
    }
    const resize = () => {
      const w = Math.max(1, container.clientWidth)
      const h = Math.max(1, container.clientHeight)
      renderer.setSize(w, h, false)
      renderer.domElement.style.width = "100%"
      renderer.domElement.style.height = "100%"
      labelRenderer.setSize(w, h)
      composer.setPixelRatio(renderer.getPixelRatio())
      composer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      rainScale.value = (h * renderer.getPixelRatio()) / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
      pxWorld.value = (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / h
      packetSize.value = 22 * renderer.getPixelRatio()
      computeHome()
      if (!userMoved && !fly) {
        camera.position.copy(home.pos)
        controls.target.copy(home.tgt)
      }
      // setSize mengosongkan canvas dan ResizeObserver berjalan setelah rAF, jadi tanpa ini satu frame hitam tampil.
      renderFrame()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(container)
    resize()
    refreshState()

    let lastImgUpload = -1
    let lastPatchCheck = 0
    let lastPatchUpload = 0
    let lastDeclutter = 0
    let lastHover = 0
    let lastT = 0
    let flow = 0
    let perfTime = 0
    let perfFrames = 0
    renderer.setAnimationLoop(() => {
      const t = clock.getElapsedTime()
      const raw = t - lastT
      const dt = Math.min(0.1, raw)
      lastT = t
      // Ukur FPS 3 detik sekali (setelah pemanasan, abaikan jeda tab tersembunyi);
      // bila < 30 FPS turunkan satu tingkat kualitas, maksimal dua kali.
      if (quality < 2 && t > 4 && raw < 0.25 && !document.hidden) {
        perfTime += raw
        perfFrames += 1
        if (perfTime >= 3) {
          if (perfFrames / perfTime < 30) {
            quality += 1
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === 1 ? 1.25 : 1))
            resize()
          }
          perfTime = 0
          perfFrames = 0
        }
      }
      const { onAzimuth, onTiles } = propsRef.current

      curtainMat.uniforms.uTime.value = t
      // Aliran kanal ikut bukaan pintu air (dianimasikan dari state yang tampil).
      flow += dt * 0.32 * (shown.gate / LIVE_GATE_OPENING)
      waterMat.uniforms.uFlowDrain.value = flow
      waterMat.uniforms.uTime.value = t
      groundUniforms.uTime.value = t
      // Genangan mengikuti hujan rata-rata 3 hari yang tampil (≥ ~16 mm/hari mulai menyebar).
      const floodTarget = clamp((shown.rain3d - 16) / 18, 0, 1)
      groundUniforms.uFlood.value += (floodTarget - groundUniforms.uFlood.value) * (1 - Math.exp(-dt * 1.5))

      // Upload tekstur citra dibatasi agar tile yang berdatangan tidak membuat tersendat.
      if (imgDirty && t - lastImgUpload > 0.3) {
        imgTex.needsUpdate = true
        imgDirty = false
        lastImgUpload = t
      }
      if (tilesChanged) {
        tilesChanged = false
        onTiles?.(imgLoaded, imgTotal)
      }
      if (t - lastPatchCheck > 0.4) {
        updatePatch()
        lastPatchCheck = t
      }
      if (patchDirty && t - lastPatchUpload > 0.25) {
        patchTex.needsUpdate = true
        patchDirty = false
        lastPatchUpload = t
      }

      if (tweenT < 1) {
        tweenT = Math.min(1, tweenT + dt / FRAME_TWEEN)
        shown = tweenT >= 1 ? tweenTo : mixShown(tweenFrom, tweenTo, easeInOut(tweenT))
        drawDrape(shown)
      }

      const camD = camera.position.distanceTo(controls.target) || 1
      splashSquash.value = Math.max(0.2, (camera.position.y - controls.target.y) / camD)
      const { selectedId } = propsRef.current
      for (const n of nodes) {
        n.haloMat.uniforms.uTime.value = t + n.x * 0.07
        const pulse = 1 + 0.08 * Math.sin(t * 3 + n.z)
        n.flash *= Math.exp(-dt * 3.5)
        n.ring.scale.setScalar((n.id === selectedId ? 1.55 * pulse : pulse) * (1 + 0.7 * n.flash))
        n.ringMat.opacity = n.level === "awas" ? 0.55 + 0.45 * Math.abs(Math.sin(t * 4)) : Math.min(1, 0.9 + 0.3 * n.flash)
        if (n.spin) n.spin.rotation.y = t * 0.8
        if (n.offMark.visible) {
          const blink = 0.5 + 0.5 * Math.sin(t * 5 + n.x)
          n.offRing.scale.setScalar(1 + 0.18 * blink)
          n.offRingMat.opacity = 0.35 + 0.5 * blink
          n.offBeaconMat.opacity = 0.3 + 0.7 * blink
        }
      }
      stepData(t)
      stepWeather(t, dt)

      if (fly) {
        const k = Math.min(1, (t - fly.t0) / fly.dur)
        const e = easeInOut(k)
        camera.position.lerpVectors(fly.p0, fly.p1, e)
        controls.target.lerpVectors(fly.t0v, fly.t1v, e)
        if (k >= 1) fly = null
      }
      // Hover: kursor tangan saat di atas sensor.
      if (pointer && !dragging && (hoverDirty || t - lastHover > 0.12)) {
        hoverDirty = false
        lastHover = t
        const rect = renderer.domElement.getBoundingClientRect()
        ndc.set(((pointer.x - rect.left) / rect.width) * 2 - 1, -((pointer.y - rect.top) / rect.height) * 2 + 1)
        raycaster.setFromCamera(ndc, camera)
        const onSensor = raycaster.intersectObjects(pickables.filter((p) => p.parent?.visible), false).length > 0
        renderer.domElement.style.cursor = onSensor ? "pointer" : "grab"
      }

      controls.update()
      // Titik orbit tetap di atas kawasan.
      controls.target.x = THREE.MathUtils.clamp(controls.target.x, -60, 60)
      controls.target.z = THREE.MathUtils.clamp(controls.target.z, -50, 50)
      onAzimuth?.(THREE.MathUtils.radToDeg(controls.getAzimuthalAngle()))
      renderFrame()
      if (probeOn) probe()
      if (t - lastDeclutter > 0.15) {
        declutter()
        lastDeclutter = t
      }
    })

    apiRef.current = {
      refreshState,
      refreshCallouts,
      select,
      setAutoRotate: (on) => {
        controls.autoRotate = on
      },
      setView: (view) => {
        if (view.mode === "focus") {
          select(view.id ?? null)
        } else if (view.mode === "block") {
          flyToBlock(TWIN_BLOCKS.indexOf(view.id ?? ""))
        } else if (view.mode === "north") {
          // Putar ke arah utara tanpa mengubah jarak & kemiringan kamera.
          const offset = camera.position.clone().sub(controls.target)
          const spherical = new THREE.Spherical().setFromVector3(offset)
          spherical.theta = 0
          flyTo(controls.target.clone().add(new THREE.Vector3().setFromSpherical(spherical)), controls.target.clone(), 0.9)
        } else {
          flyTo(home.pos.clone(), home.tgt.clone(), 1.4)
        }
      },
    }

    return () => {
      disposed = true
      apiRef.current = null
      renderer.setAnimationLoop(null)
      ro.disconnect()
      renderer.domElement.removeEventListener("pointerdown", onDown)
      renderer.domElement.removeEventListener("pointerup", onUp)
      renderer.domElement.removeEventListener("pointermove", onMove)
      renderer.domElement.removeEventListener("pointerleave", onLeave)
      for (const im of [...pendingImages, ...patchImgs]) {
        im.onload = null
        im.onerror = null
      }
      controls.dispose()
      for (const d of disposables) d.dispose()
      renderer.dispose()
      // dispose() saja tidak melepas konteks GL; tiap hot reload / pindah halaman menimbun konteks + render
      // target bloom di GPU sampai GC, dan itu membuat frame baru bisa tergambar sebagian (blok hitam).
      renderer.forceContextLoss()
      probeEl?.remove()
      renderer.domElement.remove()
      labelRenderer.domElement.remove()
    }
  }, [])

  const { frame, layer, overlays, night, division, selectedId, callouts, labelIds, autoRotate, view } = props

  useEffect(() => {
    apiRef.current?.refreshState()
  }, [frame, layer, overlays, night, division])

  useEffect(() => {
    apiRef.current?.refreshCallouts()
  }, [callouts, selectedId, labelIds])

  // Pilihan baru (dari klik di model atau chip di kartu) → kamera terbang ke sensor.
  // Dibandingkan dengan pilihan sebelumnya supaya efek ganda StrictMode tidak ikut terbang.
  const lastSelected = useRef(selectedId)
  useEffect(() => {
    if (lastSelected.current === selectedId) return
    lastSelected.current = selectedId
    apiRef.current?.select(selectedId)
  }, [selectedId])

  useEffect(() => {
    apiRef.current?.setAutoRotate(autoRotate)
  }, [autoRotate])

  useEffect(() => {
    if (view.nonce > 0) apiRef.current?.setView(view)
  }, [view])

  return <div ref={containerRef} className="relative isolate h-full w-full overflow-hidden" />
}
