"use client";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar, NavigationItem } from "@/components/app-sidebar";
import { Toaster } from "@/components/ui/toaster"; // Import the Toaster component
import { useState } from "react";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [activeView, setActiveView] = useState<NavigationItem>("dashboard");

  return (
    <SidebarProvider defaultOpen>
      <div className="flex gap-2 h-screen w-full overflow-hidden">
        <AppSidebar activeView={activeView} setActiveView={setActiveView} />
        <SidebarInset className="flex-1 overflow-auto">
          <main className="min-w-0 bg-background">
            <SidebarTrigger />
            {children}
            <Toaster /> {/* Add the Toaster component */}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}