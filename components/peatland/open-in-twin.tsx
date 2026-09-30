"use client"

import Link from "next/link"
import { BoxIcon } from "lucide-react"

import { twinHref, type TwinLink } from "@/lib/peatland/stations"
import { cn } from "@/lib/utils"

/**
 * Tautan ke halaman Digital Twin yang langsung memilih aset / block / layer.
 * `asset` boleh id twin (m5) atau kode stasiun (BH-07); stasiun yang tidak
 * dimodelkan di 3D membuka block-nya. `variant="icon"` untuk baris tabel.
 */
export function OpenInTwin({
  label = "Buka di Twin",
  variant = "button",
  className,
  ...link
}: TwinLink & { label?: string; variant?: "button" | "icon" | "link"; className?: string }) {
  const href = twinHref(link)
  const title = `${label}${link.asset ? ` · ${link.asset}` : link.block ? ` · ${link.block}` : ""}`
  if (variant === "icon") {
    return (
      <Link
        href={href}
        title={title}
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "inline-flex size-7 items-center justify-center rounded-md border border-emerald-400/20 bg-emerald-500/[0.08] text-emerald-300 transition-colors hover:border-emerald-300/45 hover:bg-emerald-500/20",
          className
        )}
      >
        <BoxIcon className="size-3.5" />
      </Link>
    )
  }
  if (variant === "link") {
    return (
      <Link
        href={href}
        onClick={(e) => e.stopPropagation()}
        className={cn("inline-flex items-center gap-1 text-[11.5px] font-medium text-emerald-400 transition-colors hover:text-emerald-300", className)}
      >
        <BoxIcon className="size-3.5" />
        {label}
      </Link>
    )
  }
  return (
    <Link
      href={href}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-500/[0.12] px-2.5 py-1.5 text-[11.5px] font-semibold text-emerald-200 transition-colors hover:border-emerald-300/50 hover:bg-emerald-500/25",
        className
      )}
    >
      <BoxIcon className="size-3.5" />
      {label}
    </Link>
  )
}
