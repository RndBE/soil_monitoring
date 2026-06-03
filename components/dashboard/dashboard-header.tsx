"use client"

import { BellIcon, ChevronDownIcon, SearchIcon, SunIcon, WifiIcon } from "lucide-react"

import { Input } from "@/components/ui/input"
import { SidebarTrigger } from "@/components/ui/sidebar"

type Props = {
  weather?: { tempC: string; label: string }
  iot?: { online: number; total: number }
  notifCount?: number
  userName?: string
  userRole?: string
}

export function DashboardHeader({
  weather = { tempC: "28.5", label: "Cerah" },
  iot = { online: 48, total: 52 },
  notifCount = 3,
  userName = "Administrator",
  userRole = "Super Admin",
}: Props) {
  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b bg-background px-3 lg:px-6">
      <SidebarTrigger className="size-9 rounded-md" />

      <div className="relative max-w-xl flex-1">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-9 rounded-full bg-muted/40 pl-9 text-sm"
          placeholder="Cari lokasi, pintu air, sensor..."
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-full bg-muted/40 px-3 py-1.5 md:flex">
          <SunIcon className="size-4 text-amber-500" />
          <div className="grid leading-tight">
            <span className="text-[12px] font-semibold">{weather.tempC}°C</span>
            <span className="text-[10.5px] text-muted-foreground">{weather.label}</span>
          </div>
        </div>

        <div className="hidden items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 ring-1 ring-emerald-500/30 md:flex">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
          </span>
          <WifiIcon className="size-3.5 text-emerald-600" />
          <div className="grid leading-tight">
            <span className="text-[12px] font-semibold text-emerald-700 dark:text-emerald-300">
              IoT Online
            </span>
            <span className="text-[10.5px] text-muted-foreground">
              {iot.online} / {iot.total}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="relative inline-flex size-9 items-center justify-center rounded-full hover:bg-muted"
          aria-label="Notifikasi"
        >
          <BellIcon className="size-4" />
          {notifCount > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-background">
              {notifCount}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          className="flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-muted"
        >
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 text-xs font-bold text-white">
            {initialsOf(userName)}
          </span>
          <div className="hidden grid leading-tight sm:grid">
            <span className="text-[12.5px] font-semibold">{userName}</span>
            <span className="text-[10.5px] text-muted-foreground">{userRole}</span>
          </div>
          <ChevronDownIcon className="size-3.5 text-muted-foreground" />
        </button>
      </div>
    </header>
  )
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}
