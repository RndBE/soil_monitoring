import { NextResponse, type NextRequest } from "next/server"

import { SESSION_COOKIE, verifySession } from "@/lib/auth/session"

/** Rute yang boleh diakses tanpa sesi. */
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout"]

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const user = await verifySession(request.cookies.get(SESSION_COOKIE)?.value)

  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = ""
    if (pathname !== "/") url.searchParams.set("next", `${pathname}${search}`)
    return NextResponse.redirect(url)
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.png|.*\\.(?:png|jpg|svg|ico)$).*)"],
}
