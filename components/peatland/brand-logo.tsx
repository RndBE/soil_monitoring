import Image from "next/image"

import { cn } from "@/lib/utils"

/**
 * Logo Beacon Engineering versi latar gelap (public/brand/logo_beacon_dark.png: "b" merah,
 * "e" + wordmark putih; PNG transparan 499×148). Versi biasa (logo_beacon.png) berteks
 * biru tua dan tenggelam di tema gelap dashboard ini.
 * Wordmark sudah ada di gambar, jadi tidak ada teks HTML tambahan.
 * - `sm` (sidebar 210 px, login mobile).
 * - `lg` (panel login).
 */
export function BrandLogo({
  className,
  size = "sm",
  priority = false,
}: {
  className?: string
  size?: "sm" | "lg"
  priority?: boolean
}) {
  // Dibungkus span supaya gambar tidak ikut di-stretch saat induknya flex-col.
  return (
    <span className={cn("inline-flex min-w-0", className)}>
      <Image
        src="/brand/logo_beacon_dark.png"
        alt="Beacon Engineering"
        width={499}
        height={148}
        priority={priority}
        className={cn("w-auto shrink-0", size === "lg" ? "h-14" : "h-10")}
      />
    </span>
  )
}
