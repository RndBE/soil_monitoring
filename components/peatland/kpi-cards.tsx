import {
  ArrowDownIcon,
  ArrowUpIcon,
  BellIcon,
  CloudRainIcon,
  FlameIcon,
  RadioTowerIcon,
  WavesIcon,
} from "lucide-react"

import { kpis, type Kpi } from "@/lib/peatland/mock-data"
import { cn } from "@/lib/utils"

const iconMap = {
  water: WavesIcon,
  borehole: RadioTowerIcon,
  fire: FlameIcon,
  rain: CloudRainIcon,
  alert: BellIcon,
  signal: RadioTowerIcon,
}

const valueTone: Record<Kpi["statusTone"], string> = {
  normal: "text-emerald-400",
  warning: "text-amber-400",
  critical: "text-red-400",
  info: "text-sky-400",
}

const iconTone: Record<Kpi["statusTone"], string> = {
  normal: "bg-emerald-500/12 text-emerald-400 ring-emerald-500/20",
  warning: "bg-amber-500/12 text-amber-400 ring-amber-500/20",
  critical: "bg-red-500/12 text-red-400 ring-red-500/20",
  info: "bg-sky-500/12 text-sky-400 ring-sky-500/20",
}

const statusDot: Record<Kpi["statusTone"], string> = {
  normal: "bg-emerald-500",
  warning: "bg-amber-500",
  critical: "bg-red-500",
  info: "bg-sky-500",
}

function KpiCard({ k }: { k: Kpi }) {
  const Icon = iconMap[k.icon]
  const DeltaIcon = k.deltaDir === "up" ? ArrowUpIcon : ArrowDownIcon
  const deltaColor =
    k.deltaTone === "good" ? "text-emerald-400" : k.deltaTone === "bad" ? "text-red-400" : "text-white/50"

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/8 bg-[#11181400] bg-gradient-to-b from-white/[0.04] to-transparent p-4 ring-1 ring-white/5 transition-colors hover:border-white/15">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10.5px] font-semibold uppercase tracking-wide text-white/45">{k.label}</span>
        <span className={cn("inline-flex size-8 items-center justify-center rounded-lg ring-1", iconTone[k.statusTone])}>
          <Icon className="size-4" />
        </span>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className={cn("text-[30px] font-bold leading-none tracking-tight", valueTone[k.statusTone])}>
          {k.value}
        </span>
        {k.unit && <span className="text-[13px] font-medium text-white/40">{k.unit}</span>}
      </div>

      <div className="flex items-center gap-1.5">
        <span className={cn("size-1.5 rounded-full", statusDot[k.statusTone])} />
        <span className="text-[12px] font-medium text-white/65">{k.status}</span>
      </div>

      <div className="flex items-center gap-1 border-t border-white/5 pt-2 text-[11px]">
        <span className="text-white/40">vs yesterday</span>
        <DeltaIcon className={cn("size-3", deltaColor)} />
        <span className={cn("font-semibold", deltaColor)}>{k.delta}</span>
      </div>
    </div>
  )
}

export function KpiCards() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {kpis.map((k) => (
        <KpiCard key={k.key} k={k} />
      ))}
    </div>
  )
}
