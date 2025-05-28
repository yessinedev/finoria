"use client";

import { useState } from "react";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Dashboard from "@/components/dashboard";
import Clients from "@/components/clients";
import Products from "@/components/products";
import Sales from "@/components/sales";
import Invoices from "@/components/invoices";

export type NavigationItem =
  | "dashboard"
  | "clients"
  | "products"
  | "sales"
  | "invoices";

export default function App() {
  const [activeView, setActiveView] = useState<NavigationItem>("dashboard");

  const renderContent = () => {
    switch (activeView) {
      case "dashboard":
        return <Dashboard />;
      case "clients":
        return <Clients />;
      case "products":
        return <Products />;
      case "sales":
        return <Sales />;
      case "invoices":
        return <Invoices />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <SidebarProvider defaultOpen>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar activeView={activeView} setActiveView={setActiveView} />
        <SidebarInset className="flex-1 h-full overflow-auto">
          <main className="h-full min-w-0 bg-background">
            <SidebarTrigger />
            {renderContent()}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
