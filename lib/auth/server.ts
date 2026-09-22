import { cookies } from "next/headers"

import { SESSION_COOKIE, verifySession, type SessionUser } from "./session"

/** Sesi aktif untuk server component / route handler. Null kalau belum login. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies()
  return verifySession(store.get(SESSION_COOKIE)?.value)
}
