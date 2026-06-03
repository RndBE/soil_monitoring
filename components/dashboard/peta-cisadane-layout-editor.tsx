"use client"

import { RotateCcw, Save, Undo2 } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import {
  PetaCisadaneInteraktif,
  type CisadaneLayout,
} from "@/components/dashboard/peta-cisadane-interaktif"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { PetaCisadaneLayoutDocument } from "@/lib/peta-cisadane-layout"

type Props = {
  initialDocument: PetaCisadaneLayoutDocument
}

export function PetaCisadaneLayoutEditor({ initialDocument }: Props) {
  const [layout, setLayout] = useState<CisadaneLayout>(initialDocument.layout)
  const [savedLayout, setSavedLayout] = useState<CisadaneLayout>(initialDocument.layout)
  const [savedAt, setSavedAt] = useState(initialDocument.updatedAt)
  const [isSaving, setIsSaving] = useState(false)
  const changedCount = useMemo(() => Object.keys(layout).length, [layout])
  const hasChanges = useMemo(
    () => JSON.stringify(layout) !== JSON.stringify(savedLayout),
    [layout, savedLayout]
  )

  async function saveLayout() {
    setIsSaving(true)
    try {
      const response = await fetch("/api/peta-cisadane-layout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout }),
      })
      const payload = (await response.json()) as PetaCisadaneLayoutDocument | { error?: string }

      if (!response.ok) {
        throw new Error("error" in payload && payload.error ? payload.error : "Gagal menyimpan layout.")
      }

      const document = payload as PetaCisadaneLayoutDocument
      setLayout(document.layout)
      setSavedLayout(document.layout)
      setSavedAt(document.updatedAt)
      toast.success("Layout peta tersimpan")
    } catch (error) {
      toast.error("Gagal menyimpan layout", {
        description: error instanceof Error ? error.message : "Periksa koneksi server.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <Card className="overflow-hidden p-0">
        <CardHeader className="border-b border-foreground/5 px-4 pb-3 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-[13px] font-semibold uppercase tracking-[0.12em] text-foreground/90">
                Edit Layout Peta
              </CardTitle>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {savedAt ? `Tersimpan: ${new Date(savedAt).toLocaleString("id-ID")}` : "Belum pernah disimpan"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => { window.location.href = "/" }}>
                <Undo2 className="mr-2 size-4" />
                Dashboard
              </Button>
              <Button size="sm" variant="outline" onClick={() => setLayout(savedLayout)} disabled={!hasChanges || isSaving}>
                <RotateCcw className="mr-2 size-4" />
                Batal
              </Button>
              <Button size="sm" onClick={saveLayout} disabled={!hasChanges || isSaving}>
                <Save className="mr-2 size-4" />
                Simpan
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-[calc(100vh-13rem)] min-h-[520px] p-0">
          <PetaCisadaneInteraktif
            editable
            height="100%"
            layout={layout}
            onLayoutChange={setLayout}
          />
        </CardContent>
      </Card>

      <div className="grid content-start gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[13px] font-semibold uppercase tracking-wide text-foreground/80">
              Status Layout
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3 rounded-md bg-muted/50 px-3 py-2">
              <span className="text-muted-foreground">Elemen diubah</span>
              <span className="font-mono font-semibold">{changedCount}</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md bg-muted/50 px-3 py-2">
              <span className="text-muted-foreground">Status</span>
              <span className="font-semibold">{hasChanges ? "Belum disimpan" : "Sinkron"}</span>
            </div>
            <Button className="w-full" variant="outline" onClick={() => setLayout({})} disabled={isSaving}>
              Reset Semua Posisi
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
