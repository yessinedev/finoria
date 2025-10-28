"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Plus,
  AlertCircle,
  Filter,
  Eye,
  Download,
} from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { useDataTable } from "@/hooks/use-data-table";
import { db } from "@/lib/database";
import type { PurchaseOrder, Sale } from "@/types/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { pdf } from "@react-pdf/renderer";
import { PurchaseOrderPDFDocument } from "./purchase-order-pdf";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function PurchaseOrders() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState<PurchaseOrder | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [companySettings, setCompanySettings] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [dateFilter, setDateFilter] = useState<string>("all")
  const [generatingPDF, setGeneratingPDF] = useState<number | null>(null)
  const { toast } = useToast()

  // Form state for creating purchase orders
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null)
  const [deliveryDate, setDeliveryDate] = useState<string>("")
  const [creating, setCreating] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // DataTable logic
  const filteredPurchaseOrdersByDate = purchaseOrders.filter((purchaseOrder) => {
    if (dateFilter === "all") return true
    const purchaseOrderDate = new Date(purchaseOrder.orderDate)
    const now = new Date()
    const daysDiff = Math.floor((now.getTime() - purchaseOrderDate.getTime()) / (1000 * 60 * 60 * 24))

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
    data: filteredPurchaseOrders,
    searchTerm: tableSearchTerm,
    setSearchTerm: setTableSearchTerm,
    handleSort,
    handleFilter,
    clearFilters,
    sortConfig,
    filters,
  } = useDataTable(filteredPurchaseOrdersByDate, { key: "orderDate", direction: "desc" })

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentPurchaseOrders = filteredPurchaseOrders.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredPurchaseOrders.length / itemsPerPage)

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber)
  
  const columns = [
    {
      key: "number" as keyof PurchaseOrder,
      label: "Numéro",
      sortable: true,
      filterable: true,
    },
    {
      key: "clientName" as keyof PurchaseOrder,
      label: "Client",
      sortable: true,
      filterable: true,
      render: (value: string, purchaseOrder: PurchaseOrder) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-muted-foreground">{purchaseOrder.clientCompany}</div>
        </div>
      ),
    },
    {
      key: "totalAmount" as keyof PurchaseOrder,
      label: "Montant TTC",
      sortable: true,
      render: (value: number) => <span className="font-medium">{formatCurrency(value)}</span>,
    },
    {
      key: "orderDate" as keyof PurchaseOrder,
      label: "Date de commande",
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString("fr-FR"),
    },
  ];

  useEffect(() => {
    loadData();
    loadCompanySettings();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [purchaseOrdersResult, salesResult] = await Promise.all([
        db.purchaseOrders.getAll(),
        db.sales.getAllWithItems()
      ]);

      if (purchaseOrdersResult.success) {
        setPurchaseOrders(purchaseOrdersResult.data || []);
      } else {
        setError(purchaseOrdersResult.error || "Erreur lors du chargement des bons de commande");
      }

      if (salesResult.success) {
        setSales(salesResult.data || []);
      }
    } catch (error) {
      setError("Erreur inattendue lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const loadCompanySettings = async () => {
    try {
      const settingsResult = await db.settings.get();
      if (settingsResult.success && settingsResult.data) {
        setCompanySettings(settingsResult.data);
      }
    } catch (error) {
      console.error("Error loading company settings:", error);
    }
  };

  const handleViewPurchaseOrder = async (purchaseOrder: PurchaseOrder) => {
    // If the purchase order doesn't have items, fetch them
    if (!purchaseOrder.items || purchaseOrder.items.length === 0) {
      try {
        const itemsResult = await db.purchaseOrders.getItems(purchaseOrder.id);
        if (itemsResult.success) {
          setSelectedPurchaseOrder({
            ...purchaseOrder,
            items: itemsResult.data || [],
          });
        } else {
          setSelectedPurchaseOrder(purchaseOrder);
        }
      } catch (error) {
        setSelectedPurchaseOrder(purchaseOrder);
      }
    } else {
      setSelectedPurchaseOrder(purchaseOrder);
    }
    setIsPreviewOpen(true);
  };

  const handleDownloadPurchaseOrder = async (purchaseOrder: PurchaseOrder) => {
    setGeneratingPDF(purchaseOrder.id);
    try {
      // If the purchase order doesn't have items, we need to add them
      const purchaseOrderWithItems = {
        ...purchaseOrder,
        items: purchaseOrder.items || [],
      };
      
      const blob = await pdf(<PurchaseOrderPDFDocument purchaseOrder={purchaseOrderWithItems} companySettings={companySettings} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bon-de-commande-${purchaseOrder.number}.pdf`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error("Error generating PDF:", error);
      setError("Erreur lors de la génération du PDF");
      toast({
        title: "Erreur",
        description: "Erreur lors de la génération du PDF",
        variant: "destructive",
      });
    } finally {
      setGeneratingPDF(null);
    }
  };

  const handleCreatePurchaseOrder = async () => {
    if (!selectedSaleId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une vente.",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const result = await db.purchaseOrders.generateFromSale(selectedSaleId, deliveryDate);
      if (result.success) {
        await loadData(); // Refresh the list
        setIsCreating(false);
        setSelectedSaleId(null);
        setDeliveryDate("");
        toast({
          title: "Succès",
          description: "Bon de commande créé avec succès",
        });
      } else {
        throw new Error(result.error || "Erreur lors de la création du bon de commande");
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de la création du bon de commande",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const renderActions = (purchaseOrder: PurchaseOrder) => (
    <div className="flex justify-end gap-2 items-center">
      <Button variant="outline" size="sm" onClick={() => handleViewPurchaseOrder(purchaseOrder)}>
        <Eye className="h-4 w-4" />
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => handleDownloadPurchaseOrder(purchaseOrder)}
        disabled={generatingPDF === purchaseOrder.id}
      >
        {generatingPDF === purchaseOrder.id ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <Download className="h-4 w-4" />
        )}
      </Button>
    </div>
  );

  // Calculate statistics
  const totalAmount = filteredPurchaseOrders.reduce((sum, purchaseOrder) => sum + purchaseOrder.totalAmount, 0);

  if (loading) {
    return (
      <div className="p-6 flex flex-col gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Gestion des bons de commande</h1>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Gestion des bons de commande</h1>
          <p className="text-muted-foreground">
            Consultez et gérez tous vos bons de commande ({purchaseOrders.length} bon{purchaseOrders.length > 1 ? "s" : ""})
          </p>
        </div>

        <Button onClick={() => setIsCreating(true)} className="w-fit">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau bon de commande
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total des commandes</p>
                <p className="text-2xl font-bold text-blue-900">{formatCurrency(totalAmount)}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
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
              <Label htmlFor="dateFilter">Filtrer par période</Label>
              <select
                id="dateFilter"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Toutes les périodes</option>
                <option value="today">Aujourd'hui</option>
                <option value="week">Cette semaine</option>
                <option value="month">Ce mois</option>
                <option value="quarter">Ce trimestre</option>
              </select>
            </div>

            {dateFilter !== "all" && (
              <Button
                variant="outline"
                onClick={() => {
                  setDateFilter("all");
                  clearFilters();
                }}
              >
                Réinitialiser
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Purchase Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Liste des bons de commande ({filteredPurchaseOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={currentPurchaseOrders}
            columns={columns}
            sortConfig={sortConfig}
            searchTerm={tableSearchTerm}
            filters={filters}
            onSort={handleSort}
            onSearch={setTableSearchTerm}
            onFilter={handleFilter}
            onClearFilters={clearFilters}
            loading={loading}
            emptyMessage="Aucun bon de commande trouvé"
            actions={(purchaseOrder) => renderActions(purchaseOrder)}
          />
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Affichage de {indexOfFirstItem + 1} à {Math.min(indexOfLastItem, filteredPurchaseOrders.length)} sur {filteredPurchaseOrders.length} bons de commande
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-medium">
                  Page {currentPage} sur {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Purchase Order Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Créer un bon de commande
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="sale">Vente d'origine *</Label>
              <select
                id="sale"
                value={selectedSaleId || ""}
                onChange={(e) => setSelectedSaleId(Number(e.target.value) || null)}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sélectionnez une vente</option>
                {sales.map((sale) => (
                  <option key={sale.id} value={sale.id}>
                    VTE-{sale.id} - {sale.clientName} ({formatCurrency(sale.totalAmount + sale.taxAmount)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="deliveryDate">Date de livraison prévue</Label>
              <Input
                id="deliveryDate"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreating(false);
                setSelectedSaleId(null);
                setDeliveryDate("");
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreatePurchaseOrder}
              disabled={creating || !selectedSaleId}
            >
              {creating ? "Création en cours..." : "Créer le bon de commande"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purchase Order Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Aperçu du bon de commande
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto border rounded bg-white p-4">
            {selectedPurchaseOrder && (
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold">Bon de commande #{selectedPurchaseOrder.number}</h2>
                    <p className="text-muted-foreground">Date de commande: {new Date(selectedPurchaseOrder.orderDate).toLocaleDateString("fr-FR")}</p>
                    {selectedPurchaseOrder.deliveryDate && (
                      <p className="text-muted-foreground">Date de livraison prévue: {new Date(selectedPurchaseOrder.deliveryDate).toLocaleDateString("fr-FR")}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-2">Client</h3>
                    <p>{selectedPurchaseOrder.clientName}</p>
                    {selectedPurchaseOrder.clientCompany && <p>{selectedPurchaseOrder.clientCompany}</p>}
                    {selectedPurchaseOrder.clientAddress && <p>{selectedPurchaseOrder.clientAddress}</p>}
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Vente d'origine</h3>
                    <p>#VTE-{selectedPurchaseOrder.saleId}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Articles</h3>
                  <div className="border rounded">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-2">Produit</th>
                          <th className="text-right p-2">Quantité</th>
                          <th className="text-right p-2">Prix unitaire</th>
                          <th className="text-right p-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPurchaseOrder.items.map((item) => (
                          <tr key={item.id} className="border-t">
                            <td className="p-2">{item.productName}</td>
                            <td className="p-2 text-right">{item.quantity}</td>
                            <td className="p-2 text-right">{formatCurrency(item.unitPrice)}</td>
                            <td className="p-2 text-right">{formatCurrency(item.totalPrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="w-64">
                    <div className="flex justify-between py-1">
                      <span>Sous-total:</span>
                      <span>{formatCurrency(selectedPurchaseOrder.amount)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>TVA:</span>
                      <span>{formatCurrency(selectedPurchaseOrder.taxAmount)}</span>
                    </div>
                    <div className="flex justify-between py-1 font-bold border-t">
                      <span>Total:</span>
                      <span>{formatCurrency(selectedPurchaseOrder.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}