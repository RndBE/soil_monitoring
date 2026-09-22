"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CalendarIcon, ChevronDownIcon, CloudRainIcon, LogOutIcon, SettingsIcon, UserIcon } from "lucide-react"
import { toast } from "sonner"

import { useSession } from "@/components/session-provider"
import { logout } from "@/lib/auth/client"
import { dashboardMeta } from "@/lib/peatland/mock-data"
import { cn } from "@/lib/utils"

const ESTATES = ["Sei Galuh Estate", "Sungai Rokan Estate", "Kampar Estate", "Indragiri Estate"]
const DIVISIONS = ["Block A", "Block B", "Block C", "Block D", "Block E"]
const DATE_RANGES = ["Hari ini", "7 hari terakhir", "9 - 10 Sep 2024", "Bulan ini", "Kuartal ini"]

function MenuShell({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-full overflow-hidden rounded-lg border border-white/10 bg-[#10201a] py-1 shadow-xl shadow-black/40">
        {children}
      </div>
    </>
  )
}

function Selector({
  label,
  value,
  options,
  onSelect,
}: {
  label: string
  value: string
  options: string[]
  onSelect: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex min-w-[130px] items-center gap-2 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-1.5 text-left transition-colors hover:bg-white/[0.06]"
      >
        <div className="grid flex-1 leading-tight">
          <span className="text-[9px] uppercase tracking-wide text-white/35">{label}</span>
          <span className="text-[12.5px] font-semibold text-white/90">{value}</span>
        </div>
        <ChevronDownIcon className={cn("size-3.5 text-white/40 transition-transform", open && "rotate-180")} />
      </button>
      <MenuShell open={open} onClose={() => setOpen(false)}>
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => {
              onSelect(opt)
              setOpen(false)
            }}
            className={cn(
              "block w-full px-3 py-2 text-left text-[12.5px] transition-colors hover:bg-white/5",
              opt === value ? "font-semibold text-emerald-400" : "text-white/75"
            )}
          >
            {opt}
          </button>
        ))}
      </MenuShell>
    </div>
  )
}

export function PeatHeader({ title, subtitle }: { title?: string; subtitle?: string }) {
  const m = dashboardMeta
  const router = useRouter()
  const user = useSession()
  const displayName = user?.name ?? m.user.name
  const displayRole = user?.role ?? m.user.role
  const [loggingOut, setLoggingOut] = useState(false)
  const [estate, setEstate] = useState(m.estate)
  const [division, setDivision] = useState(m.division)
  const [dateRange, setDateRange] = useState(m.dateRange)
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-white/5 px-5 py-3">
      <div className="mr-auto min-w-[240px]">
        <h1 className="text-[19px] font-bold leading-tight text-white">{title ?? m.title}</h1>
        {subtitle ? <p className="text-[12px] text-emerald-400/80">{subtitle}</p> : null}
      </div>

      <Selector
        label="Estate"
        value={estate}
        options={ESTATES}
        onSelect={(v) => {
          setEstate(v)
          toast.success(`Estate diubah ke ${v}`)
        }}
      />
      <Selector
        label="Division"
        value={division}
        options={DIVISIONS}
        onSelect={(v) => {
          setDivision(v)
          toast.success(`Division diubah ke ${v}`)
        }}
      />

      <div className="relative">
        <DateButton value={dateRange} onSelect={(v) => { setDateRange(v); toast(`Rentang: ${v}`) }} />
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-1.5">
        <CloudRainIcon className="size-5 text-sky-400" />
        <div className="grid leading-tight">
          <span className="text-[13px] font-bold text-white">{m.weather.temp}</span>
          <span className="text-[10px] text-white/45">{m.weather.condition}</span>
        </div>
      </div>

      <div className="relative">
        <button
          onClick={() => setProfileOpen((o) => !o)}
          className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-1.5 transition-colors hover:bg-white/[0.06]"
        >
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-sky-500 text-[12px] font-bold text-white">
            {displayName
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("")}
          </span>
          <div className="grid leading-tight">
            <span className="text-[12.5px] font-semibold text-white/90">{displayName}</span>
            <span className="text-[10px] text-white/45">{displayRole}</span>
          </div>
          <ChevronDownIcon className={cn("size-3.5 text-white/40 transition-transform", profileOpen && "rotate-180")} />
        </button>
        <MenuShell open={profileOpen} onClose={() => setProfileOpen(false)}>
          <button
            onClick={() => {
              setProfileOpen(false)
              toast.info("Membuka profil pengguna…")
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] text-white/75 transition-colors hover:bg-white/5"
          >
            <UserIcon className="size-3.5" /> Profil Saya
          </button>
          <button
            onClick={() => {
              setProfileOpen(false)
              router.push("/settings")
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] text-white/75 transition-colors hover:bg-white/5"
          >
            <SettingsIcon className="size-3.5" /> Pengaturan
          </button>
          <button
            disabled={loggingOut}
            onClick={async () => {
              setLoggingOut(true)
              setProfileOpen(false)
              await logout()
            }}
            className="flex w-full items-center gap-2 border-t border-white/5 px-3 py-2 text-left text-[12.5px] text-red-400 transition-colors hover:bg-white/5 disabled:opacity-60"
          >
            <LogOutIcon className="size-3.5" /> {loggingOut ? "Keluar…" : "Keluar"}
          </button>
        </MenuShell>
      </div>
    </header>
  )
}

function DateButton({ value, onSelect }: { value: string; onSelect: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-[12.5px] font-medium text-white/85 transition-colors hover:bg-white/[0.06]"
      >
        <CalendarIcon className="size-4 text-white/50" />
        {value}
        <ChevronDownIcon className={cn("size-3.5 text-white/40 transition-transform", open && "rotate-180")} />
      </button>
      <MenuShell open={open} onClose={() => setOpen(false)}>
        {DATE_RANGES.map((opt) => (
          <button
            key={opt}
            onClick={() => {
              onSelect(opt)
              setOpen(false)
            }}
            className={cn(
              "block w-full whitespace-nowrap px-3 py-2 text-left text-[12.5px] transition-colors hover:bg-white/5",
              opt === value ? "font-semibold text-emerald-400" : "text-white/75"
            )}
          >
            {opt}
          </button>
        ))}
      </MenuShell>
    </>
  )
}
