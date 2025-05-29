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
  RefreshCw,
  Calendar,
  Target,
  ShoppingCart,
  Clock,
  TrendingDown,
} from "lucide-react"
import { DataTable } from "@/components/ui/data-table"
import { useDataTable } from "@/hooks/use-data-table"
import { LineChart, BarChart, PieChart, ChartContainer } from "@/components/ui/chart"
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
      render: (value: number) => `${value.toFixed(2)} €`,
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
          {value}
        </Badge>
      ),
    },
  ]

  useEffect(() => {
    loadDashboardStats()

    // Subscribe to real-time updates
    const unsubscribe = db.subscribe((table, action, data) => {
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

    const result = await db.dashboard.getStats()
    if (result.success) {
      // Enhanced stats with additional calculations
      const baseStats = result.data || {}

      // Generate mock data for charts (in real app, this would come from database)
      const enhancedStats = {
        ...baseStats,
        monthlyRevenue: baseStats.todayRevenue * 30, // Mock calculation
        activeClients: Math.floor(baseStats.totalClients * 0.7),
        lowStockProducts: Math.floor(baseStats.totalProducts * 0.1),
        totalSales: baseStats.recentSales?.length || 0,
        pendingInvoices: 5, // Mock data
        overdueInvoices: 2, // Mock data
        salesByMonth: generateMonthlySalesData(),
        topProducts: generateTopProductsData(),
        clientDistribution: generateClientDistributionData(),
      }

      setStats(enhancedStats)
      setLastUpdated(new Date())
    } else {
      setError(result.error || "Erreur lors du chargement des statistiques")
    }

    setLoading(false)
  }

  // Mock data generators (in real app, these would be database queries)
  const generateMonthlySalesData = () => {
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun"]
    return months.map((month) => ({
      month,
      revenue: Math.floor(Math.random() * 10000) + 5000,
      sales: Math.floor(Math.random() * 50) + 20,
    }))
  }

  const generateTopProductsData = () => [
    { name: "Consultation technique", quantity: 25, revenue: 3000 },
    { name: "Formation web", quantity: 8, revenue: 20000 },
    { name: "Ordinateur Dell", quantity: 12, revenue: 10788 },
    { name: "Licence Adobe", quantity: 15, revenue: 9000 },
  ]

  const generateClientDistributionData = () => [
    { name: "Entreprises", value: 60 },
    { name: "Particuliers", value: 25 },
    { name: "Associations", value: 15 },
  ]

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
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Tableau de bord</h1>
          <p className="text-muted-foreground">Chargement des statistiques...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
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
            <div className="text-2xl font-bold">{stats.todayRevenue.toFixed(2)} €</div>
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
            <div className="text-2xl font-bold">{stats.monthlyRevenue.toFixed(0)} €</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Target className="h-3 w-3 mr-1" />
              Objectif: 50 000 €
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients actifs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeClients}</div>
            <div className="text-xs text-muted-foreground">sur {stats.totalClients} clients</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventes en cours</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSales}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="h-3 w-3 mr-1" />
              {stats.pendingInvoices} en attente
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Évolution du chiffre d'affaires</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer>
              <LineChart
                data={stats.salesByMonth.map((item) => ({
                  name: item.month,
                  value: item.revenue,
                }))}
                height={250}
              />
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Répartition des clients</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer>
              <PieChart data={stats.clientDistribution} size={250} />
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Products and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Produits les plus vendus</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer>
              <BarChart
                data={stats.topProducts.map((product) => ({
                  name: product.name.split(" ")[0], // Shortened name
                  value: product.revenue,
                  color: "bg-blue-500",
                }))}
                height={200}
              />
            </ChartContainer>
          </CardContent>
        </Card>

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
