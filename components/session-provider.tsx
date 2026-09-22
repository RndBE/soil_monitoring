"use client"

import { createContext, useContext } from "react"

import type { SessionUser } from "@/lib/auth/session"

const SessionContext = createContext<SessionUser | null>(null)

/**
 * Sesi dibaca sekali di root layout (server) lalu disebar lewat context,
 * supaya halaman client component tidak perlu ikut menarik `next/headers`.
 */
export function SessionProvider({
  user,
  children,
}: {
  user: SessionUser | null
  children: React.ReactNode
}) {
  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>
}

/** Sesi aktif, atau null kalau belum login. */
export function useSession(): SessionUser | null {
  return useContext(SessionContext)
}
