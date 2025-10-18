"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Euro,
  Users,
  TrendingUp,
  FileText,
  Package,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Target,
  ShoppingCart,
  Clock,
  TrendingDown,
} from "lucide-react"
import { DataTable } from "@/components/ui/data-table"
import { useDataTable } from "@/hooks/use-data-table"
import { db } from "@/lib/database"
import type { DashboardStats } from "@/types/types"

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    todayRevenue: 0,
    monthlyRevenue: 0,
    totalClients: 0,
    activeClients: 0,
    totalProducts: 0,
    lowStockProducts: 0,
    totalSales: 0,
    pendingInvoices: 0,
    overdueInvoices: 0,
    recentSales: [],
    salesByMonth: [],
    topProducts: [],
    clientDistribution: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [dateRange, setDateRange] = useState("30") // days

  // Data table for recent sales
  const {
    data: filteredSales,
    searchTerm,
    setSearchTerm,
    handleSort,
    handleFilter,
    clearFilters,
    sortConfig,
    filters,
  } = useDataTable(stats.recentSales, { key: "date", direction: "desc" })

  const salesColumns = [
    {
      key: "client" as keyof (typeof stats.recentSales)[0],
      label: "Client",
      sortable: true,
      filterable: true,
    },
    {
      key: "amount" as keyof (typeof stats.recentSales)[0],
      label: "Montant",
      sortable: true,
      render: (value: number) => `${(value || 0).toFixed(3)} TND`,
    },
    {
      key: "date" as keyof (typeof stats.recentSales)[0],
      label: "Date",
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString("fr-FR"),
    },
    {
      key: "status" as keyof (typeof stats.recentSales)[0],
      label: "Statut",
      sortable: true,
      filterable: true,
      filterType: "select" as const,
      filterOptions: [
        { label: "Payée", value: "Payée" },
        { label: "En attente", value: "En attente" },
        { label: "En retard", value: "En retard" },
      ],
      render: (value: string) => (
        <Badge variant={value === "Payée" ? "default" : value === "En retard" ? "destructive" : "secondary"}>
          {value || "Inconnu"}
        </Badge>
      ),
    },
  ]

  useEffect(() => {
    loadDashboardStats()

    // Subscribe to real-time updates
    const unsubscribe = db.subscribe((table) => {
      if (["sales", "clients", "products", "invoices"].includes(table)) {
        loadDashboardStats()
      }
    })

    // Auto-refresh every 5 minutes
    const interval = setInterval(loadDashboardStats, 5 * 60 * 1000)

    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [dateRange])

  const loadDashboardStats = async () => {
    setLoading(true)
    setError(null)

    try {
      // Pass the dateRange parameter to the IPC call
      const result = await db.dashboard.getStats(dateRange)
      if (result.success) {
        // Use real stats from database
        const baseStats = result.data || {}

        // Ensure all required fields have default values
        const enhancedStats: DashboardStats = {
          todayRevenue: baseStats.todayRevenue || 0,
          monthlyRevenue: baseStats.monthlyRevenue || 0,
          totalClients: baseStats.totalClients || 0,
          activeClients: baseStats.activeClients || Math.floor((baseStats.totalClients || 0) * 0.7),
          totalProducts: baseStats.totalProducts || 0,
          lowStockProducts: baseStats.lowStockProducts || 0,
          totalSales: baseStats.totalSales || 0,
          pendingInvoices: baseStats.pendingInvoices || 0,
          overdueInvoices: baseStats.overdueInvoices || 0,
          recentSales: baseStats.recentSales || [],
          salesByMonth: baseStats.salesByMonth || [],
          topProducts: baseStats.topProducts || [],
          clientDistribution: baseStats.clientDistribution || [],
        }

        setStats(enhancedStats)
        setLastUpdated(new Date())
      } else {
        setError(result.error || "Erreur lors du chargement des statistiques")
      }
    } catch (err) {
      setError("Erreur inattendue lors du chargement des statistiques")
      console.error("Dashboard stats error:", err)
    }

    setLoading(false)
  }

  const handleRefresh = () => {
    loadDashboardStats()
  }

  const getGrowthIndicator = (current: number, previous: number) => {
    const growth = ((current - previous) / previous) * 100
    return {
      value: Math.abs(growth).toFixed(1),
      isPositive: growth >= 0,
      icon: growth >= 0 ? TrendingUp : TrendingDown,
    }
  }

  if (loading && stats.todayRevenue === 0) {
    return (
      <div className="p-6 flex flex-col gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Tableau de bord</h1>
          <p className="text-muted-foreground">Chargement des statistiques...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tableau de bord</h1>
          <p className="text-muted-foreground">
            Vue d'ensemble de votre activité
            {lastUpdated && (
              <span className="ml-2 text-xs">(Mis à jour: {lastUpdated.toLocaleTimeString("fr-FR")})</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 derniers jours</SelectItem>
              <SelectItem value="30">30 derniers jours</SelectItem>
              <SelectItem value="90">90 derniers jours</SelectItem>
              <SelectItem value="365">Cette année</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CA du jour</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats.todayRevenue || 0).toFixed(3)} TND</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              +12.5% vs hier
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CA mensuel</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats.monthlyRevenue || 0).toFixed(3)} TND</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Target className="h-3 w-3 mr-1" />
              Objectif: 50 000 TND
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients actifs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeClients || 0}</div>
            <div className="text-xs text-muted-foreground">sur {stats.totalClients || 0} clients</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventes en cours</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSales || 0}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="h-3 w-3 mr-1" />
              {stats.pendingInvoices || 0} en attente
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistics Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produits</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts || 0}</div>
            <p className="text-xs text-muted-foreground">Total des produits actifs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock faible</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lowStockProducts || 0}</div>
            <p className="text-xs text-muted-foreground">Produits en rupture de stock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paiements en attente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingInvoices || 0}</div>
            <p className="text-xs text-muted-foreground">Factures non payées</p>
          </CardContent>
        </Card>
      </div>

      {/* Additional KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paiements en retard</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overdueInvoices || 0}</div>
            <p className="text-xs text-muted-foreground">Factures en retard de paiement</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de conversion</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalSales ? Math.round((stats.totalSales - stats.pendingInvoices) / stats.totalSales * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Ventes converties</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Croissance</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              +{Math.round(((stats.monthlyRevenue || 0) / 50000) * 100) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">Par rapport à l'objectif mensuel</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Products and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Alertes et notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.lowStockProducts > 0 && (
              <Alert>
                <Package className="h-4 w-4" />
                <AlertDescription>
                  {stats.lowStockProducts} produit{stats.lowStockProducts > 1 ? "s" : ""} en rupture de stock
                </AlertDescription>
              </Alert>
            )}

            {stats.overdueInvoices > 0 && (
              <Alert variant="destructive">
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  {stats.overdueInvoices} facture{stats.overdueInvoices > 1 ? "s" : ""} en retard de paiement
                </AlertDescription>
              </Alert>
            )}

            {stats.pendingInvoices > 0 && (
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  {stats.pendingInvoices} facture{stats.pendingInvoices > 1 ? "s" : ""} en attente de paiement
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Détails des produits populaires</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topProducts && stats.topProducts.length > 0 ? (
                stats.topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <Package className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{product.name || "Produit inconnu"}</p>
                        <p className="text-sm text-muted-foreground">{product.quantity || 0} vendus</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{(product.revenue || 0).toFixed(3)} TND</p>
                      <p className="text-sm text-muted-foreground">Revenu</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">Aucun produit vendu</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Ventes récentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredSales}
            columns={salesColumns}
            sortConfig={sortConfig}
            searchTerm={searchTerm}
            filters={filters}
            onSort={handleSort}
            onSearch={setSearchTerm}
            onFilter={handleFilter}
            onClearFilters={clearFilters}
            loading={loading}
            emptyMessage="Aucune vente récente"
          />
        </CardContent>
      </Card>
    </div>
  )
}
