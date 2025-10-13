import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useState } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VentePro",
  description: "Gestion de stock et facturation pour les PME",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SidebarProvider defaultOpen>
      <div className="flex gap-2 h-screen w-full overflow-auto">
        <AppSidebar  />
        <SidebarInset className="flex-1">
          <main className="h-full min-w-0 bg-background">
            <SidebarTrigger />
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
      </body>
    </html>
  );
}
