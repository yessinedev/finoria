"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ShoppingCart,
  AlertCircle,
  Eye,
} from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { useDataTable } from "@/hooks/use-data-table";
import { db } from "@/lib/database";
import type { LineItem, Client, Product, Sale } from "@/types/types";
import SaleDetailsModal from "@/components/sales/SaleDetailsModal";
import SaleForm from "@/components/sales/SaleForm";
import { Badge } from "@/components/ui/badge";

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
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(20);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSalesList, setShowSalesList] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isSaleDetailsOpen, setIsSaleDetailsOpen] = useState(false);

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
      sale.taxAmount -
      (sale.discountAmount ?? 0),
  }));
  

  const salesColumns = [
    {
      key: "clientName" as keyof Sale,
      label: "Client",
      sortable: true,
      filterable: true,
    },
    {
      key: "finalAmount" as keyof Sale,
      label: "Montant TTC",
      sortable: true,
      render: (value?: number) =>
        typeof value === "number" ? `${value.toFixed(2)} DT` : "—",
    },
    {
      key: "saleDate" as keyof Sale,
      label: "Date",
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString("fr-FR"),
    },
    {
      key: "status" as keyof Sale,
      label: "Statut",
      sortable: true,
      filterable: true,
      filterType: "select" as const,
      filterOptions: [
        { label: "En attente", value: "En attente" },
        { label: "Confirmée", value: "Confirmée" },
        { label: "Livrée", value: "Livrée" },
        { label: "Annulée", value: "Annulée" },
      ],
      render: (value: string) => (
        <Badge
          variant={
            value === "Confirmée"
              ? "default"
              : value === "Livrée"
              ? "default"
              : "secondary"
          }
        >
          {value}
        </Badge>
      ),
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
        db.sales.getAll(),
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
  const globalDiscountAmount = (subtotal * globalDiscount) / 100;
  const discountedSubtotal = subtotal - globalDiscountAmount;
  const taxAmount = (discountedSubtotal * taxRate) / 100;
  const finalTotal = discountedSubtotal + taxAmount;

  const handleSubmit = async () => {
    if (!selectedClient || lineItems.length === 0) {
      setError(
        "Veuillez sélectionner un client et ajouter au moins un article"
      );
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const saleData = {
        clientId: Number.parseInt(selectedClient),
        items: lineItems.map((item) => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
        totalAmount: discountedSubtotal,
        taxAmount: taxAmount,
        discountAmount: globalDiscountAmount,
        finalAmount: finalTotal,
        status: "En attente",
      };

      const result = await db.sales.create(saleData);
      if (result.success) {
        saleData.items.map(async (item) => {
          const currentStock = await db.products.getStock(item.productId);
          const stock = currentStock.data! - item.quantity;
          db.products.updateStock(item.productId, stock);
        })
        setSelectedClient("");
        setLineItems([]);
        setGlobalDiscount(0);
        alert("Vente enregistrée avec succès!");
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

  const handleViewSale = (sale: Sale) => {
    setSelectedSale(sale);
    setIsSaleDetailsOpen(true);
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
              actions={(sale) => (
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleViewSale(sale)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              )}
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
          globalDiscount={globalDiscount}
          setGlobalDiscount={setGlobalDiscount}
          taxRate={taxRate}
          setTaxRate={setTaxRate}
          subtotal={subtotal}
          globalDiscountAmount={globalDiscountAmount}
          discountedSubtotal={discountedSubtotal}
          taxAmount={taxAmount}
          finalTotal={finalTotal}
          saving={saving}
          handleSubmit={handleSubmit}
        />
      )}
      <SaleDetailsModal
        sale={selectedSale}
        open={isSaleDetailsOpen}
        onClose={() => setIsSaleDetailsOpen(false)}
      />
    </div>
  );
}
