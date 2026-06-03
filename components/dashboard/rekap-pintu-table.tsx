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
  label: string
  iconColor: string
  iconLabel?: string
  jumlah: number
}

export function RekapPintuTable({ rows, total }: { rows: Row[]; total: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[13px] font-semibold uppercase tracking-wide text-foreground/80">
            Rekap Pintu Air
          </CardTitle>
          <a className="text-[11px] font-medium text-sky-600 hover:underline" href="/pintu-air">
            Lihat Detail
          </a>
        </div>
      </CardHeader>
      <CardContent className="px-0 pt-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-foreground/5">
                <TableHead className="h-8 text-[11px] uppercase">Jenis Pintu Air</TableHead>
                <TableHead className="h-8 text-right text-[11px] uppercase">Jumlah</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.label} className="border-foreground/5">
                  <TableCell className="py-1.5 text-[12.5px]">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="inline-block size-2.5 rounded-sm"
                        style={{ background: r.iconColor }}
                      />
                      {r.label}
                    </span>
                  </TableCell>
                  <TableCell className="py-1.5 text-right text-[12.5px] font-semibold">
                    {r.jumlah}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="border-foreground/10">
                <TableCell className="py-1.5 text-[12.5px] font-semibold">Total</TableCell>
                <TableCell className="py-1.5 text-right text-[12.5px] font-bold">
                  {total}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
