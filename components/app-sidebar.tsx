"use client"

import * as React from "react"
import Link from "next/link"
import {
  BellIcon,
  ChartColumnIcon,
  ChevronRightIcon,
  CircleIcon,
  DoorOpenIcon,
  DropletIcon,
  GaugeIcon,
  InfoIcon,
  LayoutDashboardIcon,
  MapIcon,
  RadioTowerIcon,
  SettingsIcon,
  SlidersHorizontalIcon,
  UsersIcon,
} from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

type NavSub = { title: string; url: string; isActive?: boolean }
type NavItem = {
  title: string
  url: string
  icon: React.ReactNode
  badge?: number
  isActive?: boolean
  items?: NavSub[]
}

function getNav(activePath: string): NavItem[] {
  return [
    {
      title: "Dashboard",
      url: "/",
      icon: <LayoutDashboardIcon />,
      isActive: activePath === "/",
    },
    {
      title: "Peta Jaringan",
      url: "/peta-jaringan",
      icon: <MapIcon />,
      isActive: activePath === "/peta-jaringan",
    },
    {
      title: "Pintu Air",
      url: "/pintu-air",
      icon: <DoorOpenIcon />,
      isActive: activePath === "/pintu-air",
    },
    {
      title: "Pemantauan",
      url: "/muka-air",
      icon: <GaugeIcon />,
      isActive: ["/muka-air", "/debit", "/cuaca-tanah"].includes(activePath),
      items: [
        { title: "Muka Air", url: "/muka-air", isActive: activePath === "/muka-air" },
        { title: "Debit", url: "/debit", isActive: activePath === "/debit" },
        { title: "Cuaca & Tanah", url: "/cuaca-tanah", isActive: activePath === "/cuaca-tanah" },
      ],
    },
    {
      title: "Kendali Pintu Air",
      url: "/pintu-air",
      icon: <SlidersHorizontalIcon />,
      isActive: activePath === "/kendali",
    },
    {
      title: "Sensor & IoT",
      url: "/perangkat",
      icon: <RadioTowerIcon />,
      isActive: activePath === "/perangkat",
    },
    {
      title: "Analitik & Laporan",
      url: "/analisa-data",
      icon: <ChartColumnIcon />,
      isActive: ["/analisa-data", "/analisis-risiko", "/laporan"].includes(activePath),
      items: [
        { title: "Analisa Data", url: "/analisa-data", isActive: activePath === "/analisa-data" },
        { title: "Analisis Risiko", url: "/analisis-risiko", isActive: activePath === "/analisis-risiko" },
        { title: "Laporan", url: "/laporan", isActive: activePath === "/laporan" },
      ],
    },
    {
      title: "Alarm & Notifikasi",
      url: "/alarm",
      icon: <BellIcon />,
      isActive: activePath === "/alarm",
      badge: 3,
    },
    {
      title: "Pengaturan",
      url: "/pengaturan",
      icon: <SettingsIcon />,
      isActive: activePath === "/pengaturan",
    },
    {
      title: "Pengguna",
      url: "/pengguna",
      icon: <UsersIcon />,
      isActive: activePath === "/pengguna",
    },
    {
      title: "Tentang Sistem",
      url: "/tentang-sistem",
      icon: <InfoIcon />,
      isActive: activePath === "/tentang-sistem",
    },
  ]
}

export function AppSidebar({
  activePath = "/",
  ...props
}: React.ComponentProps<typeof Sidebar> & { activePath?: string }) {
  const nav = React.useMemo(() => getNav(activePath), [activePath])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="border-b border-foreground/5 py-3 group-data-[collapsible=icon]:py-2">
        <div className="flex items-center gap-3 px-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-emerald-500 text-white shadow-sm">
            <DropletIcon className="size-5" />
          </span>
          <div className="grid leading-tight group-data-[collapsible=icon]:hidden">
            <span className="font-heading text-[13px] font-bold tracking-wide text-foreground">
              SMART IRIGATION SYSTEM
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">
              CILIWUNG - CISADANE
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-1 py-2">
        <SidebarGroup>
          <SidebarMenu className="gap-0.5">
            {nav.map((item) => {
              if (!item.items?.length) {
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      isActive={item.isActive}
                      tooltip={item.title}
                      className={cn(
                        "h-9 gap-3 rounded-md text-[13px] font-medium",
                        item.isActive
                          ? "bg-sky-600 text-white hover:bg-sky-600 hover:text-white"
                          : "text-foreground/80 hover:bg-muted",
                      )}
                      render={<Link href={item.url} />}
                    >
                      {item.icon}
                      <span className="flex-1 truncate">{item.title}</span>
                      {item.badge ? (
                        <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white group-data-[collapsible=icon]:hidden">
                          {item.badge}
                        </span>
                      ) : null}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              }

              return (
                <Collapsible
                  key={item.title}
                  defaultOpen={item.isActive}
                  className="group/collapsible"
                  render={<SidebarMenuItem />}
                >
                  <CollapsibleTrigger
                    render={
                      <SidebarMenuButton
                        isActive={item.isActive}
                        tooltip={item.title}
                        className={cn(
                          "h-9 gap-3 rounded-md text-[13px] font-medium",
                          item.isActive
                            ? "bg-sky-600 text-white hover:bg-sky-600 hover:text-white"
                            : "text-foreground/80 hover:bg-muted",
                        )}
                      />
                    }
                  >
                    {item.icon}
                    <span className="flex-1 truncate">{item.title}</span>
                    <ChevronRightIcon className="ml-auto size-3.5 transition-transform duration-200 group-data-open/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="ml-5 mt-0.5 border-l border-foreground/10 pl-3">
                      {item.items.map((sub) => (
                        <SidebarMenuSubItem key={sub.url}>
                          <SidebarMenuSubButton
                            isActive={sub.isActive}
                            className={cn(
                              "h-8 rounded-md text-[12.5px]",
                              sub.isActive
                                ? "bg-sky-50 font-medium text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"
                                : "text-foreground/70 hover:bg-muted",
                            )}
                            render={<Link href={sub.url} />}
                          >
                            <span>{sub.title}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 group-data-[collapsible=icon]:hidden">
        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
          <span className="relative mt-1 flex size-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
          </span>
          <div className="grid leading-tight">
            <span className="text-[12.5px] font-semibold text-emerald-700 dark:text-emerald-300">
              Sistem Terhubung
            </span>
            <span className="text-[10.5px] text-muted-foreground">IoT Gateway Online</span>
            <span className="mt-0.5 text-[10.5px] text-muted-foreground">
              Terakhir update: 10:24:30
            </span>
          </div>
        </div>
      </SidebarFooter>

      <SidebarFooter className="hidden group-data-[collapsible=icon]:block p-2">
        <div className="flex justify-center">
          <CircleIcon className="size-3 fill-emerald-500 text-emerald-500" />
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
