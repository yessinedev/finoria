"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
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
import { useState, useEffect } from "react";
import Link from "next/link";

export type NavigationItem =
  | "dashboard"
  | "clients"
  | "sales"
  | "quotes"
  | "invoices"
  | "credit-notes"
  | "inventory"
  | "stock-movements"
  | "settings";

const navigationItems = [
  { id: "dashboard", label: "Tableau de bord", icon: BarChart3 },
  {
    id: "sales-management",
    label: "Gestion de ventes",
    icon: ShoppingCart,
    children: [
      { id: "quotes", label: "Devis" },
      { id: "sales", label: "Commande client" },
      { id: "invoices", label: "Facture" },
      { id: "credit-notes", label: "Facture d'avoir" },
    ],
  },
  {
    id: "purchases",
    label: "Gestion d'achats",
    icon: ShoppingCart,
    children: [
      { id: "purchase-order", label: "Commande fournisseur" },
      { id: "supplier-invoice", label: "Facture fournisseur" },
    ],
  },

  {
    id: "stock",
    label: "Gestion de stock",
    icon: Package,
    children: [
      { id: "inventory", label: "Inventaire" },
      { id: "stock-movements", label: "Mouvements de stock" },
      { id: "categories", label: "Catégories" },
    ],
  },
  { id: "clients", label: "Clients", icon: Users },
  { id: "suppliers", label: "Fournisseurs", icon: Building2 },
];

// Settings item moved to footer
const footerItems = [
  { id: "settings", label: "Paramètres", icon: FileText },
];

export interface AppSidebarProps {
  activeView: NavigationItem;
  setActiveView: (view: NavigationItem) => void;
}

export function AppSidebar({ activeView, setActiveView }: AppSidebarProps) {
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({
    "sales-management": true,
    "purchases": true,
    "stock": true,
  });

  useEffect(() => {
    // Initialize all groups as open by default
    const initialOpenGroups: { [key: string]: boolean } = {};
    navigationItems.forEach((item) => {
      if (item.children) {
        initialOpenGroups[item.id] = true;
      }
    });
    setOpenGroups(initialOpenGroups);
  }, []);

  const handleToggle = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Map navigation item IDs to their respective routes
  const getRoute = (id: string) => {
    switch (id) {
      case "dashboard":
        return "/dashboard";
      case "clients":
        return "/clients";
      case "sales":
        return "/sales";
      case "quotes":
        return "/quotes";
      case "invoices":
        return "/invoices";
      case "credit-notes":
        return "/credit-notes";
      case "delivery":
        return "/sales/delivery";
      case "output":
        return "/sales/output";
      case "purchase-order":
        return "/suppliers/orders";
      case "supplier-invoice":
        return "/suppliers/invoices";
      case "suppliers":
        return "/suppliers";
      case "inventory":
        return "/inventory";
      case "stock-movements":
        return "/movements";
      case "client-payments":
        return "/payments/clients";
      case "supplier-payments":
        return "/payments/suppliers";
      case "settings":
        return "/settings";
      case "categories":
        return "/categories";
      default:
        return "#";
    }
  };

  return (
    <Sidebar className="border-r" collapsible="offcanvas" variant="inset">
      <SidebarHeader className="border-b px-6 py-4 flex items-start gap-2">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          <h1 className="font-semibold text-lg">Finoria</h1>
        </div>
        <p className="text-xs text-muted-foreground">Gestion & Facturation</p>
      </SidebarHeader>

      <SidebarContent className="py-4 px-4">
        <SidebarMenu>
          {navigationItems.map((item) => (
            <SidebarMenuItem key={item.id}>
              {item.children ? (
                <>
                  <SidebarMenuButton
                    onClick={() => handleToggle(item.id)}
                    isActive={activeView === item.id}
                    className="w-full justify-start gap-3 px-3 py-2.5 flex items-center hover:cursor-pointer font-semibold"
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
                    <SidebarMenu className="ml-4 border-muted-foreground/10 pl-2 mt-1">
                      {item.children.map((sub) => (
                        <SidebarMenuItem key={sub.id}>
                          <Link href={getRoute(sub.id)} passHref>
                            <SidebarMenuButton
                              onClick={() =>
                                setActiveView(sub.id as NavigationItem)
                              }
                              isActive={activeView === sub.id}
                              className="w-full justify-start gap-3 px-3 py-2.5 hover:cursor-pointer"
                            >
                              <span>{sub.label}</span>
                            </SidebarMenuButton>
                          </Link>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  )}
                </>
              ) : (
                <Link href={getRoute(item.id)} passHref>
                  <SidebarMenuButton
                    onClick={() => setActiveView(item.id as NavigationItem)}
                    isActive={activeView === item.id}
                    className="w-full justify-start gap-3 px-3 py-2.5"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t px-4 py-3">
        <SidebarMenu>
          {footerItems.map((item) => (
            <SidebarMenuItem key={item.id}>
              <Link href={getRoute(item.id)} passHref>
                <SidebarMenuButton
                  onClick={() => setActiveView(item.id as NavigationItem)}
                  isActive={activeView === item.id}
                  className="w-full justify-start gap-3 px-3 py-2.5"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}