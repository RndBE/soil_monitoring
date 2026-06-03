import { UsersIcon } from "lucide-react"

import { AppShell } from "@/components/dashboard/app-shell"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function PenggunaPage() {
  const users = await prisma.user.findMany({ include: { role: true }, orderBy: { name: "asc" } })

  return (
    <AppShell activePath="/pengguna" title="Pengguna">
      <SectionHeading
        title="Manajemen Pengguna"
        description="Akun yang punya akses ke dashboard irigasi."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="size-4 text-sky-500" /> Daftar Akun
          </CardTitle>
          <CardDescription>{users.length} akun terdaftar.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Dibuat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="text-sm font-medium">{u.name}</TableCell>
                    <TableCell className="text-xs">{u.email}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{u.role.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.createdAt.toISOString().slice(0, 10)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  )
}
