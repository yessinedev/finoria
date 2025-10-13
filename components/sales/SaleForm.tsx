import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calculator, Percent, Plus, Trash2, Save, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Client, Product, LineItem } from "@/types/types";

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
  globalDiscount: number;
  setGlobalDiscount: (discount: number) => void;
  taxRate: number;
  setTaxRate: (rate: number) => void;
  subtotal: number;
  globalDiscountAmount: number;
  discountedSubtotal: number;
  taxAmount: number;
  finalTotal: number;
  saving: boolean;
  handleSubmit: () => void;
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
    globalDiscount,
    setGlobalDiscount,
    taxRate,
    setTaxRate,
    subtotal,
    globalDiscountAmount,
    discountedSubtotal,
    taxAmount,
    finalTotal,
    saving,
    handleSubmit,
  } = props;

  const activeProducts = products.filter((product) => product.isActive);

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
                                  {product.price.toFixed(2)} € • {product.description}
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
                    ? products
                        .find((p) => p.id === selectedProduct)
                        ?.price.toFixed(2) + " €"
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
  );
}
