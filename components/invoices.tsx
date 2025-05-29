"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { EntitySelect } from "@/components/common/EntitySelect"
import {
  FileText,
  Download,
  Eye,
  Plus,
  Loader2,
  AlertCircle,
  Euro,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  TrendingUp,
  TrendingDown,
} from "lucide-react"
import { DataTable } from "@/components/ui/data-table"
import { useDataTable } from "@/hooks/use-data-table"
import InvoiceGeneratorModal from "@/components/InvoiceGeneratorModal"
import InvoicePreviewModal from "@/components/InvoicePreviewModal"
import { db } from "@/lib/database"
import type { Invoice, Sale } from "@/types/types"

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [generatingPDF, setGeneratingPDF] = useState<number | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("all")

  // Data table configuration
  const filteredInvoicesByStatus = invoices.filter((invoice) => {
    if (statusFilter === "all") return true
    return invoice.status === statusFilter
  })

  const filteredInvoicesByDate = filteredInvoicesByStatus.filter((invoice) => {
    if (dateFilter === "all") return true
    const invoiceDate = new Date(invoice.issueDate)
    const now = new Date()
    const daysDiff = Math.floor((now.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24))

    switch (dateFilter) {
      case "today":
        return daysDiff === 0
      case "week":
        return daysDiff <= 7
      case "month":
        return daysDiff <= 30
      case "quarter":
        return daysDiff <= 90
      default:
        return true
    }
  })

  const {
    data: filteredInvoices,
    searchTerm,
    setSearchTerm,
    handleSort,
    handleFilter,
    clearFilters,
    sortConfig,
    filters,
  } = useDataTable(filteredInvoicesByDate, { key: "issueDate", direction: "desc" })

  const columns = [
    {
      key: "number" as keyof Invoice,
      label: "N° Facture",
      sortable: true,
      filterable: true,
      render: (value: string) => <span className="font-mono font-medium text-primary">{value}</span>,
    },
    {
      key: "clientName" as keyof Invoice,
      label: "Client",
      sortable: true,
      filterable: true,
      render: (value: string, invoice: Invoice) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-muted-foreground">{invoice.clientCompany}</div>
        </div>
      ),
    },
    {
      key: "totalAmount" as keyof Invoice,
      label: "Montant TTC",
      sortable: true,
      render: (value: number) => <span className="font-medium">{formatCurrency(value)}</span>,
    },
    {
      key: "issueDate" as keyof Invoice,
      label: "Date d'émission",
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString("fr-FR"),
    },
    {
      key: "dueDate" as keyof Invoice,
      label: "Échéance",
      sortable: true,
      render: (value: string, invoice: Invoice) => {
        const dueDate = new Date(value)
        const today = new Date()
        const isOverdue = dueDate < today && invoice.status !== "Payée"
        return (
          <div className={isOverdue ? "text-red-600 font-medium" : ""}>
            {dueDate.toLocaleDateString("fr-FR")}
            {isOverdue && <div className="text-xs">En retard</div>}
          </div>
        )
      },
    },
    {
      key: "status" as keyof Invoice,
      label: "Statut",
      sortable: true,
      filterable: true,
      filterType: "select" as const,
      filterOptions: [
        { label: "En attente", value: "En attente" },
        { label: "Payée", value: "Payée" },
        { label: "En retard", value: "En retard" },
        { label: "Annulée", value: "Annulée" },
      ],
      render: (value: Invoice["status"]) => (
        <Badge variant={getStatusVariant(value)} className="flex items-center gap-1 w-fit">
          {getStatusIcon(value)}
          {value}
        </Badge>
      ),
    },
  ]

  useEffect((): (() => void) => {
    loadData()

    // Subscribe to real-time updates
    const unsubscribe = db.subscribe((table, action, data) => {
      if (["invoices", "sales"].includes(table)) {
        loadData()
      }
    })

    return unsubscribe
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [invoicesResult, salesResult] = await Promise.all([db.invoices.getAll(), db.sales.getAll()])

      if (invoicesResult.success) {
        // Mock additional data for preview (in real app, this would come from database)
        const enhancedInvoices = (invoicesResult.data || []).map((invoice) => ({
          ...invoice,
          items: [
            {
              id: 1,
              productName: "Consultation technique",
              description: "Consultation technique d'une heure",
              quantity: 1,
              unitPrice: invoice.amount,
              discount: 0,
              totalPrice: invoice.amount,
            },
          ],
          clientEmail: "client@example.com",
          clientPhone: "01 23 45 67 89",
          notes: "Merci pour votre confiance.",
          paymentTerms: "30 jours net",
        }))
        setInvoices(enhancedInvoices)
      } else {
        setError(invoicesResult.error || "Erreur lors du chargement des factures")
      }

      if (salesResult.success) {
        // Mock additional data for sales (in real app, this would come from database)
        // Fix type error: ensure clientCompany, clientEmail, clientPhone, clientAddress are always strings
        const enhancedSales = (salesResult.data || []).map((sale) => ({
          ...sale,
          clientCompany: sale.clientCompany || "",
          clientEmail: sale.clientEmail || "",
          clientPhone: sale.clientPhone || "",
          clientAddress: sale.clientAddress || "",
          items: sale.items || [],
        }))
        setSales(enhancedSales)
      }
    } catch (error) {
      setError("Erreur inattendue lors du chargement")
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "TND",
    }).format(amount)
  }

  const getStatusVariant = (status: Invoice["status"]) => {
    switch (status) {
      case "Payée":
        return "default"
      case "En attente":
        return "secondary"
      case "En retard":
        return "destructive"
      case "Annulée":
        return "outline"
      default:
        return "secondary"
    }
  }

  const getStatusIcon = (status: Invoice["status"]) => {
    switch (status) {
      case "Payée":
        return <CheckCircle className="h-3 w-3" />
      case "En attente":
        return <Clock className="h-3 w-3" />
      case "En retard":
        return <AlertCircle className="h-3 w-3" />
      case "Annulée":
        return <XCircle className="h-3 w-3" />
      default:
        return null
    }
  }

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setIsPreviewOpen(true)
  }

  const handleDownloadPDF = async (invoice: Invoice) => {
    setGeneratingPDF(invoice.id)
    try {
      const result = await db.invoices.generatePDF(invoice.id)
      if (result.success) {
        await db.invoices.openPDF(result.data)
      } else {
        alert("Erreur lors de la génération du PDF")
      }
    } catch (error) {
      alert("Erreur lors de la génération du PDF")
    } finally {
      setGeneratingPDF(null)
    }
  }

  const handlePrintInvoice = (invoice: Invoice) => {
    // In a real app, this would trigger the print dialog
    window.print()
  }

  const handleStatusChange = async (invoiceId: number, newStatus: string) => {
    try {
      const result = await db.invoices.updateStatus(invoiceId, newStatus)
      if (result.success) {
        await loadData()
        setIsPreviewOpen(false)
      } else {
        setError(result.error || "Erreur lors de la mise à jour")
      }
    } catch (error) {
      setError("Erreur lors de la mise à jour du statut")
    }
  }

  // Calculate statistics
  const totalAmount = filteredInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0)
  const paidAmount = filteredInvoices
    .filter((invoice) => invoice.status === "Payée")
    .reduce((sum, invoice) => sum + invoice.totalAmount, 0)
  const pendingAmount = filteredInvoices
    .filter((invoice) => invoice.status === "En attente")
    .reduce((sum, invoice) => sum + invoice.totalAmount, 0)
  const overdueAmount = filteredInvoices
    .filter((invoice) => invoice.status === "En retard")
    .reduce((sum, invoice) => sum + invoice.totalAmount, 0)

  // Get sales that don't have invoices yet
  const availableSales = sales.filter(
    (sale) => !invoices.some((invoice) => invoice.saleId === sale.id) && sale.status !== "Annulée",
  )

  const renderActions = (invoice: Invoice) => (
    <div className="flex justify-end gap-2">
      <Button variant="outline" size="sm" onClick={() => handleViewInvoice(invoice)}>
        <Eye className="h-4 w-4" />
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => handleDownloadPDF(invoice)}
        disabled={generatingPDF === invoice.id}
      >
        {generatingPDF === invoice.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      </Button>
    </div>
  )

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Gestion des factures</h1>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Gestion des factures</h1>
          <p className="text-muted-foreground">
            Consultez et gérez toutes vos factures ({invoices.length} facture{invoices.length > 1 ? "s" : ""})
          </p>
        </div>

        <Button onClick={() => setIsGeneratorOpen(true)} className="w-fit">
          <Plus className="h-4 w-4 mr-2" />
          Générer une facture
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total facturé</p>
                <p className="text-2xl font-bold text-blue-900">{formatCurrency(totalAmount)}</p>
                <div className="flex items-center text-xs text-blue-600 mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +12% ce mois
                </div>
              </div>
              <Euro className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Montant encaissé</p>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(paidAmount)}</p>
                <div className="flex items-center text-xs text-green-600 mt-1">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {((paidAmount / totalAmount) * 100 || 0).toFixed(1)}% du total
                </div>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">En attente</p>
                <p className="text-2xl font-bold text-orange-900">{formatCurrency(pendingAmount)}</p>
                <div className="flex items-center text-xs text-orange-600 mt-1">
                  <Clock className="h-3 w-3 mr-1" />
                  {invoices.filter((i) => i.status === "En attente").length} facture(s)
                </div>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">En retard</p>
                <p className="text-2xl font-bold text-red-900">{formatCurrency(overdueAmount)}</p>
                <div className="flex items-center text-xs text-red-600 mt-1">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  {invoices.filter((i) => i.status === "En retard").length} facture(s)
                </div>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <EntitySelect
                label="Filtrer par statut"
                id="statusFilter"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { label: "Tous les statuts", value: "all" },
                  { label: "En attente", value: "En attente" },
                  { label: "Payée", value: "Payée" },
                  { label: "En retard", value: "En retard" },
                  { label: "Annulée", value: "Annulée" },
                ]}
                getOptionLabel={(opt) => opt.label}
                getOptionValue={(opt) => opt.value}
              />
            </div>

            <div className="flex-1">
              <EntitySelect
                label="Filtrer par période"
                id="dateFilter"
                value={dateFilter}
                onChange={setDateFilter}
                options={[
                  { label: "Toutes les périodes", value: "all" },
                  { label: "Aujourd'hui", value: "today" },
                  { label: "Cette semaine", value: "week" },
                  { label: "Ce mois", value: "month" },
                  { label: "Ce trimestre", value: "quarter" },
                ]}
                getOptionLabel={(opt) => opt.label}
                getOptionValue={(opt) => opt.value}
              />
            </div>

            {(statusFilter !== "all" || dateFilter !== "all") && (
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter("all")
                  setDateFilter("all")
                  clearFilters()
                }}
              >
                Réinitialiser
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Liste des factures ({filteredInvoices.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredInvoices}
            columns={columns}
            sortConfig={sortConfig}
            searchTerm={searchTerm}
            filters={filters}
            onSort={handleSort}
            onSearch={setSearchTerm}
            onFilter={handleFilter}
            onClearFilters={clearFilters}
            loading={loading}
            emptyMessage="Aucune facture trouvée"
            actions={renderActions}
          />
        </CardContent>
      </Card>

      {/* Invoice Generator Modal */}
      <InvoiceGeneratorModal
        open={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        onInvoiceGenerated={loadData}
        availableSales={availableSales}
      />

      {/* Invoice Preview Modal */}
      <InvoicePreviewModal
        invoice={selectedInvoice}
        open={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false)
          setSelectedInvoice(null)
        }}
        onPrint={handlePrintInvoice}
        onStatusChange={handleStatusChange}
      />
    </div>
  )
}
