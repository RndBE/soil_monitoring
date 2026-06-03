import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// API contoh: simpan command aktuasi pintu air ke DB + log AktuasiPintuAir.
// Untuk integrasi nyata, di sini kita publish ke MQTT broker
// (mis. `irigasi/<di>/pintu/<id>/cmd`) dan tunggu balasan state dari aktuator.

const bodySchema = z.object({
  posisi: z.number().min(0).max(100),
  sumber: z.enum(["MANUAL", "JADWAL", "ALARM", "OVERRIDE"]).default("MANUAL"),
  operator: z.string().optional(),
  catatan: z.string().optional(),
});

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Body tidak valid.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const pintu = await prisma.pintuAir.findUnique({ where: { id } });
  if (!pintu) {
    return Response.json({ error: "Pintu air tidak ditemukan." }, { status: 404 });
  }

  const posisiSebelum = Number(pintu.posisiPersen);
  const posisiSesudah = parsed.data.posisi;

  const [updated, aktuasi] = await prisma.$transaction([
    prisma.pintuAir.update({
      where: { id },
      data: {
        posisiPersen: posisiSesudah,
        lastUpdate: new Date(),
      },
    }),
    prisma.aktuasiPintuAir.create({
      data: {
        pintuAirId: id,
        waktu: new Date(),
        posisiSebelumPersen: posisiSebelum,
        posisiSesudahPersen: posisiSesudah,
        sumber: parsed.data.sumber,
        operator: parsed.data.operator,
        catatan: parsed.data.catatan,
      },
    }),
  ]);

  // TODO(hardware): publish MQTT/HTTP command ke aktuator di sini.

  return Response.json({
    pintuAir: {
      id: updated.id,
      kode: updated.kode,
      nama: updated.nama,
      posisiPersen: Number(updated.posisiPersen),
      mode: updated.mode,
    },
    aktuasi: { id: aktuasi.id, waktu: aktuasi.waktu },
  });
}
