"use client";

import { useState } from "react";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Quotes from "@/components/quote/quotes";
import Dashboard from "@/components/dashboard/dashboard";
import Clients from "@/components/clients/clients";
import Products from "@/components/products/products";
import Sales from "@/components/sales/sales";
import Invoices from "@/components/invoices/invoices";

export type NavigationItem =
  | "dashboard"
  | "clients"
  | "products"
  | "sales"
  | "quotes"
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
      case "quotes":
        return <Quotes />;
      case "invoices":
        return <Invoices />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <SidebarProvider defaultOpen>
      <div className="flex gap-2 h-screen w-full overflow-auto">
        <AppSidebar activeView={activeView} setActiveView={setActiveView} />
        <SidebarInset className="flex-1">
          <main className="h-full min-w-0 bg-background">
            <SidebarTrigger />
            {renderContent()}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
