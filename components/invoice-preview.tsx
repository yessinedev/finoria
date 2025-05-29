"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PDFViewer, pdf } from "@react-pdf/renderer";

import { InvoicePDFDocument } from "@/components/invoice-pdf";
import {
  Download,
  Printer,
  FileText,
  Loader2,
  Check,
  Clock,
  AlertCircle,
  X,
} from "lucide-react";
import type { Invoice } from "@/types/types";

interface InvoicePreviewProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
  onPrint: (invoice: Invoice) => void;
  onStatusChange?: (invoiceId: number, status: string) => void;
}

export default function InvoicePreview({
  invoice,
  isOpen,
  onClose,
  onPrint,
  onStatusChange,
}: InvoicePreviewProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const blob = await pdf(<InvoicePDFDocument invoice={invoice} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `facture-${invoice.number}.pdf`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    setIsPrinting(true);
    try {
      onPrint(invoice);
    } finally {
      setIsPrinting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Payée":
        return "bg-green-100 text-green-800 border-green-200";
      case "En attente":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "En retard":
        return "bg-red-100 text-red-800 border-red-200";
      case "Annulée":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Payée":
        return <Check className="h-4 w-4" />;
      case "En attente":
        return <Clock className="h-4 w-4" />;
      case "En retard":
        return <AlertCircle className="h-4 w-4" />;
      case "Annulée":
        return <X className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "TND",
    }).format(amount);
  };

  const isOverdue =
    new Date(invoice.dueDate) < new Date() && invoice.status !== "Payée";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Facture {invoice.number}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div
          className="mb-6 border rounded overflow-hidden"
          style={{ height: 500, minHeight: 400 }}
        >
          <PDFViewer
            width="100%"
            height={500}
            showToolbar={false}
            style={{ border: "none", backgroundColor: "transparent" }}
          >
            <InvoicePDFDocument invoice={invoice} />
          </PDFViewer>
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 border-t pt-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="flex gap-2">
              {onStatusChange && (
                <div className="flex gap-1">
                  {invoice.status !== "Payée" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onStatusChange(invoice.id, "Payée")}
                      className="text-green-600 border-green-200 hover:bg-green-50"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Marquer payée
                    </Button>
                  )}
                  {invoice.status !== "Annulée" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onStatusChange(invoice.id, "Annulée")}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Annuler
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handlePrint}
                disabled={isPrinting}
              >
                {isPrinting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4 mr-2" />
                )}
                Imprimer
              </Button>
              <Button onClick={handleDownload} disabled={isDownloading}>
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Télécharger PDF
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
