import { BatteryFullIcon, SignalIcon, SunIcon } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/dashboard/status-badge"
import type { PerangkatRingkas } from "@/lib/types"

type Props = {
  items: PerangkatRingkas[]
}

const jenisLabel: Record<string, string> = {
  AWLR: "AWLR",
  FLOW_METER: "Flow Meter",
  AKTUATOR_PINTU: "Aktuator Pintu",
  WEATHER_STATION: "Weather Station",
  SOIL_SENSOR: "Sensor Tanah",
  LOGGER: "Logger",
}

export function PerangkatTable({ items }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Perangkat Lapangan</CardTitle>
        <CardDescription>
          Status logger, sensor, dan aktuator. {items.length} perangkat aktif.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Lokasi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Baterai</TableHead>
                <TableHead>Sinyal</TableHead>
                <TableHead>Firmware</TableHead>
                <TableHead>Update</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.kode}</TableCell>
                  <TableCell className="text-sm">{p.nama}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {jenisLabel[p.jenis] ?? p.jenis}
                  </TableCell>
                  <TableCell className="text-xs">{p.lokasi}</TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                  </TableCell>
                  <TableCell className="min-w-[100px]">
                    <div className="flex items-center gap-1">
                      <BatteryFullIcon className="size-3.5 text-emerald-500" />
                      <Progress value={p.battery} className="h-1.5 w-12" />
                      <span className="text-xs">{p.battery}%</span>
                      {p.solarCharging ? (
                        <SunIcon className="size-3 text-amber-500" />
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="min-w-[100px]">
                    <div className="flex items-center gap-1">
                      <SignalIcon className="size-3.5 text-sky-500" />
                      <Progress value={p.signal} className="h-1.5 w-12" />
                      <span className="text-xs">{p.signal}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{p.firmwareVersion}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.lastDataReceived}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
