import { z } from "zod"

import {
  getPetaCisadaneLayoutDocument,
  savePetaCisadaneLayout,
} from "@/lib/peta-cisadane-layout"

export const dynamic = "force-dynamic"

const layoutItemSchema = z
  .object({
    x: z.number().finite().optional(),
    y: z.number().finite().optional(),
    labelDx: z.number().finite().optional(),
    labelDy: z.number().finite().optional(),
    width: z.number().finite().optional(),
    height: z.number().finite().optional(),
    showLabel: z.boolean().optional(),
  })
  .strict()

const bodySchema = z.object({
  layout: z.record(layoutItemSchema),
})

export async function GET() {
  return Response.json(await getPetaCisadaneLayoutDocument())
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => ({}))
  const parsed = bodySchema.safeParse(body)

  if (!parsed.success) {
    return Response.json(
      { error: "Layout peta tidak valid.", issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  return Response.json(await savePetaCisadaneLayout(parsed.data.layout))
}
