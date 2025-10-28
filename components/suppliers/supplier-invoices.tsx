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
import { supplierInvoiceSchema, SupplierInvoiceFormData } from "@/lib/validation/schemas";
import { z } from "zod";
import { StatusDropdown } from "@/components/common/StatusDropdown";
import { EntitySelect } from "@/components/common/EntitySelect";
import SupplierInvoiceGenerator from "./SupplierInvoiceGenerator";

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

  const openCreateDialog = () => {
    setCurrentInvoice(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (invoice: SupplierInvoice) => {
    setCurrentInvoice(invoice);
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (invoice: SupplierInvoice) => {
    setInvoiceToDelete(invoice);
    setIsDeleteDialogOpen(true);
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

      {/* Dialog for creating/editing invoices - replaced with SupplierInvoiceGenerator */}
      <SupplierInvoiceGenerator
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onInvoiceGenerated={loadInvoices}
        invoiceToEdit={currentInvoice}
      />

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