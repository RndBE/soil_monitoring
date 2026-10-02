import Image from "next/image"

import { cn } from "@/lib/utils"

/**
 * Logo PT Geosistem Instrumen versi tema gelap: simbol "G" (PNG transparan,
 * public/brand/geosistem-mark.png, warna asli biru-hijau) + wordmark teks terang dengan
 * tagline dua warna (emerald | sky) mengikuti palet dashboard. Teks dirender HTML supaya
 * tajam di semua ukuran.
 * - `sm` (sidebar 210 px, login mobile): bertumpuk — simbol + nama dua baris, tagline di bawah.
 * - `lg` (panel login): satu baris.
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
  const tagline = (
    <>
      <span className="text-emerald-300">MONITORING TODAY</span>
      <span className="text-white/35"> | </span>
      <span className="text-sky-300">SAFER TOMORROW</span>
    </>
  )
  const mark = (cls: string) => (
    <Image
      src="/brand/geosistem-mark.png"
      alt=""
      width={108}
      height={82}
      priority={priority}
      className={cn("w-auto shrink-0 drop-shadow-[0_2px_8px_rgba(56,189,248,0.25)]", cls)}
    />
  )

  if (size === "lg") {
    return (
      <span className={cn("inline-flex min-w-0 items-center gap-3", className)}>
        {mark("h-12")}
        <span className="grid min-w-0 leading-[1.15]">
          <span className="whitespace-nowrap text-[17px] font-extrabold tracking-[0.01em] text-white">PT GEOSISTEM INSTRUMEN</span>
          <span className="whitespace-nowrap text-[10.5px] font-semibold tracking-[0.03em]">{tagline}</span>
        </span>
      </span>
    )
  }

  return (
    <span className={cn("inline-grid min-w-0 gap-1.5", className)} aria-label="PT Geosistem Instrumen">
      <span className="flex min-w-0 items-center gap-2">
        {mark("h-9")}
        <span className="grid min-w-0 text-[12.5px] font-extrabold leading-[1.1] tracking-[0.02em] text-white">
          <span>PT GEOSISTEM</span>
          <span>INSTRUMEN</span>
        </span>
      </span>
      <span className="whitespace-nowrap text-[7.5px] font-semibold tracking-[0.04em]">{tagline}</span>
    </span>
  )
}
