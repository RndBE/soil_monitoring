"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { toast } from "sonner"
import {
  BellIcon,
  ChevronRightIcon,
  DropletIcon,
  FileTextIcon,
  FlameIcon,
  GaugeIcon,
  LayoutDashboardIcon,
  LeafIcon,
  MapIcon,
  RadioTowerIcon,
  RefreshCwIcon,
  SettingsIcon,
  SproutIcon,
} from "lucide-react"

import { stations } from "@/lib/peatland/mock-data"
import { cn } from "@/lib/utils"
import { BrandLogo } from "./brand-logo"

type NavChild = { label: string; href: string }
type NavItem = {
  label: string
  icon: React.ReactNode
  href: string
  children?: NavChild[]
}

const nav: NavItem[] = [
  { label: "Overview", icon: <LayoutDashboardIcon className="size-[18px]" />, href: "/" },
  { label: "Map View", icon: <MapIcon className="size-[18px]" />, href: "/map-view" },
  {
    label: "Peat Monitoring",
    icon: <GaugeIcon className="size-[18px]" />,
    href: "/peat-monitoring",
    children: [
      { label: "Stations Overview", href: "/peat-monitoring" },
      { label: "Subsidence", href: "/peat-monitoring/subsidence" },
    ],
  },
  { label: "Borehole Monitoring", icon: <RadioTowerIcon className="size-[18px]" />, href: "/borehole-monitoring" },
  { label: "Weather & Rainfall", icon: <DropletIcon className="size-[18px]" />, href: "/weather-rainfall" },
  { label: "Fire Risk", icon: <FlameIcon className="size-[18px]" />, href: "/fire-risk" },
  { label: "Plantation Health", icon: <LeafIcon className="size-[18px]" />, href: "/plantation-health" },
  { label: "Agriculture", icon: <SproutIcon className="size-[18px]" />, href: "/agriculture" },
  { label: "Alerts", icon: <BellIcon className="size-[18px]" />, href: "/alerts" },
  { label: "Reports", icon: <FileTextIcon className="size-[18px]" />, href: "/reports" },
  { label: "Settings", icon: <SettingsIcon className="size-[18px]" />, href: "/settings" },
]

function StationDonut() {
  const r = 26
  const c = 2 * Math.PI * r
  const onlinePct = stations.online / stations.total
  const dash = c * onlinePct
  return (
    <div className="relative size-[64px] shrink-0">
      <svg viewBox="0 0 64 64" className="size-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#ef4444" strokeWidth="7" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="#22c55e"
          strokeWidth="7"
          strokeDasharray={`${dash} ${c - dash}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[13px] font-bold text-white">{stations.percent}%</span>
      </div>
    </div>
  )
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)
}

export function PeatSidebar() {
  const pathname = usePathname() ?? "/"
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState("10 Sep 2024 09:37 AM")

  const handleRefresh = () => {
    if (refreshing) return
    setRefreshing(true)
    const t = toast.loading("Memperbarui data sensor…")
    setTimeout(() => {
      setRefreshing(false)
      setLastUpdate("Baru saja")
      toast.success("Data sensor diperbarui", { id: t })
    }, 900)
  }

  return (
    <aside className="hidden w-[210px] shrink-0 flex-col border-r border-white/5 bg-[#0c120f] lg:flex">
      {/* Brand */}
      <Link href="/" className="flex items-center gap-2.5 px-4 py-4">
        <BrandLogo className="size-9 shrink-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]" />
        <div className="grid leading-tight">
          <span className="text-[11.5px] font-bold tracking-wide text-white">PEATLAND MONITORING</span>
          <span className="text-[9.5px] font-medium text-white/40">PLANTATION & PEAT MANAGEMENT</span>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
        {nav.map((item) => {
          const active = isActive(pathname, item.href)
          if (item.children) {
            const groupActive = pathname.startsWith(item.href)
            const open = openGroups[item.href] ?? groupActive
            return (
              <div key={item.label}>
                <button
                  onClick={() => setOpenGroups((s) => ({ ...s, [item.href]: !open }))}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                    groupActive
                      ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                      : "text-white/55 hover:bg-white/5 hover:text-white/85"
                  )}
                >
                  <span className={cn(groupActive ? "text-emerald-400" : "text-white/40 group-hover:text-white/70")}>
                    {item.icon}
                  </span>
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronRightIcon className={cn("size-3.5 text-white/30 transition-transform", open && "rotate-90")} />
                </button>
                {open && (
                  <div className="mt-0.5 grid gap-0.5 pl-9">
                    {item.children.map((c) => {
                      const cActive = pathname === c.href
                      return (
                        <Link
                          key={c.href}
                          href={c.href}
                          className={cn(
                            "rounded-md px-3 py-1.5 text-[12px] transition-colors",
                            cActive
                              ? "text-emerald-400"
                              : "text-white/45 hover:bg-white/5 hover:text-white/75"
                          )}
                        >
                          {c.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                active
                  ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                  : "text-white/55 hover:bg-white/5 hover:text-white/85"
              )}
            >
              <span className={cn(active ? "text-emerald-400" : "text-white/40 group-hover:text-white/70")}>
                {item.icon}
              </span>
              <span className="flex-1 text-left">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Monitoring Stations card */}
      <div className="mx-3 mb-3 rounded-xl border border-white/8 bg-white/[0.03] p-3">
        <p className="mb-2 text-[11px] font-semibold text-white/70">Monitoring Stations</p>
        <div className="flex items-center gap-3">
          <StationDonut />
          <div className="grid gap-1.5 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span className="text-white/50">Online</span>
            </div>
            <p className="-mt-1 pl-3.5 font-bold text-white">
              {stations.online} <span className="font-normal text-white/40">({stations.percent}%)</span>
            </p>
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-red-500" />
              <span className="text-white/50">Offline</span>
            </div>
            <p className="-mt-1 pl-3.5 font-bold text-white">
              {stations.offline}{" "}
              <span className="font-normal text-white/40">
                ({Math.round((stations.offline / stations.total) * 100)}%)
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 border-t border-white/5 px-4 py-3">
        <div className="grid leading-tight">
          <span className="text-[10px] text-white/40">Last Data Update</span>
          <span className="text-[10.5px] font-medium text-white/70">{lastUpdate}</span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label="Perbarui data"
          className="inline-flex size-7 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25 transition-colors hover:bg-emerald-500/25 disabled:opacity-60"
        >
          <RefreshCwIcon className={cn("size-3.5", refreshing && "animate-spin")} />
        </button>
      </div>
    </aside>
  )
}
