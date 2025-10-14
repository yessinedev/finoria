"use client";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/common/FormField";
import { EntitySelect } from "@/components/common/EntitySelect";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Save } from "lucide-react";
import type { Client, Product, LineItem } from "@/types/types";
import { quoteSchema } from "@/lib/validation/schemas";
import { z } from "zod";

interface CreateQuoteModalProps {
  open: boolean;
  onClose: () => void;
  clients: Client[];
  products: Product[];
  onCreate: (quote: any) => void;
}

export default function CreateQuoteModal({ open, onClose, clients, products, onCreate }: CreateQuoteModalProps) {
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemDiscount, setNewItemDiscount] = useState(0);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(20);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Financial calculations
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const globalDiscountAmount = (subtotal * globalDiscount) / 100;
  const discountedSubtotal = subtotal - globalDiscountAmount;
  const taxAmount = (discountedSubtotal * taxRate) / 100;
  const finalTotal = discountedSubtotal + taxAmount;

  // Clear error when client is selected
  useEffect(() => {
    if (selectedClient && errors.clientId) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.clientId;
        return newErrors;
      });
    }
  }, [selectedClient, errors]);

  // Clear error when items are added
  useEffect(() => {
    if (lineItems.length > 0 && errors.items) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.items;
        return newErrors;
      });
    }
  }, [lineItems, errors]);

  const validateForm = () => {
    try {
      const quoteData = {
        clientId: Number(selectedClient),
        amount: discountedSubtotal,
        taxAmount: taxAmount,
        totalAmount: finalTotal,
        status: "Brouillon",
        issueDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        items: lineItems.map(item => ({
          productId: item.productId,
          productName: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.total,
        })),
      };
      
      quoteSchema.parse(quoteData);
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

  const addLineItem = () => {
    if (!selectedProduct) return;
    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return;
    const item: LineItem = {
      id: Date.now(),
      productId: product.id,
      name: product.name,
      description: product.description,
      quantity: newItemQuantity,
      unitPrice: product.price,
      discount: newItemDiscount,
      total: product.price * newItemQuantity * (1 - newItemDiscount / 100),
    };
    setLineItems((prev) => [...prev, item]);
    setSelectedProduct(null);
    setNewItemQuantity(1);
    setNewItemDiscount(0);
  };

  const removeLineItem = (id: number) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCreate = () => {
    if (!validateForm()) {
      return;
    }
    
    setSaving(true);
    // Minimal quote object for demo
    const quote = {
      id: Date.now(),
      number: `DEV-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`,
      clientId: Number(selectedClient),
      clientName: clients.find((c) => c.id.toString() === selectedClient)?.name || "",
      clientCompany: clients.find((c) => c.id.toString() === selectedClient)?.company || "",
      clientEmail: clients.find((c) => c.id.toString() === selectedClient)?.email || "",
      clientPhone: clients.find((c) => c.id.toString() === selectedClient)?.phone || "",
      clientAddress: clients.find((c) => c.id.toString() === selectedClient)?.address || "",
      amount: discountedSubtotal,
      taxAmount: taxAmount,
      totalAmount: finalTotal,
      issueDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: "Brouillon",
      items: lineItems,
      notes,
      paymentTerms: "30 jours net",
    };
    onCreate(quote);
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Nouveau devis</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <EntitySelect
              label="Client *"
              id="client"
              value={selectedClient}
              onChange={setSelectedClient}
              options={clients}
              getOptionLabel={(c) => c.name}
              getOptionValue={(c) => c.id.toString()}
              required
            />
            {errors.clientId && (
              <p className="text-sm text-red-500 mt-1">{errors.clientId}</p>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Articles *</label>
              <div className="flex gap-2 mb-2">
                <EntitySelect
                  label="Produit"
                  id="product"
                  value={selectedProduct?.toString() || ""}
                  onChange={(v) => setSelectedProduct(Number(v))}
                  options={products}
                  getOptionLabel={(p) => p.name}
                  getOptionValue={(p) => p.id.toString()}
                />
                <FormField
                  label="Qté"
                  id="quantity"
                  type="number"
                  value={newItemQuantity.toString()}
                  onChange={(e) => setNewItemQuantity(Number(e.target.value))}
                  placeholder="1"
                />
                <FormField
                  label="Remise %"
                  id="discount"
                  type="number"
                  value={newItemDiscount.toString()}
                  onChange={(e) => setNewItemDiscount(Number(e.target.value))}
                  placeholder="0"
                />
                <Button onClick={addLineItem} disabled={!selectedProduct}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {lineItems.length > 0 && (
                <div className="border rounded divide-y">
                  {lineItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between px-2 py-1 text-sm">
                      <span>{item.name} x{item.quantity}</span>
                      <span>{item.total.toFixed(3)} TND</span>
                      <Button variant="ghost" size="sm" onClick={() => removeLineItem(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {errors.items && (
                <p className="text-sm text-red-500 mt-1">{errors.items}</p>
              )}
            </div>
            <FormField
              label="Remise globale (%)"
              id="globalDiscount"
              type="number"
              value={globalDiscount.toString()}
              onChange={(e) => setGlobalDiscount(Number(e.target.value))}
              placeholder="0"
            />
            <FormField
              label="Taux de TVA (%)"
              id="taxRate"
              type="number"
              value={taxRate.toString()}
              onChange={(e) => setTaxRate(Number(e.target.value))}
              placeholder="20"
            />
            <FormField
              label="Notes"
              id="notes"
              textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes pour le client..."
            />
          </div>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Résumé financier</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Sous-total</span>
                  <span>{subtotal.toFixed(3)} TND</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Remise globale</span>
                  <span>-{globalDiscountAmount.toFixed(3)} TND</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Sous-total remisé</span>
                  <span>{discountedSubtotal.toFixed(3)} TND</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>TVA ({taxRate}%)</span>
                  <span>+{taxAmount.toFixed(3)} TND</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t pt-2">
                  <span>Total TTC</span>
                  <span>{finalTotal.toFixed(3)} TND</span>
                </div>
              </CardContent>
            </Card>
            <Button onClick={handleCreate} disabled={saving || !selectedClient || lineItems.length === 0} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Création..." : "Créer le devis"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}