"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PDFViewer, pdf } from "@react-pdf/renderer";

import { SupplierInvoicePDFDocument } from "./supplier-invoice-pdf";
import {
  Download,
  Printer,
  FileText,
  Loader2,
  X,
} from "lucide-react";
import type { SupplierInvoice } from "@/types/types";

interface SupplierInvoicePreviewProps {
  invoice: SupplierInvoice;
  isOpen: boolean;
  onClose: () => void;
  onPrint: (invoice: SupplierInvoice) => void;
  onStatusChange?: (invoiceId: number, status: string) => void;
  companySettings?: any;
  products?: any[];
}

export default function SupplierInvoicePreview({
  invoice,
  isOpen,
  onClose,
  onPrint,
  onStatusChange,
  companySettings,
  products,
}: SupplierInvoicePreviewProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const blob = await pdf(<SupplierInvoicePDFDocument invoice={invoice} companySettings={companySettings} products={products} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `facture-fournisseur-${invoice.invoiceNumber}.pdf`;
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Facture Fournisseur {invoice.invoiceNumber}
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
            <SupplierInvoicePDFDocument invoice={invoice} companySettings={companySettings} products={products} />
          </PDFViewer>
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 border-t pt-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="flex gap-2">
              {onStatusChange && (
                <div className="flex gap-1">
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
