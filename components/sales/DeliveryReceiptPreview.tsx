import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Eye,
  Download,
  Edit,
  Printer
} from "lucide-react";
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";
import { DeliveryReceiptPDFDocument } from "@/components/sales/delivery-receipt-pdf";
import type { DeliveryReceipt, Sale } from "@/types/types";

interface DeliveryReceiptPreviewProps {
  deliveryReceipt: DeliveryReceipt;
  sale: Sale;
  companySettings?: any;
  products?: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}

export default function DeliveryReceiptPreview({ 
  deliveryReceipt, 
  sale,
  companySettings,
  products,
  open, 
  onOpenChange,
  onEdit
}: DeliveryReceiptPreviewProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    // The actual download is handled by PDFDownloadLink, this is just for UI feedback
    setTimeout(() => setIsDownloading(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Aperçu du bon de livraison
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <div className="h-full border rounded-lg overflow-hidden">
            <PDFViewer className="w-full h-full min-h-[500px]">
              <DeliveryReceiptPDFDocument 
                deliveryReceipt={deliveryReceipt} 
                sale={sale}
                companySettings={companySettings}
                products={products}
              />
            </PDFViewer>
          </div>
        </div>
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Modifier
          </Button>
          <PDFDownloadLink
            document={
              <DeliveryReceiptPDFDocument 
                deliveryReceipt={deliveryReceipt} 
                sale={sale}
                companySettings={companySettings}
                products={products}
              />
            }
            fileName={`bon-de-livraison-${deliveryReceipt.deliveryNumber}.pdf`}
            onClick={handleDownload}
          >
            {({ loading }) => (
              <Button disabled={loading || isDownloading}>
                <Download className="h-4 w-4 mr-2" />
                {loading || isDownloading ? "Préparation..." : "Télécharger"}
              </Button>
            )}
          </PDFDownloadLink>
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}