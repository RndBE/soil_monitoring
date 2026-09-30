import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import { Geist, JetBrains_Mono } from "next/font/google";
import { SessionProvider } from "@/components/session-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { getSessionUser } from "@/lib/auth/server";
import { DashboardFiltersProvider } from "@/lib/peatland/filters";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Peatland & Plantation Monitoring Dashboard",
  description:
    "Sistem pemantauan muka air gambut, subsidence, risiko kebakaran, curah hujan, dan kesehatan tanaman perkebunan.",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    shortcut: ["/favicon.png"],
    apple: [{ url: "/favicon.png", type: "image/png" }],
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();

  return (
    <html lang="id" className={`${geist.variable} ${jetbrainsMono.variable}`}>
      <body>
        <SessionProvider user={user}>
          <DashboardFiltersProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </DashboardFiltersProvider>
        </SessionProvider>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
