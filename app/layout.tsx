import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import { Geist } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { DashboardFiltersProvider } from "@/lib/peatland/filters";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "Dashboard Pemantauan Irigasi",
  description:
    "Sistem monitoring muka air, debit, pintu air, cuaca, dan kelembaban tanah Daerah Irigasi.",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    shortcut: ["/favicon.png"],
    apple: [{ url: "/favicon.png", type: "image/png" }],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={geist.variable}>
      <body>
        <DashboardFiltersProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </DashboardFiltersProvider>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
