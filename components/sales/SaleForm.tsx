import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calculator, Percent, Plus, Trash2, Save, Check, ChevronsUpDown, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Client, Product, LineItem } from "@/types/types";
import { saleSchema } from "@/lib/validation/schemas";
import { z } from "zod";
import { EntitySelect } from "@/components/common/EntitySelect";

interface SaleFormProps {
  clients: Client[];
  products: Product[];
  selectedClient: string;
  setSelectedClient: (id: string) => void;
  lineItems: LineItem[];
  setLineItems: (items: LineItem[]) => void;
  selectedProduct: number | null;
  setSelectedProduct: (id: number | null) => void;
  productSearchOpen: boolean;
  setProductSearchOpen: (open: boolean) => void;
  newItemQuantity: number;
  setNewItemQuantity: (qty: number) => void;
  newItemDiscount: number;
  setNewItemDiscount: (discount: number) => void;
  addLineItem: () => void;
  removeLineItem: (id: number) => void;
  updateLineItem: (id: number, field: keyof LineItem, value: string | number) => void;
  // Removed globalDiscount and setGlobalDiscount
  // Removed taxRate and setTaxRate - using per-item TVA calculation
  fodecTax: number; // New FODEC tax state
  setFodecTax: (rate: number) => void; // New FODEC tax setter
  subtotal: number;
  // Removed globalDiscountAmount
  discountedSubtotal: number;
  taxAmount: number;
  fodecAmount: number; // New FODEC amount
  finalTotal: number;
  saving: boolean;
  handleSubmit: (errors: Record<string, string>) => void;
  errors: Record<string, string>;
  setErrors: (errors: Record<string, string>) => void;
}

export default function SaleForm(props: SaleFormProps) {
  const {
    clients,
    products,
    selectedClient,
    setSelectedClient,
    lineItems,
    setLineItems,
    selectedProduct,
    setSelectedProduct,
    productSearchOpen,
    setProductSearchOpen,
    newItemQuantity,
    setNewItemQuantity,
    newItemDiscount,
    setNewItemDiscount,
    addLineItem,
    removeLineItem,
    updateLineItem,
    // Removed globalDiscount and setGlobalDiscount
    // Removed taxRate and setTaxRate - using per-item TVA calculation
    fodecTax, // New FODEC tax
    setFodecTax, // New FODEC tax setter
    subtotal,
    // Removed globalDiscountAmount
    discountedSubtotal,
    taxAmount,
    fodecAmount, // New FODEC amount
    finalTotal,
    saving,
    handleSubmit,
    errors,
    setErrors,
  } = props;

  const activeProducts = products.filter((product) => product.isActive);

  // Clear error when client is selected
  useEffect(() => {
    if (selectedClient && errors.clientId) {
      setErrors({ ...errors, clientId: "" });
    }
  }, [selectedClient, errors, setErrors]);

  // Clear error when items are added
  useEffect(() => {
    if (lineItems.length > 0 && errors.items) {
      setErrors({ ...errors, items: "" });
    }
  }, [lineItems, errors, setErrors]);

  const validateForm = () => {
    try {
      const saleData = {
        clientId: Number(selectedClient),
        totalAmount: discountedSubtotal,
        taxAmount: taxAmount,
        discountAmount: 0, // Removed global discount
        finalAmount: finalTotal,
        // Removed status field
        saleDate: new Date().toISOString(),
        items: lineItems.map(item => ({
          productId: item.productId,
          productName: item.name,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          totalPrice: item.total,
        })),
      };
      
      saleSchema.parse(saleData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path.length > 0) {
            // Handle items array errors
            if (err.path[0] === 'items') {
              newErrors['items'] = err.message;
            } else {
              newErrors[err.path[0]] = err.message;
            }
          }
        });
        setErrors(newErrors);
        return false;
      }
      return false;
    }
  };

  const handleFormSubmit = () => {
    if (validateForm()) {
      handleSubmit({});
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 flex flex-col gap-2">
        {/* Client Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Informations client</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <EntitySelect
                label="Sélectionner un client *"
                id="client"
                value={selectedClient}
                onChange={setSelectedClient}
                options={clients}
                getOptionLabel={(client) => `${client.name} - ${client.company}`}
                getOptionValue={(client) => client.id.toString()}
                required
                error={errors.clientId}
              />
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
                                  {product.sellingPriceHT ? `${product.sellingPriceHT.toFixed(3)} DNT` : "N/A"} • {product.description}
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
                    ? (() => {
                        const product = products.find((p) => p.id === selectedProduct);
                        return product 
                          ? `${product.sellingPriceHT ? product.sellingPriceHT.toFixed(3) : "N/A"} DNT`
                          : "0.000 DNT";
                      })()
                    : "0.000 DNT"}
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
                    <TableHead className="w-24 md:w-32">Qté</TableHead>
                    <TableHead className="w-28 md:w-36">Prix unit.</TableHead>
                    <TableHead className="w-28 md:w-36">Remise %</TableHead>
                    <TableHead className="w-32 md:w-40">Total</TableHead>
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
                          className="w-full min-w-[80px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.001"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateLineItem(
                              item.id,
                              "unitPrice",
                              Number.parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-full min-w-[100px]"
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
                          className="w-full min-w-[80px]"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.total.toFixed(3)} DNT
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
            {errors.items && (
              <p className="text-sm text-red-500 mt-1">{errors.items}</p>
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
            {/* FODEC Tax */}
            <div className="space-y-2">
              <Label htmlFor="fodecTax">Taxe FODEC (%)</Label>
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="fodecTax"
                  type="number"
                  min="0"
                  max="100"
                  value={fodecTax}
                  onChange={(e) =>
                    setFodecTax(Number.parseFloat(e.target.value) || 0)
                  }
                />
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-2 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span>Sous-total:</span>
                <span>{subtotal.toFixed(3)} DNT</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Sous-total après remise:</span>
                <span>{discountedSubtotal.toFixed(3)} DNT</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>TVA (par article):</span>
                <span>{taxAmount.toFixed(3)} DNT</span>
              </div>
              {fodecTax > 0 && (
                <div className="flex justify-between text-sm">
                  <span>FODEC ({fodecTax}%):</span>
                  <span>{fodecAmount.toFixed(3)} DNT</span>
                </div>
              )}
              <div className="border-t pt-2">
                <div className="flex justify-between font-semibold">
                  <span>Total TTC:</span>
                  <span>{finalTotal.toFixed(3)} DNT</span>
                </div>
              </div>
            </div>
            <Button
              onClick={handleFormSubmit}
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
  );
}