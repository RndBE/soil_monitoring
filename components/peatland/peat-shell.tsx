import { PeatHeader } from "./peat-header"
import { PeatSidebar } from "./peat-sidebar"

/**
 * Kerangka halaman dashboard peatland: sidebar + header + area konten.
 * Dipakai oleh semua halaman menu agar konsisten. `title`/`subtitle`
 * mengisi judul di header (default: judul dashboard utama).
 */
export function PeatShell({
  title,
  subtitle,
  children,
}: {
  title?: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="dark flex h-screen overflow-hidden bg-[#080d0a] text-white">
      <PeatSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <PeatHeader title={title} subtitle={subtitle} />
        <main className="peat-scroll flex-1 overflow-y-auto bg-[radial-gradient(120%_60%_at_50%_-10%,rgba(16,185,129,0.06),transparent_60%)] px-3 py-4 sm:px-5">
          <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-4">{children}</div>
        </main>
      </div>
    </div>
  )
}
