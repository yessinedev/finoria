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
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  FileText, 
  Eye, 
  Download, 
  AlertTriangle,
  ArrowUpDown,
} from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
import { SupplierInvoicePDFDocument } from "./supplier-invoice-pdf";
import { ActionsDropdown } from "@/components/common/actions-dropdown";
import { StatusDropdown } from "@/components/common/StatusDropdown";
import SupplierInvoicePreview from "./supplier-invoice-preview";
import SupplierInvoiceGenerator from "./SupplierInvoiceGenerator";
import PaymentDialog from "@/components/payments/PaymentDialog";

import { supplierInvoiceSchema } from "@/lib/validation/schemas";
import { z } from "zod";
import { EntitySelect } from "@/components/common/EntitySelect";

export default function SupplierInvoices() {
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<SupplierInvoice[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
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
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<SupplierInvoice | null>(null);
  
  
  // Inline editing state
  const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  const { toast } = useToast();

  // Form state for edit dialog only
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

  // Validation errors state for edit dialog only
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadInvoices();
    loadSuppliers();
    loadOrders();
    loadProducts();
    loadCompanySettings();

    // Subscribe to real-time updates
    const unsubscribe = db.subscribe((table, action, data) => {
      if (["supplier_invoices", "supplier_payments"].includes(table)) {
        loadInvoices();
      }
    });

    return unsubscribe;
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

  const loadInvoices = async () => {
    try {
      setIsLoading(true);
      // Check and update supplier invoice statuses based on due dates
      await window.electronAPI?.checkSupplierInvoiceDueDates?.();
      
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

  const handleStatusChange = async (invoiceId: number, newStatus: string) => {
    try {
      const result = await db.supplierInvoices.updateStatus(invoiceId, newStatus);
      if (result.success) {
        toast({
          title: "Succès",
          description: "Statut mis à jour avec succès",
        });
        loadInvoices();
      } else {
        toast({
          title: "Erreur",
          description: result.error || "Erreur lors de la mise à jour du statut",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour du statut",
        variant: "destructive",
      });
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
      if (response.success && response.data) {
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
      
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        
        error.errors.forEach((err) => {
          if (err.path.length > 0) {
            newErrors[err.path[0]] = err.message;
          }
        });
        
        setErrors(newErrors);
        return false;
      }
      return false;
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
      const invoiceData = {
        ...formData,
        supplierId: Number(formData.supplierId),
        orderId: formData.orderId ? Number(formData.orderId) : null,
        amount: Number(formData.amount.toFixed(3)),
        taxAmount: Number(formData.taxAmount.toFixed(3)),
        totalAmount: Number(formData.totalAmount.toFixed(3)),
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
    setCurrentInvoice(null);
    setErrors({});
  };

  const openCreateDialog = () => {
    setIsGeneratorOpen(true);
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
    setCurrentInvoice(invoice);
    setErrors({});
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
    }
  };

  const handleViewInvoice = (invoice: SupplierInvoice) => {
    setSelectedInvoice(invoice);
    setIsPreviewOpen(true);
  };

  const handleRecordPayment = (invoice: SupplierInvoice) => {
    setSelectedInvoiceForPayment(invoice);
    setIsPaymentDialogOpen(true);
  };

  const handleDownloadPDF = async (invoice: SupplierInvoice) => {
    try {
      const blob = await pdf(<SupplierInvoicePDFDocument invoice={invoice} companySettings={companySettings} products={products} />).toBlob();
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

      {/* Supplier Invoice Generator Dialog */}
      <SupplierInvoiceGenerator
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        onInvoiceGenerated={loadInvoices}
      />

      {/* Dialog for editing invoices (keeping the existing edit dialog) */}
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

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Sous-total:</span>
                <span>{formData.amount.toFixed(3)} DNT</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>TVA:</span>
                <span>{formData.taxAmount.toFixed(3)} DNT</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between font-semibold">
                  <span>Total TTC:</span>
                  <span>{formData.totalAmount.toFixed(3)} DNT</span>
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
                  <span>Date d'émission</span>
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => requestSort('dueDate')}>
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span>Date d'échéance</span>
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
              <TableHead className="cursor-pointer" onClick={() => requestSort('status')}>
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span>Statut</span>
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
                <TableCell colSpan={7} className="text-center">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : currentInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
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
                    {editingInvoiceId === invoice.id && editingField === 'dueDate' ? (
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
                        onClick={() => startEditing(invoice.id, 'dueDate', invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '')}
                        className="cursor-pointer hover:underline"
                      >
                        {invoice.dueDate ? (
                          (() => {
                            const dueDate = new Date(invoice.dueDate);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            dueDate.setHours(0, 0, 0, 0);
                            const isOverdue = dueDate < today && invoice.status !== "Payée" && invoice.status !== "Annulée";
                            return (
                              <div className="flex items-center gap-2">
                                <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                                  {format(dueDate, "dd/MM/yyyy", { locale: fr })}
                                </span>
                                {isOverdue && (
                                  <span className="text-xs text-red-600">(Échue)</span>
                                )}
                              </div>
                            );
                          })()
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {invoice.totalAmount.toFixed(3)} DNT
                  </TableCell>
                  <TableCell>
                    <StatusDropdown
                      currentValue={invoice.status}
                      options={[
                        { value: "En attente", label: "En attente", variant: "secondary" },
                        { value: "Partiellement payée", label: "Partiellement payée", variant: "default" },
                        { value: "Payée", label: "Payée", variant: "default" },
                        { value: "En retard", label: "En retard", variant: "destructive" },
                        { value: "Annulée", label: "Annulée", variant: "outline" },
                      ]}
                      onStatusChange={(newStatus) => handleStatusChange(invoice.id, newStatus)}
                    />
                  </TableCell>
                  <TableCell>
                    <ActionsDropdown
                      actions={[
                        {
                          label: "Régler",
                          icon: <FileText className="h-4 w-4" />,
                          onClick: () => handleRecordPayment(invoice),
                        },
                        {
                          label: "Modifier",
                          icon: <Edit className="h-4 w-4" />,
                          onClick: () => openEditDialog(invoice),
                        },
                        {
                          label: "Voir",
                          icon: <Eye className="h-4 w-4" />,
                          onClick: () => handleViewInvoice(invoice),
                        },
                        {
                          label: "Télécharger PDF",
                          icon: <Download className="h-4 w-4" />,
                          onClick: () => handleDownloadPDF(invoice),
                        },
                        {
                          label: "Supprimer",
                          icon: <Trash2 className="h-4 w-4" />,
                          onClick: () => openDeleteDialog(invoice),
                          className: "text-red-600",
                        },
                      ]}
                    />
                  </TableCell>
                </TableRow>
              ))

            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination - Always show if there are invoices */}
      {filteredInvoices.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Affichage de {indexOfFirstItem + 1} à {Math.min(indexOfLastItem, filteredInvoices.length)} sur {filteredInvoices.length} facture{filteredInvoices.length > 1 ? 's' : ''}
          </div>
          {totalPages > 1 ? (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => paginate(currentPage - 1)}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  // Show first page, last page, current page and 2 pages around current
                  let pageNumber;
                  if (totalPages <= 7) {
                    pageNumber = i + 1;
                  } else if (currentPage <= 4) {
                    pageNumber = i + 1;
                  } else if (currentPage >= totalPages - 3) {
                    pageNumber = totalPages - 6 + i;
                  } else {
                    pageNumber = currentPage - 3 + i;
                  }
                  
                  return (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        onClick={() => paginate(pageNumber)}
                        isActive={currentPage === pageNumber}
                        className="cursor-pointer"
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => paginate(currentPage + 1)}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          ) : (
            <div className="text-sm text-muted-foreground">
              Page 1 sur 1
            </div>
          )}
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
          products={products}
          onPrint={async (invoice) => {
            try {
              // Generate PDF and open print dialog
              const blob = await pdf(<SupplierInvoicePDFDocument invoice={invoice} companySettings={companySettings} products={products} />).toBlob();
              const url = URL.createObjectURL(blob);
              const printWindow = window.open(url);
              if (printWindow) {
                printWindow.addEventListener('load', () => {
                  printWindow.print();
                });
              }
              // Clean up after a delay
              setTimeout(() => {
                URL.revokeObjectURL(url);
              }, 1000);
            } catch (error) {
              console.error("Error printing PDF:", error);
              toast({
                title: "Erreur",
                description: "Erreur lors de l'impression du PDF",
                variant: "destructive",
              });
            }
          }}
          companySettings={companySettings}
        />
      )}

      {/* Payment Dialog */}
      <PaymentDialog
        isOpen={isPaymentDialogOpen}
        onClose={() => {
          setIsPaymentDialogOpen(false);
          setSelectedInvoiceForPayment(null);
        }}
        onSuccess={() => {
          loadInvoices();
          setIsPaymentDialogOpen(false);
          setSelectedInvoiceForPayment(null);
        }}
        payment={null}
        invoice={selectedInvoiceForPayment}
        type="supplier"
        suppliers={suppliers}
        supplierInvoices={invoices}
      />
    </div>
  );
}