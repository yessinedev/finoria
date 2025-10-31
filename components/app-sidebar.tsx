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
  ChevronRight,
  Settings,
  CreditCard,
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
  | "purchase-orders"
  | "delivery-receipts"
  | "reception-notes"
  | "inventory"
  | "stock-movements"
  | "client-payments"
  | "supplier-payments"
  | "settings";

const navigationItems = [
  { id: "dashboard", label: "Tableau de bord", icon: BarChart3 },
  {
    id: "sales-management",
    label: "Gestion de ventes",
    icon: ShoppingCart,
    children: [
      { id: "clients", label: "Clients", icon: Users },
      { id: "quotes", label: "Devis" },
      { id: "sales", label: "Commande client" },
      { id: "invoices", label: "Facture" },
      { id: "credit-notes", label: "Facture d'avoir" },
      { id: "purchase-orders", label: "Bon de commande" },
      { id: "delivery-receipts", label: "Bon de livraison" },
    ],
  },
  {
    id: "purchases",
    label: "Gestion d'achats",
    icon: ShoppingCart,
    children: [
      { id: "suppliers", label: "Fournisseurs", icon: Building2 },
      { id: "purchase-order", label: "Commande fournisseur" },
      { id: "supplier-invoice", label: "Facture fournisseur" },
      { id: "reception-notes", label: "Bon de réception" },
    ],
  },

  {
    id: "stock",
    label: "Gestion de stock",
    icon: Package,
    children: [
      { id: "products", label: "Produits" },
      { id: "stock-movements", label: "Mouvements de stock" },
      { id: "categories", label: "Catégories" },
    ],
  },
  {
    id: "payments",
    label: "Paiements",
    icon: CreditCard,
    children: [
      { id: "client-payments", label: "Paiements clients" },
      { id: "supplier-payments", label: "Paiements fournisseurs" },
    ],
  },
];

// Settings item moved to footer
const footerItems = [{ id: "settings", label: "Paramètres", icon: Settings }];

export interface AppSidebarProps {
  activeView: NavigationItem;
  setActiveView: (view: NavigationItem) => void;
}

export function AppSidebar({ activeView, setActiveView }: AppSidebarProps) {
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({
    "sales-management": true,
    purchases: true,
    stock: true,
    payments: true,
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
      case "purchase-orders":
        return "/purchase-orders";
      case "delivery-receipts":
        return "/delivery-receipts";
      case "purchase-order":
        return "/suppliers/orders";
      case "supplier-invoice":
        return "/suppliers/invoices";
      case "reception-notes":
        return "/suppliers/reception-notes";
      case "suppliers":
        return "/suppliers";
      case "products":
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
    <Sidebar className="border-r border-border/40" collapsible="offcanvas" variant="inset">
      <SidebarHeader className="border-b border-border/40 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-bold text-lg tracking-tight">Finoria</h1>
            <p className="text-xs text-muted-foreground font-medium">Gestion & Facturation</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-4 px-3">
        <SidebarMenu className="space-y-1">
          {navigationItems.map((item) => (
            <SidebarMenuItem key={item.id}>
              {item.children ? (
                <div className="space-y-1">
                  <SidebarMenuButton
                    onClick={() => handleToggle(item.id)}
                    isActive={activeView === item.id}
                    className="w-full justify-start gap-3 px-3 py-2.5 flex items-center hover:cursor-pointer font-medium hover:bg-primary/10 hover:text-primary transition-colors rounded-lg"
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="text-sm">{item.label}</span>
                    <ChevronRight
                      className={`ml-auto h-4 w-4 transition-transform duration-200 ${
                        openGroups[item.id] ? "rotate-90" : ""
                      }`}
                    />
                  </SidebarMenuButton>

                  {openGroups[item.id] && (
                    <SidebarMenu className="ml-3 space-y-0.5 mt-1">
                      {item.children.map((sub) => (
                        <SidebarMenuItem key={sub.id}>
                          <Link href={getRoute(sub.id)} passHref className="block">
                            <SidebarMenuButton
                              onClick={() =>
                                setActiveView(sub.id as NavigationItem)
                              }
                              isActive={activeView === sub.id}
                              className="w-full justify-start gap-3 px-3 py-2 hover:cursor-pointer text-sm hover:bg-primary/10 hover:text-primary transition-colors rounded-lg data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:font-medium"
                            >
                              <span className="ml-4 relative before:absolute before:left-[-12px] before:top-1/2 before:-translate-y-1/2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-muted-foreground/40">
                                {sub.label}
                              </span>
                            </SidebarMenuButton>
                          </Link>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  )}
                </div>
              ) : (
                <Link href={getRoute(item.id)} passHref className="block">
                  <SidebarMenuButton
                    onClick={() => setActiveView(item.id as NavigationItem)}
                    isActive={activeView === item.id}
                    className="w-full justify-start gap-3 px-3 py-2.5 font-medium hover:bg-primary/10 hover:text-primary transition-colors rounded-lg data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="text-sm">{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/40 px-3 py-4">
        <SidebarMenu>
          {footerItems.map((item) => (
            <SidebarMenuItem key={item.id}>
              <Link href={getRoute(item.id)} passHref className="block">
                <SidebarMenuButton
                  onClick={() => setActiveView(item.id as NavigationItem)}
                  isActive={activeView === item.id}
                  className="w-full justify-start gap-3 px-3 py-2.5 font-medium hover:bg-primary/10 hover:text-primary transition-colors rounded-lg data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
                >
                  <item.icon className="h-4 w-4" />
                  <span className="text-sm">{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
