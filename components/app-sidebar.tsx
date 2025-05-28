"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { BarChart3, Users, ShoppingCart, FileText, Building2, Package } from "lucide-react"

const navigationItems = [
  { id: "dashboard", label: "Tableau de bord", icon: BarChart3 },
  { id: "clients", label: "Clients", icon: Users },
  { id: "products", label: "Produits", icon: Package },
  { id: "sales", label: "Ventes", icon: ShoppingCart },
  { id: "invoices", label: "Factures", icon: FileText },
]

export interface AppSidebarProps {
  activeView: string
  setActiveView: (view: string) => void
}

export function AppSidebar({ activeView, setActiveView }: AppSidebarProps) {
  return (
    <Sidebar className="border-r" collapsible="offcanvas">
      <SidebarHeader className="border-b px-6 py-4 flex items-center gap-2">
        <Building2 className="h-6 w-6 text-primary" />
        <div>
          <h1 className="font-semibold text-lg">GestVente</h1>
          <p className="text-xs text-muted-foreground">Gestion & Facturation</p>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-4 py-4">
        <SidebarMenu>
          {navigationItems.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                onClick={() => setActiveView(item.id as string)}
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
      {/* Place SidebarTrigger outside the SidebarContent so it is always visible when collapsed */}
      
    </Sidebar>
  )
}
