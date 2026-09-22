import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { sessionCookie, signSession, type SessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Username atau password tidak valid.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  let user;
  try {
    user = await prisma.user.findUnique({
      where: { username: parsed.data.username },
      include: { role: true },
    });
  } catch {
    return NextResponse.json(
      { error: "Layanan autentikasi sedang tidak tersedia. Coba beberapa saat lagi." },
      { status: 503 },
    );
  }

  // Pesan sengaja disamakan supaya username yang terdaftar tidak bisa ditebak.
  const invalid = NextResponse.json(
    { error: "Username atau password salah." },
    { status: 401 },
  );

  if (!user) {
    // Tetap jalankan hash dummy agar waktu respons tidak membocorkan
    // keberadaan akun.
    await bcrypt.compare(parsed.data.password, "$2a$08$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidi");
    return invalid;
  }

  if (!(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return invalid;
  }

  const sessionUser: SessionUser = {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role.name,
    access: user.role.access,
  };

  let token: string;
  try {
    token = await signSession(sessionUser);
  } catch {
    return NextResponse.json(
      { error: "Sesi tidak bisa dibuat: AUTH_SECRET belum diatur di server." },
      { status: 500 },
    );
  }

  const response = NextResponse.json({ user: sessionUser });
  response.cookies.set(sessionCookie(token));
  return response;
}
