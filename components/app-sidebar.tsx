"use client";

import { NavigationItem } from "@/app/page";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  BarChart3,
  Users,
  ShoppingCart,
  FileText,
  Building2,
  Package,
} from "lucide-react";

const navigationItems = [
  { id: "dashboard", label: "Tableau de bord", icon: BarChart3 },
  { id: "clients", label: "Clients", icon: Users },
  { id: "products", label: "Produits", icon: Package },
  { id: "sales", label: "Ventes", icon: ShoppingCart },
  { id: "invoices", label: "Factures", icon: FileText },
];

export interface AppSidebarProps {
  activeView: NavigationItem;
  setActiveView: (view: NavigationItem) => void;
}

export function AppSidebar({ activeView, setActiveView }: AppSidebarProps) {
  return (
    <Sidebar className="border-r" collapsible="offcanvas">
      <SidebarHeader className="border-b px-6 py-4 flex items-start gap-2">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          <h1 className="font-semibold text-lg">VentePro</h1>
        </div>
          <p className="text-xs text-muted-foreground">Gestion & Facturation</p>
      </SidebarHeader>
      <SidebarContent className="px-4 py-4">
        <SidebarMenu>
          {navigationItems.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                onClick={() => setActiveView(item.id as NavigationItem)}
                isActive={activeView === item.id}
                className="w-full justify-start gap-3 px-3 py-2.5"
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
