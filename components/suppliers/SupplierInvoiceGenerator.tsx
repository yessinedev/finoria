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
import type { Supplier, Product, SupplierOrder } from "@/types/types";
import { FormField } from "@/components/common/FormField";
import { EntitySelect } from "@/components/common/EntitySelect";
import { FinancialSummaryCard } from "@/components/common/FinancialSummaryCard";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface SupplierInvoiceGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onInvoiceGenerated: () => void;
  invoiceToEdit?: any; // Optional invoice to edit
}

export default function SupplierInvoiceGenerator({
  isOpen,
  onClose,
  onInvoiceGenerated,
  invoiceToEdit,
}: SupplierInvoiceGeneratorProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<
    "from-order" | "new-invoice" | "from-reception-notes"
  >("from-order");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null
  );
  const [supplierOrders, setSupplierOrders] = useState<SupplierOrder[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<SupplierOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<SupplierOrder | null>(
    null
  );
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
  const [loading, setLoading] = useState(false);
  const [companySettings, setCompanySettings] = useState<any>(null); // Add company settings state
  const [receptionNotes, setReceptionNotes] = useState<any[]>([]);
  const [selectedReceptionNotes, setSelectedReceptionNotes] = useState<
    number[]
  >([]);
  const [loadingReceptionNotes, setLoadingReceptionNotes] = useState(false);

  // Clear error when supplier is selected
  useEffect(() => {
    if (selectedSupplier && error) {
      setError(null);
    }
  }, [selectedSupplier, error]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        suppliersResult,
        productsResult,
        settingsResult,
        receptionNotesResult,
      ] = await Promise.all([
        db.suppliers.getAll(),
        db.products.getAll(),
        db.settings.get(),
        db.receptionNotes.getAll(),
      ]);

      if (suppliersResult.success) setSuppliers(suppliersResult.data || []);
      if (productsResult.success) setProducts(productsResult.data || []);

      // Set company settings
      if (settingsResult.success && settingsResult.data) {
        setCompanySettings(settingsResult.data);
        // Use default tax rate instead of company TVA rate
        // taxRate is now calculated per item
      }

      // Set reception notes
      if (receptionNotesResult.success && receptionNotesResult.data) {
        setReceptionNotes(receptionNotesResult.data || []);
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
      if (invoiceToEdit) {
        loadInvoiceData(invoiceToEdit);
      } else {
        resetForm();
      }
    }
  }, [isOpen, invoiceToEdit]);

  const loadInvoiceData = (invoice: any) => {
    // Load existing invoice data for editing
    setSelectedSupplier(
      suppliers.find((s) => s.id === invoice.supplierId) || null
    );
    setFormData({
      notes: invoice.notes || "",
      customNumber: invoice.invoiceNumber || "",
    });
    setLineItems(invoice.items || []);
  };

  const handleSupplierSelection = async (supplierId: string) => {
    const supplier = suppliers.find((s) => s.id.toString() === supplierId);
    setSelectedSupplier(supplier || null);
    setError(null);

    if (supplier) {
      // Load orders for this supplier
      try {
        const [ordersResult, invoicesResult] = await Promise.all([
          db.supplierOrders.getAll(),
          db.supplierInvoices.getAll()
        ]);
        
        if (ordersResult.success) {
          // Get all order IDs that have been invoiced
          const invoicedOrderIds = new Set(
            (invoicesResult.data || [])
              .filter((inv: any) => inv.orderId != null)
              .map((inv: any) => inv.orderId)
          );
          
          // Filter orders: only for this supplier and not yet invoiced
          const supplierOrders = (ordersResult.data || []).filter(
            (order: SupplierOrder) => 
              order.supplierId === supplier.id && 
              !invoicedOrderIds.has(order.id)
          );
          setSupplierOrders(supplierOrders);
        }
      } catch (error) {
        console.error("Error loading supplier orders:", error);
      }
    } else {
      setSupplierOrders([]);
    }

    // Clear selections when supplier changes
    setSelectedOrders([]);
    setLineItems([]);
  };

  const handleOrderSelection = (orderId: number) => {
    const order = supplierOrders.find((o) => o.id === orderId);
    setSelectedOrder(order || null);
    setError(null);

    // When an order is selected, populate line items
    if (order && order.items) {
      const items = order.items.map((item) => ({
        id: Date.now() + Math.random(),
        productId: item.productId,
        productName: item.productName,
        description: "",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        totalPrice: item.totalPrice,
      }));
      setLineItems(items);
    }
  };

  const handleReceptionNoteSelection = (receptionNoteId: number) => {
    const receptionNote = receptionNotes.find(
      (rn) => rn.id === receptionNoteId
    );
    if (!receptionNote) return;

    // Toggle selection
    if (selectedReceptionNotes.includes(receptionNoteId)) {
      // Remove from selection
      setSelectedReceptionNotes(
        selectedReceptionNotes.filter((id) => id !== receptionNoteId)
      );
    } else {
      // Add to selection
      setSelectedReceptionNotes([...selectedReceptionNotes, receptionNoteId]);
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
      if (activeTab === "from-order") {
        if (!selectedOrder) {
          setError("Veuillez sélectionner une commande");
          return false;
        }
      } else if (activeTab === "new-invoice") {
        if (!selectedSupplier) {
          setError("Veuillez sélectionner un fournisseur");
          return false;
        }
        if (lineItems.length === 0) {
          setError("Veuillez ajouter au moins un article");
          return false;
        }
      } else {
        // from-reception-notes
        if (!selectedSupplier) {
          setError("Veuillez sélectionner un fournisseur");
          return false;
        }
        if (selectedReceptionNotes.length === 0) {
          setError("Veuillez sélectionner au moins un bon de réception");
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
      (product.purchasePriceHT * newItemQuantity * newItemDiscount) / 100;
    const total = product.purchasePriceHT * newItemQuantity - discountAmount;

    const item = {
      id: Date.now(),
      productId: product.id,
      productName: product.name,
      description: product.description,
      quantity: newItemQuantity,
      unitPrice: product.purchasePriceHT,
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

  // Calculate totals for new invoice with per-item TVA and timbre fiscal
  const subtotal = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const discountedSubtotal = subtotal; // No global discount in this form
  // Calculate tax per item based on product TVA rates
  const taxAmount = lineItems.reduce((sum, item) => {
    // Get product TVA rate from the actual product data
    const product = products.find(p => p.id === item.productId);
    const itemTvaRate = product && 'tvaRate' in product ? (product.tvaRate as number) : 0;
    return sum + (item.totalPrice * itemTvaRate) / 100;
  }, 0);
  const ttcAmount = discountedSubtotal + taxAmount; // No FODEC for supplier invoices
  const timbreFiscal = companySettings?.timbreFiscal || 1.000;
  const finalTotal = ttcAmount + timbreFiscal; // Add timbre fiscal to final total

  const handleGenerateInvoice = async () => {
    if (!validateForm()) {
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      if (activeTab === "from-order") {
        // Classic invoice generation from existing order
        if (!selectedOrder) return;

        // Always provide a valid invoice number
        const invoiceNumber = formData.customNumber.trim() !== ""
          ? formData.customNumber.trim()
          : generatePreviewInvoiceNumber();
          
        // Calculate amounts correctly
        // Note: selectedOrder.totalAmount is TTC (includes tax), not HT
        const tvaAmount = selectedOrder.taxAmount;
        const htAmount = selectedOrder.totalAmount - tvaAmount; // HT = TTC - TVA
        const ttcAmount = selectedOrder.totalAmount; // This is already TTC
        const timbreFiscal = companySettings?.timbreFiscal || 1.000;
        const finalAmount = ttcAmount + timbreFiscal;
          
        const invoiceData = {
          supplierId: selectedOrder.supplierId,
          orderId: selectedOrder.id,
          invoiceNumber: invoiceNumber,
          amount: htAmount,
          taxAmount: tvaAmount,
          totalAmount: finalAmount, // Include timbre fiscal
          issueDate: new Date().toISOString(),
          status: "En attente",
          notes: formData.notes,
          skipStockUpdate: true, // Skip stock update - supplier order already updated stock
          items: selectedOrder.items,
        };

        const result = await db.supplierInvoices.create(invoiceData);
        if (result.success && result.data) {
          // No need to create stock movements here - supplier order already did that
          
          onInvoiceGenerated();
          onClose();
          // Reset form
          setSelectedOrder(null);
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
      } else if (activeTab === "new-invoice") {
        // Enhanced invoice generation - create new invoice with manual items
        // Calculate amounts with timbre fiscal
        const htAmount = subtotal;
        const tvaAmount = taxAmount;
        const ttcAmount = htAmount + tvaAmount; // No FODEC for supplier invoices
        const timbreFiscal = companySettings?.timbreFiscal || 1.000;
        const finalAmount = ttcAmount + timbreFiscal;
        
        const invoiceData = {
          supplierId: selectedSupplier!.id,
          orderId: null,
          invoiceNumber: formData.customNumber.trim() !== "" 
            ? formData.customNumber.trim() 
            : generatePreviewInvoiceNumber(),
          amount: htAmount,
          taxAmount: tvaAmount,
          totalAmount: finalAmount, // Include timbre fiscal
          issueDate: new Date().toISOString(),
          status: "En attente",
          notes: formData.notes,
          items: lineItems,
        };

        const result = await db.supplierInvoices.create(invoiceData);
        if (result.success && result.data) {
          // Create stock movement records for each item
          for (const item of lineItems) {
            try {
              await db.stockMovements.create({
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                movementType: 'IN',
                sourceType: 'supplier_invoice',
                sourceId: result.data.id,
                reference: `FINV-${result.data.id}`,
                reason: `Réception fournisseur - Facture ${invoiceData.invoiceNumber}`
              });
            } catch (stockError) {
              console.error(`Failed to create stock movement for product ${item.productId}:`, stockError);
            }
          }
          
          onInvoiceGenerated();
          onClose();
          // Reset form
          resetForm();
          toast({
            title: "Succès",
            description: "Facture créée avec succès",
          });
        } else {
          setError(result.error || "Erreur lors de la création de la facture");
          toast({
            title: "Erreur",
            description:
              result.error || "Erreur lors de la création de la facture",
            variant: "destructive",
          });
        }
      } else {
        // Generate invoice from selected reception notes
        // For simplicity, we'll create one invoice with all items from selected reception notes

        // Combine all items from selected reception notes
        const allItems = selectedReceptionNotes.flatMap((noteId) => {
          const note = receptionNotes.find((rn) => rn.id === noteId);
          return note ? note.items || [] : [];
        });

        // Calculate totals
        const totalAmount = allItems.reduce(
          (sum, item) => sum + item.receivedQuantity * item.unitPrice,
          0
        );
        const taxAmountRN = allItems.reduce((sum, item) => {
          // Get product TVA rate from the actual product data
          const product = products.find(p => p.id === item.productId);
          const itemTvaRate = product && 'tvaRate' in product ? (product.tvaRate as number) : 0;
          return (
            sum + (item.receivedQuantity * item.unitPrice * itemTvaRate) / 100
          );
        }, 0);
        const totalWithTax = totalAmount + taxAmountRN;
        const timbreFiscal = companySettings?.timbreFiscal || 1.000;
        const finalAmount = totalWithTax + timbreFiscal;
        
        // Generate a unique invoice number
        const invoiceNumber =
          formData.customNumber.trim() !== ""
            ? formData.customNumber.trim()
            : generatePreviewInvoiceNumber();

        // Create invoice
        const invoiceData = {
          supplierId: selectedSupplier!.id,
          orderId: null,
          invoiceNumber: invoiceNumber,
          amount: totalAmount,
          taxAmount: taxAmountRN,
          totalAmount: finalAmount, // Include timbre fiscal
          issueDate: new Date().toISOString(),
          status: "En attente",
          notes: formData.notes,
          skipStockUpdate: true, // Skip stock update - reception notes already updated stock
          items: allItems.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.receivedQuantity,
            unitPrice: item.unitPrice,
            discount: 0,
            totalPrice: item.receivedQuantity * item.unitPrice,
          })),
        };

        const result = await db.supplierInvoices.create(invoiceData);
        if (result.success && result.data) {
          // No need to create stock movements here - reception notes already did that
          
          onInvoiceGenerated();
          onClose();
          // Reset form
          resetForm();
          toast({
            title: "Succès",
            description:
              "Facture créée avec succès à partir des bons de réception",
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
    setSelectedSupplier(null);
    setSelectedOrders([]);
    setSupplierOrders([]);
    setLineItems([]);
    setSelectedOrder(null);
    setFormData({
      notes: "",
      customNumber: "",
    });
    setActiveTab("from-order");
    setFormErrors({});
  };

  const generatePreviewInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `FF-${year}${month}-${random}`;
  };

  const handleShowPreview = () => {
    if (!validateForm()) {
      return;
    }

    // Generate preview based on current workflow
    let previewData;
    const invoiceNumber = formData.customNumber.trim() !== ""
      ? formData.customNumber.trim()
      : generatePreviewInvoiceNumber();
    const timbreFiscal = companySettings?.timbreFiscal || 1.000;
    
    if (activeTab === "from-order") {
      // Preview for classic workflow
      if (!selectedOrder) return;
      // Note: selectedOrder.totalAmount is TTC (includes tax), not HT
      const tvaAmount = selectedOrder.taxAmount;
      const htAmount = selectedOrder.totalAmount - tvaAmount; // HT = TTC - TVA
      const ttcAmount = selectedOrder.totalAmount; // This is already TTC
      const finalAmount = ttcAmount + timbreFiscal;
      
      previewData = {
        number: invoiceNumber,
        orderId: selectedOrder.id,
        supplierId: selectedOrder.supplierId,
        amount: htAmount,
        taxAmount: tvaAmount,
        totalAmount: finalAmount, // Include timbre fiscal
        status: "En attente",
        notes: formData.notes,
        items: selectedOrder.items,
        issueDate: new Date().toISOString(),
      };
    } else if (activeTab === "new-invoice") {
      // Preview for new invoice
      if (!selectedSupplier) return;
      const htAmount = subtotal;
      const tvaAmount = taxAmount;
      const ttcAmount = htAmount + tvaAmount; // No FODEC for supplier invoices
      const finalAmount = ttcAmount + timbreFiscal;
      
      previewData = {
        number: invoiceNumber,
        orderId: null,
        supplierId: selectedSupplier.id,
        supplierName: selectedSupplier.name,
        supplierCompany: selectedSupplier.company,
        supplierEmail: selectedSupplier.email,
        supplierPhone: selectedSupplier.phone,
        supplierAddress: selectedSupplier.address,
        supplierTaxId: selectedSupplier.taxId,
        amount: htAmount,
        taxAmount: tvaAmount,
        totalAmount: finalAmount, // Include timbre fiscal
        status: "En attente",
        issueDate: new Date().toISOString(),
        notes: formData.notes,
        items: lineItems,
      };
    } else {
      // Preview for reception notes
      if (!selectedSupplier) return;
      const allItems = selectedReceptionNotes.flatMap((noteId) => {
        const note = receptionNotes.find((rn) => rn.id === noteId);
        return note ? note.items || [] : [];
      });
      const totalAmount = allItems.reduce(
        (sum, item) => sum + item.receivedQuantity * item.unitPrice,
        0
      );
      const taxAmountRN = allItems.reduce((sum, item) => {
        // Get product TVA rate from the actual product data
        const product = products.find(p => p.id === item.productId);
        const itemTvaRate = product && 'tvaRate' in product ? (product.tvaRate as number) : 0;
        return (
          sum + (item.receivedQuantity * item.unitPrice * itemTvaRate) / 100
        );
      }, 0);
      const totalWithTax = totalAmount + taxAmountRN;
      const finalAmount = totalWithTax + timbreFiscal;
      
      previewData = {
        number: invoiceNumber,
        orderId: null,
        supplierId: selectedSupplier.id,
        supplierName: selectedSupplier.name,
        supplierCompany: selectedSupplier.company,
        supplierEmail: selectedSupplier.email,
        supplierPhone: selectedSupplier.phone,
        supplierAddress: selectedSupplier.address,
        supplierTaxId: selectedSupplier.taxId,
        amount: totalAmount,
        taxAmount: taxAmountRN,
        totalAmount: finalAmount, // Include timbre fiscal
        status: "En attente",
        issueDate: new Date().toISOString(),
        notes: formData.notes,
        items: allItems.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.receivedQuantity,
          unitPrice: item.unitPrice,
          discount: 0,
          totalPrice: item.receivedQuantity * item.unitPrice,
        })),
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
              Générateur de facture fournisseur
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
                    activeTab === "from-order"
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setActiveTab("from-order")}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Depuis une commande
                  </div>
                </button>
                <button
                  className={`py-2 px-4 font-medium text-sm ${
                    activeTab === "new-invoice"
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setActiveTab("new-invoice")}
                >
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Nouvelle facture
                  </div>
                </button>
                <button
                  className={`py-2 px-4 font-medium text-sm ${
                    activeTab === "from-reception-notes"
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setActiveTab("from-reception-notes")}
                >
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Depuis bons de réception
                  </div>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
                {/* Left Column - Supplier/Order Selection and Configuration */}
                <div className="lg:col-span-1 flex flex-col gap-2">
                  {activeTab === "from-order" ? (
                    // Classic workflow - Order selection
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          Sélection de la commande *
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <EntitySelect
                          label="Sélectionner un fournisseur *"
                          id="supplier-for-order"
                          value={selectedSupplier?.id?.toString() || ""}
                          onChange={handleSupplierSelection}
                          options={suppliers}
                          getOptionLabel={(supplier) =>
                            `${supplier.name} (${supplier.company})`
                          }
                          getOptionValue={(supplier) => supplier.id.toString()}
                          required
                        />
                        
                        {selectedSupplier && (
                          <EntitySelect
                            label="Commande à facturer"
                            id="order"
                            value={selectedOrder?.id?.toString() || ""}
                            onChange={(value) =>
                              handleOrderSelection(Number(value))
                            }
                            options={supplierOrders}
                            getOptionLabel={(order) =>
                              `Commande #${order.id} - ${new Date(
                                order.orderDate
                              ).toLocaleDateString("fr-FR")} - ${formatCurrency(
                                order.totalAmount
                              )}`
                            }
                            getOptionValue={(order) => order.id.toString()}
                            required
                          />
                        )}
                        {formErrors.orderId && (
                          <p className="text-sm text-red-500 mt-1">
                            {formErrors.orderId}
                          </p>
                        )}

                        {selectedOrder && (
                          <Card className="border-primary/20 bg-primary/5">
                            <CardHeader className="pb-3">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-primary" />
                                <span className="font-medium">
                                  Détails de la commande
                                </span>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-muted-foreground">
                                    Fournisseur:
                                  </p>
                                  <p className="font-medium">
                                    {selectedOrder.supplierName}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">
                                    Entreprise:
                                  </p>
                                  <p className="font-medium">
                                    {selectedOrder.supplierCompany}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">
                                    Date de commande:
                                  </p>
                                  <p className="font-medium">
                                    {new Date(
                                      selectedOrder.orderDate
                                    ).toLocaleDateString("fr-FR")}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">
                                    Montant TTC:
                                  </p>
                                  <p className="font-medium text-primary">
                                    {formatCurrency(selectedOrder.totalAmount)}
                                  </p>
                                </div>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-sm mb-1">
                                  Articles ({selectedOrder?.items?.length}):
                                </p>
                                <div className="space-y-1">
                                  {selectedOrder?.items
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
                                  {(selectedOrder?.items?.length ?? 0) > 3 && (
                                    <p className="text-xs text-muted-foreground">
                                      +{(selectedOrder?.items?.length ?? 0) - 3}{" "}
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
                    // Enhanced workflow - Supplier selection
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Building2 className="h-5 w-5" />
                          Informations fournisseur
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <EntitySelect
                          label="Sélectionner un fournisseur *"
                          id="supplier"
                          value={selectedSupplier?.id?.toString() || ""}
                          onChange={handleSupplierSelection}
                          options={suppliers}
                          getOptionLabel={(supplier) =>
                            `${supplier.name} (${supplier.company})`
                          }
                          getOptionValue={(supplier) => supplier.id.toString()}
                          required
                        />
                        {formErrors.supplierId && (
                          <p className="text-sm text-red-500 mt-1">
                            {formErrors.supplierId}
                          </p>
                        )}

                        {selectedSupplier && (
                          <Card className="border-primary/20 bg-primary/5">
                            <CardContent className="space-y-2 pt-4">
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Nom:</p>
                                  <p className="font-medium">
                                    {selectedSupplier.name}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">
                                    Entreprise:
                                  </p>
                                  <p className="font-medium">
                                    {selectedSupplier.company}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">
                                    Email:
                                  </p>
                                  <p className="font-medium">
                                    {selectedSupplier.email}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">
                                    Téléphone:
                                  </p>
                                  <p className="font-medium">
                                    {selectedSupplier.phone}
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
                  {activeTab === "from-order" ? (
                    // Classic workflow - Just show financial summary
                    selectedOrder && (
                      <FinancialSummaryCard
                        subtotal={selectedOrder.totalAmount - selectedOrder.taxAmount}
                        tax={selectedOrder.taxAmount}
                        total={selectedOrder.totalAmount}
                        dueDate={new Date().toLocaleDateString("fr-FR")}
                        paymentTerms="30 jours net"
                        currency="DNT"
                      />
                    )
                  ) : activeTab === "new-invoice" ? (
                    // New Invoice Workflow
                    <Card className="flex-1 flex flex-col">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <ShoppingCart className="h-5 w-5" />
                          Création de facture
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col">
                        <div className="grid grid-cols-12 gap-2 items-end mb-8">
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
                                  product.purchasePriceHT
                                    ? product.purchasePriceHT.toFixed(3)
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
                                          product.purchasePriceHT
                                            ? product.purchasePriceHT.toFixed(3)
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
                        <div className="border-t pt-4 mt-8">
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
                            <div className="flex justify-between text-sm">
                              <span>Timbre Fiscal:</span>
                              <span>{timbreFiscal.toFixed(3)} DNT</span>
                            </div>
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
                    // Reception Notes Workflow
                    <Card className="flex-1 flex flex-col">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          Sélection des bons de réception
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col">
                        {selectedSupplier ? (
                          <>
                            {receptionNotes.filter(
                              (rn) => rn.supplierId === selectedSupplier.id
                            ).length > 0 ? (
                              <div className="flex-1 overflow-auto space-y-2">
                                {receptionNotes
                                  .filter(
                                    (rn) =>
                                      rn.supplierId === selectedSupplier.id
                                  )
                                  .map((rn) => (
                                    <div
                                      key={rn.id}
                                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                                        selectedReceptionNotes.includes(rn.id)
                                          ? "border-primary bg-primary/10"
                                          : "hover:bg-muted"
                                      }`}
                                      onClick={() =>
                                        handleReceptionNoteSelection(rn.id)
                                      }
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          {selectedReceptionNotes.includes(
                                            rn.id
                                          ) ? (
                                            <Check className="h-4 w-4 text-primary" />
                                          ) : (
                                            <div className="h-4 w-4 border rounded"></div>
                                          )}
                                          <div>
                                            <div className="font-medium">
                                              {rn.receptionNumber}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                              {new Date(
                                                rn.receptionDate
                                              ).toLocaleDateString(
                                                "fr-FR"
                                              )}{" "}
                                              •{" "}
                                              {formatCurrency(
                                                rn.items?.reduce(
                                                  (sum, item) =>
                                                    sum +
                                                    item.receivedQuantity *
                                                      item.unitPrice,
                                                  0
                                                ) || 0
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-sm font-medium">
                                            {rn.items?.length || 0} article
                                            {rn.items?.length !== 1 ? "s" : ""}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                                Aucun bon de réception trouvé pour ce
                                fournisseur
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex-1 flex items-center justify-center text-muted-foreground">
                            Veuillez sélectionner un fournisseur pour voir ses
                            bons de réception
                          </div>
                        )}

                        {/* Selected Reception Notes Summary */}
                        {selectedReceptionNotes.length > 0 && (
                          <div className="mt-4 pt-4 border-t">
                            <h3 className="font-medium mb-2">
                              Bons de réception sélectionnés:
                            </h3>
                            <div className="space-y-2">
                              {selectedReceptionNotes.map((noteId) => {
                                const note = receptionNotes.find(
                                  (rn) => rn.id === noteId
                                );
                                if (!note) return null;

                                const total =
                                  note.items?.reduce(
                                    (sum, item) =>
                                      sum +
                                      item.receivedQuantity * item.unitPrice,
                                    0
                                  ) || 0;

                                return (
                                  <div
                                    key={note.id}
                                    className="flex justify-between items-center bg-muted p-2 rounded"
                                  >
                                    <div>
                                      <span className="font-medium">
                                        {note.receptionNumber}
                                      </span>
                                      <span className="text-sm text-muted-foreground ml-2">
                                        ({note.items?.length || 0} article
                                        {note.items?.length !== 1 ? "s" : ""})
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <div>{formatCurrency(total)}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {new Date(
                                          note.receptionDate
                                        ).toLocaleDateString("fr-FR")}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Financial Summary */}
                            <div className="mt-4">
                              <Card className="border-green-200 bg-green-50">
                                <CardHeader>
                                  <CardTitle className="flex items-center gap-2 text-green-800">
                                    Récapitulatif financier
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Sous-total HT:</span>
                                    <span className="font-medium">{selectedReceptionNotes.reduce((sum, noteId) => {
                                      const note = receptionNotes.find(rn => rn.id === noteId);
                                      return sum + (note?.items?.reduce((itemSum, item) => itemSum + (item.receivedQuantity * item.unitPrice), 0) || 0);
                                    }, 0).toFixed(3)} DNT</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">TVA:</span>
                                    <span className="font-medium">{selectedReceptionNotes.reduce((sum, noteId) => {
                                      const note = receptionNotes.find(rn => rn.id === noteId);
                                      return sum + (note?.items?.reduce((itemSum, item) => {
                                        const product = products.find(p => p.id === item.productId);
                                        const itemTvaRate = product && 'tvaRate' in product ? (product.tvaRate as number) : 0;
                                        return itemSum + ((item.receivedQuantity * item.unitPrice) * itemTvaRate / 100);
                                      }, 0) || 0);
                                    }, 0).toFixed(3)} DNT</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Timbre Fiscal:</span>
                                    <span className="font-medium">{(companySettings?.timbreFiscal || 1.000).toFixed(3)} DNT</span>
                                  </div>
                                  <div className="border-t pt-2">
                                    <div className="flex justify-between text-lg font-bold text-green-800">
                                      <span>Total TTC:</span>
                                      <span>{selectedReceptionNotes.reduce((sum, noteId) => {
                                        const note = receptionNotes.find(rn => rn.id === noteId);
                                        const itemsTotal = note?.items?.reduce((itemSum, item) => itemSum + (item.receivedQuantity * item.unitPrice), 0) || 0;
                                        const tvaAmount = note?.items?.reduce((itemSum, item) => {
                                          const product = products.find(p => p.id === item.productId);
                                          const itemTvaRate = product && 'tvaRate' in product ? (product.tvaRate as number) : 0;
                                          return itemSum + ((item.receivedQuantity * item.unitPrice) * itemTvaRate / 100);
                                        }, 0) || 0;
                                        const ttcAmount = itemsTotal + tvaAmount;
                                        const timbreFiscal = companySettings?.timbreFiscal || 1.000;
                                        return sum + (ttcAmount + timbreFiscal); // Include timbre fiscal
                                      }, 0).toFixed(3)} DNT</span>
                                    </div>
                                  </div>
                                  <div className="text-xs text-muted-foreground pt-2 border-t">
                                    <p>Échéance: {new Date().toLocaleDateString("fr-FR")}</p>
                                    <p>Conditions: 30 jours net</p>
                                  </div>
                                </CardContent>
                              </Card>
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
                    (activeTab === "from-order"
                      ? !selectedOrder
                      : !selectedSupplier ||
                        (activeTab === "new-invoice"
                          ? lineItems.length === 0
                          : selectedReceptionNotes.length === 0))
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
                    (activeTab === "from-order"
                      ? !selectedOrder
                      : !selectedSupplier ||
                        (activeTab === "new-invoice"
                          ? lineItems.length === 0
                          : selectedReceptionNotes.length === 0))
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
    </>
  );
}
