"use client"

import { FlameIcon } from "lucide-react"
import { toast } from "sonner"

import { aiInsight, alerts, type Severity } from "@/lib/peatland/mock-data"
import { cn } from "@/lib/utils"
import { Panel, ViewAll } from "./panel"

const severityStyle: Record<Severity, { dot: string; text: string; label: string }> = {
  critical: { dot: "bg-red-500", text: "text-red-400", label: "Critical" },
  warning: { dot: "bg-amber-500", text: "text-amber-400", label: "Warning" },
  info: { dot: "bg-sky-500", text: "text-sky-400", label: "Info" },
}

export function AlertCenter() {
  return (
    <div className="flex flex-col gap-3">
      <Panel>
        <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
          <h3 className="text-[14px] font-semibold text-white">Alert Center</h3>
          <ViewAll onClick={() => toast.info(`Menampilkan ${alerts.length} alert aktif`)} />
        </div>
        <div className="px-1 pb-1">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-white/35">
                <th className="px-3 py-1.5 font-medium">Time</th>
                <th className="px-2 py-1.5 font-medium">Asset</th>
                <th className="px-2 py-1.5 font-medium">Alert</th>
                <th className="px-3 py-1.5 text-right font-medium">Severity</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => {
                const s = severityStyle[a.severity]
                return (
                  <tr
                    key={a.time + a.asset}
                    onClick={() => toast(`${a.asset} · ${a.time}`, { description: a.alert })}
                    className="cursor-pointer border-t border-white/5 transition-colors hover:bg-white/[0.03]"
                  >
                    <td className="px-3 py-2 text-[12px] text-white/55">{a.time}</td>
                    <td className="px-2 py-2 text-[12px] font-medium text-white/85">{a.asset}</td>
                    <td className={cn("px-2 py-2 text-[12px]", s.text)}>{a.alert}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium", s.text)}>
                        <span className={cn("size-1.5 rounded-full", s.dot)} />
                        {s.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* AI Insight */}
      <Panel className="border-emerald-500/20 bg-emerald-500/[0.04]">
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-7 items-center justify-center rounded-lg bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/25">
                <FlameIcon className="size-4" />
              </span>
              <span className="text-[14px] font-semibold text-white">AI Insight</span>
            </div>
            <ViewAll onClick={() => toast.info("Membuka riwayat AI Insight…")} />
          </div>
          <p className="text-[12.5px] leading-relaxed text-white/65">{aiInsight}</p>
          <button
            onClick={() =>
              toast.success("Rekomendasi", {
                description:
                  "Naikkan tinggi muka air Block C ke -30 cm via Water Gate WTG-02 dalam 48 jam, dan jadwalkan patroli gambut tambahan.",
                duration: 6000,
              })
            }
            className="self-start rounded-lg bg-emerald-500/15 px-4 py-2 text-[12px] font-semibold text-emerald-300 ring-1 ring-emerald-500/30 transition-colors hover:bg-emerald-500/25"
          >
            View Recommendation
          </button>
        </div>
      </Panel>
    </div>
  )
}
