"use client"

import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"

/** Kartu dasar semua halaman: sudut 14px, garis tipis bernuansa emerald, sorotan atas. */
export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-[14px] border border-emerald-200/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.042),rgba(255,255,255,0.012)_46%,rgba(255,255,255,0.008))] shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_12px_32px_rgba(0,0,0,0.22)]",
        className
      )}
    >
      {children}
    </div>
  )
}

/**
 * Header kartu. `kicker` = label kecil mono di atas judul (gaya command center
 * Digital Twin); `icon` tampil di samping kicker.
 */
export function PanelHeader({
  title,
  subtitle,
  kicker,
  icon: Icon,
  action,
  className,
}: {
  title: string
  subtitle?: string
  kicker?: string
  icon?: LucideIcon
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 px-4 pb-2 pt-3.5", className)}>
      <div className="min-w-0">
        {kicker && (
          <span className="kicker mb-1 flex items-center gap-1.5 text-emerald-300/70">
            {Icon && <Icon className="size-3" />}
            {kicker}
          </span>
        )}
        <h3 className="truncate text-[14px] font-semibold tracking-[-0.01em] text-white">{title}</h3>
        {subtitle && <p className="truncate text-[11px] text-white/50">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  )
}

const viewAllClass =
  "inline-flex items-center gap-1 text-[11.5px] font-medium text-emerald-400 transition-colors hover:text-emerald-300"

/** Tautan "View All": pakai `href` (halaman tujuan) bila ada, selain itu `onClick`. */
export function ViewAll({ onClick, href, label = "View All" }: { onClick?: () => void; href?: string; label?: string }) {
  if (href) {
    return (
      <Link href={href} className={viewAllClass}>
        {label}
      </Link>
    )
  }
  return (
    <button onClick={onClick ?? (() => toast.info("Membuka tampilan lengkap…"))} className={viewAllClass}>
      {label}
    </button>
  )
}

/** Pembungkus tabel: bisa digeser horizontal di layar sempit. */
export function TableScroll({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("peat-scroll overflow-x-auto", className)}>{children}</div>
}

/** Kelas sel tabel standar (header & isi). */
export const tableTh = "whitespace-nowrap px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/45"
export const tableTd = "px-3 py-2 text-[12px]"
export const tableRow = "border-t border-white/[0.06] transition-colors hover:bg-emerald-400/[0.035]"
