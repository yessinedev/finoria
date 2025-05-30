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
  ChevronDown,
} from "lucide-react";
import { useState } from "react";

const navigationItems = [
  { id: "dashboard", label: "Tableau de bord", icon: BarChart3 },
  {
    id: "sales",
    label: "Ventes",
    icon: ShoppingCart,
    children: [
      { id: "quote", label: "Devis" },
      { id: "order", label: "Commande client" },
      { id: "delivery", label: "Bon de livraison" },
      { id: "invoices", label: "Facture" },
      { id: "output", label: "Bon de sortie" },
    ],
  },
  {
    id: "purchases",
    label: "Achats",
    icon: ShoppingCart,
    children: [
      { id: "purchase-order", label: "Commande fournisseur" },
      { id: "supplier-invoice", label: "Facture fournisseur" },
      { id: "supplier-delivery", label: "Bon de livraison fournisseur" },
    ],
  },
  {
    id: "payments",
    label: "Paiements",
    icon: FileText,
    children: [
      { id: "client-payments", label: "Paiements clients" },
      { id: "supplier-payments", label: "Paiements fournisseurs" },
    ],
  },
  {
    id: "stock",
    label: "Stock",
    icon: Package,
    children: [
      { id: "inventory", label: "Inventaire" },
      { id: "stock-movements", label: "Mouvements de stock" },
    ],
  },
  { id: "clients", label: "Clients", icon: Users },
  { id: "suppliers", label: "Fournisseurs", icon: Building2 },
  { id: "products", label: "Produits", icon: Package },
];

export interface AppSidebarProps {
  activeView: NavigationItem;
  setActiveView: (view: NavigationItem) => void;
}

export function AppSidebar({ activeView, setActiveView }: AppSidebarProps) {
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>(
    {}
  );
  const handleToggle = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };
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
              {item.children ? (
                <>
                  <SidebarMenuButton
                    onClick={() => handleToggle(item.id)}
                    isActive={activeView === item.id}
                    className="w-full justify-start gap-3 px-3 py-2.5 flex items-center hover:cursor-pointer"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                    <ChevronDown
                      className={`ml-auto transition-transform ${
                        openGroups[item.id] ? "rotate-180" : ""
                      }`}
                    />
                  </SidebarMenuButton>
                  {openGroups[item.id] && (
                    <SidebarMenu className="ml-6 border-l border-muted-foreground/10 pl-2 mt-1">
                      {item.children.map((sub) => (
                        <SidebarMenuItem key={sub.id}>
                          <SidebarMenuButton
                            onClick={() => setActiveView(sub.id as NavigationItem)}
                            isActive={activeView === sub.id}
                            className="w-full justify-start gap-3 px-3 py-2.5"
                          >
                            <span>{sub.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  )}
                </>
              ) : (
                <SidebarMenuButton
                  onClick={() => setActiveView(item.id as NavigationItem)}
                  isActive={activeView === item.id}
                  className="w-full justify-start gap-3 px-3 py-2.5"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
