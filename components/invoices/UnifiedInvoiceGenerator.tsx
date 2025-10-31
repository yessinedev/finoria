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

interface UnifiedInvoiceGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onInvoiceGenerated: () => void;
  availableSales: Sale[];
}

export default function UnifiedInvoiceGenerator({
  isOpen,
  onClose,
  onInvoiceGenerated,
  availableSales,
}: UnifiedInvoiceGeneratorProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<
    "from-sale" | "new-sale" | "from-purchase-orders"
  >("from-sale");
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientPurchaseOrders, setClientPurchaseOrders] = useState<
    PurchaseOrder[]
  >([]);
  const [selectedPurchaseOrders, setSelectedPurchaseOrders] = useState<
    PurchaseOrder[]
  >([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedClientForSale, setSelectedClientForSale] = useState<Client | null>(null); // Client selection for from-sale tab
  const [clientSales, setClientSales] = useState<Sale[]>([]); // Filtered sales for selected client
  const [formData, setFormData] = useState({
    notes: "",
    customNumber: "",
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<any>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
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
        // Set FODEC rate from company settings
        setFodecTax(settingsResult.data.fodecRate || 0);
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

  const handleClientForSaleSelection = (clientId: string) => {
    const client = clients.find((c) => c.id.toString() === clientId);
    setSelectedClientForSale(client || null);
    setSelectedSale(null); // Reset sale selection when client changes
    setError(null);

    if (client) {
      // Filter sales for this client
      const filteredSales = availableSales.filter((s) => s.clientId === client.id);
      setClientSales(filteredSales);
    } else {
      setClientSales([]);
    }
  };

  const handleSaleSelection = (saleId: string) => {
    const sale = clientSales.find((s) => s.id.toString() === saleId);
    setSelectedSale(sale || null);
    setError(null);
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

  const validateForm = () => {
    try {
      if (activeTab === "from-sale") {
        if (!selectedSale) {
          setError("Veuillez sélectionner une vente");
          return false;
        }
      } else if (activeTab === "new-sale") {
        if (!selectedClient) {
          setError("Veuillez sélectionner un client");
          return false;
        }
        if (lineItems.length === 0) {
          setError("Veuillez ajouter au moins un article");
          return false;
        }
      } else {
        // from-purchase-orders
        if (!selectedClient) {
          setError("Veuillez sélectionner un client");
          return false;
        }
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
      fodecApplicable: product.fodecApplicable || false,
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

  // Calculate totals for new sale with correct FODEC, TVA, and discount calculations
  // HT (subtotal) should be the sum of (quantity × unit price) for all items
  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  // Apply discount to get discounted subtotal
  const totalDiscount = lineItems.reduce(
    (sum, item) => sum + (item.unitPrice * item.quantity * item.discount) / 100,
    0
  );
  const discountedSubtotal = subtotal - totalDiscount;
  
  // Calculate FODEC per line item only for FODEC-eligible products
  const fodecAmount = lineItems.reduce((sum, item) => {
    // Get product FODEC eligibility
    const product = products.find((p) => p.id === item.productId);
    if (product && product.fodecApplicable) {
      // Calculate discounted item total
      const itemTotal =
        item.unitPrice * item.quantity -
        (item.unitPrice * item.quantity * item.discount) / 100;
      // Apply FODEC rate to this item
      return sum + (itemTotal * fodecTax) / 100;
    }
    return sum;
  }, 0);
  
  // Calculate tax (TVA) on (discounted subtotal + FODEC)
  const taxAmount = lineItems.reduce((sum, item) => {
    // Get product TVA rate
    const product = products.find((p) => p.id === item.productId);
    const itemTvaRate =
      product && "tvaRate" in product ? (product.tvaRate as number) : 0; // Use actual TVA rate or 0 if not found
    // TVA is calculated on (discounted item total + FODEC portion for this item)
    const itemTotal =
      item.unitPrice * item.quantity -
      (item.unitPrice * item.quantity * item.discount) / 100;
    // Calculate FODEC portion for this item (only if FODEC eligible)
    let itemFodec = 0;
    if (product && product.fodecApplicable) {
      itemFodec = (itemTotal * fodecTax) / 100;
    }
    return sum + ((itemTotal + itemFodec) * itemTvaRate) / 100;
  }, 0);
  // TTC (final total) is HT + FODEC + TVA
  const finalTotal = discountedSubtotal + fodecAmount + taxAmount;

  const handleGenerateInvoice = async () => {
    if (!validateForm()) {
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      if (activeTab === "from-sale") {
        // Classic invoice generation from existing sale
        if (!selectedSale) return;

        // Always provide a valid invoice number
        const invoiceNumber =
          formData.customNumber.trim() !== ""
            ? formData.customNumber.trim()
            : generatePreviewInvoiceNumber();
        const invoiceData = {
          number: invoiceNumber,
          saleId: selectedSale.id,
          dueDate: new Date().toISOString(), // Issue date is now
          amount: selectedSale.totalAmount - selectedSale.taxAmount - (selectedSale.fodecAmount || 0), // HT amount
          taxAmount: selectedSale.taxAmount, // TVA amount
          fodecAmount: selectedSale.fodecAmount || 0, // FODEC amount
          totalAmount: selectedSale.totalAmount, // TTC amount
          clientId: selectedSale.clientId,
          status: "En attente",
          notes: formData.notes,
        };

        const result = await db.invoices.create(invoiceData);
        if (result.success) {
          onInvoiceGenerated();
          onClose();
          // Reset form
          setSelectedSale(null);
          setFormData({
            notes: "",
            customNumber: "",
          });
          setFormErrors({});
          toast({
            title: "Succès",
            description: "Facture générée avec succès",
          });
        } else {
          setError(
            result.error || "Erreur lors de la génération de la facture"
          );
          toast({
            title: "Erreur",
            description:
              result.error || "Erreur lors de la génération de la facture",
            variant: "destructive",
          });
        }
      } else if (activeTab === "new-sale") {
        // Enhanced invoice generation - create new sale and then invoice
        // Create a new sale and then generate invoice from it
        const saleData = {
          clientId: selectedClient!.id,
          items: lineItems,
          totalAmount: finalTotal, // TTC amount
          taxAmount: taxAmount,
          discountAmount: 0,
          fodecAmount: fodecAmount, // Include FODEC amount
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

        // Reset form and close
        resetForm();
        onInvoiceGenerated();
        onClose();
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
          dueDate: new Date().toISOString(), // Issue date is now
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

        // Reset form and close
        resetForm();
        onInvoiceGenerated();
        onClose();
      }
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
    setSelectedSale(null);
    setFormData({
      notes: "",
      customNumber: "",
    });
    setActiveTab("from-sale");
    setFormErrors({});
  };

  const generatePreviewInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `FAC-${year}${month}-${random}`;
  };

  const handleShowPreview = () => {
    if (!validateForm()) {
      return;
    }

    // Generate preview based on current workflow
    let previewData;
    const invoiceNumber =
      formData.customNumber.trim() !== ""
        ? formData.customNumber.trim()
        : generatePreviewInvoiceNumber();

    if (activeTab === "from-sale") {
      // Preview for classic workflow
      if (!selectedSale) return;
      previewData = {
        number: invoiceNumber,
        saleId: selectedSale.id,
        dueDate: new Date().toISOString(), // Issue date is now
        amount: selectedSale.totalAmount - selectedSale.taxAmount - (selectedSale.fodecAmount || 0), // HT amount
        taxAmount: selectedSale.taxAmount,
        fodecAmount: selectedSale.fodecAmount || 0,
        totalAmount: selectedSale.totalAmount, // Already TTC
        clientId: selectedSale.clientId,
        status: "En attente",
        notes: formData.notes,
        clientName: selectedSale.clientName,
        clientCompany: selectedSale.clientCompany,
        clientTaxId: selectedSale.clientTaxId, // Include client tax ID
        items: selectedSale.items,
        issueDate: new Date().toISOString(),
      };
    } else if (activeTab === "new-sale") {
      // Preview for new sale
      if (!selectedClient) return;
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
        dueDate: new Date().toISOString(), // Issue date is now
        notes: formData.notes,
        items: lineItems,
      };
    } else {
      // Preview for purchase orders
      if (!selectedClient) return;
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
        dueDate: new Date().toISOString(), // Issue date is now
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
              Générateur de facture
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
                    activeTab === "from-sale"
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setActiveTab("from-sale")}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Depuis une vente
                  </div>
                </button>
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
                    Nouvelle vente
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
                {/* Left Column - Client/Sale Selection and Configuration */}
                <div className="lg:col-span-1 flex flex-col gap-2">
                  {activeTab === "from-sale" ? (
                    // Client-first workflow - Select client then sale
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          Sélection client & vente *
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Step 1: Select Client */}
                        <EntitySelect
                          label="Sélectionner un client *"
                          id="clientForSale"
                          value={selectedClientForSale?.id?.toString() || ""}
                          onChange={handleClientForSaleSelection}
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
                        
                        {/* Step 2: Select Sale (only shown after client selection) */}
                        {selectedClientForSale && (
                          <EntitySelect
                            label="Vente à facturer *"
                            id="sale"
                            value={selectedSale?.id?.toString() || ""}
                            onChange={handleSaleSelection}
                            options={clientSales}
                            getOptionLabel={(sale) =>
                              `${new Date(sale.saleDate).toLocaleDateString(
                                "fr-FR"
                              )} - ${formatCurrency(sale.totalAmount)}`
                            }
                            getOptionValue={(sale) => sale.id.toString()}
                            required
                          />
                        )}
                        {formErrors.saleId && (
                          <p className="text-sm text-red-500 mt-1">
                            {formErrors.saleId}
                          </p>
                        )}

                        {selectedSale && (
                          <Card className="border-primary/20 bg-primary/5">
                            <CardHeader className="pb-3">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-primary" />
                                <span className="font-medium">
                                  Détails de la vente
                                </span>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-muted-foreground">
                                    Client:
                                  </p>
                                  <p className="font-medium">
                                    {selectedSale.clientName}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">
                                    Entreprise:
                                  </p>
                                  <p className="font-medium">
                                    {selectedSale.clientCompany}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">
                                    Date de vente:
                                  </p>
                                  <p className="font-medium">
                                    {new Date(
                                      selectedSale.saleDate
                                    ).toLocaleDateString("fr-FR")}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">
                                    Montant TTC:
                                  </p>
                                  <p className="font-medium text-primary">
                                    {formatCurrency(selectedSale.totalAmount)}
                                  </p>
                                </div>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-sm mb-1">
                                  Articles ({selectedSale?.items?.length}):
                                </p>
                                <div className="space-y-1">
                                  {selectedSale?.items
                                    ?.slice(0, 3)
                                    .map((item) => (
                                      <div
                                        key={item.id}
                                        className="text-xs bg-background/50 p-2 rounded"
                                      >
                                        <span className="font-medium">
                                          {item.productName}
                                        </span>
                                        <span className="text-muted-foreground ml-2">
                                          {item.quantity}x{" "}
                                          {formatCurrency(item.unitPrice)}
                                        </span>
                                      </div>
                                    ))}
                                  {(selectedSale?.items?.length ?? 0) > 3 && (
                                    <p className="text-xs text-muted-foreground">
                                      +{(selectedSale?.items?.length ?? 0) - 3}{" "}
                                      autre(s) article(s)
                                    </p>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    // Enhanced workflow - Client selection
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
                              </div>
                              <div className="grid grid-cols-1 gap-2 text-sm">
                                <div>
                                  <p className="text-muted-foreground">
                                    Email:
                                  </p>
                                  <p className="font-medium break-all">
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
                  )}

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
                        placeholder={`Auto: ${generatePreviewInvoiceNumber()}`}
                        error={formErrors.number}
                      />

                      <div className="flex flex-col gap-2">
                        <Label>Notes (optionnel)</Label>
                        <FormField
                          id="notes"
                          label="Notes (optionnel)"
                          value={formData.notes}
                          onChange={(e) =>
                            setFormData({ ...formData, notes: e.target.value })
                          }
                          textarea
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - Workflow Specific Content */}
                <div className="lg:col-span-2 flex flex-col gap-2">
                  {activeTab === "from-sale" ? (
                    // Classic workflow - Just show financial summary
                    selectedSale && (() => {
                      // Calculate HT subtotal from sale items (totalPrice represents HT per item after discount)
                      // HT subtotal includes FODEC amount
                      const itemsTotal = selectedSale.items?.reduce((sum, item) => sum + (item.totalPrice || 0), 0) || 0;
                      const htSubtotal = itemsTotal + (selectedSale.fodecAmount || 0);
                      
                      // Recalculate TVA correctly: TVA is calculated on (itemTotal + itemFodec) for each item
                      const recalculatedTVA = selectedSale.items?.reduce((sum, item) => {
                        const product = products.find((p) => p.id === item.productId);
                        const itemTvaRate = product && "tvaRate" in product ? (product.tvaRate as number) : 0;
                        const itemTotal = item.totalPrice || 0; // HT after discount
                        // Calculate FODEC portion for this item (only if FODEC eligible)
                        let itemFodec = 0;
                        if (item.fodecApplicable && fodecTax > 0) {
                          itemFodec = (itemTotal * fodecTax) / 100;
                        }
                        // TVA = (itemTotal + itemFodec) * tvaRate / 100
                        return sum + ((itemTotal + itemFodec) * itemTvaRate) / 100;
                      }, 0) || 0;
                      
                      return (
                        <FinancialSummaryCard
                          subtotal={htSubtotal}
                          tax={recalculatedTVA}
                          total={selectedSale.totalAmount}
                          currency="DNT"
                        />
                      );
                    })()
                  ) : activeTab === "new-sale" ? (
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
                                  <th className="text-right p-2 w-28">
                                    Remise %
                                  </th>
                                  <th className="text-right p-2 w-32">Total</th>
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
                            {/* FODEC Tax Rate Display */}
                            <div className="space-y-2">
                              <Label>Taux FODEC (%)</Label>
                              <div className="flex items-center gap-2">
                                <Percent className="h-4 w-4 text-muted-foreground" />
                                <div className="flex h-10 w-full rounded-md border border-input bg-gray-100 px-3 py-2 text-sm cursor-not-allowed">
                                  {fodecTax.toFixed(1)}%
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Configurez dans les paramètres de l'entreprise
                              </p>
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
                                            {formatCurrency(po.totalAmount)}
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
                                      {formatCurrency(po.totalAmount)}
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
                                dueDate={new Date().toLocaleDateString(
                                  "fr-FR"
                                )}
                                paymentTerms="30 jours net"
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

              <Button
                onClick={handleGenerateInvoice}
                disabled={
                  isGenerating ||
                  (activeTab === "from-sale"
                    ? !selectedSale
                    : !selectedClient ||
                      (activeTab === "new-sale"
                        ? lineItems.length === 0
                        : selectedPurchaseOrders.length === 0))
                }
              >
                <Save className="h-4 w-4 mr-2" />
                {isGenerating ? "Génération..." : "Générer la facture"}
              </Button>
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
