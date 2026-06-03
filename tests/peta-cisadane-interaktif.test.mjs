import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import assert from "node:assert/strict"

const root = resolve(import.meta.dirname, "..")
const componentPath = resolve(root, "components/dashboard/peta-cisadane-interaktif.tsx")
const dashboardPath = resolve(root, "app/page.tsx")
const editorComponentPath = resolve(root, "components/dashboard/peta-cisadane-layout-editor.tsx")
const editorPagePath = resolve(root, "app/peta-jaringan/edit/page.tsx")
const apiRoutePath = resolve(root, "app/api/peta-cisadane-layout/route.ts")
const layoutStorePath = resolve(root, "lib/peta-cisadane-layout.ts")
const layoutDataPath = resolve(root, "data/peta-cisadane-layout.json")

assert.ok(existsSync(componentPath), "peta-cisadane-interaktif.tsx should exist")
assert.ok(existsSync(editorComponentPath), "peta-cisadane-layout-editor.tsx should exist")
assert.ok(existsSync(editorPagePath), "separate edit page should exist at /peta-jaringan/edit")
assert.ok(existsSync(apiRoutePath), "peta-cisadane-layout API route should exist")
assert.ok(existsSync(layoutStorePath), "server-side layout storage helper should exist")
assert.ok(existsSync(layoutDataPath), "server-side layout JSON file should exist")

const component = readFileSync(componentPath, "utf8")
const dashboard = readFileSync(dashboardPath, "utf8")
const editorComponent = readFileSync(editorComponentPath, "utf8")
const editorPage = readFileSync(editorPagePath, "utf8")
const apiRoute = readFileSync(apiRoutePath, "utf8")
const layoutStore = readFileSync(layoutStorePath, "utf8")
const layoutData = readFileSync(layoutDataPath, "utf8")

assert.match(component, /^"use client"/, "interactive map must be a client component")
assert.match(component, /export function PetaCisadaneInteraktif/, "component should export PetaCisadaneInteraktif")
assert.match(component, /export type CisadaneLayout/, "component should export the editable layout type")
assert.match(component, /editable\?: boolean/, "component should support edit mode")
assert.match(component, /onLayoutChange\?: \(layout: CisadaneLayout\) => void/, "component should report layout changes in edit mode")
assert.doesNotMatch(component, /cisadane\.png|<img|next\/image/i, "component must redraw the schematic, not embed an image")
assert.doesNotMatch(
  component,
  /width=\{VIEWBOX_W - 12\}[\s\S]*height=\{VIEWBOX_H - 12\}[\s\S]*stroke="#0f172a"/,
  "interactive map should not draw an internal SVG border frame"
)
assert.match(component, /const VIEWBOX_W = 1636/, "map should keep the same width as cisadane.png")
assert.match(component, /const VIEWBOX_H = 652/, "map should crop the unused whitespace below the Cisadane schematic")
assert.doesNotMatch(component, /VIEWBOX_Y_OFFSET/, "map viewBox should not crop the top of the Cisadane schematic")
assert.match(
  component,
  /viewBox=\{`0 0 \$\{VIEWBOX_W\} \$\{VIEWBOX_H\}`\}/,
  "map should render the full Cisadane viewBox without top cropping"
)

for (const token of [
  "CISADANE_CHANNELS",
  "CISADANE_STRUCTURES",
  "CISADANE_GATES",
  "CISADANE_NODES",
  "onPointerDown",
  "onPointerMove",
  "onWheel",
  "setPointerCapture",
  "getOverviewScale",
  "constrainView",
  "data-testid=\"peta-cisadane-detail\"",
]) {
  assert.ok(component.includes(token), `component should include ${token}`)
}

assert.match(
  component,
  /Math\.max\(width \/ VIEWBOX_W, height \/ VIEWBOX_H\)/,
  "map overview should fill the viewport height so the dashboard does not leave empty space below"
)
assert.match(
  component,
  /const scale = getOverviewScale\(rect\.width, rect\.height\)/,
  "reset/default fit should use the responsive Cisadane overview scale"
)
assert.match(
  component,
  /constrainView\(\s*\{\s*scale,\s*x: 0,\s*y: 0,/s,
  "reset/default fit should anchor the Cisadane schematic to the top-left of the viewport"
)
assert.match(
  component,
  /const INITIAL_OVERVIEW_SCALE = 0\.78/,
  "server-rendered initial view should not start at 100% before client resize fitting runs"
)
assert.match(
  component,
  /constrainForContainer/,
  "map pan and zoom should be constrained to the visible container"
)
assert.doesNotMatch(component, /MousePointer2|Drag, scroll, klik elemen/, "map should not render the bottom-left instruction overlay")
assert.match(
  component,
  /gate\.showLabel !== false/,
  "gate labels should be optional so crowded labels can be hidden without removing gate data"
)
for (const gateId of ["gate-cbl3-barat", "gate-cbl5", "gate-cbl1", "gate-cbl1-selatan"]) {
  assert.match(
    component,
    new RegExp(`id: "${gateId}"[\\s\\S]*?showLabel: false`),
    `${gateId} should hide the crowded left-side gate label`
  )
}
assert.match(
  component,
  /contentHeight <= bounds\.height\s*\?\s*0/s,
  "overview mode should keep the map anchored to the top instead of leaving empty space above"
)

assert.match(dashboard, /PetaCisadaneInteraktif/, "dashboard should render the new interactive schematic")
assert.match(dashboard, /getPetaCisadaneLayout/, "dashboard should load the persisted Cisadane layout")
assert.match(dashboard, /layout=\{petaLayout\}/, "dashboard map should render the persisted layout")
assert.doesNotMatch(dashboard, /@\/components\/dashboard\/peta-jaringan"/, "dashboard should not use the geographic map component for the main schematic")
assert.match(
  dashboard,
  /<Card className="flex h-full overflow-hidden p-0">/,
  "dashboard map card should keep the default rounded card frame"
)
assert.doesNotMatch(
  dashboard,
  /rounded-none border-0 p-0 shadow-none|SVG Interaktif/,
  "dashboard map card should not remove its rounded frame or show the SVG badge"
)
assert.match(
  dashboard,
  /<CardHeader className="border-b border-foreground\/5 px-4 pb-3 pt-4">/,
  "dashboard map card header should have comfortable spacing"
)
assert.match(
  dashboard,
  /<CardTitle className="text-\[13px\] font-semibold uppercase tracking-\[0\.12em\] text-foreground\/90">/,
  "dashboard map title should use the refined card title style"
)
assert.match(
  dashboard,
  /<div className="grid items-stretch gap-4 xl:grid-cols-\[1fr_320px\]">/,
  "map and right sidebar should share the same stretched row height"
)
assert.match(
  dashboard,
  /<CardContent className="relative min-h-\[360px\] flex-1 p-0 xl:min-h-0">/,
  "dashboard map content should be a relative viewport that follows the right sidebar height on desktop"
)
assert.match(
  dashboard,
  /<div className="absolute inset-0">\s*<PetaCisadaneInteraktif height="100%" layout=\{petaLayout\} \/>/s,
  "dashboard map should be absolutely positioned and receive persisted layout"
)
assert.match(
  component,
  /className="relative h-full overflow-hidden bg-white"/,
  "interactive map wrapper should not draw its own border or force extra height"
)
assert.doesNotMatch(
  component,
  /min-h-\[360px\]/,
  "interactive map component should not force the dashboard row taller than the right sidebar"
)

const sidebarStart = dashboard.indexOf('<div className="flex flex-col gap-4">')
const movedCardsStart = dashboard.indexOf('<div className="grid gap-4 md:grid-cols-2">')
const chartRowStart = dashboard.indexOf("{/* Baris 4: Chart muka air")

assert.ok(sidebarStart > -1, "dashboard should keep a right sidebar beside the map")
assert.ok(movedCardsStart > -1, "dashboard should add a two-column row below the map for moved cards")
assert.ok(chartRowStart > movedCardsStart, "moved cards row should appear before chart row")

const sidebar = dashboard.slice(sidebarStart, movedCardsStart)
assert.match(sidebar, /StatusPintuDonut/, "right sidebar should keep status card")
assert.match(sidebar, /KendaliPintuPanel/, "right sidebar should keep control card")
assert.doesNotMatch(sidebar, /MiniTrendList|KondisiAktual/, "trend and kondisi cards should be moved out of the right sidebar")

const movedCardsRow = dashboard.slice(movedCardsStart, chartRowStart)
assert.match(movedCardsRow, /MiniTrendList/, "moved cards row should contain trend card")
assert.match(movedCardsRow, /KondisiAktual/, "moved cards row should contain current condition card")

assert.doesNotMatch(component, /PETA JARINGAN IRIGASI/, "interactive SVG should not duplicate the dashboard title inside the map")
assert.doesNotMatch(component, /SUNGAI CILIWUNG - CISADANE/, "interactive SVG should not show the old internal map subtitle")
assert.doesNotMatch(component, /ANALISA JALUR DAN DENAH PINTU AIR/, "interactive SVG should not show the old internal analysis title")
assert.match(
  component,
  /<rect width=\{236\} height=\{258\} rx=\{8\}/,
  "legend box should be wide enough for the longest labels"
)
assert.match(
  component,
  /<text x=\{74\} y=\{173\}[\s\S]*Pintu Air \(Operasional\)/,
  "legend text column should keep operational gate label inside the legend box"
)

assert.match(editorPage, /PetaCisadaneLayoutEditor/, "edit page should render the layout editor")
assert.match(editorPage, /getPetaCisadaneLayoutDocument/, "edit page should load the saved layout document")
assert.match(editorComponent, /^"use client"/, "layout editor should be a client component")
assert.match(editorComponent, /editable/, "layout editor should enable editable map mode")
assert.match(editorComponent, /\/api\/peta-cisadane-layout/, "layout editor should save through the layout API")
assert.match(editorComponent, /onLayoutChange=\{setLayout\}/, "layout editor should receive dragged element positions")
assert.match(apiRoute, /export async function GET/, "layout API should support GET")
assert.match(apiRoute, /export async function PUT/, "layout API should support PUT")
assert.match(apiRoute, /savePetaCisadaneLayout/, "layout API should persist layout changes")
assert.match(layoutStore, /peta-cisadane-layout\.json/, "layout storage should use the server-side JSON file")
assert.match(layoutStore, /sanitizePetaCisadaneLayout/, "layout storage should sanitize incoming layout values")
assert.doesNotThrow(() => JSON.parse(layoutData), "layout JSON should be valid")

console.log("peta-cisadane-interaktif static checks passed")
