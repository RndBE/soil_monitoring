"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type WheelEvent,
} from "react"
import { Info, Maximize2, Minus, Plus, X } from "lucide-react"

import { Button } from "@/components/ui/button"

type ElementKind = "channel" | "gate" | "node" | "structure"

type MapMetric = {
  label: string
  value: string
}

type SelectableElement = {
  id: string
  kind: ElementKind
  code: string
  name: string
  description: string
  metrics?: MapMetric[]
}

type SvgLabel = {
  text: string
  x: number
  y: number
  rotate?: number
  anchor?: "start" | "middle" | "end"
  size?: number
  weight?: number
  fill?: string
}

type ChannelElement = SelectableElement & {
  d: string
  stroke: string
  strokeWidth: number
  dash?: string
  labels?: SvgLabel[]
  decorations?: Array<{
    d: string
    stroke: string
    strokeWidth: number
    dash?: string
  }>
}

type GateElement = SelectableElement & {
  x: number
  y: number
  tone: "operational" | "backup"
  count: number | null
  label: string
  labelDx: number
  labelDy: number
  showLabel?: boolean
  connector?: { x1: number; y1: number; x2: number; y2: number }
}

type NodeElement = SelectableElement & {
  x: number
  y: number
  labelDx: number
  labelDy: number
  anchor?: "start" | "middle" | "end"
  tone?: "normal" | "highlight"
}

type StructureElement = SelectableElement & {
  x: number
  y: number
  width?: number
  height?: number
  label?: string
  labelDx?: number
  labelDy?: number
  rotate?: number
}

type ViewState = {
  x: number
  y: number
  scale: number
}

type DragState = {
  pointerId: number
  startX: number
  startY: number
  originX: number
  originY: number
  moved: boolean
}

type EditDragState = DragState & {
  elementId: string
}

type ContainerBounds = {
  width: number
  height: number
}

export type CisadaneLayoutItem = {
  x?: number
  y?: number
  labelDx?: number
  labelDy?: number
  width?: number
  height?: number
  showLabel?: boolean
}

export type CisadaneLayout = Record<string, CisadaneLayoutItem>

type Props = {
  height?: string
  layout?: CisadaneLayout
  editable?: boolean
  onLayoutChange?: (layout: CisadaneLayout) => void
}

const VIEWBOX_W = 1636
const VIEWBOX_H = 652
const INITIAL_OVERVIEW_SCALE = 0.78
const MIN_SCALE = 0.35
const MAX_SCALE = 5

const CISADANE_CHANNELS: ChannelElement[] = [
  {
    id: "sungai-ciliwung",
    kind: "channel",
    code: "SCW",
    name: "Sungai Ciliwung",
    description: "Sungai utama di sisi hulu yang memasok jaringan bagian Ciliwung.",
    d: "M 394 146 C 455 126 478 112 520 101 C 590 84 655 100 740 100",
    stroke: "#1455b8",
    strokeWidth: 4,
    decorations: [
      {
        d: "M 395 157 C 456 140 494 127 535 119 C 595 108 662 111 721 112",
        stroke: "#38bdf8",
        strokeWidth: 2.5,
      },
      {
        d: "M 392 169 L 710 169 L 710 118 L 721 118 L 721 181 L 394 181",
        stroke: "#15803d",
        strokeWidth: 3,
      },
      {
        d: "M 395 158 L 685 158 L 685 127",
        stroke: "#15803d",
        strokeWidth: 2,
      },
    ],
    labels: [
      {
        text: "SUNGAI CILIWUNG",
        x: 592,
        y: 91,
        anchor: "start",
        size: 13,
        weight: 800,
        fill: "#0f172a",
      },
    ],
    metrics: [
      { label: "Tipe", value: "Sungai utama" },
      { label: "Arah", value: "Barat ke timur" },
    ],
  },
  {
    id: "saluran-sekunder-sarakan",
    kind: "channel",
    code: "CBL7",
    name: "Saluran Sekunder Sarakan",
    description: "Cabang sekunder di sisi kiri jaringan CBL7.",
    d: "M 306 170 L 398 170",
    stroke: "#15803d",
    strokeWidth: 3,
    labels: [
      { text: "Saluran Sekunder Sarakan", x: 260, y: 191, anchor: "start", size: 12, fill: "#0f172a" },
      { text: "(CBL7)", x: 347, y: 209, anchor: "middle", size: 11, fill: "#0f172a" },
    ],
    metrics: [
      { label: "Kelas", value: "Sekunder" },
      { label: "Node", value: "CBL7" },
    ],
  },
  {
    id: "saluran-induk-barat-laut",
    kind: "channel",
    code: "CBL",
    name: "Saluran Induk Cisadane Barat Laut",
    description: "Ruas vertikal CBL dari CBL7 menuju saluran induk Cisadane Kiri.",
    d: "M 398 146 L 398 586",
    stroke: "#15803d",
    strokeWidth: 4,
    metrics: [
      { label: "Kelas", value: "Induk" },
      { label: "Titik", value: "CBL7 sampai B-CBL1" },
    ],
  },
  {
    id: "pintu-sorong-rehab",
    kind: "channel",
    code: "PSR",
    name: "Pintu Sorong Rehab",
    description: "Ruas tersier penghubung dari area CBL3 menuju saluran Pisangan.",
    d: "M 314 365 L 398 365 L 398 380 L 780 380",
    stroke: "#16a34a",
    strokeWidth: 3,
    dash: "9 7",
    metrics: [
      { label: "Kelas", value: "Tersier" },
      { label: "Status", value: "Rehab" },
    ],
  },
  {
    id: "saluran-sekunder-rengas",
    kind: "channel",
    code: "PS",
    name: "Saluran Sekunder Pisangan",
    description: "Ruas vertikal Pisangan dengan node B-PS4 sampai B-PS1.",
    d: "M 780 92 L 780 380",
    stroke: "#0f766e",
    strokeWidth: 4,
    labels: [
      { text: "SALURAN SEKUNDER PISANGAN", x: 757, y: 300, rotate: -90, anchor: "middle", size: 13, weight: 800 },
    ],
    metrics: [
      { label: "Kelas", value: "Sekunder" },
      { label: "Node", value: "B-PS4 sampai B-PS1" },
    ],
  },
  {
    id: "saluran-sekunder-kemang",
    kind: "channel",
    code: "KE",
    name: "Saluran Sekunder Kedungu",
    description: "Ruas vertikal Kedungu yang terhubung ke saluran induk Cisadane Kiri.",
    d: "M 970 92 L 970 586",
    stroke: "#334155",
    strokeWidth: 4,
    labels: [
      { text: "SALURAN SEKUNDER KEDUNGU", x: 947, y: 485, rotate: -90, anchor: "middle", size: 13, weight: 800 },
    ],
    metrics: [
      { label: "Kelas", value: "Sekunder" },
      { label: "Node", value: "B-KE7 sampai B-KN2" },
    ],
  },
  {
    id: "saluran-induk-cisadane-kiri",
    kind: "channel",
    code: "CKI",
    name: "Saluran Induk Cisadane Kiri",
    description: "Ruas utama horizontal di bagian bawah skema.",
    d: "M 24 586 C 104 589 126 577 184 584 C 250 591 258 579 338 585 L 1616 586",
    stroke: "#1e3a8a",
    strokeWidth: 6,
    decorations: [
      {
        d: "M 24 597 C 104 600 126 588 184 595 C 250 602 258 590 338 596 L 1616 597",
        stroke: "#93c5fd",
        strokeWidth: 2,
      },
    ],
    labels: [
      { text: "SALURAN INDUK CISADANE KIRI", x: 690, y: 574, anchor: "middle", size: 15, weight: 800 },
    ],
    metrics: [
      { label: "Kelas", value: "Induk" },
      { label: "Arah", value: "Barat ke timur" },
    ],
  },
  {
    id: "sungai-cisadane",
    kind: "channel",
    code: "CSL",
    name: "Sungai Cisadane",
    description: "Sungai vertikal di sisi kanan tengah skema.",
    d: "M 1368 40 L 1368 536",
    stroke: "#1d70b8",
    strokeWidth: 3,
    decorations: [
      { d: "M 1368 40 L 1362 50 M 1368 40 L 1374 50", stroke: "#1d70b8", strokeWidth: 3 },
    ],
    labels: [
      { text: "Sungai Cisadane", x: 1353, y: 341, rotate: -90, anchor: "middle", size: 15, weight: 800 },
    ],
    metrics: [
      { label: "Tipe", value: "Sungai" },
      { label: "Posisi", value: "Kanan tengah" },
    ],
  },
  {
    id: "saluran-sekunder-rancabung",
    kind: "channel",
    code: "RCB",
    name: "Saluran Sekunder Belimbing",
    description: "Ruas sekunder Belimbing menuju B-B2 dan B-B1.",
    d: "M 1544 58 L 1544 318 L 1450 318",
    stroke: "#b91c1c",
    strokeWidth: 4,
    labels: [
      { text: "Saluran Sekunder Belimbing", x: 1525, y: 221, rotate: -90, anchor: "middle", size: 12, weight: 700 },
    ],
    metrics: [
      { label: "Kelas", value: "Sekunder" },
      { label: "Node", value: "B-B2 dan B-B1" },
    ],
  },
  {
    id: "saluran-sekunder-cisadane",
    kind: "channel",
    code: "CU",
    name: "Saluran Sekunder Cisadane",
    description: "Ruas vertikal kanan dengan node B-CU7 sampai B-CU1.",
    d: "M 1450 58 L 1450 586",
    stroke: "#1e1b4b",
    strokeWidth: 4,
    decorations: [
      { d: "M 1450 318 L 1450 586", stroke: "#b91c1c", strokeWidth: 4 },
    ],
    labels: [
      { text: "Saluran Induk Cisadane Utara", x: 1427, y: 493, rotate: -90, anchor: "middle", size: 12, weight: 700 },
    ],
    metrics: [
      { label: "Kelas", value: "Sekunder" },
      { label: "Node", value: "B-CU7 sampai B-CU1" },
    ],
  },
  {
    id: "saluran-cisadane-timur",
    kind: "channel",
    code: "CTM",
    name: "Saluran Cisadane Timur",
    description: "Lanjutan saluran di kanan bawah setelah B-CA5 Kanan.",
    d: "M 1450 586 L 1616 586",
    stroke: "#1e3a8a",
    strokeWidth: 5,
    labels: [
      { text: "SI Cisadane Timur", x: 1525, y: 615, anchor: "middle", size: 12, weight: 700 },
    ],
    metrics: [
      { label: "Kelas", value: "Induk" },
      { label: "Posisi", value: "Timur" },
    ],
  },
]

const CISADANE_GATES: GateElement[] = [
  {
    id: "gate-cbl3-barat",
    kind: "gate",
    code: "G-CBL3-B",
    name: "Pintu Air Operasional CBL3 Barat",
    description: "Pintu operasional cabang barat pada ruas CBL3.",
    x: 340,
    y: 340,
    tone: "operational",
    count: 3,
    label: "3 Pintu",
    labelDx: -52,
    labelDy: 8,
    showLabel: false,
    connector: { x1: 340, y1: 356, x2: 340, y2: 366 },
    metrics: [
      { label: "Status", value: "Operasional" },
      { label: "Jumlah pintu", value: "3" },
    ],
  },
  {
    id: "gate-cbl5",
    kind: "gate",
    code: "G-CBL5",
    name: "Pintu Air Operasional B-CBL5",
    description: "Pintu operasional pada ruas CBL5.",
    x: 424,
    y: 299,
    tone: "operational",
    count: 2,
    label: "2 Pintu",
    labelDx: 18,
    labelDy: -1,
    showLabel: false,
    connector: { x1: 408, y1: 300, x2: 398, y2: 300 },
    metrics: [
      { label: "Status", value: "Operasional" },
      { label: "Jumlah pintu", value: "2" },
    ],
  },
  {
    id: "gate-ps1",
    kind: "gate",
    code: "G-PS1",
    name: "Pintu Air Operasional B-PS1",
    description: "Pintu operasional pada saluran Pisangan di titik B-PS1.",
    x: 862,
    y: 327,
    tone: "operational",
    count: 1,
    label: "1 Pintu",
    labelDx: 14,
    labelDy: -23,
    connector: { x1: 862, y1: 345, x2: 862, y2: 351 },
    metrics: [
      { label: "Status", value: "Operasional" },
      { label: "Jumlah pintu", value: "1" },
    ],
  },
  {
    id: "gate-ps4-cadangan",
    kind: "gate",
    code: "G-PS4-C",
    name: "Pintu Air Cadangan B-PS4",
    description: "Pintu cadangan pada titik B-PS4.",
    x: 862,
    y: 147,
    tone: "backup",
    count: null,
    label: "Nihil",
    labelDx: 23,
    labelDy: -2,
    metrics: [
      { label: "Status", value: "Cadangan" },
      { label: "Jumlah pintu", value: "Nihil" },
    ],
  },
  {
    id: "gate-ps3-cadangan",
    kind: "gate",
    code: "G-PS3-C",
    name: "Pintu Air Cadangan B-PS3",
    description: "Pintu cadangan pada titik B-PS3.",
    x: 862,
    y: 220,
    tone: "backup",
    count: null,
    label: "Nihil",
    labelDx: 23,
    labelDy: -2,
    metrics: [
      { label: "Status", value: "Cadangan" },
      { label: "Jumlah pintu", value: "Nihil" },
    ],
  },
  {
    id: "gate-cbl1",
    kind: "gate",
    code: "G-CBL1",
    name: "Pintu Air Operasional B-CBL1",
    description: "Pintu operasional di dekat saluran induk Cisadane Kiri.",
    x: 330,
    y: 550,
    tone: "operational",
    count: 3,
    label: "3 Pintu",
    labelDx: -51,
    labelDy: 4,
    showLabel: false,
    metrics: [
      { label: "Status", value: "Operasional" },
      { label: "Jumlah pintu", value: "3" },
    ],
  },
  {
    id: "gate-cbl1-selatan",
    kind: "gate",
    code: "G-CBL1-S",
    name: "Pintu Air Operasional Selatan B-CBL1",
    description: "Pintu operasional arah aliran selatan pada bagian bawah CBL1.",
    x: 352,
    y: 620,
    tone: "operational",
    count: 6,
    label: "6 Pintu",
    labelDx: -72,
    labelDy: 4,
    showLabel: false,
    connector: { x1: 382, y1: 608, x2: 382, y2: 586 },
    metrics: [
      { label: "Status", value: "Operasional" },
      { label: "Jumlah pintu", value: "6" },
    ],
  },
  {
    id: "gate-kn2-cadangan",
    kind: "gate",
    code: "G-KN2-C",
    name: "Pintu Air Cadangan B-KN2",
    description: "Pintu cadangan pada sambungan Kedungu menuju induk kiri.",
    x: 904,
    y: 566,
    tone: "backup",
    count: 2,
    label: "2 Pintu",
    labelDx: -71,
    labelDy: -22,
    metrics: [
      { label: "Status", value: "Cadangan" },
      { label: "Jumlah pintu", value: "2" },
    ],
  },
  {
    id: "gate-kn1",
    kind: "gate",
    code: "G-KN1",
    name: "Pintu Aktuator Lumpur B-KN1",
    description: "Pintu actuator lumpur pada area intake kiri.",
    x: 1088,
    y: 545,
    tone: "operational",
    count: 4,
    label: "4 Pintu",
    labelDx: -14,
    labelDy: -28,
    connector: { x1: 1088, y1: 563, x2: 1088, y2: 586 },
    metrics: [
      { label: "Status", value: "Operasional" },
      { label: "Jumlah pintu", value: "4" },
      { label: "Catatan", value: "Pintu actuator lumpur KI" },
    ],
  },
  {
    id: "gate-km1",
    kind: "gate",
    code: "G-KM1",
    name: "Pintu Aktuator Lumpur B-KM1",
    description: "Pintu actuator lumpur pada area intake kanan.",
    x: 1250,
    y: 545,
    tone: "operational",
    count: 5,
    label: "5 Pintu",
    labelDx: -14,
    labelDy: -28,
    connector: { x1: 1250, y1: 563, x2: 1250, y2: 586 },
    metrics: [
      { label: "Status", value: "Operasional" },
      { label: "Jumlah pintu", value: "5" },
      { label: "Catatan", value: "Pintu actuator lumpur KA" },
    ],
  },
]

const CISADANE_NODES: NodeElement[] = [
  { id: "node-ss", kind: "node", code: "SS", name: "SS", description: "Titik awal sungai Ciliwung pada skema.", x: 398, y: 146, labelDx: -40, labelDy: 3, anchor: "end" },
  { id: "node-bs", kind: "node", code: "BS", name: "BS", description: "Titik saluran sekunder Sarakan.", x: 398, y: 170, labelDx: -93, labelDy: 3, anchor: "end" },
  { id: "node-cbl7", kind: "node", code: "CBL7", name: "CBL7", description: "Node CBL7 di saluran Sarakan.", x: 398, y: 170, labelDx: 13, labelDy: 5 },
  { id: "node-cbl6", kind: "node", code: "B CBL6", name: "B-CBL6", description: "Bangunan CBL6.", x: 398, y: 244, labelDx: -18, labelDy: 4, anchor: "end" },
  { id: "node-cbl5", kind: "node", code: "B CBL5", name: "B-CBL5", description: "Bangunan CBL5.", x: 398, y: 299, labelDx: -18, labelDy: 4, anchor: "end" },
  { id: "node-cbl3", kind: "node", code: "B CBL3", name: "B-CBL3", description: "Bangunan CBL3 pada ruas pintu sorong rehab.", x: 398, y: 365, labelDx: 15, labelDy: 5, tone: "highlight" },
  { id: "node-cbl2", kind: "node", code: "B CBL2", name: "B-CBL2", description: "Bangunan CBL2.", x: 398, y: 435, labelDx: 13, labelDy: 4 },
  { id: "node-cbl1", kind: "node", code: "B CBL1", name: "B-CBL1", description: "Bangunan CBL1 di dekat saluran induk.", x: 398, y: 493, labelDx: 13, labelDy: 4 },
  { id: "node-ps4", kind: "node", code: "B PS4", name: "B-PS4", description: "Bangunan PS4.", x: 780, y: 132, labelDx: 13, labelDy: 4 },
  { id: "node-ps3", kind: "node", code: "B PS3", name: "B-PS3", description: "Bangunan PS3.", x: 780, y: 205, labelDx: 13, labelDy: 4 },
  { id: "node-ps2", kind: "node", code: "B PS2", name: "B-PS2", description: "Bangunan PS2.", x: 780, y: 267, labelDx: 13, labelDy: 4 },
  { id: "node-ps1", kind: "node", code: "B PS1", name: "B-PS1", description: "Bangunan PS1.", x: 780, y: 327, labelDx: 13, labelDy: 4, tone: "highlight" },
  { id: "node-ke7", kind: "node", code: "B KE7", name: "B-KE7", description: "Bangunan KE7.", x: 970, y: 145, labelDx: 13, labelDy: 4 },
  { id: "node-ke6", kind: "node", code: "B KE6", name: "B-KE6", description: "Bangunan KE6.", x: 970, y: 205, labelDx: 13, labelDy: 4 },
  { id: "node-ke5", kind: "node", code: "B KE5", name: "B-KE5", description: "Bangunan KE5.", x: 970, y: 266, labelDx: 13, labelDy: 4 },
  { id: "node-ke4", kind: "node", code: "B KE4", name: "B-KE4", description: "Bangunan KE4.", x: 970, y: 328, labelDx: 13, labelDy: 4 },
  { id: "node-ke3", kind: "node", code: "B KE3", name: "B-KE3", description: "Bangunan KE3.", x: 970, y: 382, labelDx: 13, labelDy: 4 },
  { id: "node-ke2", kind: "node", code: "B KE2", name: "B-KE2", description: "Bangunan KE2.", x: 970, y: 468, labelDx: 13, labelDy: 4 },
  { id: "node-ke1", kind: "node", code: "B KE1", name: "B-KE1", description: "Bangunan KE1.", x: 970, y: 520, labelDx: 13, labelDy: 4 },
  { id: "node-kn2", kind: "node", code: "B KN2", name: "B-KN2", description: "Bangunan KN2 di simpul Kedungu.", x: 970, y: 566, labelDx: 13, labelDy: 4, tone: "highlight" },
  { id: "node-cu7", kind: "node", code: "B CU7", name: "B-CU7", description: "Bangunan CU7.", x: 1450, y: 119, labelDx: 13, labelDy: 4 },
  { id: "node-cu6", kind: "node", code: "B CU6", name: "B-CU6", description: "Bangunan CU6.", x: 1450, y: 186, labelDx: 13, labelDy: 4 },
  { id: "node-cu5", kind: "node", code: "B CU5", name: "B-CU5", description: "Bangunan CU5.", x: 1450, y: 248, labelDx: 13, labelDy: 4 },
  { id: "node-cu4", kind: "node", code: "B CU4", name: "B-CU4", description: "Bangunan CU4.", x: 1450, y: 310, labelDx: 13, labelDy: 4, tone: "highlight" },
  { id: "node-cu3a", kind: "node", code: "B CU3a", name: "B-CU3a", description: "Talang B-CU3a.", x: 1450, y: 365, labelDx: 13, labelDy: 4 },
  { id: "node-cu2", kind: "node", code: "B CU2", name: "B-CU2", description: "Bangunan CU2.", x: 1450, y: 423, labelDx: 13, labelDy: 4 },
  { id: "node-cu1", kind: "node", code: "B CU1", name: "B-CU1", description: "Bangunan CU1.", x: 1450, y: 482, labelDx: 13, labelDy: 4 },
  { id: "node-bb2", kind: "node", code: "B B2", name: "B-B2", description: "Bangunan B2 pada Belimbing.", x: 1544, y: 153, labelDx: 13, labelDy: 4 },
  { id: "node-bb1", kind: "node", code: "B B1", name: "B-B1", description: "Bangunan B1 pada Belimbing.", x: 1544, y: 185, labelDx: 13, labelDy: 4 },
  { id: "node-bca5", kind: "node", code: "B CA5", name: "B-CA5", description: "Bangunan CA5 di area intake.", x: 1368, y: 586, labelDx: 10, labelDy: -24 },
]

const CISADANE_STRUCTURES: StructureElement[] = [
  {
    id: "struktur-b-cbl3",
    kind: "structure",
    code: "REG-CBL3",
    name: "Bangunan Pengatur B-CBL3",
    description: "Bangunan pengatur pada percabangan CBL3.",
    x: 384,
    y: 367,
    width: 18,
    height: 16,
    label: "C",
    labelDx: 0,
    labelDy: -16,
    metrics: [{ label: "Tipe", value: "Bangunan pengatur" }],
  },
  {
    id: "struktur-b-cbl1",
    kind: "structure",
    code: "REG-CBL1",
    name: "Bangunan Pengatur B-CBL1",
    description: "Bangunan pengatur pada sambungan CBL1 ke saluran induk.",
    x: 382,
    y: 608,
    width: 18,
    height: 18,
    label: "F",
    labelDx: 0,
    labelDy: -18,
    metrics: [{ label: "Tipe", value: "Bangunan pengatur" }],
  },
  {
    id: "struktur-b-kn1",
    kind: "structure",
    code: "B-KN1",
    name: "Bangunan Pengatur B-KN1",
    description: "Bangunan pengatur di area pintu actuator intake kiri.",
    x: 1118,
    y: 586,
    width: 18,
    height: 22,
    label: "B KN1",
    labelDx: 28,
    labelDy: -10,
    metrics: [{ label: "Tipe", value: "Bangunan pengatur" }],
  },
  {
    id: "struktur-b-km1",
    kind: "structure",
    code: "B-KM1",
    name: "Bangunan Pengatur B-KM1",
    description: "Bangunan pengatur di area pintu actuator intake kanan.",
    x: 1280,
    y: 586,
    width: 18,
    height: 22,
    label: "B KM1",
    labelDx: 28,
    labelDy: -10,
    metrics: [{ label: "Tipe", value: "Bangunan pengatur" }],
  },
  {
    id: "struktur-int-c3",
    kind: "structure",
    code: "INT-C3",
    name: "Intake C3",
    description: "Intake C3 pada area pertemuan Cisadane dan saluran induk.",
    x: 1345,
    y: 586,
    width: 22,
    height: 16,
    label: "Int. C3",
    labelDx: 0,
    labelDy: 30,
    metrics: [{ label: "Tipe", value: "Intake" }],
  },
  {
    id: "struktur-int-cka",
    kind: "structure",
    code: "INT-CKA",
    name: "Intake CKa",
    description: "Intake CKa sebelum saluran Cisadane Timur.",
    x: 1397,
    y: 586,
    width: 22,
    height: 16,
    label: "Int. Cka",
    labelDx: 0,
    labelDy: 30,
    metrics: [{ label: "Tipe", value: "Intake" }],
  },
  {
    id: "struktur-bca5-kanan",
    kind: "structure",
    code: "BCA5-K",
    name: "B CA5 Kanan",
    description: "Bangunan CA5 kanan pada sambungan bawah.",
    x: 1415,
    y: 586,
    width: 20,
    height: 16,
    label: "B CA5 Kanan",
    labelDx: 28,
    labelDy: -10,
    metrics: [{ label: "Tipe", value: "Bangunan pengatur" }],
  },
]

const KIND_LABEL: Record<ElementKind, string> = {
  channel: "Saluran / sungai",
  gate: "Pintu air",
  node: "Node jaringan",
  structure: "Bangunan pengatur",
}

function pentagonPath(cx: number, cy: number, radius: number) {
  const points: string[] = []

  for (let i = 0; i < 5; i += 1) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5
    const x = cx + radius * Math.cos(angle)
    const y = cy + radius * Math.sin(angle)
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }

  return `M ${points.join(" L ")} Z`
}

function gatePalette(tone: GateElement["tone"]) {
  if (tone === "backup") {
    return {
      fill: "#facc15",
      stroke: "#854d0e",
      text: "#422006",
      selected: "#0f172a",
    }
  }

  return {
    fill: "#dc2626",
    stroke: "#7f1d1d",
    text: "#ffffff",
    selected: "#0f172a",
  }
}

function getOverviewScale(width: number, height: number) {
  return Math.max(width / VIEWBOX_W, height / VIEWBOX_H)
}

function clampScale(scale: number, minScale = MIN_SCALE) {
  return Math.max(minScale, Math.min(MAX_SCALE, scale))
}

function applyLayout<T extends { id: string }>(items: T[], layout?: CisadaneLayout): T[] {
  if (!layout) return items
  return items.map((item) => ({ ...item, ...layout[item.id] }) as T)
}

function constrainView(view: ViewState, bounds: ContainerBounds): ViewState {
  const minScale = getOverviewScale(bounds.width, bounds.height)
  const scale = clampScale(view.scale, minScale)
  const contentWidth = VIEWBOX_W * scale
  const contentHeight = VIEWBOX_H * scale
  const x =
    contentWidth <= bounds.width
      ? (bounds.width - contentWidth) / 2
      : Math.min(0, Math.max(bounds.width - contentWidth, view.x))
  const y =
    contentHeight <= bounds.height
      ? 0
      : Math.min(0, Math.max(bounds.height - contentHeight, view.y))

  return { x, y, scale }
}

export function PetaCisadaneInteraktif({ height = "100%", layout = {}, editable = false, onLayoutChange }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const editDragRef = useRef<EditDragState | null>(null)
  const dragMovedRef = useRef(false)
  const [view, setView] = useState<ViewState>({ x: 0, y: 0, scale: INITIAL_OVERVIEW_SCALE })
  const [isDragging, setIsDragging] = useState(false)
  const [selected, setSelected] = useState<SelectableElement | null>(null)
  const structures = applyLayout(CISADANE_STRUCTURES, layout)
  const nodes = applyLayout(CISADANE_NODES, layout)
  const gates = applyLayout(CISADANE_GATES, layout)

  const constrainForContainer = useCallback((nextView: ViewState) => {
    const container = containerRef.current
    if (!container) return nextView

    const rect = container.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return nextView

    return constrainView(nextView, { width: rect.width, height: rect.height })
  }, [])

  const fitToContainer = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return

    const scale = getOverviewScale(rect.width, rect.height)

    setView(
      constrainView(
        {
          scale,
          x: 0,
          y: 0,
        },
        { width: rect.width, height: rect.height }
      )
    )
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    fitToContainer()

    const resizeObserver = new ResizeObserver(() => {
      fitToContainer()
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
    }
  }, [fitToContainer])

  const zoomAt = useCallback((pointX: number, pointY: number, factor: number) => {
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return

    const bounds = { width: rect.width, height: rect.height }

    setView((current) => {
      const nextScale = clampScale(current.scale * factor, getOverviewScale(bounds.width, bounds.height))
      const ratio = nextScale / current.scale

      return constrainView(
        {
          scale: nextScale,
          x: pointX - (pointX - current.x) * ratio,
          y: pointY - (pointY - current.y) * ratio,
        },
        bounds
      )
    })
  }, [])

  const zoomFromCenter = useCallback(
    (factor: number) => {
      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      zoomAt(rect.width / 2, rect.height / 2, factor)
    },
    [zoomAt]
  )

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault()

    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const pointX = event.clientX - rect.left
    const pointY = event.clientY - rect.top
    const factor = event.deltaY > 0 ? 1 / 1.16 : 1.16

    zoomAt(pointX, pointY, factor)
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return

    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: view.x,
      originY: view.y,
      moved: false,
    }
    dragMovedRef.current = false
    setIsDragging(true)
  }

  const startElementEditDrag = (event: PointerEvent<SVGGElement>, element: { id: string; x: number; y: number }) => {
    if (!editable || !onLayoutChange || event.button !== 0) return

    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    editDragRef.current = {
      elementId: element.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: element.x,
      originY: element.y,
      moved: false,
    }
    dragMovedRef.current = false
    setIsDragging(true)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const editDrag = editDragRef.current
    if (editDrag && editDrag.pointerId === event.pointerId) {
      const dx = (event.clientX - editDrag.startX) / view.scale
      const dy = (event.clientY - editDrag.startY) / view.scale

      if (Math.abs(event.clientX - editDrag.startX) + Math.abs(event.clientY - editDrag.startY) > 3) {
        editDrag.moved = true
      }

      onLayoutChange?.({
        ...layout,
        [editDrag.elementId]: {
          ...layout[editDrag.elementId],
          x: Math.round((editDrag.originX + dx) * 100) / 100,
          y: Math.round((editDrag.originY + dy) * 100) / 100,
        },
      })
      return
    }

    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY

    if (Math.abs(dx) + Math.abs(dy) > 3) {
      drag.moved = true
    }

    setView((current) =>
      constrainForContainer({
        ...current,
        x: drag.originX + dx,
        y: drag.originY + dy,
      })
    )
  }

  const finishPointerDrag = (event: PointerEvent<HTMLDivElement>) => {
    const editDrag = editDragRef.current
    if (editDrag && editDrag.pointerId === event.pointerId) {
      dragMovedRef.current = editDrag.moved
      editDragRef.current = null
      setIsDragging(false)
      return
    }

    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    dragMovedRef.current = drag.moved
    dragRef.current = null
    setIsDragging(false)

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const selectElement = (element: SelectableElement) => {
    if (dragMovedRef.current) {
      dragMovedRef.current = false
      return
    }

    setSelected(element)
  }

  const clearSelection = () => {
    if (dragMovedRef.current) {
      dragMovedRef.current = false
      return
    }

    setSelected(null)
  }

  const handleKeySelect = (event: KeyboardEvent<SVGGElement>, element: SelectableElement) => {
    if (event.key !== "Enter" && event.key !== " ") return

    event.preventDefault()
    setSelected(element)
  }

  const isSelected = (id: string) => selected?.id === id

  return (
    <div className="h-full w-full" style={{ height }}>
      <div className="relative h-full overflow-hidden bg-white">
        <div
          ref={containerRef}
          className="h-full w-full overflow-hidden bg-white"
          style={{
            cursor: isDragging ? "grabbing" : "grab",
            touchAction: "none",
            userSelect: "none",
          }}
          onClick={clearSelection}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishPointerDrag}
          onPointerCancel={finishPointerDrag}
          onWheel={handleWheel}
        >
          <div
            style={{
              width: VIEWBOX_W,
              height: VIEWBOX_H,
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
              transformOrigin: "0 0",
            }}
          >
            <svg
              aria-label="Peta jaringan irigasi Sungai Ciliwung - Cisadane"
              className="block"
              height={VIEWBOX_H}
              role="img"
              viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
              width={VIEWBOX_W}
            >
              <g aria-label="Arah utara" transform="translate(70 218)">
                <text x={0} y={-26} fill="#0f172a" fontSize={18} fontWeight={800} textAnchor="middle">
                  U
                </text>
                <path d="M 0 -10 L 15 42 L 0 27 L -15 42 Z" fill="#0f172a" stroke="#0f172a" strokeWidth={1} />
              </g>

              <Legend />

              <g>
                {CISADANE_CHANNELS.map((channel) => {
                  const selectedChannel = isSelected(channel.id)

                  return (
                    <g
                      key={channel.id}
                      aria-label={`${KIND_LABEL[channel.kind]} ${channel.name}`}
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation()
                        selectElement(channel)
                      }}
                      onKeyDown={(event) => handleKeySelect(event, channel)}
                      style={{ cursor: "pointer", outline: "none" }}
                    >
                      <path
                        d={channel.d}
                        fill="none"
                        pointerEvents="stroke"
                        stroke="transparent"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={Math.max(18, channel.strokeWidth + 14)}
                      />
                      {channel.decorations?.map((decoration) => (
                        <path
                          key={decoration.d}
                          d={decoration.d}
                          fill="none"
                          pointerEvents="none"
                          stroke={decoration.stroke}
                          strokeDasharray={decoration.dash}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={decoration.strokeWidth}
                        />
                      ))}
                      <path
                        d={channel.d}
                        fill="none"
                        pointerEvents="none"
                        stroke={channel.stroke}
                        strokeDasharray={channel.dash}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={selectedChannel ? channel.strokeWidth + 3 : channel.strokeWidth}
                      />
                      {channel.labels?.map((label) => (
                        <text
                          key={`${channel.id}-${label.text}`}
                          x={label.x}
                          y={label.y}
                          fill={label.fill ?? "#0f172a"}
                          fontSize={label.size ?? 12}
                          fontWeight={label.weight ?? 700}
                          pointerEvents="none"
                          textAnchor={label.anchor ?? "start"}
                          transform={label.rotate ? `rotate(${label.rotate} ${label.x} ${label.y})` : undefined}
                        >
                          {label.text}
                        </text>
                      ))}
                    </g>
                  )
                })}
              </g>

              <g>
                {structures.map((structure) => (
                  <g
                    key={structure.id}
                    aria-label={`${KIND_LABEL[structure.kind]} ${structure.name}`}
                    role="button"
                    tabIndex={0}
                    transform={structure.rotate ? `rotate(${structure.rotate} ${structure.x} ${structure.y})` : undefined}
                    onPointerDown={(event) => startElementEditDrag(event, structure)}
                    onClick={(event) => {
                      event.stopPropagation()
                      selectElement(structure)
                    }}
                    onKeyDown={(event) => handleKeySelect(event, structure)}
                    style={{ cursor: editable ? "move" : "pointer", outline: "none" }}
                  >
                    <RegulatorSymbol
                      height={structure.height ?? 18}
                      selected={isSelected(structure.id)}
                      width={structure.width ?? 18}
                      x={structure.x}
                      y={structure.y}
                    />
                    {structure.label ? (
                      <text
                        x={structure.x + (structure.labelDx ?? 0)}
                        y={structure.y + (structure.labelDy ?? 0)}
                        fill="#0f172a"
                        fontSize={11}
                        fontWeight={800}
                        pointerEvents="none"
                        textAnchor={Math.abs(structure.labelDx ?? 0) < 2 ? "middle" : "start"}
                      >
                        {structure.label}
                      </text>
                    ) : null}
                  </g>
                ))}
              </g>

              <g>
                {nodes.map((node) => {
                  const selectedNode = isSelected(node.id)
                  const stroke = node.tone === "highlight" ? "#dc2626" : "#1e3a8a"

                  return (
                    <g
                      key={node.id}
                      aria-label={`${KIND_LABEL[node.kind]} ${node.name}`}
                      role="button"
                      tabIndex={0}
                      onPointerDown={(event) => startElementEditDrag(event, node)}
                      onClick={(event) => {
                        event.stopPropagation()
                        selectElement(node)
                      }}
                      onKeyDown={(event) => handleKeySelect(event, node)}
                      style={{ cursor: editable ? "move" : "pointer", outline: "none" }}
                    >
                      <circle cx={node.x} cy={node.y} r={14} fill="transparent" />
                      <line
                        x1={node.x - 7}
                        x2={node.x + 7}
                        y1={node.y}
                        y2={node.y}
                        stroke={selectedNode ? "#0f172a" : stroke}
                        strokeWidth={selectedNode ? 4 : 3}
                      />
                      <rect
                        x={node.x - 3}
                        y={node.y - 3}
                        width={6}
                        height={6}
                        fill={selectedNode ? "#0f172a" : "#bfdbfe"}
                        stroke={stroke}
                        strokeWidth={1}
                      />
                      <text
                        x={node.x + node.labelDx}
                        y={node.y + node.labelDy}
                        fill="#0f172a"
                        fontSize={13}
                        fontWeight={800}
                        pointerEvents="none"
                        textAnchor={node.anchor ?? "start"}
                      >
                        {node.code}
                      </text>
                    </g>
                  )
                })}
              </g>

              <g>
                {gates.map((gate) => {
                  const selectedGate = isSelected(gate.id)
                  const palette = gatePalette(gate.tone)
                  const radius = gate.tone === "backup" ? 13 : 15

                  return (
                    <g
                      key={gate.id}
                      aria-label={`${KIND_LABEL[gate.kind]} ${gate.name}`}
                      role="button"
                      tabIndex={0}
                      onPointerDown={(event) => startElementEditDrag(event, gate)}
                      onClick={(event) => {
                        event.stopPropagation()
                        selectElement(gate)
                      }}
                      onKeyDown={(event) => handleKeySelect(event, gate)}
                      style={{ cursor: editable ? "move" : "pointer", outline: "none" }}
                    >
                      {gate.connector ? (
                        <line
                          x1={gate.connector.x1}
                          x2={gate.connector.x2}
                          y1={gate.connector.y1}
                          y2={gate.connector.y2}
                          stroke="#0f172a"
                          strokeDasharray="4 4"
                          strokeWidth={1.5}
                        />
                      ) : null}
                      <circle cx={gate.x} cy={gate.y} r={24} fill="transparent" />
                      <path
                        d={pentagonPath(gate.x, gate.y, selectedGate ? radius + 4 : radius)}
                        fill={palette.fill}
                        stroke={selectedGate ? palette.selected : palette.stroke}
                        strokeLinejoin="round"
                        strokeWidth={selectedGate ? 4 : 2}
                      />
                      {gate.count !== null ? (
                        <text
                          x={gate.x}
                          y={gate.y + 5}
                          fill={palette.text}
                          fontSize={11}
                          fontWeight={900}
                          pointerEvents="none"
                          textAnchor="middle"
                        >
                          {gate.count}
                        </text>
                      ) : null}
                      {gate.showLabel !== false ? (
                        <text
                          x={gate.x + gate.labelDx}
                          y={gate.y + gate.labelDy}
                          fill="#0f172a"
                          fontSize={gate.tone === "backup" ? 18 : 20}
                          fontWeight={800}
                          pointerEvents="none"
                        >
                          {gate.label}
                        </text>
                      ) : null}
                      {gate.tone === "backup" && gate.showLabel !== false ? (
                        <text
                          x={gate.x + gate.labelDx}
                          y={gate.y + gate.labelDy + 17}
                          fill="#0f172a"
                          fontSize={11}
                          fontWeight={800}
                          pointerEvents="none"
                        >
                          (Cadangan)
                        </text>
                      ) : null}
                    </g>
                  )
                })}
              </g>

              <g>
                <text x={1042} y={616} fill="#0f172a" fontSize={13} fontWeight={700}>
                  Pintu Actuator Lumpur (KI) 4 bh
                </text>
                <text x={1042} y={638} fill="#0f172a" fontSize={13} fontWeight={700}>
                  (Prime Actuator Intake (KI) 4 bh)
                </text>
                <text x={1410} y={638} fill="#0f172a" fontSize={13} fontWeight={700}>
                  Pintu Actuator Lumpur (KA) 3 bh
                </text>
                <text x={84} y={630} fill="#0f172a" fontSize={13} fontWeight={700}>
                  Arah Aliran
                </text>
                <path d="M 170 627 L 206 627 M 206 627 L 196 621 M 206 627 L 196 633" fill="none" stroke="#1d4ed8" strokeWidth={3} />
              </g>
            </svg>
          </div>
        </div>

        <div className="absolute right-3 top-3 flex flex-col gap-1 rounded-md border bg-white/95 p-1 shadow-sm">
          <Button aria-label="Zoom in" className="h-8 w-8" size="icon" variant="ghost" onClick={() => zoomFromCenter(1.28)}>
            <Plus className="h-4 w-4" />
          </Button>
          <Button aria-label="Zoom out" className="h-8 w-8" size="icon" variant="ghost" onClick={() => zoomFromCenter(1 / 1.28)}>
            <Minus className="h-4 w-4" />
          </Button>
          <Button aria-label="Reset tampilan" className="h-8 w-8" size="icon" variant="ghost" onClick={fitToContainer}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        {selected ? (
          <div
            data-testid="peta-cisadane-detail"
            className="absolute bottom-3 right-3 w-[min(330px,calc(100%-1.5rem))] rounded-lg border bg-white p-3 text-sm shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <Info className="h-3.5 w-3.5" />
                  {KIND_LABEL[selected.kind]}
                </div>
                <div className="mt-1 truncate text-[15px] font-bold text-slate-950">{selected.name}</div>
                <div className="mt-0.5 font-mono text-[11px] font-semibold text-slate-500">{selected.code}</div>
              </div>
              <Button aria-label="Tutup detail" className="-mr-1 -mt-1 h-7 w-7" size="icon" variant="ghost" onClick={() => setSelected(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-slate-600">{selected.description}</p>

            {selected.metrics?.length ? (
              <div className="mt-3 grid gap-1.5">
                {selected.metrics.map((metric) => (
                  <div key={metric.label} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-2 py-1.5 text-xs">
                    <span className="text-slate-500">{metric.label}</span>
                    <span className="text-right font-semibold text-slate-900">{metric.value}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function RegulatorSymbol({
  x,
  y,
  width,
  height,
  selected,
}: {
  x: number
  y: number
  width: number
  height: number
  selected: boolean
}) {
  const halfW = width / 2
  const halfH = height / 2

  return (
    <g pointerEvents="none">
      <line x1={x - halfW} x2={x + halfW} y1={y - halfH} y2={y - halfH} stroke={selected ? "#0f172a" : "#0f172a"} strokeWidth={selected ? 3 : 2} />
      <line x1={x - halfW} x2={x + halfW} y1={y + halfH} y2={y + halfH} stroke={selected ? "#0f172a" : "#0f172a"} strokeWidth={selected ? 3 : 2} />
      <line x1={x - halfW + 4} x2={x - halfW + 4} y1={y - halfH - 5} y2={y + halfH + 5} stroke={selected ? "#0f172a" : "#0f172a"} strokeWidth={selected ? 3 : 2} />
      <line x1={x + halfW - 4} x2={x + halfW - 4} y1={y - halfH - 5} y2={y + halfH + 5} stroke={selected ? "#0f172a" : "#0f172a"} strokeWidth={selected ? 3 : 2} />
      <rect x={x - halfW} y={y - halfH} width={width} height={height} fill="#eff6ff" opacity={selected ? 0.9 : 0.45} stroke="#1d4ed8" strokeWidth={selected ? 2 : 1} />
    </g>
  )
}

function Legend() {
  const x = 24
  const y = 286

  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={236} height={258} rx={8} fill="#ffffff" stroke="#64748b" strokeWidth={2} />
      <text x={19} y={28} fill="#0f172a" fontSize={17} fontWeight={900}>
        KETERANGAN
      </text>

      <line x1={18} x2={58} y1={52} y2={52} stroke="#1455b8" strokeWidth={4} />
      <text x={74} y={56} fill="#0f172a" fontSize={13} fontWeight={700}>
        Sungai Utama
      </text>

      <line x1={18} x2={58} y1={81} y2={81} stroke="#1e1b4b" strokeWidth={4} />
      <text x={74} y={85} fill="#0f172a" fontSize={13} fontWeight={700}>
        Saluran Induk
      </text>

      <line x1={18} x2={58} y1={110} y2={110} stroke="#15803d" strokeWidth={4} />
      <text x={74} y={114} fill="#0f172a" fontSize={13} fontWeight={700}>
        Saluran Sekunder
      </text>

      <line x1={18} x2={58} y1={139} y2={139} stroke="#16a34a" strokeDasharray="9 7" strokeWidth={4} />
      <text x={74} y={143} fill="#0f172a" fontSize={13} fontWeight={700}>
        Saluran Tersier
      </text>

      <path d={pentagonPath(30, 169, 10)} fill="#dc2626" stroke="#7f1d1d" strokeWidth={2} />
      <text x={74} y={173} fill="#0f172a" fontSize={13} fontWeight={700}>
        Pintu Air (Operasional)
      </text>

      <path d={pentagonPath(30, 199, 10)} fill="#facc15" stroke="#854d0e" strokeWidth={2} />
      <text x={74} y={203} fill="#0f172a" fontSize={13} fontWeight={700}>
        Pintu Air (Cadangan)
      </text>

      <g transform="translate(30 229)">
        <line x1={-12} x2={12} y1={-7} y2={-7} stroke="#0f172a" strokeWidth={2} />
        <line x1={-12} x2={12} y1={7} y2={7} stroke="#0f172a" strokeWidth={2} />
        <line x1={-7} x2={-7} y1={-13} y2={13} stroke="#0f172a" strokeWidth={2} />
        <line x1={7} x2={7} y1={-13} y2={13} stroke="#0f172a" strokeWidth={2} />
      </g>
      <text x={74} y={234} fill="#0f172a" fontSize={13} fontWeight={700}>
        Bangunan Pengatur
      </text>
    </g>
  )
}
