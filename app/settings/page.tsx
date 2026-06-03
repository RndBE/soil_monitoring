"use client"

import { useState } from "react"
import {
  BellIcon,
  CheckIcon,
  CloudRainIcon,
  DropletIcon,
  FlameIcon,
  MailIcon,
  MessageSquareIcon,
  PlugIcon,
  SatelliteIcon,
  SaveIcon,
  ServerIcon,
  ShieldAlertIcon,
  ThermometerIcon,
  WavesIcon,
  WrenchIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Panel, ViewAll } from "@/components/peatland/panel"
import { PeatShell } from "@/components/peatland/peat-shell"
import { cn } from "@/lib/utils"

type TeamStatus = "active" | "away" | "offline"

const teamStatusStyle: Record<TeamStatus, { text: string; dot: string; label: string }> = {
  active: { text: "text-emerald-400", dot: "bg-emerald-500", label: "Active" },
  away: { text: "text-amber-400", dot: "bg-amber-500", label: "Away" },
  offline: { text: "text-white/45", dot: "bg-slate-500", label: "Offline" },
}

const th = "px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-white/35"
const td = "px-3 py-2 text-[12px]"

function PanelHead({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
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

function InputRow({
  label,
  value,
  icon: Icon,
  onChange,
}: {
  label: string
  value: string
  icon?: React.ElementType
  onChange?: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10.5px] font-semibold uppercase tracking-wide text-white/45">{label}</span>
      <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 ring-1 ring-white/5">
        {Icon && <Icon className="size-3.5 shrink-0 text-white/35" />}
        {onChange ? (
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-transparent text-[12.5px] font-medium text-white/80 outline-none focus:ring-1 focus:ring-emerald-500/40 rounded"
          />
        ) : (
          <span className="text-[12.5px] font-medium text-white/80">{value}</span>
        )}
      </div>
    </div>
  )
}

function Toggle({
  label,
  description,
  on,
  icon: Icon,
  tone = "emerald",
  onToggle,
}: {
  label: string
  description?: string
  on: boolean
  icon?: React.ElementType
  tone?: "emerald" | "sky" | "amber"
  onToggle?: () => void
}) {
  const toneBg =
    tone === "sky" ? "bg-sky-500/12 text-sky-400 ring-sky-500/20" : tone === "amber" ? "bg-amber-500/12 text-amber-400 ring-amber-500/20" : "bg-emerald-500/12 text-emerald-400 ring-emerald-500/20"
  return (
    <div className="flex items-center justify-between gap-3 border-t border-white/5 px-4 py-2.5 first:border-t-0">
      <div className="flex items-center gap-2.5">
        {Icon && (
          <span className={cn("inline-flex size-8 items-center justify-center rounded-lg ring-1", on ? toneBg : "bg-white/5 text-white/35 ring-white/10")}>
            <Icon className="size-4" />
          </span>
        )}
        <div>
          <div className="text-[12.5px] font-medium text-white/85">{label}</div>
          {description && <div className="text-[11px] text-white/40">{description}</div>}
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full ring-1 transition-colors",
          on ? "bg-emerald-500/80 ring-emerald-400/40" : "bg-white/10 ring-white/10"
        )}
      >
        <span
          className={cn(
            "inline-block size-3.5 rounded-full bg-white shadow transition-transform",
            on ? "translate-x-[18px]" : "translate-x-[3px]"
          )}
        />
      </button>
    </div>
  )
}

type Integration = { name: string; desc: string; icon: React.ElementType; connected: boolean }

const initialIntegrations: Integration[] = [
  { name: "BMKG Weather API", desc: "Forecast & rainfall feed", icon: CloudRainIcon, connected: true },
  { name: "VIIRS / FIRMS", desc: "Satellite hotspot detection", icon: SatelliteIcon, connected: true },
  { name: "WhatsApp Gateway", desc: "Field team alerts", icon: MessageSquareIcon, connected: true },
  { name: "SCADA", desc: "Canal block automation", icon: ServerIcon, connected: false },
]

const team = [
  { name: "Anisa Octa N", role: "Peat Management Officer", lastActive: "Just now", status: "active" as TeamStatus },
  { name: "Budi Hartono", role: "Estate Manager", lastActive: "12 min ago", status: "active" as TeamStatus },
  { name: "Rini Suswanti", role: "Hydrology Analyst", lastActive: "48 min ago", status: "away" as TeamStatus },
  { name: "Dedi Kurniawan", role: "Fire Response Lead", lastActive: "3 hours ago", status: "away" as TeamStatus },
  { name: "Lukas Pranata", role: "GIS Specialist", lastActive: "Yesterday, 18:42", status: "offline" as TeamStatus },
] as const

type Threshold = { label: string; value: string; icon: React.ElementType }

const initialThresholds: Threshold[] = [
  { label: "Water Table Warning", value: "-40 cm", icon: WavesIcon },
  { label: "Water Table Critical", value: "-60 cm", icon: WavesIcon },
  { label: "Fire Risk Alert", value: ">= 71", icon: FlameIcon },
  { label: "Soil Moisture Min", value: "40%", icon: DropletIcon },
  { label: "Rainfall Alert", value: ">= 50 mm/h", icon: ThermometerIcon },
]

type ToggleKey = "critical" | "dailyEmail" | "fireSms" | "weekly" | "maintenance"

export default function SettingsPage() {
  const [profile, setProfile] = useState({
    fullName: "Anisa Octa N",
    email: "anisa.octa@sinarmas-agri.co.id",
    estate: "Sei Galuh",
    role: "Officer",
  })

  const [thresholds, setThresholds] = useState<Threshold[]>(initialThresholds)

  const [notifications, setNotifications] = useState<Record<ToggleKey, boolean>>({
    critical: true,
    dailyEmail: true,
    fireSms: true,
    weekly: false,
    maintenance: true,
  })

  const [integrations, setIntegrations] = useState<Integration[]>(initialIntegrations)

  const updateThreshold = (label: string, value: string) =>
    setThresholds((prev) => prev.map((t) => (t.label === label ? { ...t, value } : t)))

  const toggleNotification = (key: ToggleKey, label: string) =>
    setNotifications((prev) => {
      const next = !prev[key]
      toast(next ? `${label} diaktifkan` : `${label} dinonaktifkan`)
      return { ...prev, [key]: next }
    })

  const toggleIntegration = (name: string) =>
    setIntegrations((prev) =>
      prev.map((i) => {
        if (i.name !== name) return i
        const next = !i.connected
        toast.success(next ? `${name} terhubung` : `${name} terputus`)
        return { ...i, connected: next }
      })
    )

  const saveThresholds = () => {
    toast.success(`Ambang batas disimpan: ${thresholds.map((t) => `${t.label} ${t.value}`).join(", ")}`)
  }

  return (
    <PeatShell title="Settings" subtitle="System Configuration">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Profile */}
        <Panel>
          <PanelHead
            title="Profile"
            subtitle="Account & assignment"
            action={
              <button
                type="button"
                onClick={() => toast.success("Profil disimpan")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/90 px-3 py-1.5 text-[11.5px] font-semibold text-[#06120c] ring-1 ring-emerald-400/40 transition-colors hover:bg-emerald-400"
              >
                <SaveIcon className="size-3.5" />
                Save
              </button>
            }
          />
          <div className="px-4 pb-4">
            <div className="mb-4 flex items-center gap-3">
              <span className="inline-flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/30 to-sky-500/20 text-[15px] font-bold text-emerald-300 ring-1 ring-emerald-500/30">
                AO
              </span>
              <div>
                <div className="text-[14px] font-semibold text-white">{profile.fullName}</div>
                <div className="text-[11.5px] text-white/50">Peat Management Officer</div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InputRow label="Full Name" value={profile.fullName} onChange={(v) => setProfile((p) => ({ ...p, fullName: v }))} />
              <InputRow label="Email" value={profile.email} icon={MailIcon} onChange={(v) => setProfile((p) => ({ ...p, email: v }))} />
              <InputRow label="Estate" value={profile.estate} onChange={(v) => setProfile((p) => ({ ...p, estate: v }))} />
              <InputRow label="Role" value={profile.role} onChange={(v) => setProfile((p) => ({ ...p, role: v }))} />
            </div>
          </div>
        </Panel>

        {/* Threshold Settings */}
        <Panel>
          <PanelHead title="Threshold Settings" subtitle="Alert trigger limits" />
          <div className="px-4 pb-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {thresholds.map((t) => (
                <InputRow key={t.label} label={t.label} value={t.value} icon={t.icon} onChange={(v) => updateThreshold(t.label, v)} />
              ))}
            </div>
            <button
              type="button"
              onClick={saveThresholds}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/90 px-3.5 py-2 text-[12.5px] font-semibold text-[#06120c] ring-1 ring-emerald-400/40 transition-colors hover:bg-emerald-400"
            >
              <SaveIcon className="size-3.5" />
              Save Changes
            </button>
          </div>
        </Panel>

        {/* Notifications */}
        <Panel>
          <PanelHead title="Notifications" subtitle="Delivery channels" action={<ViewAll />} />
          <div className="pb-2">
            <Toggle
              label="Critical Alerts"
              description="Real-time push for critical events"
              on={notifications.critical}
              icon={ShieldAlertIcon}
              tone="amber"
              onToggle={() => toggleNotification("critical", "Critical Alerts")}
            />
            <Toggle
              label="Daily Summary Email"
              description="Sent every day at 07:00 WIB"
              on={notifications.dailyEmail}
              icon={MailIcon}
              tone="sky"
              onToggle={() => toggleNotification("dailyEmail", "Daily Summary Email")}
            />
            <Toggle
              label="Fire Hotspot SMS"
              description="VIIRS hotspot within estate"
              on={notifications.fireSms}
              icon={FlameIcon}
              tone="amber"
              onToggle={() => toggleNotification("fireSms", "Fire Hotspot SMS")}
            />
            <Toggle
              label="Weekly Report"
              description="Compiled hydrology report"
              on={notifications.weekly}
              icon={BellIcon}
              onToggle={() => toggleNotification("weekly", "Weekly Report")}
            />
            <Toggle
              label="Maintenance Reminders"
              description="Sensor & borehole servicing"
              on={notifications.maintenance}
              icon={WrenchIcon}
              tone="emerald"
              onToggle={() => toggleNotification("maintenance", "Maintenance Reminders")}
            />
          </div>
        </Panel>

        {/* Integrations */}
        <Panel>
          <PanelHead title="Integrations" subtitle="Connected data sources" />
          <div className="grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-2">
            {integrations.map((i) => {
              const Icon = i.icon
              return (
                <div
                  key={i.name}
                  className="flex flex-col gap-2 rounded-lg border border-white/8 bg-white/[0.03] p-3 ring-1 ring-white/5 transition-colors hover:border-white/15"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={cn(
                        "inline-flex size-8 items-center justify-center rounded-lg ring-1",
                        i.connected ? "bg-emerald-500/12 text-emerald-400 ring-emerald-500/20" : "bg-white/5 text-white/40 ring-white/10"
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    {i.connected ? (
                      <CheckIcon className="size-4 text-emerald-400" />
                    ) : (
                      <PlugIcon className="size-4 text-white/30" />
                    )}
                  </div>
                  <div>
                    <div className="text-[12.5px] font-semibold text-white/85">{i.name}</div>
                    <div className="text-[11px] text-white/40">{i.desc}</div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium", i.connected ? "text-emerald-400" : "text-white/45")}>
                      <span className={cn("size-1.5 rounded-full", i.connected ? "bg-emerald-500" : "bg-slate-500")} />
                      {i.connected ? "Connected" : "Disconnected"}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleIntegration(i.name)}
                      className={cn(
                        "rounded-md px-2 py-1 text-[10.5px] font-semibold ring-1 transition-colors",
                        i.connected
                          ? "bg-white/5 text-white/55 ring-white/10 hover:bg-white/10"
                          : "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30 hover:bg-emerald-500/25"
                      )}
                    >
                      {i.connected ? "Disconnect" : "Connect"}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </Panel>
      </div>

      {/* Team Members */}
      <div className="grid gap-4">
        <Panel>
          <PanelHead title="Team Members" subtitle="Sei Galuh estate · 5 members" action={<ViewAll />} />
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className={th}>Name</th>
                <th className={th}>Role</th>
                <th className={th}>Last Active</th>
                <th className={cn(th, "text-right")}>Status</th>
              </tr>
            </thead>
            <tbody>
              {team.map((m) => {
                const s = teamStatusStyle[m.status]
                const initials = m.name
                  .split(" ")
                  .slice(0, 2)
                  .map((p) => p[0])
                  .join("")
                return (
                  <tr
                    key={m.name}
                    onClick={() => toast(`${m.name} · ${m.role} · ${s.label}`)}
                    className="cursor-pointer border-t border-white/5 hover:bg-white/[0.03]"
                  >
                    <td className={td}>
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex size-7 items-center justify-center rounded-full bg-white/8 text-[10.5px] font-bold text-white/70 ring-1 ring-white/10">
                          {initials}
                        </span>
                        <span className="font-medium text-white/85">{m.name}</span>
                      </div>
                    </td>
                    <td className={cn(td, "text-white/55")}>{m.role}</td>
                    <td className={cn(td, "text-white/55")}>{m.lastActive}</td>
                    <td className={cn(td, "text-right")}>
                      <span className={cn("inline-flex items-center gap-1.5 text-[11.5px] font-medium", s.text)}>
                        <span className={cn("size-1.5 rounded-full", s.dot)} />
                        {s.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Panel>
      </div>
    </PeatShell>
  )
}
