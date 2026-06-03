import { cn } from "@/lib/utils"

import type { StatusRisiko, StatusPerangkat, StatusEvent } from "@/lib/types"

const riskMap: Record<StatusRisiko, string> = {
  Normal: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30",
  Waspada: "bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/30",
  Siaga: "bg-orange-500/15 text-orange-700 dark:text-orange-300 ring-orange-500/30",
  Awas: "bg-rose-500/15 text-rose-700 dark:text-rose-300 ring-rose-500/30",
}

const deviceMap: Record<StatusPerangkat, string> = {
  Online: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30",
  Weak: "bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/30",
  Offline: "bg-rose-500/15 text-rose-700 dark:text-rose-300 ring-rose-500/30",
  Maintenance: "bg-sky-500/15 text-sky-700 dark:text-sky-300 ring-sky-500/30",
}

const eventMap: Record<StatusEvent, string> = {
  Open: "bg-rose-500/15 text-rose-700 dark:text-rose-300 ring-rose-500/30",
  "In Progress": "bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/30",
  Resolved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30",
}

type Props = {
  status: StatusRisiko | StatusPerangkat | StatusEvent | string
  className?: string
}

export function StatusBadge({ status, className }: Props) {
  const cls =
    (riskMap as Record<string, string>)[status] ||
    (deviceMap as Record<string, string>)[status] ||
    (eventMap as Record<string, string>)[status] ||
    "bg-muted text-foreground ring-foreground/15"

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        cls,
        className,
      )}
    >
      {status}
    </span>
  )
}
