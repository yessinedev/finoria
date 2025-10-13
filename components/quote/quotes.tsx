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
} from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { useDataTable } from "@/hooks/use-data-table";
import type { Client, Product, LineItem } from "@/types/types";
import CreateQuoteModal from "./create-quote-modal";
import { PDFViewer, pdf } from "@react-pdf/renderer";
import { QuotePDFDocument } from "./quote-pdf";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
        <span className="font-mono font-medium text-primary">{value}</span>
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
    {
      key: "status" as keyof Quote,
      label: "Statut",
      sortable: true,
      filterable: true,
      filterType: "select" as const,
      filterOptions: [
        { label: "Brouillon", value: "Brouillon" },
        { label: "Envoyé", value: "Envoyé" },
        { label: "Accepté", value: "Accepté" },
        { label: "Refusé", value: "Refusé" },
      ],
      render: (value: QuoteStatus) => (
        <Badge
          variant={getStatusVariant(value)}
          className="flex items-center gap-1 w-fit"
        >
          {getStatusIcon(value)}
          {value}
        </Badge>
      ),
    },
  ];

  useEffect(() => {
    // Mock clients
    setClients([
      {
        id: 1,
        name: "Société Alpha",
        company: "Alpha SARL",
        email: "contact@alpha.com",
        phone: "01 23 45 67 89",
        address: "1 rue Alpha, Tunis",
      },
      {
        id: 2,
        name: "Entreprise Beta",
        company: "Beta SAS",
        email: "info@beta.com",
        phone: "98 76 54 32 10",
        address: "2 avenue Beta, Sfax",
      },
    ]);
    // Mock products
    setProducts([
      {
        id: 1,
        name: "Produit A",
        description: "Service de conseil",
        price: 100,
        category: "Services",
        stock: 10,
        isActive: true,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      },
      {
        id: 2,
        name: "Produit B",
        description: "Produit physique",
        price: 250,
        category: "Produits",
        stock: 5,
        isActive: true,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      },
    ]);
    // Mock quotes
    setQuotes([
      {
        id: 1,
        number: "DEV-2025-001",
        clientId: 1,
        clientName: "Société Alpha",
        clientCompany: "Alpha SARL",
        clientEmail: "contact@alpha.com",
        clientPhone: "01 23 45 67 89",
        clientAddress: "1 rue Alpha, Tunis",
        amount: 100,
        taxAmount: 20,
        totalAmount: 120,
        issueDate: "2025-05-01",
        dueDate: "2025-06-01",
        status: "Envoyé",
        items: [
          {
            id: 1,
            productId: 1,
            name: "Produit A",
            description: "Service de conseil",
            quantity: 1,
            unitPrice: 100,
            discount: 0,
            total: 100,
          },
        ],
        notes: "Merci pour votre confiance.",
        paymentTerms: "30 jours net",
      },
      {
        id: 2,
        number: "DEV-2025-002",
        clientId: 2,
        clientName: "Entreprise Beta",
        clientCompany: "Beta SAS",
        clientEmail: "info@beta.com",
        clientPhone: "98 76 54 32 10",
        clientAddress: "2 avenue Beta, Sfax",
        amount: 250,
        taxAmount: 50,
        totalAmount: 300,
        issueDate: "2025-05-15",
        dueDate: "2025-06-15",
        status: "Brouillon",
        items: [
          {
            id: 2,
            productId: 2,
            name: "Produit B",
            description: "Produit physique",
            quantity: 1,
            unitPrice: 250,
            discount: 0,
            total: 250,
          },
        ],
        notes: "Devis valable 30 jours.",
        paymentTerms: "30 jours net",
      },
    ]);
    setLoading(false);
  }, []);

  const loadQuotes = async () => {
    setLoading(true);
    setError(null);
    try {
      // Replace with actual API call
      const response = await window.electronAPI.getQuotes();
      setQuotes(response);
    } catch (err) {
      console.error("Failed to load quotes:", err);
      setError("Erreur lors du chargement des devis");
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "TND",
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

  const handleViewQuote = (quote: Quote) => {
    setPreviewQuote(quote);
    setIsPreviewOpen(true);
  };

  const handleDownloadQuote = async (quote: Quote) => {
    const blob = await pdf(<QuotePDFDocument quote={quote} />).toBlob();
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
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => handleViewQuote(quote)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDownloadQuote(quote)}>
                  <Download className="h-4 w-4" />
                </Button>
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
                <QuotePDFDocument quote={previewQuote} />
              </PDFViewer>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* TODO: Add Quote creation modal and preview modal */}
      {isCreating && (
        <CreateQuoteModal
          open={isCreating}
          clients={clients}
          products={products}
          onClose={() => setIsCreating(false)}
          onCreate={(newQuote) => {
            setQuotes((prev) => [...prev, newQuote]);
            setIsCreating(false);
          }}
        />
      )}
    </div>
  );
}
