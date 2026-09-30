"use client"

import Link from "next/link"
import { ArrowDownIcon, ArrowUpIcon, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { TONE_COLOR, type Tone } from "./status"

export type StatDelta = {
  text: string
  dir: "up" | "down"
  /** true = perubahan baik (hijau), false = buruk (merah), null = netral. */
  good?: boolean | null
  /** Pembanding, mis. "vs kemarin", "vs pass lalu". */
  vs?: string
}

/** Garis kecil tren untuk kartu KPI (tanpa Recharts agar ringan). */
function Spark({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const pts = data.map((v, i) => [(i / (data.length - 1)) * 100, 26 - ((v - min) / span) * 22 - 2] as const)
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ")
  const id = `spark-${color.replace("#", "")}`
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="h-7 w-full" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L100 28 L0 28 Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.2" fill={color} />
    </svg>
  )
}

/**
 * Kartu KPI bersama semua halaman. Nilai diwarnai sesuai `tone` (termasuk level
 * EWS); `status` = teks di bawah nilai; `delta` / `foot` di baris bawah;
 * `spark` = deret tren kecil; `href` membuat kartu jadi tautan.
 */
export function StatTile({
  label,
  value,
  unit,
  icon: Icon,
  tone = "normal",
  status,
  delta,
  foot,
  spark,
  href,
  onClick,
  className,
}: {
  label: string
  value: string
  unit?: string
  icon: LucideIcon
  tone?: Tone
  status?: string
  delta?: StatDelta
  foot?: string
  spark?: number[]
  href?: string
  onClick?: () => void
  className?: string
}) {
  const c = TONE_COLOR[tone]
  const DeltaIcon = delta?.dir === "up" ? ArrowUpIcon : ArrowDownIcon
  const deltaColor = delta?.good == null ? "text-white/55" : delta.good ? "text-emerald-400" : "text-red-400"
  const interactive = Boolean(href || onClick)

  const body = (
    <>
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, color-mix(in srgb, ${c} 55%, transparent), transparent)` }}
      />
      <div className="flex items-start justify-between gap-2">
        <span className="kicker leading-[1.35] text-white/55">{label}</span>
        <span
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg ring-1"
          style={{ color: c, background: `color-mix(in srgb, ${c} 12%, transparent)`, ["--tw-ring-color" as string]: `color-mix(in srgb, ${c} 25%, transparent)` }}
        >
          <Icon className="size-4" />
        </span>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-[28px] font-bold leading-none tracking-tight tabular-nums" style={{ color: c }}>
          {value}
        </span>
        {unit && <span className="text-[12.5px] font-medium text-white/50">{unit}</span>}
      </div>

      {status && (
        <div className="-mt-1 flex items-center gap-1.5">
          <span className="size-1.5 rounded-full" style={{ background: c, boxShadow: `0 0 6px ${c}` }} />
          <span className="text-[11.5px] font-medium text-white/70">{status}</span>
        </div>
      )}

      {spark && <Spark data={spark} color={c} />}

      {(delta || foot) && (
        <div className="mt-auto flex items-center gap-1 border-t border-white/[0.06] pt-2 text-[11px]">
          {delta ? (
            <>
              <span className="text-white/45">{delta.vs ?? "vs kemarin"}</span>
              <DeltaIcon className={cn("size-3", deltaColor)} />
              <span className={cn("font-semibold", deltaColor)}>{delta.text}</span>
            </>
          ) : (
            <span className="text-white/50">{foot}</span>
          )}
        </div>
      )}
    </>
  )

  const cls = cn(
    "relative flex flex-col gap-3 overflow-hidden rounded-[14px] border border-emerald-200/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.01))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[border-color,transform,background] duration-200",
    interactive && "cursor-pointer hover:-translate-y-0.5 hover:border-emerald-300/25 focus-visible:outline-2 focus-visible:outline-emerald-400/60",
    className
  )

  if (href) {
    return (
      <Link href={href} className={cls}>
        {body}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(cls, "text-left")}>
        {body}
      </button>
    )
  }
  return <div className={cls}>{body}</div>
}
