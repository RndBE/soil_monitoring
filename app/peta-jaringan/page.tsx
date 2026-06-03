import { AppShell } from "@/components/dashboard/app-shell"
import Link from "next/link"
import { PetaCisadaneInteraktif } from "@/components/dashboard/peta-cisadane-interaktif"
import { PetaJaringan } from "@/components/dashboard/peta-jaringan"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  getPintuAirRingkas,
  getSaluranRingkas,
  getTitikRingkas,
} from "@/lib/backend/queries"
import { getPetaCisadaneLayout } from "@/lib/peta-cisadane-layout"

export const dynamic = "force-dynamic"

const jenisLabel: Record<string, string> = {
  AWLR: "Muka Air",
  DEBIT: "Debit",
  CUACA_TANAH: "Cuaca & Tanah",
  PINTU_AIR: "Pintu Air",
}

export default async function PetaJaringanPage() {
  const [titik, pintu, saluran, petaLayout] = await Promise.all([
    getTitikRingkas(),
    getPintuAirRingkas(),
    getSaluranRingkas(),
    getPetaCisadaneLayout(),
  ])

  return (
    <AppShell activePath="/peta-jaringan" title="Peta Jaringan Irigasi">
      <SectionHeading
        title="Peta Jaringan"
        description="Visualisasi titik sensor, pintu air, dan saluran irigasi."
      />

      <Tabs defaultValue="skematik" className="w-full">
        <TabsList>
          <TabsTrigger value="skematik">Skema Jaringan</TabsTrigger>
          <TabsTrigger value="geografis">Peta Geografis</TabsTrigger>
        </TabsList>

        <TabsContent value="skematik" className="mt-3">
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>Skema Jaringan Irigasi Sungai Ciliwung — Cisadane</CardTitle>
                  <CardDescription>Analisis jalur dan denah pintu air.</CardDescription>
                </div>
                <Link className={buttonVariants({ variant: "outline", size: "sm" })} href="/peta-jaringan/edit">
                  Edit Layout
                </Link>
              </div>
            </CardHeader>
            <CardContent className="h-[640px] p-0">
              <PetaCisadaneInteraktif height="100%" layout={petaLayout} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geografis" className="mt-3">
          <Card className="min-h-[560px] overflow-hidden p-0">
            <CardContent className="h-[560px] p-0">
              <PetaJaringan titik={titik} pintuAir={pintu} saluran={saluran} height="100%" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid gap-3 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daftar Titik Monitoring</CardTitle>
            <CardDescription>{titik.length} titik sensor lapangan.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Saluran</TableHead>
                    <TableHead>Nilai</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {titik.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">{t.kode}</TableCell>
                      <TableCell className="text-sm">{t.nama}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {jenisLabel[t.jenis] ?? t.jenis}
                      </TableCell>
                      <TableCell className="text-xs">{t.saluran ?? "-"}</TableCell>
                      <TableCell className="text-sm">{t.nilaiTerakhir}</TableCell>
                      <TableCell>
                        <StatusBadge status={t.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Pintu Air</CardTitle>
            <CardDescription>{pintu.length} pintu air aktif.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Saluran</TableHead>
                    <TableHead>Bukaan</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pintu.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.kode}</TableCell>
                      <TableCell className="text-sm">{p.nama}</TableCell>
                      <TableCell className="text-xs">{p.saluran ?? "-"}</TableCell>
                      <TableCell className="text-sm">{p.posisiPersen.toFixed(0)}%</TableCell>
                      <TableCell>
                        <StatusBadge status={p.mode} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={p.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
