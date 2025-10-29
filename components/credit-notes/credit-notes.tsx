"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  Download,
  Eye,
  Plus,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Calendar,
  DollarSign,
  MoreVertical,
} from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { useDataTable } from "@/hooks/use-data-table";
import { db } from "@/lib/database";
import type { CreditNote, Invoice } from "@/types/types";
import { PDFViewer, pdf } from "@react-pdf/renderer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { ActionsDropdown } from "@/components/common/actions-dropdown";

export default function CreditNotes() {
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedCreditNote, setSelectedCreditNote] = useState<CreditNote | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const { toast } = useToast();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Form state for creating credit notes
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [reason, setReason] = useState("");
  const [creating, setCreating] = useState(false);
  
  // State for tracking selected items and their credit quantities
  const [creditItems, setCreditItems] = useState<Record<number, { 
    selected: boolean; 
    creditQuantity: number;
    creditDiscount?: number;
  }>>({});

  // DataTable logic
  const filteredCreditNotesByDate = creditNotes.filter((creditNote) => {
    if (dateFilter === "all") return true;
    const creditNoteDate = new Date(creditNote.issueDate);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - creditNoteDate.getTime()) / (1000 * 60 * 60 * 24));

    switch (dateFilter) {
      case "today":
        return daysDiff === 0;
      case "week":
        return daysDiff <= 7;
      case "month":
        return daysDiff <= 30;
      case "quarter":
        return daysDiff <= 90;
      default:
        return true;
    }
  });

  const {
    data: filteredCreditNotes,
    handleSort,
    handleFilter,
    clearFilters,
    sortConfig,
    filters,
  } = useDataTable(filteredCreditNotesByDate, { key: "issueDate", direction: "desc" });

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCreditNotes = filteredCreditNotes.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCreditNotes.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const columns = [
    {
      key: "number" as keyof CreditNote,
      label: "N° Avoir",
      sortable: true,
      filterable: true,
      render: (value: string) => (
        <div className="flex items-center gap-1">
          <FileText className="h-4 w-4" />
          <span className="font-mono font-medium text-primary">{value}</span>
        </div>
      ),
    },
    {
      key: "originalInvoiceId" as keyof CreditNote,
      label: "Facture d'origine",
      sortable: true,
      render: (value: number, creditNote: CreditNote) => (
        <span className="font-mono font-medium">FAC-{value}</span>
      ),
    },
    {
      key: "clientName" as keyof CreditNote,
      label: "Client",
      sortable: true,
      filterable: true,
      render: (value: string, creditNote: CreditNote) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-muted-foreground">{creditNote.clientCompany}</div>
        </div>
      ),
    },
    {
      key: "totalAmount" as keyof CreditNote,
      label: "Montant TTC",
      sortable: true,
      render: (value: number) => <span className="font-medium">{formatCurrency(value)}</span>,
    },
    {
      key: "issueDate" as keyof CreditNote,
      label: "Date d'émission",
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString("fr-FR"),
    },
    {
      key: "status" as keyof CreditNote,
      label: "Statut",
      sortable: true,
      render: (value: string) => {
        // Default to "En attente" if status is not defined
        const status = value || "En attente";
        let statusText = "En attente";
        let statusColor = "bg-yellow-100 text-yellow-800";
        
        if (status === "Confirmée") {
          statusText = "Confirmée";
          statusColor = "bg-green-100 text-green-800";
        } else if (status === "Annulée") {
          statusText = "Annulée";
          statusColor = "bg-red-100 text-red-800";
        }
        
        return (
          <Badge className={`${statusColor} whitespace-nowrap`}>
            {statusText}
          </Badge>
        );
      },
    },
  ];

  useEffect(() => {
    loadData();
    loadCompanySettings();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [creditNotesResult, invoicesResult] = await Promise.all([
        db.creditNotes.getAll(),
        db.invoices.getAll()
      ]);

      if (creditNotesResult.success) {
        setCreditNotes(creditNotesResult.data || []);
      } else {
        setError(creditNotesResult.error || "Erreur lors du chargement des factures d'avoir");
      }

      if (invoicesResult.success) {
        setInvoices(invoicesResult.data || []);
      }
    } catch (error) {
      setError("Erreur inattendue lors du chargement");
    } finally {
      setLoading(false);
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

  const handleViewCreditNote = async (creditNote: CreditNote) => {
    // If the credit note doesn't have items, fetch them
    if (!creditNote.items || !Array.isArray(creditNote.items)) {
      try {
        const itemsResult = await db.creditNotes.getItems(creditNote.id);
        if (itemsResult.success) {
          const updatedCreditNote = {
            ...creditNote,
            items: itemsResult.data || []
          };
          setSelectedCreditNote(updatedCreditNote);
        } else {
          // If fetching items fails, still show the credit note without items
          setSelectedCreditNote(creditNote);
        }
      } catch (error) {
        console.error("Error fetching credit note items:", error);
        // Still show the credit note without items
        setSelectedCreditNote(creditNote);
      }
    } else {
      setSelectedCreditNote(creditNote);
    }
    setIsPreviewOpen(true);
  };

  const handleDownloadCreditNote = async (creditNote: CreditNote) => {
    // For now, we'll just show a toast since we don't have a PDF implementation yet
    toast({
      title: "Téléchargement",
      description: "La fonction de téléchargement sera implémentée dans une prochaine version.",
    });
  };

  const handleUpdateCreditNoteStatus = async (creditNoteId: number, newStatus: string) => {
    try {
      const result = await db.creditNotes.updateStatus(creditNoteId, newStatus);
      if (result.success) {
        // Update the local state
        setCreditNotes(prevCreditNotes => 
          prevCreditNotes.map(cn => 
            cn.id === creditNoteId ? { ...cn, status: newStatus } : cn
          )
        );
        
        // If we're viewing this credit note, update that too
        if (selectedCreditNote && selectedCreditNote.id === creditNoteId) {
          setSelectedCreditNote({ ...selectedCreditNote, status: newStatus });
        }
        
        toast({
          title: "Succès",
          description: `Statut de la facture d'avoir mis à jour avec succès et stock mis à jour.`,
        });
        
        // Reload data to ensure consistency
        await loadData();
      } else {
        throw new Error(result.error || "Erreur lors de la mise à jour du statut");
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de la mise à jour du statut",
        variant: "destructive",
      });
    }
  };

  const handleInvoiceSelect = async (invoiceId: number | null) => {
    setSelectedInvoiceId(invoiceId);
    
    if (invoiceId) {
      // Find the selected invoice
      const invoice = invoices.find(inv => inv.id === invoiceId) || null;
      setSelectedInvoice(invoice);
      
      // Initialize credit items state
      if (invoice && invoice.items) {
        const initialCreditItems: Record<number, { 
          selected: boolean; 
          creditQuantity: number;
          creditDiscount?: number;
        }> = {};
        
        invoice.items.forEach(item => {
          initialCreditItems[item.id] = {
            selected: true, // By default, select all items
            creditQuantity: item.quantity, // By default, credit full quantity
            creditDiscount: item.discount || 0 // Keep original discount
          };
        });
        
        setCreditItems(initialCreditItems);
      }
    } else {
      setSelectedInvoice(null);
      setCreditItems({});
    }
  };

  const handleCreateCreditNote = async () => {
    if (!selectedInvoiceId || !reason) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une facture et indiquer le motif de l'avoir.",
        variant: "destructive",
      });
      return;
    }

    // Check if at least one item is selected
    const hasSelectedItems = Object.values(creditItems).some(item => item.selected);
    if (!hasSelectedItems) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner au moins un article à créditer.",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      // Prepare credit note items based on selected items
      const creditNoteItems = selectedInvoice?.items
        .filter(item => creditItems[item.id]?.selected)
        .map(item => {
          const creditItem = creditItems[item.id];
          const creditQuantity = creditItem?.creditQuantity || 0;
          const creditDiscount = creditItem?.creditDiscount || item.discount || 0;
          
          // Calculate total price based on credited quantity
          const totalPrice = creditQuantity * item.unitPrice * (1 - creditDiscount / 100);
          
          return {
            productId: item.productId,
            productName: item.productName,
            quantity: creditQuantity,
            unitPrice: item.unitPrice,
            discount: creditDiscount,
            totalPrice: totalPrice
          };
        }) || [];

      // Calculate totals
      const amount = creditNoteItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      const totalAmount = creditNoteItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const taxAmount = totalAmount - amount; // Simplified tax calculation

      // Generate a unique credit note number
      // We need to get the last credit note number from the database
      // For now, we'll generate a temporary number - in a real implementation,
      // this would be done on the backend
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const timestamp = String(now.getTime()).slice(-4); // Last 4 digits of timestamp
      const creditNoteNumber = `AV-${year}${month}${day}-${timestamp}`;

      const creditNoteData = {
        originalInvoiceId: selectedInvoiceId,
        clientId: selectedInvoice?.clientId || 0,
        amount: amount,
        taxAmount: taxAmount,
        totalAmount: totalAmount,
        reason: reason,
        status: "Confirmée", // Set status to confirmed immediately to track stock movements
        dueDate: new Date().toISOString(),
        items: creditNoteItems
      };

      const result = await db.creditNotes.create(creditNoteData);
      if (result.success) {
        await loadData(); // Refresh the list
        setIsCreating(false);
        setSelectedInvoiceId(null);
        setSelectedInvoice(null);
        setCreditItems({});
        setReason("");
        toast({
          title: "Succès",
          description: "Facture d'avoir créée avec succès et stock mis à jour.",
        });
      } else {
        throw new Error(result.error || "Erreur lors de la création de la facture d'avoir");
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de la création de la facture d'avoir",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  // Calculate statistics
  const totalAmount = filteredCreditNotes.reduce((sum, creditNote) => sum + creditNote.totalAmount, 0);
  const confirmedAmount = 0;
  const pendingAmount = 0;

  const renderActions = (creditNote: CreditNote) => (
    <ActionsDropdown
      actions={[
        {
          label: "Voir",
          icon: <Eye className="h-4 w-4" />,
          onClick: () => handleViewCreditNote(creditNote),
        },
        {
          label: "Télécharger PDF",
          icon: <Download className="h-4 w-4" />,
          onClick: () => handleDownloadCreditNote(creditNote),
        },
        ...(creditNote.status !== "Confirmée" ? [
          {
            label: "Confirmer",
            icon: <CheckCircle className="h-4 w-4" />,
            onClick: () => handleUpdateCreditNoteStatus(creditNote.id, "Confirmée"),
          }
        ] : []),
        ...(creditNote.status !== "Annulée" && creditNote.status !== "Confirmée" ? [
          {
            label: "Annuler",
            icon: <XCircle className="h-4 w-4" />,
            onClick: () => handleUpdateCreditNoteStatus(creditNote.id, "Annulée"),
          }
        ] : []),
      ]}
    />
  );

  if (loading) {
    return (
      <div className="p-6 flex flex-col gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Gestion des factures d'avoir</h1>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Gestion des factures d'avoir</h1>
          <p className="text-muted-foreground">
            Consultez et gérez toutes vos factures d'avoir ({creditNotes.length} facture{creditNotes.length > 1 ? "s" : ""})
          </p>
        </div>

        <Button onClick={() => setIsCreating(true)} className="w-fit">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle facture d'avoir
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total des avoirs</p>
                <p className="text-2xl font-bold text-blue-900">{formatCurrency(totalAmount)}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Montant confirmé</p>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(confirmedAmount)}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">En attente</p>
                <p className="text-2xl font-bold text-orange-900">{formatCurrency(pendingAmount)}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="dateFilter">Filtrer par période</Label>
              <select
                id="dateFilter"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Toutes les périodes</option>
                <option value="today">Aujourd'hui</option>
                <option value="week">Cette semaine</option>
                <option value="month">Ce mois</option>
                <option value="quarter">Ce trimestre</option>
              </select>
            </div>

            {dateFilter !== "all" && (
              <Button
                variant="outline"
                onClick={() => {
                  setDateFilter("all");
                  clearFilters();
                }}
              >
                Réinitialiser
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Credit Notes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Liste des factures d'avoir ({filteredCreditNotes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={currentCreditNotes}
            columns={columns}
            sortConfig={sortConfig}
            searchTerm={searchTerm}
            filters={filters}
            onSort={handleSort}
            onSearch={setSearchTerm}
            onFilter={handleFilter}
            onClearFilters={clearFilters}
            loading={loading}
            emptyMessage="Aucune facture d'avoir trouvée"
            actions={renderActions}
          />
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Affichage de {indexOfFirstItem + 1} à {Math.min(indexOfLastItem, filteredCreditNotes.length)} sur {filteredCreditNotes.length} factures d'avoir
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => paginate(currentPage - 1)}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => paginate(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => paginate(currentPage + 1)}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Credit Note Modal */}
      <Dialog open={isCreating} onOpenChange={(open) => {
        setIsCreating(open);
        if (!open) {
          setSelectedInvoiceId(null);
          setSelectedInvoice(null);
          setCreditItems({});
          setReason("");
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Créer une facture d'avoir
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto py-4 space-y-4">
            <div>
              <Label htmlFor="invoice">Facture d'origine *</Label>
              <select
                id="invoice"
                value={selectedInvoiceId || ""}
                onChange={(e) => handleInvoiceSelect(Number(e.target.value) || null)}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={creating}
              >
                <option value="">Sélectionnez une facture</option>
                {invoices.map((invoice) => (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.number} - {invoice.clientName} ({formatCurrency(invoice.totalAmount)})
                    </option>
                  ))}
              </select>
            </div>

            {selectedInvoice && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Articles de la facture</h3>
                  <div className="border rounded">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-2 w-10">
                            <input
                              type="checkbox"
                              checked={Object.values(creditItems).every(item => item.selected)}
                              onChange={(e) => {
                                const newCreditItems = {...creditItems};
                                Object.keys(newCreditItems).forEach(key => {
                                  newCreditItems[Number(key)].selected = e.target.checked;
                                });
                                setCreditItems(newCreditItems);
                              }}
                              className="h-4 w-4"
                            />
                          </th>
                          <th className="text-left p-2">Produit</th>
                          <th className="text-right p-2">Quantité facturée</th>
                          <th className="text-right p-2">Quantité à créditer</th>
                          <th className="text-right p-2">Prix unitaire</th>
                          <th className="text-right p-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInvoice.items.map((item) => {
                          const creditItem = creditItems[item.id] || { selected: false, creditQuantity: 0 };
                          return (
                            <tr key={item.id} className="border-t">
                              <td className="p-2">
                                <input
                                  type="checkbox"
                                  checked={creditItem.selected}
                                  onChange={(e) => {
                                    setCreditItems({
                                      ...creditItems,
                                      [item.id]: {
                                        ...creditItem,
                                        selected: e.target.checked
                                      }
                                    });
                                  }}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="p-2">{item.productName}</td>
                              <td className="p-2 text-right">{item.quantity}</td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max={item.quantity}
                                  value={creditItem.creditQuantity}
                                  onChange={(e) => {
                                    const newQuantity = Math.min(Math.max(0, Number(e.target.value)), item.quantity);
                                    setCreditItems({
                                      ...creditItems,
                                      [item.id]: {
                                        ...creditItem,
                                        creditQuantity: newQuantity
                                      }
                                    });
                                  }}
                                  className="w-20 text-right"
                                  disabled={!creditItem.selected}
                                />
                              </td>
                              <td className="p-2 text-right">{formatCurrency(item.unitPrice)}</td>
                              <td className="p-2 text-right">
                                {formatCurrency(creditItem.selected ? (creditItem.creditQuantity * item.unitPrice) : 0)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="reason">Motif de l'avoir *</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Indiquez le motif de cette facture d'avoir..."
                rows={4}
                disabled={creating}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreating(false);
                setSelectedInvoiceId(null);
                setSelectedInvoice(null);
                setCreditItems({});
                setReason("");
              }}
              disabled={creating}
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreateCreditNote}
              disabled={creating || !selectedInvoiceId || !reason || !Object.values(creditItems).some(item => item.selected)}
            >
              {creating ? "Création en cours..." : "Créer l'avoir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit Note Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Aperçu de la facture d'avoir
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto border rounded bg-white p-4">
            {selectedCreditNote && (
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold">Facture d'avoir #{selectedCreditNote.number}</h2>
                    <p className="text-muted-foreground">Date d'émission: {new Date(selectedCreditNote.issueDate).toLocaleDateString("fr-FR")}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-2">Client</h3>
                    <p>{selectedCreditNote.clientName}</p>
                    {selectedCreditNote.clientCompany && <p>{selectedCreditNote.clientCompany}</p>}
                    {selectedCreditNote.clientAddress && <p>{selectedCreditNote.clientAddress}</p>}
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Facture d'origine</h3>
                    <p>#{selectedCreditNote.originalInvoiceId}</p>
                    <p className="mt-2">
                      <span className="font-semibold">Motif:</span> {selectedCreditNote.reason}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Articles</h3>
                  <div className="border rounded">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-2">Produit</th>
                          <th className="text-right p-2">Quantité</th>
                          <th className="text-right p-2">Prix unitaire</th>
                          <th className="text-right p-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedCreditNote.items.map((item) => (
                          <tr key={item.id} className="border-t">
                            <td className="p-2">{item.productName}</td>
                            <td className="p-2 text-right">{item.quantity}</td>
                            <td className="p-2 text-right">{formatCurrency(item.unitPrice)}</td>
                            <td className="p-2 text-right">{formatCurrency(item.totalPrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="w-64">
                    <div className="flex justify-between py-1">
                      <span>Sous-total:</span>
                      <span>{formatCurrency(selectedCreditNote.amount)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>TVA:</span>
                      <span>{formatCurrency(selectedCreditNote.taxAmount)}</span>
                    </div>
                    <div className="flex justify-between py-1 font-bold border-t">
                      <span>Total:</span>
                      <span>{formatCurrency(selectedCreditNote.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}