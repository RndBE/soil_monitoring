import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"

export type PetaCisadaneLayoutItem = {
  x?: number
  y?: number
  labelDx?: number
  labelDy?: number
  width?: number
  height?: number
  showLabel?: boolean
}

export type PetaCisadaneLayout = Record<string, PetaCisadaneLayoutItem>

export type PetaCisadaneLayoutDocument = {
  version: 1
  updatedAt: string | null
  layout: PetaCisadaneLayout
}

const LAYOUT_FILE = join(process.cwd(), "data", "peta-cisadane-layout.json")
const ALLOWED_NUMERIC_KEYS = ["x", "y", "labelDx", "labelDy", "width", "height"] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function clampNumber(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined
  return Math.round(value * 100) / 100
}

export function sanitizePetaCisadaneLayout(input: unknown): PetaCisadaneLayout {
  if (!isRecord(input)) return {}

  const next: PetaCisadaneLayout = {}
  for (const [id, value] of Object.entries(input)) {
    if (!/^[a-z0-9-]+$/i.test(id) || !isRecord(value)) continue

    const item: PetaCisadaneLayoutItem = {}
    for (const key of ALLOWED_NUMERIC_KEYS) {
      const numericValue = clampNumber(value[key])
      if (numericValue !== undefined) item[key] = numericValue
    }

    if (typeof value.showLabel === "boolean") {
      item.showLabel = value.showLabel
    }

    if (Object.keys(item).length > 0) {
      next[id] = item
    }
  }

  return next
}

export async function getPetaCisadaneLayoutDocument(): Promise<PetaCisadaneLayoutDocument> {
  try {
    const raw = await readFile(LAYOUT_FILE, "utf8")
    const parsed = JSON.parse(raw) as unknown
    const source = isRecord(parsed) ? parsed : {}

    return {
      version: 1,
      updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : null,
      layout: sanitizePetaCisadaneLayout(source.layout),
    }
  } catch {
    return { version: 1, updatedAt: null, layout: {} }
  }
}

export async function getPetaCisadaneLayout() {
  const document = await getPetaCisadaneLayoutDocument()
  return document.layout
}

export async function savePetaCisadaneLayout(layout: unknown): Promise<PetaCisadaneLayoutDocument> {
  const document: PetaCisadaneLayoutDocument = {
    version: 1,
    updatedAt: new Date().toISOString(),
    layout: sanitizePetaCisadaneLayout(layout),
  }

  await mkdir(dirname(LAYOUT_FILE), { recursive: true })
  await writeFile(LAYOUT_FILE, `${JSON.stringify(document, null, 2)}\n`, "utf8")

  return document
}
