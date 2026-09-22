import { Suspense } from "react"
import type { Metadata } from "next"

import { LoginForm } from "@/components/login-form"
import { BrandLogo } from "@/components/peatland/brand-logo"
import {
  alerts,
  dashboardMeta,
  fireRiskTrend,
  stations,
  waterTableTrend,
} from "@/lib/peatland/mock-data"

export const metadata: Metadata = {
  title: "Masuk · Peatland & Plantation Monitoring",
  description: "Portal masuk sistem pemantauan lahan gambut dan perkebunan.",
}

export const dynamic = "force-dynamic"

/** Ubah deret angka jadi path sparkline dalam kotak w×h. */
function sparkPath(values: number[], w: number, h: number) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w
      const y = h - ((v - min) / span) * h
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(" ")
}

const waterValues = waterTableTrend.map((d) => d.value)
const fireValue = fireRiskTrend.at(-1)?.value ?? 0
const criticalCount = alerts.filter((a) => a.severity === "critical").length

/** Titik stasiun pada peta dekoratif: [x%, y%, tone] */
const MARKERS: Array<[number, number, string]> = [
  [22, 30, "#34d399"],
  [38, 52, "#34d399"],
  [57, 26, "#fbbf24"],
  [68, 62, "#34d399"],
  [46, 78, "#ef4444"],
  [80, 42, "#34d399"],
]

export default function LoginPage() {
  return (
    <main className="dark grid min-h-svh bg-[#080d0a] text-white lg:grid-cols-[1.1fr_minmax(440px,0.9fr)]">
      {/* ── Panel operasional (desktop) ───────────────────────────────── */}
      <section
        aria-hidden
        className="login-ops-bg relative hidden overflow-hidden border-r border-white/5 lg:block"
      >
        {/* Peta estate dekoratif */}
        <svg
          className="absolute inset-0 size-full"
          viewBox="0 0 600 800"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          <defs>
            <radialGradient id="ops-glow" cx="0.5" cy="0.42" r="0.6">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="ops-canal" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.35" />
            </linearGradient>
            <radialGradient
              id="ops-sweep"
              gradientUnits="userSpaceOnUse"
              cx="300"
              cy="340"
              r="212"
            >
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.18" />
              <stop offset="60%" stopColor="#34d399" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width="600" height="800" fill="url(#ops-glow)" />

          {/* Blok kebun */}
          <g stroke="#34d399" strokeOpacity="0.16" fill="#ffffff" fillOpacity="0.015">
            <rect x="72" y="150" width="150" height="112" rx="10" />
            <rect x="238" y="126" width="132" height="136" rx="10" />
            <rect x="386" y="168" width="142" height="108" rx="10" />
            <rect x="96" y="284" width="168" height="126" rx="10" />
            <rect x="282" y="280" width="128" height="130" rx="10" />
            <rect x="428" y="296" width="112" height="118" rx="10" />
            <rect x="130" y="436" width="146" height="120" rx="10" />
            <rect x="296" y="432" width="160" height="124" rx="10" />
          </g>

          {/* Garis kontur gambut */}
          <g stroke="#fbbf24" strokeOpacity="0.1" strokeWidth="1" fill="none">
            <path d="M20 620 C140 566 268 656 404 590 S560 540 592 574" />
            <path d="M20 664 C150 612 280 700 414 634 S566 588 592 620" />
            <path d="M20 708 C160 658 292 742 424 678 S572 636 592 666" />
          </g>

          {/* Kanal — aliran berjalan */}
          <g
            className="login-data-route"
            stroke="url(#ops-canal)"
            strokeWidth="2"
            strokeDasharray="10 8"
            strokeLinecap="round"
            fill="none"
          >
            <path d="M40 206 H560" />
            <path d="M40 424 H560" />
            <path d="M232 96 V600" />
            <path d="M420 96 V600" />
          </g>

          {/* Sapuan radar */}
          <g style={{ transformOrigin: "300px 340px" }} className="login-radar-sweep">
            <path d="M300 340 L300 128 A212 212 0 0 1 452 192 Z" fill="url(#ops-sweep)" />
            <path d="M300 340 L300 128" stroke="#34d399" strokeOpacity="0.22" strokeWidth="1" />
          </g>
          <circle cx="300" cy="340" r="212" stroke="#34d399" strokeOpacity="0.1" />
          <circle cx="300" cy="340" r="132" stroke="#34d399" strokeOpacity="0.08" />
        </svg>

        {/* Penanda stasiun */}
        {MARKERS.map(([x, y, tone]) => (
          <span
            key={`${x}-${y}`}
            className="login-marker-ping absolute size-2.5 rounded-full"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              background: tone,
              boxShadow: `0 0 0 4px ${tone}22, 0 0 16px ${tone}88`,
            }}
          />
        ))}

        {/* Isi panel */}
        <div className="relative flex h-full flex-col justify-between p-10 xl:p-12">
          <div className="flex items-center gap-3">
            <BrandLogo className="size-11 shrink-0 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]" />
            <div className="grid leading-tight">
              <span className="text-[12px] font-bold tracking-[0.16em] text-white">
                PEATLAND MONITORING
              </span>
              <span className="text-[10px] font-medium tracking-wide text-white/40">
                {dashboardMeta.org.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="max-w-[440px] space-y-5">
            <h2 className="text-[34px] font-bold leading-[1.15] tracking-tight xl:text-[38px]">
              Pantau gambut,
              <br />
              <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-amber-300 bg-clip-text text-transparent">
                lindungi kebun.
              </span>
            </h2>
            <p className="text-[13.5px] leading-relaxed text-white/50">
              Muka air, risiko kebakaran, curah hujan, dan kesehatan tanaman dari{" "}
              {stations.total} stasiun lapangan — dalam satu layar, diperbarui terus-menerus.
            </p>

            {/* Status telemetri */}
            <div className="login-float-card w-fit rounded-xl border border-white/8 bg-white/[0.04] p-3.5 ring-1 ring-white/5 backdrop-blur-md">
              <div className="mb-2 flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
                  Sinkronisasi telemetri
                </span>
              </div>
              <div className="h-1 w-56 overflow-hidden rounded-full bg-white/8">
                <div className="login-scan-bar h-full rounded-full bg-gradient-to-r from-emerald-400 to-amber-300" />
              </div>
            </div>
          </div>

          {/* Kartu metrik */}
          <div className="grid grid-cols-3 gap-3">
            <div className="login-float-row rounded-xl border border-white/8 bg-white/[0.04] p-3.5 ring-1 ring-white/5 backdrop-blur-md">
              <div className="text-[10px] uppercase tracking-[0.14em] text-white/40">
                Stasiun Online
              </div>
              <div className="mt-1 text-[22px] font-bold leading-none">
                {stations.online}
                <span className="ml-1 text-[12px] font-medium text-white/35">
                  /{stations.total}
                </span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-emerald-400"
                  style={{ width: `${stations.percent}%` }}
                />
              </div>
            </div>

            <div className="login-float-row rounded-xl border border-white/8 bg-white/[0.04] p-3.5 ring-1 ring-white/5 backdrop-blur-md">
              <div className="text-[10px] uppercase tracking-[0.14em] text-white/40">
                Muka Air 7 Hari
              </div>
              <div className="mt-1 text-[22px] font-bold leading-none text-emerald-300">
                {waterValues.at(-1)}
                <span className="ml-1 text-[12px] font-medium text-white/35">cm</span>
              </div>
              <svg viewBox="0 0 96 22" className="mt-1.5 h-[22px] w-full" fill="none">
                {/* Garis dasar selalu tampak; kilau berjalan di atasnya. */}
                <path
                  d={sparkPath(waterValues, 96, 20)}
                  stroke="#34d399"
                  strokeOpacity="0.35"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  className="login-spark-line"
                  d={sparkPath(waterValues, 96, 20)}
                  stroke="#6ee7b7"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="login-float-row rounded-xl border border-white/8 bg-white/[0.04] p-3.5 ring-1 ring-white/5 backdrop-blur-md">
              <div className="text-[10px] uppercase tracking-[0.14em] text-white/40">
                Indeks Kebakaran
              </div>
              <div className="mt-1 text-[22px] font-bold leading-none text-amber-300">
                {fireValue}
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-[10.5px] text-white/40">
                <span className="size-1.5 rounded-full bg-red-500" />
                {criticalCount} alert kritis
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Sisi formulir ─────────────────────────────────────────────── */}
      <section className="login-form-side relative flex flex-col items-center justify-center px-5 py-10 sm:px-10">
        {/* Lockup brand versi mobile */}
        <div className="mb-7 flex items-center gap-2.5 lg:hidden">
          <BrandLogo className="size-9 shrink-0" idPrefix="bl-login-mobile" />
          <div className="grid leading-tight">
            <span className="text-[11.5px] font-bold tracking-[0.14em] text-white">
              PEATLAND MONITORING
            </span>
            <span className="text-[9.5px] font-medium text-white/40">
              {dashboardMeta.org.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="login-auth-card relative w-full max-w-[400px] overflow-hidden rounded-2xl border border-white/10 bg-[#0b120e]/85 p-7 backdrop-blur-xl">
          {/* Hairline emas di tepi atas */}
          <span className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />
          <Suspense fallback={<div className="h-[430px]" />}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-white/30">
          {dashboardMeta.org} · Sistem internal. Aktivitas masuk dicatat.
        </p>
      </section>
    </main>
  )
}
