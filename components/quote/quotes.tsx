"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FileText,
  Download,
  Eye,
  Plus,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Trash2,
  MoreVertical,
  Printer
} from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { useDataTable } from "@/hooks/use-data-table";
import { db } from "@/lib/database";
import type { Client, Product, LineItem } from "@/types/types";
import CreateQuoteModal from "./create-quote-modal";
import { PDFViewer, pdf } from "@react-pdf/renderer";
import { QuotePDFDocument } from "./quote-pdf";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StatusDropdown } from "@/components/common/StatusDropdown";
import { ActionsDropdown } from "@/components/common/actions-dropdown";

// TODO: Move to types.ts and backend
export type QuoteStatus = "Brouillon" | "Envoyé" | "Accepté" | "Refusé";
export interface Quote {
  id: number;
  number: string;
  clientId: number;
  clientName: string;
  clientCompany?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  issueDate: string;
  dueDate: string;
  status: QuoteStatus;
  items: LineItem[];
  notes?: string;
  paymentTerms?: string;
}

export default function Quotes() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewQuote, setPreviewQuote] = useState<Quote | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [isConverting, setIsConverting] = useState(false);
  const { toast } = useToast();

  // DataTable logic (reuse from invoices)
  const {
    data: filteredQuotes,
    searchTerm,
    setSearchTerm,
    handleSort,
    handleFilter,
    clearFilters,
    sortConfig,
    filters,
  } = useDataTable(quotes, { key: "issueDate", direction: "desc" });

  const columns = [
    {
      key: "number" as keyof Quote,
      label: "N° Devis",
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
      key: "clientName" as keyof Quote,
      label: "Client",
      sortable: true,
      filterable: true,
      render: (value: string, quote: Quote) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-muted-foreground">
            {quote.clientCompany}
          </div>
        </div>
      ),
    },
    {
      key: "totalAmount" as keyof Quote,
      label: "Montant TTC",
      sortable: true,
      render: (value: number) => (
        <span className="font-medium">{formatCurrency(value)}</span>
      ),
    },
    {
      key: "issueDate" as keyof Quote,
      label: "Date d'émission",
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString("fr-FR"),
    },
    {
      key: "dueDate" as keyof Quote,
      label: "Validité",
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString("fr-FR"),
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
      // Load quotes from database
      const quotesResult = await db.quotes.getAll();
      if (quotesResult.success) {
        // Ensure each quote has an items array
        const quotesWithItems = (quotesResult.data || []).map(quote => ({
          ...quote,
          items: Array.isArray(quote.items) ? quote.items : []
        }));
        setQuotes(quotesWithItems);
      } else {
        setError(quotesResult.error || "Erreur lors du chargement des devis");
        toast({
          title: "Erreur",
          description: quotesResult.error || "Erreur lors du chargement des devis",
          variant: "destructive",
        });
      }
      
      // Load clients from database
      const clientsResult = await db.clients.getAll();
      if (clientsResult.success) {
        setClients(clientsResult.data || []);
      } else {
        toast({
          title: "Erreur",
          description: clientsResult.error || "Erreur lors du chargement des clients",
          variant: "destructive",
        });
      }
      
      // Load products from database
      const productsResult = await db.products.getAll();
      if (productsResult.success) {
        setProducts(productsResult.data || []);
      } else {
        toast({
          title: "Erreur",
          description: productsResult.error || "Erreur lors du chargement des produits",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Failed to load data:", err);
      setError("Erreur lors du chargement des données");
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement des données",
        variant: "destructive",
      });
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "DNT",
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }).format(amount);
  };

  const getStatusVariant = (status: QuoteStatus) => {
    switch (status) {
      case "Accepté":
        return "default";
      case "Envoyé":
        return "secondary";
      case "Refusé":
        return "destructive";
      case "Brouillon":
      default:
        return "outline";
    }
  };

  const getStatusIcon = (status: QuoteStatus) => {
    switch (status) {
      case "Accepté":
        return <CheckCircle className="h-3 w-3" />;
      case "Envoyé":
        return <Clock className="h-3 w-3" />;
      case "Refusé":
        return <XCircle className="h-3 w-3" />;
      case "Brouillon":
      default:
        return null;
    }
  };

  const handleViewQuote = async (quote: Quote) => {
    // If the quote doesn't have items, fetch them
    if (!quote.items || !Array.isArray(quote.items)) {
      try {
        const itemsResult = await db.quotes.getItems(quote.id);
        if (itemsResult.success) {
          const updatedQuote = {
            ...quote,
            items: itemsResult.data || []
          };
          setPreviewQuote(updatedQuote);
        } else {
          // If fetching items fails, still show the quote without items
          setPreviewQuote(quote);
        }
      } catch (error) {
        console.error("Error fetching quote items:", error);
        // Still show the quote without items
        setPreviewQuote(quote);
      }
    } else {
      setPreviewQuote(quote);
    }
    setIsPreviewOpen(true);
  };

  const handleDownloadQuote = async (quote: Quote) => {
    // If the quote doesn't have items, fetch them
    let quoteWithItems = quote;
    if (!quote.items || !Array.isArray(quote.items)) {
      try {
        const itemsResult = await db.quotes.getItems(quote.id);
        if (itemsResult.success) {
          quoteWithItems = {
            ...quote,
            items: itemsResult.data || []
          };
        }
      } catch (error) {
        console.error("Error fetching quote items:", error);
      }
    }
    
    // Make sure company settings are loaded
    let currentCompanySettings = companySettings;
    if (!currentCompanySettings) {
      const settingsResult = await db.settings.get();
      if (settingsResult.success && settingsResult.data) {
        currentCompanySettings = settingsResult.data;
        setCompanySettings(settingsResult.data);
      }
    }
    
    const blob = await pdf(<QuotePDFDocument quote={quoteWithItems} companySettings={currentCompanySettings} products={products} />).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `devis-${quote.number}.pdf`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const handlePrintQuote = async (quote: Quote) => {
    // If the quote doesn't have items, fetch them
    let quoteWithItems = quote;
    if (!quote.items || !Array.isArray(quote.items)) {
      try {
        const itemsResult = await db.quotes.getItems(quote.id);
        if (itemsResult.success) {
          quoteWithItems = {
            ...quote,
            items: itemsResult.data || []
          };
        }
      } catch (error) {
        console.error("Error fetching quote items:", error);
      }
    }
    
    // Make sure company settings are loaded
    let currentCompanySettings = companySettings;
    if (!currentCompanySettings) {
      const settingsResult = await db.settings.get();
      if (settingsResult.success && settingsResult.data) {
        currentCompanySettings = settingsResult.data;
        setCompanySettings(settingsResult.data);
      }
    }
    
    // Generate PDF and open print dialog
    const blob = await pdf(<QuotePDFDocument quote={quoteWithItems} companySettings={currentCompanySettings} products={products} />).toBlob();
    const url = URL.createObjectURL(blob);
    
    // Open PDF in a new window and trigger print
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    
    // Clean up after a delay
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  };

  const handleDeleteQuote = (quote: Quote) => {
    setQuoteToDelete(quote);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteQuote = async () => {
    if (!quoteToDelete) return;
    
    try {
      const result = await db.quotes.delete(quoteToDelete.id);
      if (result.success) {
        await loadData();
        setIsDeleteDialogOpen(false);
        setQuoteToDelete(null);
        toast({
          title: "Succès",
          description: "Devis supprimé avec succès",
        });
      } else {
        throw new Error(result.error || "Erreur lors de la suppression");
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de la suppression du devis",
        variant: "destructive",
      });
    }
  };

  const handleCreateQuote = async (quoteData: any) => {
    try {
      const result = await db.quotes.create(quoteData);
      if (result.success) {
        await loadData(); // Refresh the list
        setIsCreating(false);
        toast({
          title: "Succès",
          description: "Devis créé avec succès",
        });
      } else {
        toast({
          title: "Erreur",
          description: result.error || "Erreur lors de la création du devis",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la création du devis",
        variant: "destructive",
      });
    }
  };

  const handleConvertToInvoice = async (quote: Quote) => {
    setIsConverting(true);
    try {
      const result = await db.invoices.generateFromQuote(quote.id);
      if (result.success) {
        await loadData(); // Refresh the list
        toast({
          title: "Succès",
          description: "Devis converti en facture avec succès",
        });
      } else {
        throw new Error(result.error || "Erreur lors de la conversion du devis en facture");
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de la conversion du devis en facture",
        variant: "destructive",
      });
    } finally {
      setIsConverting(false);
    }
  };

  const handleStatusChange = async (quoteId: number, newStatus: string) => {
    try {
      const result = await db.quotes.updateStatus(quoteId, newStatus);
      if (result.success) {
        await loadData(); // Refresh the list
        toast({
          title: "Succès",
          description: "Statut mis à jour avec succès",
        });
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

  // TODO: Add quote creation and preview logic

  if (loading) {
    return (
      <div className="p-6 flex flex-col gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Gestion des devis</h1>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Gestion des devis</h1>
          <p className="text-muted-foreground">
            Consultez et gérez tous vos devis ({quotes.length} devis)
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)} className="w-fit">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau devis
        </Button>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {/* Quotes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Liste des devis ({filteredQuotes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredQuotes}
            columns={columns}
            sortConfig={sortConfig}
            searchTerm={searchTerm}
            filters={filters}
            onSort={handleSort}
            onSearch={setSearchTerm}
            onFilter={handleFilter}
            onClearFilters={clearFilters}
            loading={loading}
            emptyMessage="Aucun devis trouvé"
            actions={(quote) => (
              <div className="flex justify-end gap-2 items-center">
                <StatusDropdown
                  currentValue={quote.status}
                  options={[
                    { value: "Brouillon", label: "Brouillon", variant: "outline" },
                    { value: "Envoyé", label: "Envoyé", variant: "secondary" },
                    { value: "Accepté", label: "Accepté", variant: "default" },
                    { value: "Refusé", label: "Refusé", variant: "destructive" },
                  ]}
                  onStatusChange={(newStatus) => handleStatusChange(quote.id, newStatus)}
                />
                <ActionsDropdown
                  actions={[
                    {
                      label: "Voir",
                      icon: <Eye className="h-4 w-4" />,
                      onClick: () => handleViewQuote(quote),
                    },
                    {
                      label: "Télécharger PDF",
                      icon: <Download className="h-4 w-4" />,
                      onClick: () => handleDownloadQuote(quote),
                    },
                    {
                      label: "Imprimer",
                      icon: <Printer className="h-4 w-4" />,
                      onClick: () => handlePrintQuote(quote),
                    },
                    {
                      label: "Convertir en facture",
                      icon: <FileText className="h-4 w-4" />,
                      onClick: () => handleConvertToInvoice(quote),
                      disabled: isConverting || quote.status === "Accepté",
                    },
                    {
                      label: "Supprimer",
                      icon: <Trash2 className="h-4 w-4" />,
                      onClick: () => handleDeleteQuote(quote),
                      className: "text-red-600",
                    },
                  ]}
                />
              </div>
            )}
          />
        </CardContent>
      </Card>
      {/* Quote Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Aperçu du devis
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto border rounded bg-white" style={{ height: 500, minHeight: 400 }}>
            {previewQuote && (
              <PDFViewer width="100%" height={500} showToolbar={false} style={{ border: "none", backgroundColor: "transparent" }}>
                <QuotePDFDocument quote={previewQuote} companySettings={companySettings} products={products} />
              </PDFViewer>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer le devis "{quoteToDelete?.number}" ? 
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
              onClick={confirmDeleteQuote}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* TODO: Add Quote creation modal and preview modal */}
      {isCreating && (
        <CreateQuoteModal
          open={isCreating}
          clients={clients}
          products={products}
          onClose={() => setIsCreating(false)}
          onCreate={handleCreateQuote}
        />
      )}
    </div>
  );
}
