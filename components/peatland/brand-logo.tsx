/**
 * Emblem brand premium: badge squircle emerald-gelap dengan daun-tetesan
 * bergradien emas→emerald, rim emas tipis, dan kilau halus. Murni SVG (no deps).
 */
export function BrandLogo({
  className,
  /** Wajib diisi berbeda kalau ada >1 logo di satu halaman — id gradien harus unik. */
  idPrefix = "bl",
}: {
  className?: string
  idPrefix?: string
}) {
  const badge = `${idPrefix}-badge`
  const rim = `${idPrefix}-rim`
  const leaf = `${idPrefix}-leaf`
  const gloss = `${idPrefix}-gloss`

  return (
    <svg viewBox="0 0 40 40" className={className} role="img" aria-label="Logo" fill="none">
      <defs>
        <linearGradient id={badge} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#14694d" />
          <stop offset="52%" stopColor="#0a4030" />
          <stop offset="100%" stopColor="#04241a" />
        </linearGradient>
        <linearGradient id={rim} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id={leaf} x1="0.2" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="38%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
        <radialGradient id={gloss} cx="0.3" cy="0.24" r="0.72">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.32" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Badge */}
      <rect x="1.5" y="1.5" width="37" height="37" rx="12" fill={`url(#${badge})`} />
      <rect x="1.5" y="1.5" width="37" height="37" rx="12" fill={`url(#${gloss})`} />
      <rect
        x="2.1"
        y="2.1"
        width="35.8"
        height="35.8"
        rx="11.4"
        fill="none"
        stroke={`url(#${rim})`}
        strokeOpacity="0.55"
        strokeWidth="1.1"
      />

      {/* Daun-tetesan (water + leaf) */}
      <path d="M20 8.4 C27 13.8 27.6 24 20 30.2 C12.4 24 13 13.8 20 8.4 Z" fill={`url(#${leaf})`} />
      {/* Kilau spekular tipis di tepi kiri */}
      <path
        d="M19 10.6 C14.6 15 14.4 21.4 17.6 26.6"
        stroke="#ffffff"
        strokeOpacity="0.4"
        strokeWidth="1"
        strokeLinecap="round"
      />
      {/* Tulang daun */}
      <g stroke="#05281d" strokeOpacity="0.5" strokeLinecap="round">
        <path d="M20 11.4 L20 28" strokeWidth="1.3" />
        <path d="M20 16 L23.4 13.8" strokeWidth="0.9" strokeOpacity="0.42" />
        <path d="M20 16 L16.6 13.8" strokeWidth="0.9" strokeOpacity="0.42" />
        <path d="M20 19.6 L24 17.6" strokeWidth="0.9" strokeOpacity="0.42" />
        <path d="M20 19.6 L16 17.6" strokeWidth="0.9" strokeOpacity="0.42" />
        <path d="M20 23.2 L23 21.7" strokeWidth="0.9" strokeOpacity="0.42" />
        <path d="M20 23.2 L17 21.7" strokeWidth="0.9" strokeOpacity="0.42" />
      </g>
    </svg>
  )
}
