"use client"

import { toast } from "sonner"

import { cn } from "@/lib/utils"

export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-white/8 bg-gradient-to-b from-white/[0.035] to-transparent ring-1 ring-white/5",
        className
      )}
    >
      {children}
    </div>
  )
}

export function PanelHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-3.5">
      <div>
        <h3 className="text-[14px] font-semibold text-white">{title}</h3>
        {subtitle && <p className="text-[11px] text-white/40">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function ViewAll({ onClick, label = "View All" }: { onClick?: () => void; label?: string }) {
  return (
    <button
      onClick={onClick ?? (() => toast.info("Membuka tampilan lengkap…"))}
      className="text-[11.5px] font-medium text-emerald-400 transition-colors hover:text-emerald-300"
    >
      {label}
    </button>
  )
}
