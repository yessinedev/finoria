"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ShoppingCart,
  AlertCircle,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { useDataTable } from "@/hooks/use-data-table";
import { db } from "@/lib/database";
import type { LineItem, Client, Product, Sale } from "@/types/types";
import SaleDetailsModal from "@/components/sales/SaleDetailsModal";
import SaleForm from "@/components/sales/SaleForm";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatusDropdown } from "@/components/common/StatusDropdown";
import { Edit, Trash2 } from "lucide-react";

export default function Sales() {
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemDiscount, setNewItemDiscount] = useState(0);
  // Removed globalDiscount state
  const [taxRate, setTaxRate] = useState(19);
  const [fodecTax, setFodecTax] = useState(0); // New FODEC tax state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSalesList, setShowSalesList] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isSaleDetailsOpen, setIsSaleDetailsOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // State for stock alert dialog
  const [showStockAlert, setShowStockAlert] = useState(false);
  const [stockAlertData, setStockAlertData] = useState<{
    insufficientItems: Array<{ name: string; requested: number; available: number }>;
    onContinue: () => void;
  } | null>(null);

  // Data table for sales list
  const {
    data: filteredSales,
    searchTerm,
    setSearchTerm,
    handleSort,
    handleFilter,
    clearFilters,
    sortConfig,
    filters,
  } = useDataTable(sales, { key: "saleDate", direction: "desc" });

  const enrichedSales = filteredSales.map((sale) => ({
    ...sale,
    finalAmount:
      sale.totalAmount +
      sale.taxAmount +
      (sale.fodecAmount ?? 0) - // Include FODEC amount if exists
      (sale.discountAmount ?? 0),
  }));
  

  const salesColumns = [
    {
      key: "clientName" as keyof Sale,
      label: "Client",
      sortable: true,
      filterable: true,
      render: (value: string, sale: Sale) => (
        <div className="flex items-center gap-1">
          <ShoppingCart className="h-4 w-4" />
          {value}
          {sale.clientCompany && <span className="text-muted-foreground">({sale.clientCompany})</span>}
        </div>
      ),
    },
    {
      key: "finalAmount" as keyof Sale,
      label: "Montant TTC",
      sortable: true,
      render: (value?: number) =>
        typeof value === "number" ? `${value.toFixed(3)} DNT` : "—",
    },
    {
      key: "saleDate" as keyof Sale,
      label: "Date",
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString("fr-FR"),
    },
  ];

  const activeProducts = products.filter((product) => product.isActive);

  useEffect((): (() => void) => {
    loadData();

    // Subscribe to real-time updates
    const unsubscribe = db.subscribe((table, action, data) => {
      if (["clients", "products", "sales"].includes(table)) {
        loadData();
      }
    });

    return unsubscribe;
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [clientsResult, productsResult, salesResult] = await Promise.all([
        db.clients.getAll(),
        db.products.getAll(),
        db.sales.getAllWithItems(),
      ]);

      if (clientsResult.success) setClients(clientsResult.data || []);
      if (productsResult.success) setProducts(productsResult.data || []);
      if (salesResult.success) setSales(salesResult.data || []);
    } catch (error) {
      setError("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const addLineItem = () => {
    if (!selectedProduct) return;

    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return;

    // Check if product already exists in line items
    const existingItem = lineItems.find(
      (item) => item.productId === selectedProduct
    );
    if (existingItem) {
      updateLineItem(
        existingItem.id,
        "quantity",
        existingItem.quantity + newItemQuantity
      );
    } else {
      const discountAmount =
        (product.price * newItemQuantity * newItemDiscount) / 100;
      const total = product.price * newItemQuantity - discountAmount;

      const item: LineItem = {
        id: Date.now(),
        productId: product.id,
        name: product.name,
        description: product.description,
        quantity: newItemQuantity,
        unitPrice: product.price,
        discount: newItemDiscount,
        total: total,
      };

      setLineItems([...lineItems, item]);
    }

    setSelectedProduct(null);
    setNewItemQuantity(1);
    setNewItemDiscount(0);
  };

  const removeLineItem = (id: number) => {
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  const updateLineItem = (
    id: number,
    field: keyof LineItem,
    value: string | number
  ) => {
    setLineItems(
      lineItems.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (
            field === "quantity" ||
            field === "unitPrice" ||
            field === "discount"
          ) {
            const discountAmount =
              (updated.unitPrice * updated.quantity * updated.discount) / 100;
            updated.total =
              updated.unitPrice * updated.quantity - discountAmount;
          }
          return updated;
        }
        return item;
      })
    );
  };

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  // Removed globalDiscountAmount calculation
  const discountedSubtotal = subtotal; // No global discount anymore
  const taxAmount = (discountedSubtotal * taxRate) / 100;
  const fodecAmount = (discountedSubtotal * fodecTax) / 100; // New FODEC amount
  const finalTotal = discountedSubtotal + taxAmount + fodecAmount;

  const handleSubmit = async (errors: Record<string, string>) => {
    if (!selectedClient || lineItems.length === 0) {
      setError(
        "Veuillez sélectionner un client et ajouter au moins un article"
      );
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Check stock availability before proceeding
      const stockCheckResults = [];
      let hasInsufficientStock = false;

      for (const item of lineItems) {
        // Skip stock check for service products
        const product = products.find(p => p.id === item.productId);
        if (product && product.category === 'Service') {
          continue;
        }

        const stockResponse = await db.products.getStock(item.productId);
        const availableStock = stockResponse.success ? stockResponse.data : 0;
        
        if (availableStock < item.quantity) {
          hasInsufficientStock = true;
          stockCheckResults.push({
            name: item.name,
            requested: item.quantity,
            available: availableStock
          });
        }
      }

      // If there's insufficient stock, show alert dialog
      if (hasInsufficientStock) {
        setStockAlertData({
          insufficientItems: stockCheckResults,
          onContinue: () => {
            setShowStockAlert(false);
            processSale();
          }
        });
        setShowStockAlert(true);
        setSaving(false);
        return;
      }

      // If stock is sufficient, proceed with sale
      await processSale();
    } catch (error) {
      setError("Erreur inattendue lors de la vérification du stock");
      setSaving(false);
    }
  };

  const processSale = async () => {
    try {
      const saleData = {
        clientId: Number.parseInt(selectedClient),
        items: lineItems.map((item) => ({
          productId: item.productId,
          productName: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          totalPrice: item.total,
        })),
        totalAmount: discountedSubtotal,
        taxAmount: taxAmount,
        fodecAmount: fodecAmount, // Include FODEC amount
        discountAmount: 0, // No global discount
        finalAmount: finalTotal,
        status: "En attente",
        saleDate: new Date().toISOString(),
      };

      const result = await db.sales.create(saleData);
      if (result.success && result.data) {
        // Stock update is now handled in the backend IPC handler
        // Create stock movement record for each item
        for (const item of saleData.items) {
          try {
            await db.stockMovements.create({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              movementType: 'OUT',
              sourceType: 'sale',
              sourceId: result.data.id,
              reference: `SALE-${result.data.id}`,
              reason: 'Produit vendu'
            });
          } catch (stockError) {
            console.error(`Failed to create stock movement for product ${item.productId}:`, stockError);
          }
        }
        
        setSelectedClient("");
        setLineItems([]);
        setFodecTax(0); // Reset FODEC tax
        setFormErrors({});
        toast({
          title: "Succès",
          description: "Vente enregistrée avec succès!",
        });
        await loadData();
      } else {
        setError(result.error || "Erreur lors de l'enregistrement");
      }
    } catch (error) {
      setError("Erreur inattendue lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleViewSale = async (sale: Sale) => {
    // If the sale doesn't have items or items array is empty, fetch them
    if (!sale.items || !Array.isArray(sale.items) || sale.items.length === 0) {
      try {
        const itemsResult = await db.sales.getItems(sale.id);
        if (itemsResult.success) {
          const saleWithItems = {
            ...sale,
            items: itemsResult.data || [],
          };
          setSelectedSale(saleWithItems);
        } else {
          // If fetching items fails, still show the sale without items
          setSelectedSale(sale);
        }
      } catch (error) {
        // If fetching items fails, still show the sale without items
        setSelectedSale(sale);
      }
    } else {
      setSelectedSale(sale);
    }
    setIsSaleDetailsOpen(true);
  };

  const handleStatusChange = async (saleId: number, newStatus: string) => {
    try {
      const result = await db.sales.updateStatus(saleId, newStatus);
      if (result.success) {
        toast({
          title: "Succès",
          description: "Statut mis à jour avec succès",
        });
      } else {
        throw new Error(result.error || "Erreur lors de la mise à jour du statut");
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour du statut",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex flex-col gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Gestion des ventes</h1>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Gestion des ventes</h1>
          <p className="text-muted-foreground">
            {showSalesList ? "Liste des ventes" : "Créer une nouvelle vente"}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant={showSalesList ? "default" : "outline"}
            onClick={() => setShowSalesList(!showSalesList)}
          >
            {showSalesList ? "Nouvelle vente" : "Voir les ventes"}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stock Alert Dialog */}
      <AlertDialog open={showStockAlert} onOpenChange={setShowStockAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Stock Insuffisant
            </AlertDialogTitle>
            <div className="text-sm text-muted-foreground">
              Les articles suivants n'ont pas suffisamment de stock disponible :
              <div className="mt-2 space-y-2">
                {stockAlertData?.insufficientItems.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                    <span className="font-medium">{item.name}</span>
                    <span>
                      Demandé: {item.requested}, Disponible: {item.available}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                Voulez-vous continuer avec cette vente malgré le stock insuffisant ?
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowStockAlert(false)}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction onClick={stockAlertData?.onContinue}>
              Continuer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showSalesList ? (
        // Sales List View
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Liste des ventes ({sales.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={enrichedSales}
              columns={salesColumns}
              sortConfig={sortConfig}
              searchTerm={searchTerm}
              filters={filters}
              onSort={handleSort}
              onSearch={setSearchTerm}
              onFilter={handleFilter}
              onClearFilters={clearFilters}
              loading={loading}
              emptyMessage="Aucune vente trouvée"
              actions={(sale) => renderActions(sale)}
            />
          </CardContent>
        </Card>
      ) : (
        // New Sale Form
        <SaleForm
          clients={clients}
          products={products}
          selectedClient={selectedClient}
          setSelectedClient={setSelectedClient}
          lineItems={lineItems}
          setLineItems={setLineItems}
          selectedProduct={selectedProduct}
          setSelectedProduct={setSelectedProduct}
          productSearchOpen={productSearchOpen}
          setProductSearchOpen={setProductSearchOpen}
          newItemQuantity={newItemQuantity}
          setNewItemQuantity={setNewItemQuantity}
          newItemDiscount={newItemDiscount}
          setNewItemDiscount={setNewItemDiscount}
          addLineItem={addLineItem}
          removeLineItem={removeLineItem}
          updateLineItem={updateLineItem}
          // Removed globalDiscount and setGlobalDiscount
          taxRate={taxRate}
          setTaxRate={setTaxRate}
          fodecTax={fodecTax} // New FODEC tax prop
          setFodecTax={setFodecTax} // New FODEC tax setter prop
          subtotal={subtotal}
          // Removed globalDiscountAmount
          discountedSubtotal={discountedSubtotal}
          taxAmount={taxAmount}
          fodecAmount={fodecAmount} // New FODEC amount prop
          finalTotal={finalTotal}
          saving={saving}
          handleSubmit={handleSubmit}
          errors={formErrors}
          setErrors={setFormErrors}
        />
      )}
      <SaleDetailsModal
        sale={selectedSale}
        open={isSaleDetailsOpen}
        onClose={() => setIsSaleDetailsOpen(false)}
      />
    </div>
  );

  const renderActions = (sale: Sale) => (
    <div className="flex justify-end gap-2 items-center">
      <StatusDropdown
        currentValue={sale.status}
        options={[
          { value: "En attente", label: "En attente", variant: "secondary" },
          { value: "Confirmée", label: "Confirmée", variant: "default" },
          { value: "Livrée", label: "Livrée", variant: "default" },
          { value: "Annulée", label: "Annulée", variant: "outline" },
        ]}
        onStatusChange={(newStatus) => handleStatusChange(sale.id, newStatus)}
      />
      
      <Button variant="outline" size="sm" onClick={() => handleViewSale(sale)}>
        <Eye className="h-4 w-4" />
      </Button>
    </div>
  );
}
