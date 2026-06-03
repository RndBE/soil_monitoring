import {
  CodeIcon,
  CpuIcon,
  DatabaseIcon,
  GitBranchIcon,
  InfoIcon,
  PaletteIcon,
} from "lucide-react"

import { AppShell } from "@/components/dashboard/app-shell"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const dynamic = "force-dynamic"

export default function TentangSistemPage() {
  return (
    <AppShell activePath="/tentang-sistem" title="Tentang Sistem">
      <SectionHeading
        title="Tentang Sistem"
        description="Informasi versi, teknologi, dan ruang lingkup Smart Irigation System."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <InfoIcon className="size-4 text-sky-500" /> Smart Irigation System
          </CardTitle>
          <CardDescription>Sistem monitoring & kendali Daerah Irigasi Ciliwung – Cisadane.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <p>
            Sistem ini memantau kondisi muka air, debit, status pintu air, serta cuaca dan
            kelembaban tanah di seluruh jaringan irigasi. Operator dapat mengatur bukaan pintu
            secara manual, terjadwal, atau otomatis berdasar ambang yang ditentukan.
          </p>
          <p className="text-muted-foreground">
            Dibangun di atas Next.js 16, Prisma ORM (MySQL), Leaflet untuk peta, dan Recharts
            untuk grafik. Komunikasi ke aktuator pintu air dilakukan via MQTT/HTTP gateway.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <InfoCard
          icon={<CodeIcon className="size-4 text-sky-500" />}
          title="Versi Aplikasi"
          rows={[
            ["Build", "0.1.0 (dev)"],
            ["Branch", "main"],
            ["Mode", "Development"],
          ]}
        />
        <InfoCard
          icon={<CpuIcon className="size-4 text-emerald-500" />}
          title="Teknologi"
          rows={[
            ["Framework", "Next.js 16"],
            ["UI", "shadcn/ui + Tailwind v4"],
            ["Peta", "Leaflet"],
            ["Chart", "Recharts"],
          ]}
        />
        <InfoCard
          icon={<DatabaseIcon className="size-4 text-violet-500" />}
          title="Data"
          rows={[
            ["DB Engine", "MySQL via Prisma"],
            ["Realtime", "MQTT (rencana)"],
            ["Backup", "Manual"],
            ["Retention", "Default Prisma"],
          ]}
        />
        <InfoCard
          icon={<PaletteIcon className="size-4 text-rose-500" />}
          title="Tema"
          rows={[
            ["Skema", "Light"],
            ["Brand", "Sky 600 + Emerald 500"],
            ["Font", "Geist Sans"],
          ]}
        />
        <InfoCard
          icon={<GitBranchIcon className="size-4 text-amber-500" />}
          title="Repo & Build"
          rows={[
            ["Git", "Local repo (belum push)"],
            ["Workflow", "Next + Prisma"],
            ["CI/CD", "Belum aktif"],
          ]}
        />
        <InfoCard
          icon={<InfoIcon className="size-4 text-foreground" />}
          title="Kontak"
          rows={[
            ["Tim", "RnD BEACON"],
            ["Email", "support@bejogja.com"],
          ]}
        />
      </div>
    </AppShell>
  )
}

function InfoCard({
  icon,
  title,
  rows,
}: {
  icon: React.ReactNode
  title: string
  rows: [string, string][]
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">{icon} {title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">{k}</span>
            <span className="font-medium">{v}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
