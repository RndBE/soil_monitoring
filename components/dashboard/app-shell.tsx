import type { CSSProperties, ReactNode } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

type AppShellProps = {
  children: ReactNode
  activePath?: string
  title?: string
  contentPadding?: boolean
  /** Pakai header dashboard kaya (search/weather/IoT/notif/profile) — default true */
  useRichHeader?: boolean
}

export function AppShell({
  children,
  activePath = "/",
  title = "Dashboard",
  contentPadding = true,
  useRichHeader = true,
}: AppShellProps) {
  const contentClassName = contentPadding
    ? "flex w-full flex-col gap-3 px-4 py-3 md:gap-4 md:py-4 lg:px-6"
    : "flex flex-col gap-3 py-3 md:gap-4 md:py-4"

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 64)",
          "--header-height": "calc(var(--spacing) * 16)",
        } as CSSProperties
      }
    >
      <AppSidebar activePath={activePath} variant="inset" />
      <SidebarInset>
        {useRichHeader ? <DashboardHeader /> : <SiteHeader title={title} />}
        <div className="flex flex-1 flex-col bg-muted/30">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className={cn(contentClassName, "motion-fade-in")}>{children}</div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
