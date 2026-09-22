/**
 * Sesi stateless: payload JSON + tanda tangan HMAC-SHA256, disimpan di cookie
 * httpOnly. Sengaja pakai Web Crypto (bukan `node:crypto`) supaya modul ini
 * bisa dipakai middleware Edge sekaligus route handler Node.
 *
 * Modul ini harus bebas impor `next/headers` agar tetap aman di Edge.
 */

export type SessionUser = {
  id: string
  name: string
  username: string
  role: string
  access: string
}

type SessionPayload = SessionUser & { exp: number }

export const SESSION_COOKIE = "soil_session"
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 hari

const encoder = new TextEncoder()
let keyPromise: Promise<CryptoKey> | null = null

function getKey(): Promise<CryptoKey> {
  if (!keyPromise) {
    const secret = process.env.AUTH_SECRET
    if (!secret || secret.length < 32) {
      throw new Error("AUTH_SECRET belum diset atau kurang dari 32 karakter. Lihat .env.example.")
    }
    keyPromise = crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    )
  }
  return keyPromise
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/")
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="))
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** Membuat token sesi bertanda tangan. Melempar kalau AUTH_SECRET tidak layak. */
export async function signSession(
  user: SessionUser,
  maxAgeSeconds: number = SESSION_MAX_AGE,
): Promise<string> {
  const payload: SessionPayload = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
  }
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)))
  const signature = await crypto.subtle.sign("HMAC", await getKey(), encoder.encode(body))
  return `${body}.${toBase64Url(new Uint8Array(signature))}`
}

/**
 * Memvalidasi token. Mengembalikan null untuk token kosong, rusak, tanda
 * tangan salah, kedaluwarsa, atau saat kunci bermasalah — gagal selalu ke
 * arah menolak akses.
 */
export async function verifySession(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null

  const separator = token.lastIndexOf(".")
  if (separator < 1) return null
  const body = token.slice(0, separator)
  const signature = token.slice(separator + 1)

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await getKey(),
      fromBase64Url(signature),
      encoder.encode(body),
    )
    if (!valid) return null

    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as SessionPayload
    if (typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now()) return null

    if (!payload.id || !payload.username) return null
    // Disusun ulang secara eksplisit supaya field asing dalam token tidak ikut.
    return {
      id: payload.id,
      name: payload.name,
      username: payload.username,
      role: payload.role,
      access: payload.access,
    }
  } catch {
    return null
  }
}

/** Opsi cookie sesi. maxAge 0 dipakai untuk menghapus cookie saat logout. */
export function sessionCookie(value: string, maxAge: number = SESSION_MAX_AGE) {
  return {
    name: SESSION_COOKIE,
    value,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  }
}
