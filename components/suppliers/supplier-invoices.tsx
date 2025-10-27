"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  FileText, 
  Eye, 
  Download, 
  Printer,
  AlertTriangle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock
} from "lucide-react";
import { db } from "@/lib/database";
import { SupplierInvoice, Supplier, SupplierOrder, Product } from "@/types/types";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { pdf } from "@react-pdf/renderer";
import SupplierInvoicePDF, { SupplierInvoicePDFDocument } from "./supplier-invoice-pdf";
import SupplierInvoicePreview from "./supplier-invoice-preview";
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
import { supplierInvoiceSchema, SupplierInvoiceFormData } from "@/lib/validation/schemas";
import { z } from "zod";
import { StatusDropdown } from "@/components/common/StatusDropdown";
import { EntitySelect } from "@/components/common/EntitySelect";

export default function SupplierInvoices() {
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<SupplierInvoice[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<SupplierInvoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<SupplierInvoice | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<SupplierInvoice | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof SupplierInvoice; direction: 'asc' | 'desc' }>({ 
    key: 'issueDate', 
    direction: 'desc' 
  });
  const [companySettings, setCompanySettings] = useState<any>(null);
  
  
  // Inline editing state
  const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    supplierId: 0,
    orderId: 0,
    invoiceNumber: "",
    amount: 0,
    taxAmount: 0,
    totalAmount: 0,
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    paymentDate: "",
  });

  // Invoice items state
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemUnitPrice, setItemUnitPrice] = useState(0);
  const [itemDiscount, setItemDiscount] = useState(0); // Add discount state

  // Validation errors state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadInvoices();
    loadSuppliers();
    loadOrders();
    loadProducts();
    loadCompanySettings();
  }, []);

  useEffect(() => {
    let filtered = invoices.filter(
      (invoice) =>
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        // Add null checks for the sort keys
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue == null || bValue == null) {
          return 0;
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    setFilteredInvoices(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchTerm, invoices, sortConfig]);

  // Update form data when order is selected
  useEffect(() => {
    if (formData.orderId && formData.orderId !== 0) {
      const selectedOrder = orders.find(order => order.id === formData.orderId);
      console.log('Selected order:', selectedOrder); // Debug log
      if (selectedOrder && selectedOrder.items) {
        console.log('Order items:', selectedOrder.items); // Debug log
        // Convert order items to invoice items
        const invoiceItemsFromOrder = selectedOrder.items.map(item => ({
          id: Date.now() + Math.random(), // Temporary ID
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          totalPrice: item.totalPrice,
        }));
        console.log('Invoice items from order:', invoiceItemsFromOrder); // Debug log
        setInvoiceItems(invoiceItemsFromOrder);
      }
    } else {
      // Clear items when no order is selected
      setInvoiceItems([]);
    }
  }, [formData.orderId, orders]);

  const loadInvoices = async () => {
    try {
      setIsLoading(true);
      const response = await db.supplierInvoices.getAll();
      if (response.success && response.data) {
        setInvoices(response.data);
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement des factures fournisseurs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadSuppliers = async () => {
    try {
      const response = await db.suppliers.getAll();
      if (response.success && response.data) {
        setSuppliers(response.data);
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement des fournisseurs",
        variant: "destructive",
      });
    }
  };

  const loadOrders = async () => {
    try {
      const response = await db.supplierOrders.getAll();
      console.log('Orders response:', response); // Debug log
      if (response.success && response.data) {
        console.log('Orders data:', response.data); // Debug log
        setOrders(response.data);
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement des commandes fournisseurs",
        variant: "destructive",
      });
    }
  };

  const loadProducts = async () => {
    try {
      const response = await db.products.getAll();
      if (response.success && response.data) {
        setProducts(response.data);
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement des produits",
        variant: "destructive",
      });
    }
  };

  const loadCompanySettings = async () => {
    try {
      const settingsResult = await db.settings.get();
      if (settingsResult.success && settingsResult.data) {
        setCompanySettings(settingsResult.data);
      }
    } catch (error) {
      console.error("Error loading company settings:", error);
    }
  };

  const validateForm = () => {
    try {
      // Validate main form data
      const mainData = {
        ...formData,
        supplierId: Number(formData.supplierId),
        orderId: formData.orderId ? Number(formData.orderId) : undefined,
      };
      
      supplierInvoiceSchema.parse(mainData);
      
      // Additional validation: if no order is selected, we need at least one item
      if ((!formData.orderId || formData.orderId === 0) && (!invoiceItems || invoiceItems.length === 0)) {
        toast({
          title: "Erreur de validation",
          description: "Veuillez ajouter au moins un article",
          variant: "destructive",
        });
        return false;
      }
      
      setErrors({});
      setItemErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        const newItemErrors: Record<string, string> = {};
        
        error.errors.forEach((err) => {
          if (err.path.length > 0) {
            // Handle items array errors
            if (err.path[0] === 'items' && err.path.length > 2) {
              const itemIndex = err.path[1];
              const fieldName = err.path[2];
              newItemErrors[`${itemIndex}-${fieldName}`] = err.message;
            } else if (err.path[0] !== 'items') {
              newErrors[err.path[0]] = err.message;
            }
          }
        });
        
        setErrors(newErrors);
        setItemErrors(newItemErrors);
        return false;
      }
      return false;
    }
  };

  const handleCreate = async () => {
    if (!validateForm()) {
      toast({
        title: "Erreur de validation",
        description: "Veuillez corriger les erreurs dans le formulaire",
        variant: "destructive",
      });
      return;
    }

    try {
      // Calculate totals using product TVA rates
      let subtotal = 0;
      let taxAmount = 0;
      
      // Calculate subtotal and tax amount based on individual product TVA rates
      for (const item of invoiceItems) {
        subtotal += item.totalPrice;
        // Note: We'll calculate tax per item when we have product TVA data
        // For now, we'll use a default rate or need to fetch product TVA rates
      }
      
      // For now, using a default rate until we implement product TVA fetching
      const defaultVatRate = 19;
      taxAmount = subtotal * (defaultVatRate / 100);
      const totalAmount = subtotal + taxAmount;
      
      const invoiceData = {
        ...formData,
        supplierId: Number(formData.supplierId),
        orderId: formData.orderId ? Number(formData.orderId) : null,
        amount: Number(subtotal.toFixed(3)),
        taxAmount: Number(taxAmount.toFixed(3)),
        totalAmount: Number(totalAmount.toFixed(3)),
        items: invoiceItems,
      };

      const response = await db.supplierInvoices.create(invoiceData);
      if (response.success && response.data) {
        // Refresh invoices to get the complete data with supplier information
        await loadInvoices();
        resetForm();
        setIsDialogOpen(false);
        toast({
          title: "Succès",
          description: "Facture fournisseur créée avec succès",
        });
      } else {
        throw new Error(response.error || "Erreur lors de la création");
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de la création de la facture",
        variant: "destructive",
      });
    }
  };

  const handleUpdate = async () => {
    if (!currentInvoice) return;
    
    if (!validateForm()) {
      toast({
        title: "Erreur de validation",
        description: "Veuillez corriger les erreurs dans le formulaire",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Calculate totals using product TVA rates
      let subtotal = 0;
      let taxAmount = 0;
      
      // Calculate subtotal and tax amount based on individual product TVA rates
      for (const item of invoiceItems) {
        subtotal += item.totalPrice;
        // Note: We'll calculate tax per item when we have product TVA data
        // For now, we'll use a default rate or need to fetch product TVA rates
      }
      
      // For now, using a default rate until we implement product TVA fetching
      const defaultVatRate = 19;
      taxAmount = subtotal * (defaultVatRate / 100);
      const totalAmount = subtotal + taxAmount;

      const invoiceData = {
        ...formData,
        supplierId: Number(formData.supplierId),
        orderId: formData.orderId ? Number(formData.orderId) : null,
        amount: Number(subtotal.toFixed(3)),
        taxAmount: Number(taxAmount.toFixed(3)),
        totalAmount: Number(totalAmount.toFixed(3)),
        items: invoiceItems,
      };

      const response = await db.supplierInvoices.update(currentInvoice.id, invoiceData);
      if (response.success && response.data) {
        // Refresh invoices to get the complete data with supplier information
        await loadInvoices();
        resetForm();
        setIsDialogOpen(false);
        toast({
          title: "Succès",
          description: "Facture fournisseur mise à jour avec succès",
        });
      } else {
        throw new Error(response.error || "Erreur lors de la mise à jour");
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de la mise à jour de la facture",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await db.supplierInvoices.delete(id);
      if (response.success) {
        setInvoices(invoices.filter((i) => i.id !== id));
        setIsDeleteDialogOpen(false);
        setInvoiceToDelete(null);
        toast({
          title: "Succès",
          description: "Facture fournisseur supprimée avec succès",
        });
      } else {
        throw new Error(response.error || "Erreur lors de la suppression");
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de la suppression de la facture",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      supplierId: 0,
      orderId: 0,
      invoiceNumber: "",
      amount: 0,
      taxAmount: 0,
      totalAmount: 0,
      issueDate: new Date().toISOString().split("T")[0],
      dueDate: "",
      paymentDate: "",
    });
    setInvoiceItems([]);
    setSelectedProduct(null);
    setItemQuantity(1);
    setItemUnitPrice(0);
    setItemDiscount(0);
    setCurrentInvoice(null);
    setErrors({});
    setItemErrors({});
  };

  // Function to generate a unique invoice number
  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `FF-${year}${month}-${random}`;
  };

  const openCreateDialog = () => {
    resetForm();
    // Generate auto invoice number
    setFormData(prev => ({
      ...prev,
      invoiceNumber: generateInvoiceNumber()
    }));
    setIsDialogOpen(true);
  };

  const openEditDialog = (invoice: SupplierInvoice) => {
    setFormData({
      supplierId: invoice.supplierId,
      orderId: invoice.orderId || 0,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount,
      taxAmount: invoice.taxAmount,
      totalAmount: invoice.totalAmount,
      issueDate: invoice.issueDate.split("T")[0],
      dueDate: invoice.dueDate ? invoice.dueDate.split("T")[0] : "",
      paymentDate: invoice.paymentDate ? invoice.paymentDate.split("T")[0] : "",
    });
    setInvoiceItems(invoice.items || []);
    setCurrentInvoice(invoice);
    setErrors({});
    setItemErrors({});
    setItemDiscount(0);
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (invoice: SupplierInvoice) => {
    setInvoiceToDelete(invoice);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentInvoice) {
      handleUpdate();
    } else {
      handleCreate();
    }
  };

  // Status functionality removed

  const handleViewInvoice = (invoice: SupplierInvoice) => {
    setSelectedInvoice(invoice);
    setIsPreviewOpen(true);
  };

  const handleDownloadPDF = async (invoice: SupplierInvoice) => {
    try {
      const blob = await pdf(<SupplierInvoicePDFDocument invoice={invoice} companySettings={companySettings} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `facture-fournisseur-${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors du téléchargement du PDF",
        variant: "destructive",
      });
    }
  };

  // Status functionality removed

  // Inline editing functions
  const startEditing = (invoiceId: number, field: string, value: string) => {
    setEditingInvoiceId(invoiceId);
    setEditingField(field);
    setEditingValue(value);
  };

  const saveEditing = async () => {
    if (editingInvoiceId === null || editingField === null) return;

    try {
      // Find the invoice to update
      const invoice = invoices.find(i => i.id === editingInvoiceId);
      if (!invoice) return;

      // Update the specific field
      const updatedInvoice = { ...invoice, [editingField]: editingValue };
      const result = await db.supplierInvoices.update(editingInvoiceId, updatedInvoice);
      
      if (result.success) {
        await loadInvoices();
        setEditingInvoiceId(null);
        setEditingField(null);
        setEditingValue("");
        toast({
          title: "Succès",
          description: "Facture mise à jour avec succès",
        });
      } else {
        toast({
          title: "Erreur",
          description: result.error || "Erreur lors de la mise à jour",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour",
        variant: "destructive",
      });
    }
  };

  const cancelEditing = () => {
    setEditingInvoiceId(null);
    setEditingField(null);
    setEditingValue("");
  };

  const addInvoiceItem = () => {
    if (!selectedProduct || itemQuantity <= 0 || itemUnitPrice <= 0) return;

    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    // Calculate discounted price
    const discountAmount = (itemUnitPrice * itemQuantity * itemDiscount) / 100;
    const totalPrice = (itemUnitPrice * itemQuantity) - discountAmount;

    const newItem = {
      id: Date.now(), // Temporary ID for new items
      productId: selectedProduct,
      productName: product.name,
      quantity: itemQuantity,
      unitPrice: itemUnitPrice,
      discount: itemDiscount, // Use the discount value
      totalPrice: parseFloat(totalPrice.toFixed(3)),
    };

    setInvoiceItems([...invoiceItems, newItem]);
    setSelectedProduct(null);
    setItemQuantity(1);
    setItemUnitPrice(0);
    setItemDiscount(0); // Reset discount to 0
    setItemErrors({}); // Clear item errors when adding new item
  };

  const removeInvoiceItem = (id: number) => {
    setInvoiceItems(invoiceItems.filter(item => item.id !== id));
  };

  // Sorting functions
  const requestSort = (key: keyof SupplierInvoice) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentInvoices = filteredInvoices.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Calculate statistics
  const totalAmount = filteredInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const paidAmount = 0; // Status functionality removed
  const pendingAmount = 0; // Status functionality removed
  const overdueAmount = 0; // Status functionality removed

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "DNT",
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }).format(amount);
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Gestion des factures fournisseurs</h1>
          <p className="text-muted-foreground">
            Consultez et gérez toutes vos factures fournisseurs ({invoices.length} facture{invoices.length > 1 ? "s" : ""})
          </p>
        </div>
        <Button onClick={openCreateDialog} className="w-fit">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle facture
        </Button>
      </div>

      {/* Dialog for creating/editing invoices */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {currentInvoice ? "Modifier la facture" : "Nouvelle facture"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <EntitySelect
                  label="Fournisseur *"
                  id="supplierId"
                  value={formData.supplierId.toString()}
                  onChange={(value) => setFormData({ ...formData, supplierId: Number(value) })}
                  options={suppliers}
                  getOptionLabel={(supplier) => `${supplier.name} ${supplier.company ? `(${supplier.company})` : ''}`}
                  getOptionValue={(supplier) => supplier.id.toString()}
                  required
                  error={errors.supplierId}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">Numéro de facture *</Label>
                <Input
                  id="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  className={errors.invoiceNumber ? "border-red-500" : ""}
                  required
                />
                {errors.invoiceNumber && (
                  <p className="text-sm text-red-500">{errors.invoiceNumber}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orderId">Commande associée</Label>
                <Select
                  value={formData.orderId.toString()}
                  onValueChange={(value) => setFormData({ ...formData, orderId: Number(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une commande (optionnel)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Aucune</SelectItem>
                    {orders.map((order) => (
                      <SelectItem key={order.id} value={order.id.toString()}>
Commande #{order.id} - {order.supplierName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="issueDate">Date d'émission *</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                  className={errors.issueDate ? "border-red-500" : ""}
                  required
                />
                {errors.issueDate && (
                  <p className="text-sm text-red-500">{errors.issueDate}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dueDate">Date d'échéance</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentDate">Date de paiement</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                />
              </div>
            </div>

            {/* Status functionality removed */}

            <div className="space-y-2">
              <Label>Articles</Label>
              {/* Only show product selection when no order is selected */}
              {!formData.orderId || formData.orderId === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                  <div className="md:col-span-5">
                    <Label>Produit</Label>
                    <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={productSearchOpen}
                          className="w-full justify-between"
                        >
                          {selectedProduct
                            ? products.find((product) => product.id === selectedProduct)?.name
                            : "Sélectionner un produit..."}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Rechercher un produit..." />
                          <CommandList>
                            <CommandEmpty>Aucun produit trouvé.</CommandEmpty>
                            <CommandGroup>
                              {products.map((product) => (
                                <CommandItem
                                  key={product.id}
                                  value={product.name}
                                  onSelect={() => {
                                    setSelectedProduct(product.id);
                                    setItemUnitPrice(product.purchasePriceHT || 0);
                                    setProductSearchOpen(false);
                                  }}
                                >
                                  <div className="flex flex-col flex-1">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">
                                        {product.name}
                                      </span>
                                    </div>
                                    <span className="text-sm text-muted-foreground">
                                      Achat: {product.purchasePriceHT ? product.purchasePriceHT.toFixed(3) : 'N/A'} DNT • Stock: {product.stock}
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
                  <div className="md:col-span-2">
                    <Label htmlFor="itemQuantity">Quantité</Label>
                    <Input
                      id="itemQuantity"
                      type="number"
                      min="1"
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(Number(e.target.value) || 1)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="itemUnitPrice">Prix unitaire</Label>
                    <Input
                      id="itemUnitPrice"
                      type="number"
                      step="0.001"
                      min="0"
                      value={itemUnitPrice}
                      onChange={(e) => setItemUnitPrice(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Label htmlFor="itemDiscount">Remise %</Label>
                    <Input
                      id="itemDiscount"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={itemDiscount}
                      onChange={(e) => setItemDiscount(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Total</Label>
                    <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
                      {((itemQuantity * itemUnitPrice) - ((itemQuantity * itemUnitPrice * itemDiscount) / 100)).toFixed(3)} DNT
                    </div>
                  </div>
                  <div className="md:col-span-1">
                    <Button
                      type="button"
                      onClick={addInvoiceItem}
                      className="w-full"
                      disabled={!selectedProduct || itemQuantity <= 0 || itemUnitPrice <= 0}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                // When an order is selected, show a message
                <div className="text-sm text-muted-foreground p-2 bg-muted rounded-md">
                  Les articles sont automatiquement remplis à partir de la commande sélectionnée.
                  Pour modifier les articles, veuillez sélectionner "Aucune" commande.
                </div>
              )}
            </div>

            {/* Invoice Items Table */}
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead className="w-20">Quantité</TableHead>
                    <TableHead className="w-24">Prix unit.</TableHead>
                    <TableHead className="w-20">Remise %</TableHead>
                    <TableHead className="w-24">Total</TableHead>
                    {/* Only show delete button when no order is selected */}
                    {(!formData.orderId || formData.orderId === 0) && (
                      <TableHead className="w-16"></TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoiceItems.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.unitPrice.toFixed(3)} DNT</TableCell>
                      <TableCell>{item.discount.toFixed(2)}%</TableCell>
                      <TableCell>{item.totalPrice.toFixed(3)} DNT</TableCell>
                      {/* Only show delete button when no order is selected */}
                      {(!formData.orderId || formData.orderId === 0) && (
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeInvoiceItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Totals Section */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Sous-total:</span>
                <span>{invoiceItems.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(3)} DNT</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>TVA (par article):</span>
                <span>{(invoiceItems.reduce((sum, item) => {
                  // Get product TVA rate (this would need to be fetched from product data)
                  // For now, using a default rate until we implement product TVA fetching
                  const itemTvaRate = 19; // Default rate
                  return sum + (item.totalPrice * itemTvaRate / 100);
                }, 0)).toFixed(3)} DNT</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between font-semibold">
                  <span>Total TTC:</span>
                  <span>{(invoiceItems.reduce((sum, item) => sum + item.totalPrice, 0) + invoiceItems.reduce((sum, item) => {
                    // Get product TVA rate (this would need to be fetched from product data)
                    // For now, using a default rate until we implement product TVA fetching
                    const itemTvaRate = 19; // Default rate
                    return sum + (item.totalPrice * itemTvaRate / 100);
                  }, 0)).toFixed(3)} DNT</span>
                </div>
              </div>
            </div>
                          
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit">
                {currentInvoice ? "Mettre à jour" : "Créer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Total facturé</p>
              <p className="text-2xl font-bold text-blue-900">{formatCurrency(totalAmount)}</p>
              <div className="flex items-center text-xs text-blue-600 mt-1">
                <ArrowUpDown className="h-3 w-3 mr-1" />
                +12% ce mois
              </div>
            </div>
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="border rounded-lg p-4 bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Montant payé</p>
              <p className="text-2xl font-bold text-green-900">{formatCurrency(paidAmount)}</p>
              <div className="flex items-center text-xs text-green-600 mt-1">
                <CheckCircle className="h-3 w-3 mr-1" />
                {((paidAmount / totalAmount) * 100 || 0).toFixed(1)}% du total
              </div>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="border rounded-lg p-4 bg-orange-50 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">En attente</p>
              <p className="text-2xl font-bold text-orange-900">{formatCurrency(pendingAmount)}</p>
              <div className="flex items-center text-xs text-orange-600 mt-1">
                <Clock className="h-3 w-3 mr-1" />
                0 facture(s)
              </div>
            </div>
            <Clock className="h-8 w-8 text-orange-600" />
          </div>
        </div>

        <div className="border rounded-lg p-4 bg-red-50 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-medium">En retard</p>
              <p className="text-2xl font-bold text-red-900">{formatCurrency(overdueAmount)}</p>
              <div className="flex items-center text-xs text-red-600 mt-1">
                <ArrowUpDown className="h-3 w-3 mr-1" />
                0 facture(s)
              </div>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Rechercher des factures..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Responsive table container */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer" onClick={() => requestSort('invoiceNumber')}>
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span>Numéro</span>
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => requestSort('supplierName')}>
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span>Fournisseur</span>
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => requestSort('issueDate')}>
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span>Date</span>
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => requestSort('totalAmount')}>
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span>Montant</span>
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span>Actions</span>
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : currentInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Aucune facture trouvée
                </TableCell>
              </TableRow>
            ) : (
              currentInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    {editingInvoiceId === invoice.id && editingField === 'invoiceNumber' ? (
                      <Input
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={saveEditing}
                        onKeyDown={(e) => e.key === 'Enter' && saveEditing()}
                        autoFocus
                      />
                    ) : (
                      <div 
                        onClick={() => startEditing(invoice.id, 'invoiceNumber', invoice.invoiceNumber)}
                        className="cursor-pointer hover:underline"
                      >
                        {invoice.invoiceNumber}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {invoice.supplierName} {invoice.supplierCompany && `(${invoice.supplierCompany})`}
                  </TableCell>
                  <TableCell>
                    {editingInvoiceId === invoice.id && editingField === 'issueDate' ? (
                      <Input
                        type="date"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={saveEditing}
                        onKeyDown={(e) => e.key === 'Enter' && saveEditing()}
                        autoFocus
                      />
                    ) : (
                      <div 
                        onClick={() => startEditing(invoice.id, 'issueDate', invoice.issueDate.split('T')[0])}
                        className="cursor-pointer hover:underline"
                      >
                        {format(new Date(invoice.issueDate), "dd/MM/yyyy", { locale: fr })}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {invoice.totalAmount.toFixed(3)} DNT
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(invoice)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewInvoice(invoice)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadPDF(invoice)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDeleteDialog(invoice)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))

            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Affichage de {indexOfFirstItem + 1} à {Math.min(indexOfLastItem, filteredInvoices.length)} sur {filteredInvoices.length} factures
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium">
              Page {currentPage} sur {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer la facture "{invoiceToDelete?.invoiceNumber}" ? 
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => invoiceToDelete && handleDelete(invoiceToDelete.id)}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {selectedInvoice && (
        <SupplierInvoicePreview
          invoice={selectedInvoice}
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          onPrint={(invoice) => {
            // Handle print functionality if needed
            setIsPreviewOpen(false);
          }}
          companySettings={companySettings}
        />
      )}
    </div>
  );
}