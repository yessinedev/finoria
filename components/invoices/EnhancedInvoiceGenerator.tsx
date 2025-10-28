"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  FileText,
  AlertCircle,
  CalendarIcon,
  Building2,
  CreditCard,
  Calculator,
  Wand2,
  Eye,
  Save,
  X,
  ShoppingCart,
  Package,
  Plus,
  Minus,
  Check,
  Percent,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { db } from "@/lib/database";
import type { Client, Product, Sale, PurchaseOrder } from "@/types/types";
import { FormField } from "@/components/common/FormField";
import { EntitySelect } from "@/components/common/EntitySelect";
import { FinancialSummaryCard } from "@/components/common/FinancialSummaryCard";
import InvoicePreviewModal from "@/components/invoices/InvoicePreviewModal";
import { Label } from "@/components/ui/label";
import { invoiceSchema } from "@/lib/validation/schemas";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

interface EnhancedInvoiceGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onInvoiceGenerated: () => void;
}

export default function EnhancedInvoiceGenerator({
  isOpen,
  onClose,
  onInvoiceGenerated,
}: EnhancedInvoiceGeneratorProps) {
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientPurchaseOrders, setClientPurchaseOrders] = useState<
    PurchaseOrder[]
  >([]);
  const [selectedPurchaseOrders, setSelectedPurchaseOrders] = useState<
    PurchaseOrder[]
  >([]);
  const [formData, setFormData] = useState({
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    paymentTerms: "30 jours net",
    notes: "",
    customNumber: "",
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<any>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<
    "new-sale" | "from-purchase-orders"
  >("new-sale");
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemDiscount, setNewItemDiscount] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  // Removed taxRate - using per-item TVA calculation
  const [fodecTax, setFodecTax] = useState(0); // New FODEC tax state
  const [loading, setLoading] = useState(false);
  const [companySettings, setCompanySettings] = useState<any>(null); // Add company settings state

  // Clear error when client is selected
  useEffect(() => {
    if (selectedClient && error) {
      setError(null);
    }
  }, [selectedClient, error]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [clientsResult, productsResult, settingsResult] = await Promise.all(
        [db.clients.getAll(), db.products.getAll(), db.settings.get()]
      );

      if (clientsResult.success) setClients(clientsResult.data || []);
      if (productsResult.success) setProducts(productsResult.data || []);

      // Set company settings
      if (settingsResult.success && settingsResult.data) {
        setCompanySettings(settingsResult.data);
        // Use default tax rate instead of company TVA rate
        // taxRate is now calculated per item
      }
    } catch (error) {
      setError("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const handleClientSelection = async (clientId: string) => {
    const client = clients.find((c) => c.id.toString() === clientId);
    setSelectedClient(client || null);
    setError(null);

    if (client) {
      // Load purchase orders for this client
      try {
        const purchaseOrdersResult = await db.purchaseOrders.getAll();
        if (purchaseOrdersResult.success) {
          const clientOrders = (purchaseOrdersResult.data || []).filter(
            (po: PurchaseOrder) => po.clientId === client.id
          );
          setClientPurchaseOrders(clientOrders);
        }
      } catch (error) {
        console.error("Error loading client purchase orders:", error);
      }
    } else {
      setClientPurchaseOrders([]);
    }

    // Clear selections when client changes
    setSelectedPurchaseOrders([]);
    setLineItems([]);
  };

  const handlePurchaseOrderSelection = (purchaseOrderId: number) => {
    const purchaseOrder = clientPurchaseOrders.find(
      (po) => po.id === purchaseOrderId
    );
    if (!purchaseOrder) return;

    // Toggle selection
    if (selectedPurchaseOrders.some((po) => po.id === purchaseOrderId)) {
      // Remove from selection
      setSelectedPurchaseOrders(
        selectedPurchaseOrders.filter((po) => po.id !== purchaseOrderId)
      );
    } else {
      // Add to selection
      setSelectedPurchaseOrders([...selectedPurchaseOrders, purchaseOrder]);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "DNT",
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(amount);
  };

  const paymentTermsOptions = [
    { value: "15 jours net", label: "15 jours net" },
    { value: "30 jours net", label: "30 jours net" },
    { value: "45 jours net", label: "45 jours net" },
    { value: "60 jours net", label: "60 jours net" },
    { value: "Paiement comptant", label: "Paiement comptant" },
    { value: "Paiement à réception", label: "Paiement à réception" },
  ];

  const validateForm = () => {
    try {
      if (!selectedClient) {
        setError("Veuillez sélectionner un client");
        return false;
      }

      // For new sale creation
      if (activeTab === "new-sale") {
        if (lineItems.length === 0) {
          setError("Veuillez ajouter au moins un article");
          return false;
        }
      }
      // For purchase order selection
      else {
        if (selectedPurchaseOrders.length === 0) {
          setError("Veuillez sélectionner au moins un bon de commande");
          return false;
        }
      }

      setFormErrors({});
      return true;
    } catch (error) {
      return false;
    }
  };

  const addLineItem = () => {
    if (!selectedProduct) return;

    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return;

    const discountAmount =
      (product.sellingPriceHT * newItemQuantity * newItemDiscount) / 100;
    const total = product.sellingPriceHT * newItemQuantity - discountAmount;

    const item = {
      id: Date.now(),
      productId: product.id,
      productName: product.name,
      description: product.description,
      quantity: newItemQuantity,
      unitPrice: product.sellingPriceHT,
      discount: newItemDiscount,
      totalPrice: total,
    };

    setLineItems([...lineItems, item]);
    setSelectedProduct(null);
    setNewItemQuantity(1);
    setNewItemDiscount(0);
  };

  const removeLineItem = (id: number) => {
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  const updateLineItem = (
    id: number,
    field: string,
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
            updated.totalPrice =
              updated.unitPrice * updated.quantity - discountAmount;
          }
          return updated;
        }
        return item;
      })
    );
  };

  // Calculate totals for new sale (add FODEC calculations) with per-item TVA
  const subtotal = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const discountedSubtotal = subtotal; // No global discount in this form
  // Calculate tax per item based on product TVA rates
  const taxAmount = lineItems.reduce((sum, item) => {
    // Get product TVA rate (this would need to be fetched from product data)
    // For now, using a default rate until we implement product TVA fetching
    const itemTvaRate = 20; // Default rate
    return sum + (item.totalPrice * itemTvaRate) / 100;
  }, 0);
  const fodecAmount = (discountedSubtotal * fodecTax) / 100; // Calculate FODEC amount
  const finalTotal = discountedSubtotal + taxAmount + fodecAmount; // Include FODEC in final total

  const handleGenerateInvoice = async () => {
    if (!validateForm()) {
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      if (activeTab === "new-sale") {
        // Create a new sale and then generate invoice from it
        const saleData = {
          clientId: selectedClient!.id,
          items: lineItems,
          totalAmount: discountedSubtotal,
          taxAmount: taxAmount,
          discountAmount: 0,
          fodecAmount: fodecAmount, // Include FODEC amount
          finalAmount: finalTotal,
          status: "Confirmée",
          saleDate: new Date().toISOString(),
        };

        const saleResult = await db.sales.create(saleData);
        if (!saleResult.success) {
          throw new Error(
            saleResult.error || "Erreur lors de la création de la vente"
          );
        }

        // Create stock movement for each sold product
        for (const item of saleData.items) {
          try {
            await db.stockMovements.create({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              movementType: "OUT",
              sourceType: "sale",
              sourceId: saleResult.data.id,
              reference: `SALE-${saleResult.data.id}`,
              reason: "Produit vendu",
            });
          } catch (stockError) {
            console.error(
              `Failed to create stock movement for product ${item.productId}:`,
              stockError
            );
          }
        }

        // Generate invoice from the newly created sale
        const invoiceResult = await db.invoices.generateFromSale(
          saleResult.data.id
        );
        if (!invoiceResult.success) {
          throw new Error(
            invoiceResult.error || "Erreur lors de la génération de la facture"
          );
        }

        toast({
          title: "Succès",
          description: "Vente et facture créées avec succès",
        });
      } else {
        // Generate invoice from selected purchase orders
        // For simplicity, we'll create one invoice with all items from selected purchase orders
        // In a real implementation, you might want to create separate invoices or allow grouping

        // Combine all items from selected purchase orders
        const allItems = selectedPurchaseOrders.flatMap((po) => po.items || []);

        // Calculate totals
        const totalAmount = selectedPurchaseOrders.reduce(
          (sum, po) => sum + po.amount,
          0
        );
        const taxAmount = selectedPurchaseOrders.reduce(
          (sum, po) => sum + po.taxAmount,
          0
        );
        const totalWithTax = totalAmount + taxAmount;

        // Generate a unique invoice number
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, "0");
        const random = Math.floor(Math.random() * 1000)
          .toString()
          .padStart(3, "0");
        const invoiceNumber = `FAC-${year}${month}-${random}`;

        // Create invoice directly (without a sale)
        const invoiceData = {
          number: invoiceNumber,
          saleId: null, // No associated sale for this workflow
          clientId: selectedClient!.id,
          amount: totalAmount,
          taxAmount: taxAmount,
          totalAmount: totalWithTax,
          status: "En attente",
          dueDate: formData.dueDate.toISOString(),
          items: allItems,
        };

        const invoiceResult = await db.invoices.create(invoiceData);
        if (!invoiceResult.success) {
          throw new Error(
            invoiceResult.error || "Erreur lors de la génération de la facture"
          );
        }

        toast({
          title: "Succès",
          description:
            "Facture créée avec succès à partir des bons de commande",
        });
      }

      // Reset form and close
      resetForm();
      onInvoiceGenerated();
      onClose();
    } catch (error: any) {
      setError(error.message || "Erreur inattendue lors de la génération");
      toast({
        title: "Erreur",
        description: error.message || "Erreur inattendue lors de la génération",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const resetForm = () => {
    setSelectedClient(null);
    setSelectedPurchaseOrders([]);
    setClientPurchaseOrders([]);
    setLineItems([]);
    setFormData({
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      paymentTerms: "30 jours net",
      notes: "",
      customNumber: "",
    });
    setActiveTab("new-sale");
    setFormErrors({});
  };

  const handleShowPreview = () => {
    if (!validateForm()) {
      return;
    }

    if (!selectedClient) return;

    // Generate preview based on current workflow
    let previewData;
    const invoiceNumber =
      formData.customNumber.trim() !== ""
        ? formData.customNumber.trim()
        : `FAC-${new Date().getFullYear()}${String(
            new Date().getMonth() + 1
          ).padStart(2, "0")}-${Math.floor(Math.random() * 1000)
            .toString()
            .padStart(3, "0")}`;

    if (activeTab === "new-sale") {
      // Preview for new sale
      previewData = {
        number: invoiceNumber,
        saleId: null, // Will be set after sale creation
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        clientCompany: selectedClient.company,
        clientEmail: selectedClient.email,
        clientPhone: selectedClient.phone,
        clientAddress: selectedClient.address,
        clientTaxId: selectedClient.taxId,
        amount: subtotal,
        taxAmount: taxAmount,
        totalAmount: finalTotal,
        status: "En attente",
        issueDate: new Date().toISOString(),
        dueDate: formData.dueDate.toISOString(),
        notes: formData.notes,
        items: lineItems,
      };
    } else {
      // Preview for purchase orders
      const allItems = selectedPurchaseOrders.flatMap((po) => po.items || []);
      const totalAmount = selectedPurchaseOrders.reduce(
        (sum, po) => sum + po.amount,
        0
      );
      const taxAmountPO = selectedPurchaseOrders.reduce(
        (sum, po) => sum + po.taxAmount,
        0
      );
      const totalWithTax = totalAmount + taxAmountPO;

      previewData = {
        number: invoiceNumber,
        saleId: null,
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        clientCompany: selectedClient.company,
        clientEmail: selectedClient.email,
        clientPhone: selectedClient.phone,
        clientAddress: selectedClient.address,
        clientTaxId: selectedClient.taxId,
        amount: totalAmount,
        taxAmount: taxAmountPO,
        totalAmount: totalWithTax,
        status: "En attente",
        issueDate: new Date().toISOString(),
        dueDate: formData.dueDate.toISOString(),
        notes: formData.notes,
        items: allItems,
      };
    }

    setPreviewInvoice(previewData);
    setShowPreview(true);
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetForm();
            onClose();
          }
        }}
      >
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              Générateur de facture amélioré
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            <div className="flex flex-col gap-2 p-1">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Workflow Selection Tabs */}
              <div className="flex border-b">
                <button
                  className={`py-2 px-4 font-medium text-sm ${
                    activeTab === "new-sale"
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setActiveTab("new-sale")}
                >
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Nouvelle vente + facture
                  </div>
                </button>
                <button
                  className={`py-2 px-4 font-medium text-sm ${
                    activeTab === "from-purchase-orders"
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setActiveTab("from-purchase-orders")}
                >
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Depuis bons de commande
                  </div>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
                {/* Left Column - Client Selection and Configuration */}
                <div className="lg:col-span-1 flex flex-col gap-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Informations client
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <EntitySelect
                        label="Sélectionner un client *"
                        id="client"
                        value={selectedClient?.id?.toString() || ""}
                        onChange={handleClientSelection}
                        options={clients}
                        getOptionLabel={(client) =>
                          `${client.name} (${client.company})`
                        }
                        getOptionValue={(client) => client.id.toString()}
                        required
                      />
                      {formErrors.clientId && (
                        <p className="text-sm text-red-500 mt-1">
                          {formErrors.clientId}
                        </p>
                      )}

                      {selectedClient && (
                        <Card className="border-primary/20 bg-primary/5">
                          <CardContent className="space-y-2 pt-4">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <p className="text-muted-foreground">Nom:</p>
                                <p className="font-medium">
                                  {selectedClient.name}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">
                                  Entreprise:
                                </p>
                                <p className="font-medium">
                                  {selectedClient.company}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Email:</p>
                                <p className="font-medium">
                                  {selectedClient.email}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">
                                  Téléphone:
                                </p>
                                <p className="font-medium">
                                  {selectedClient.phone}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        Configuration de la facture
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                      <FormField
                        label="Numéro de facture (optionnel)"
                        id="customNumber"
                        value={formData.customNumber}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            customNumber: e.target.value,
                          })
                        }
                        placeholder={`Auto: FAC-${new Date().getFullYear()}${String(
                          new Date().getMonth() + 1
                        ).padStart(2, "0")}-001`}
                        error={formErrors.number}
                      />

                      <div className="flex flex-col gap-2">
                        <Label>Date d'échéance *</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !formData.dueDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData.dueDate ? (
                                format(formData.dueDate, "PPP", { locale: fr })
                              ) : (
                                <span>Sélectionner une date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={formData.dueDate}
                              onSelect={(date) =>
                                date &&
                                setFormData({ ...formData, dueDate: date })
                              }
                            />
                          </PopoverContent>
                        </Popover>
                        {formErrors.dueDate && (
                          <p className="text-sm text-red-500 mt-1">
                            {formErrors.dueDate}
                          </p>
                        )}
                      </div>

                      <EntitySelect
                        label="Conditions de paiement"
                        id="paymentTerms"
                        value={formData.paymentTerms}
                        onChange={(value) =>
                          setFormData({ ...formData, paymentTerms: value })
                        }
                        options={paymentTermsOptions}
                        getOptionLabel={(opt) => opt.label}
                        getOptionValue={(opt) => opt.value}
                      />

                      <FormField
                        label="Notes (optionnel)"
                        id="notes"
                        value={formData.notes}
                        onChange={(e) =>
                          setFormData({ ...formData, notes: e.target.value })
                        }
                        textarea
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - Workflow Specific Content */}
                <div className="lg:col-span-2 flex flex-col gap-2">
                  {activeTab === "new-sale" ? (
                    // New Sale Workflow
                    <Card className="flex-1 flex flex-col">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <ShoppingCart className="h-5 w-5" />
                          Création de vente
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col">
                        <div className="grid grid-cols-12 gap-2 items-end mb-4">
                          <div className="col-span-5">
                            <Label>Produit</Label>
                            <EntitySelect
                              label="Produit"
                              id="product"
                              value={selectedProduct?.toString() || ""}
                              onChange={(value) =>
                                setSelectedProduct(Number(value) || null)
                              }
                              options={products.filter((p) => p.isActive)}
                              getOptionLabel={(product) =>
                                `${product.name} (${
                                  product.sellingPriceHT
                                    ? product.sellingPriceHT.toFixed(3)
                                    : "N/A"
                                } DNT)`
                              }
                              getOptionValue={(product) =>
                                product.id.toString()
                              }
                              placeholder="Sélectionner un produit"
                            />
                          </div>
                          <div className="col-span-2">
                            <Label htmlFor="quantity">Quantité</Label>
                            <input
                              id="quantity"
                              type="number"
                              min="1"
                              value={newItemQuantity}
                              onChange={(e) =>
                                setNewItemQuantity(
                                  Number.parseInt(e.target.value) || 1
                                )
                              }
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          </div>
                          <div className="col-span-2">
                            <Label htmlFor="discount">Remise (%)</Label>
                            <input
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
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          </div>
                          <div className="col-span-2">
                            <Label>Prix unitaire</Label>
                            <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
                              {selectedProduct
                                ? (() => {
                                    const product = products.find(
                                      (p) => p.id === selectedProduct
                                    );
                                    return product
                                      ? `${
                                          product.sellingPriceHT
                                            ? product.sellingPriceHT.toFixed(3)
                                            : "N/A"
                                        } DNT`
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
                          <div className="flex-1 overflow-auto mb-4">
                            <table className="w-full">
                              <thead className="bg-muted">
                                <tr>
                                  <th className="text-left p-2">Article</th>
                                  <th className="text-right p-2 w-20">Qté</th>
                                  <th className="text-right p-2 w-24">
                                    Prix unit.
                                  </th>
                                  <th className="text-right p-2 w-20">
                                    Remise %
                                  </th>
                                  <th className="text-right p-2 w-24">Total</th>
                                  <th className="text-right p-2 w-16"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {lineItems.map((item) => (
                                  <tr key={item.id} className="border-t">
                                    <td className="p-2">
                                      <div>
                                        <div className="font-medium">
                                          {item.productName}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                          {item.description}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="p-2 text-right">
                                      <input
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
                                        className="w-20 md:w-24 text-right border rounded px-2 py-1 min-w-[80px]"
                                      />
                                    </td>
                                    <td className="p-2 text-right">
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.001"
                                        value={item.unitPrice}
                                        onChange={(e) =>
                                          updateLineItem(
                                            item.id,
                                            "unitPrice",
                                            Number.parseFloat(e.target.value) ||
                                              0
                                          )
                                        }
                                        className="w-24 md:w-28 text-right border rounded px-2 py-1 min-w-[100px]"
                                      />
                                    </td>
                                    <td className="p-2 text-right">
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={item.discount}
                                        onChange={(e) =>
                                          updateLineItem(
                                            item.id,
                                            "discount",
                                            Number.parseFloat(e.target.value) ||
                                              0
                                          )
                                        }
                                        className="w-20 md:w-24 text-right border rounded px-2 py-1 min-w-[80px]"
                                      />
                                    </td>
                                    <td className="p-2 text-right font-medium">
                                      {item.totalPrice.toFixed(3)} DNT
                                    </td>
                                    <td className="p-2 text-right">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => removeLineItem(item.id)}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Financial Summary */}
                        <div className="border-t pt-4 mt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* FODEC Tax Input */}
                            <div className="space-y-2">
                              <Label htmlFor="fodecTax">Taxe FODEC (%)</Label>
                              <div className="flex items-center gap-2">
                                <Percent className="h-4 w-4 text-muted-foreground" />
                                <input
                                  id="fodecTax"
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={fodecTax}
                                  onChange={(e) =>
                                    setFodecTax(
                                      Number.parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Totals Summary */}
                          <div className="space-y-2 pt-4">
                            <div className="flex justify-between text-sm">
                              <span>Sous-total:</span>
                              <span>{subtotal.toFixed(3)} DNT</span>
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
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    // Purchase Orders Workflow
                    <Card className="flex-1 flex flex-col">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          Sélection des bons de commande
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col">
                        {selectedClient ? (
                          <>
                            {clientPurchaseOrders.length > 0 ? (
                              <div className="flex-1 overflow-auto space-y-2">
                                {clientPurchaseOrders.map((po) => (
                                  <div
                                    key={po.id}
                                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                                      selectedPurchaseOrders.some(
                                        (selected) => selected.id === po.id
                                      )
                                        ? "border-primary bg-primary/10"
                                        : "hover:bg-muted"
                                    }`}
                                    onClick={() =>
                                      handlePurchaseOrderSelection(po.id)
                                    }
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        {selectedPurchaseOrders.some(
                                          (selected) => selected.id === po.id
                                        ) ? (
                                          <Check className="h-4 w-4 text-primary" />
                                        ) : (
                                          <div className="h-4 w-4 border rounded"></div>
                                        )}
                                        <div>
                                          <div className="font-medium">
                                            {po.number}
                                          </div>
                                          <div className="text-sm text-muted-foreground">
                                            {new Date(
                                              po.orderDate
                                            ).toLocaleDateString("fr-FR")}{" "}
                                            •{" "}
                                            {formatCurrency(
                                              po.totalAmount + po.taxAmount
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-sm font-medium">
                                          {po.items?.length || 0} article
                                          {po.items?.length !== 1 ? "s" : ""}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                                Aucun bon de commande trouvé pour ce client
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex-1 flex items-center justify-center text-muted-foreground">
                            Veuillez sélectionner un client pour voir ses bons
                            de commande
                          </div>
                        )}

                        {/* Selected Purchase Orders Summary */}
                        {selectedPurchaseOrders.length > 0 && (
                          <div className="mt-4 pt-4 border-t">
                            <h3 className="font-medium mb-2">
                              Bons de commande sélectionnés:
                            </h3>
                            <div className="space-y-2">
                              {selectedPurchaseOrders.map((po) => (
                                <div
                                  key={po.id}
                                  className="flex justify-between items-center bg-muted p-2 rounded"
                                >
                                  <div>
                                    <span className="font-medium">
                                      {po.number}
                                    </span>
                                    <span className="text-sm text-muted-foreground ml-2">
                                      ({po.items?.length || 0} article
                                      {po.items?.length !== 1 ? "s" : ""})
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <div>
                                      {formatCurrency(
                                        po.totalAmount + po.taxAmount
                                      )}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {new Date(
                                        po.orderDate
                                      ).toLocaleDateString("fr-FR")}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Financial Summary */}
                            <div className="mt-4">
                              <FinancialSummaryCard
                                subtotal={selectedPurchaseOrders.reduce(
                                  (sum, po) => sum + po.amount,
                                  0
                                )}
                                tax={selectedPurchaseOrders.reduce(
                                  (sum, po) => sum + po.taxAmount,
                                  0
                                )}
                                total={selectedPurchaseOrders.reduce(
                                  (sum, po) => sum + po.totalAmount,
                                  0
                                )}
                                dueDate={formData.dueDate.toLocaleDateString(
                                  "fr-FR"
                                )}
                                paymentTerms={formData.paymentTerms}
                                currency="DNT"
                              />
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex-shrink-0 border-t pt-4">
            <div className="flex flex-col sm:flex-row gap-3 justify-between">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isGenerating}
              >
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleShowPreview}
                  disabled={
                    isGenerating ||
                    !selectedClient ||
                    (activeTab === "new-sale"
                      ? lineItems.length === 0
                      : selectedPurchaseOrders.length === 0)
                  }
                  className="border-primary text-primary hover:bg-primary/10"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Aperçu
                </Button>
                <Button
                  onClick={handleGenerateInvoice}
                  disabled={
                    isGenerating ||
                    !selectedClient ||
                    (activeTab === "new-sale"
                      ? lineItems.length === 0
                      : selectedPurchaseOrders.length === 0)
                  }
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isGenerating ? "Génération..." : "Générer la facture"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Preview Modal */}
      <InvoicePreviewModal
        invoice={previewInvoice}
        open={showPreview}
        onClose={() => setShowPreview(false)}
        onPrint={() => {}}
      />
    </>
  );
}
