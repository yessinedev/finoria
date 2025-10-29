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
// Removed StatusDropdown import
import { Edit, Trash2 } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

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
  // Removed taxRate - using per-item TVA calculation
  const [fodecTax, setFodecTax] = useState(1); // FODEC tax default 1%
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSalesList, setShowSalesList] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isSaleDetailsOpen, setIsSaleDetailsOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

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
    finalAmount: sale.totalAmount, // totalAmount is already TTC (includes HT + FODEC + TVA)
  }));

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentSales = enrichedSales.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(enrichedSales.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

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
        (product.sellingPriceHT * newItemQuantity * newItemDiscount) / 100;
      const total = product.sellingPriceHT * newItemQuantity - discountAmount;

      const item: LineItem = {
        id: Date.now(),
        productId: product.id,
        name: product.name,
        description: product.description,
        quantity: newItemQuantity,
        unitPrice: product.sellingPriceHT,
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
          const updatedItem = { ...item, [field]: value };
          
          // Recalculate total when quantity, unitPrice, or discount changes
          if (["quantity", "unitPrice", "discount"].includes(field)) {
            const quantity = field === "quantity" ? Number(value) : item.quantity;
            const unitPrice = field === "unitPrice" ? Number(value) : item.unitPrice;
            const discount = field === "discount" ? Number(value) : item.discount;
            
            const discountAmount = (unitPrice * quantity * discount) / 100;
            updatedItem.total = unitPrice * quantity - discountAmount;
          }
          
          return updatedItem;
        }
        return item;
      })
    );
  };

  // Calculate totals with correct FODEC, TVA, and discount calculations
  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  
  const totalDiscount = lineItems.reduce(
    (sum, item) => sum + (item.unitPrice * item.quantity * item.discount) / 100,
    0
  );
  
  const discountedSubtotal = subtotal - totalDiscount;
  
  // Calculate FODEC on discounted subtotal
  const fodecAmount = (discountedSubtotal * fodecTax) / 100;
  
  // Calculate tax (TVA) on discounted subtotal only (NOT including FODEC)
  const taxAmount = lineItems.reduce((sum, item) => {
    // Get product TVA rate
    const product = products.find(p => p.id === item.productId);
    const itemTvaRate = product && 'tvaRate' in product ? (product.tvaRate as number) : 0; // Use actual TVA rate or 0 if not found
    // TVA is calculated on the discounted item total only
    const itemTotal = item.unitPrice * item.quantity - (item.unitPrice * item.quantity * item.discount / 100);
    return sum + (itemTotal * itemTvaRate / 100);
  }, 0);
  
  // Final total: HT + FODEC + TVA
  const finalTotal = discountedSubtotal + fodecAmount + taxAmount;

  const handleSubmit = async (errors: Record<string, string>) => {
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    // Check stock availability before saving
    const insufficientItems = [];
    for (const item of lineItems) {
      const product = products.find(p => p.id === item.productId);
      if (product && product.stock !== undefined && product.stock < item.quantity) {
        insufficientItems.push({
          name: product.name,
          requested: item.quantity,
          available: product.stock
        });
      }
    }

    if (insufficientItems.length > 0) {
      setStockAlertData({
        insufficientItems,
        onContinue: () => {
          setShowStockAlert(false);
          saveSale();
        }
      });
      setShowStockAlert(true);
      return;
    }

    await saveSale();
  };

  const saveSale = async () => {
    setSaving(true);
    setError(null);

    try {
      const saleData = {
        clientId: Number(selectedClient),
        items: lineItems.map((item) => ({
          productId: item.productId,
          productName: item.name,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          totalPrice: item.total,
        })),
        totalAmount: finalTotal, // TTC amount
        taxAmount: taxAmount,
        fodecAmount: fodecAmount, // Include FODEC amount
        discountAmount: 0, // No global discount
        // Removed finalAmount field as it's not in the database schema
        // Removed status field
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

  // Removed handleStatusChange function

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
              data={currentSales}
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
              // Removed actions prop since we're removing the status dropdown
            />
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Affichage de {indexOfFirstItem + 1} à {Math.min(indexOfLastItem, enrichedSales.length)} sur {enrichedSales.length} ventes
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => paginate(currentPage - 1)}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => paginate(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => paginate(currentPage + 1)}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
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
          // Removed taxRate and setTaxRate - using per-item TVA calculation
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

  // Removed renderActions function
}