"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Check,
  ChevronsUpDown,
  Plus,
  Trash2,
  ShoppingCart,
  AlertCircle,
  Calculator,
  Percent,
  Save,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DataTable } from "@/components/ui/data-table";
import { useDataTable } from "@/hooks/use-data-table";
import { db } from "@/lib/database";
import type { LineItem, Client, Product, Sale } from "@/types/types";

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
    // In real app, open sale details modal
    alert(`Détails de la vente #${sale.id}`);
  };

  const renderSalesActions = (sale: Sale) => (
    <div className="flex justify-end gap-2">
      <Button variant="outline" size="sm" onClick={() => handleViewSale(sale)}>
        <Eye className="h-4 w-4" />
      </Button>
    </div>
  );

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Gestion des ventes</h1>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
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
              actions={renderSalesActions}
            />
          </CardContent>
        </Card>
      ) : (
        // New Sale Form
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Client Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Informations client</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="client">Sélectionner un client</Label>
                  <Select
                    value={selectedClient}
                    onValueChange={setSelectedClient}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem
                          key={client.id}
                          value={client.id.toString()}
                        >
                          {client.name} - {client.company}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Product Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Articles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <Label>Sélectionner un produit</Label>
                    <Popover
                      open={productSearchOpen}
                      onOpenChange={setProductSearchOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={productSearchOpen}
                          className="w-full justify-between"
                        >
                          {selectedProduct
                            ? activeProducts.find(
                                (product) => product.id === selectedProduct
                              )?.name
                            : "Rechercher un produit..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Rechercher un produit..." />
                          <CommandList>
                            <CommandEmpty>Aucun produit trouvé.</CommandEmpty>
                            <CommandGroup>
                              {activeProducts.map((product) => (
                                <CommandItem
                                  key={product.id}
                                  value={product.name}
                                  onSelect={() => {
                                    setSelectedProduct(product.id);
                                    setProductSearchOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedProduct === product.id
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col flex-1">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">
                                        {product.name}
                                      </span>
                                      <Badge variant="outline" className="ml-2">
                                        {product.category}
                                      </Badge>
                                    </div>
                                    <span className="text-sm text-muted-foreground">
                                      {product.price.toFixed(2)} € •{" "}
                                      {product.description}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="quantity">Quantité</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={newItemQuantity}
                      onChange={(e) =>
                        setNewItemQuantity(Number.parseInt(e.target.value) || 1)
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="discount">Remise (%)</Label>
                    <Input
                      id="discount"
                      type="number"
                      min="0"
                      max="100"
                      value={newItemDiscount}
                      onChange={(e) =>
                        setNewItemDiscount(
                          Number.parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Prix unitaire</Label>
                    <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
                      {selectedProduct
                        ? `${products
                            .find((p) => p.id === selectedProduct)
                            ?.price.toFixed(2)} €`
                        : "0.00 €"}
                    </div>
                  </div>
                  <div className="col-span-1">
                    <Button
                      onClick={addLineItem}
                      className="w-full"
                      disabled={!selectedProduct}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Line Items Table */}
                {lineItems.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Article</TableHead>
                        <TableHead className="w-20">Qté</TableHead>
                        <TableHead className="w-24">Prix unit.</TableHead>
                        <TableHead className="w-20">Remise %</TableHead>
                        <TableHead className="w-24">Total</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {item.description}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                updateLineItem(
                                  item.id,
                                  "quantity",
                                  Number.parseInt(e.target.value) || 1
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) =>
                                updateLineItem(
                                  item.id,
                                  "unitPrice",
                                  Number.parseFloat(e.target.value) || 0
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={item.discount}
                              onChange={(e) =>
                                updateLineItem(
                                  item.id,
                                  "discount",
                                  Number.parseFloat(e.target.value) || 0
                                )
                              }
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {item.total.toFixed(2)} €
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeLineItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Récapitulatif
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Global Discount */}
                <div className="space-y-2">
                  <Label htmlFor="globalDiscount">Remise globale (%)</Label>
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="globalDiscount"
                      type="number"
                      min="0"
                      max="100"
                      value={globalDiscount}
                      onChange={(e) =>
                        setGlobalDiscount(
                          Number.parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                </div>

                {/* Tax Rate */}
                <div className="space-y-2">
                  <Label htmlFor="taxRate">Taux de TVA (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    min="0"
                    max="100"
                    value={taxRate}
                    onChange={(e) =>
                      setTaxRate(Number.parseFloat(e.target.value) || 0)
                    }
                  />
                </div>

                {/* Totals */}
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span>Sous-total:</span>
                    <span>{subtotal.toFixed(2)} €</span>
                  </div>
                  {globalDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Remise globale ({globalDiscount}%):</span>
                      <span>-{globalDiscountAmount.toFixed(2)} €</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span>Sous-total après remise:</span>
                    <span>{discountedSubtotal.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>TVA ({taxRate}%):</span>
                    <span>{taxAmount.toFixed(2)} €</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-semibold">
                      <span>Total TTC:</span>
                      <span>{finalTotal.toFixed(2)} €</span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSubmit}
                  className="w-full"
                  disabled={!selectedClient || lineItems.length === 0 || saving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Enregistrement..." : "Enregistrer la vente"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
