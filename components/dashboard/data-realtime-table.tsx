import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Row = {
  titik: string
  mukaAir: string | null
  debit: string | null
  waktu: string
}

export function DataRealtimeTable({ rows }: { rows: Row[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[13px] font-semibold uppercase tracking-wide text-foreground/80">
            Data Real-Time
          </CardTitle>
          <a className="text-[11px] font-medium text-sky-600 hover:underline" href="/peta-jaringan">
            Lihat Semua
          </a>
        </div>
      </CardHeader>
      <CardContent className="px-0 pt-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-foreground/5">
                <TableHead className="h-8 text-[11px] uppercase">Titik</TableHead>
                <TableHead className="h-8 text-[11px] uppercase">Muka Air (m)</TableHead>
                <TableHead className="h-8 text-[11px] uppercase">Debit (m³/dt)</TableHead>
                <TableHead className="h-8 text-[11px] uppercase">Waktu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.titik} className="border-foreground/5">
                  <TableCell className="py-1.5 text-[12.5px] font-medium">{r.titik}</TableCell>
                  <TableCell className="py-1.5 text-[12.5px]">{r.mukaAir ?? "-"}</TableCell>
                  <TableCell className="py-1.5 text-[12.5px]">{r.debit ?? "-"}</TableCell>
                  <TableCell className="py-1.5 text-[12px] text-muted-foreground">
                    {r.waktu}
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
