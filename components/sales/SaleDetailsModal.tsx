import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Truck,
  FileText,
  Download,
  Edit
} from "lucide-react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { DeliveryReceiptPDFDocument } from "@/components/sales/delivery-receipt-pdf";
import { db } from "@/lib/database";
import type { Sale } from "@/types/types";
import { useToast } from "@/hooks/use-toast";
import DeliveryReceiptForm from "@/components/sales/DeliveryReceiptForm";

interface SaleDetailsModalProps {
  sale: Sale | null;
  open: boolean;
  onClose: () => void;
}

export default function SaleDetailsModal({ sale, open, onClose }: SaleDetailsModalProps) {
  const { toast } = useToast();
  const [deliveryReceipt, setDeliveryReceipt] = useState<any>(null);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (sale && open) {
      loadDeliveryReceipt();
      loadCompanySettings();
    }
  }, [sale, open]);

  const loadDeliveryReceipt = async () => {
    if (!sale) return;
    
    try {
      const result = await db.deliveryReceipts.getBySale(sale.id);
      setDeliveryReceipt(result);
    } catch (error) {
      console.error("Failed to load delivery receipt:", error);
    }
  };

  const loadCompanySettings = async () => {
    try {
      const result = await db.settings.get();
      setCompanySettings(result.data);
    } catch (error) {
      console.error("Failed to load company settings:", error);
    }
  };

  const handleReceiptCreated = (receipt: any) => {
    setDeliveryReceipt(receipt);
    setIsFormOpen(false);
  };

  const handleEditReceipt = () => {
    setIsEditing(true);
    setIsFormOpen(true);
  };

  if (!sale) return null;
  
  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails de la vente #{sale.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><strong>Client:</strong> {sale.clientName}</div>
              <div><strong>Date:</strong> {new Date(sale.saleDate).toLocaleDateString("fr-FR")}</div>
              <div><strong>Montant HT:</strong> {sale.totalAmount.toFixed(3)} DNT</div>
              <div><strong>TVA:</strong> {sale.taxAmount.toFixed(3)} DNT</div>
              <div><strong>Montant TTC:</strong> {(sale.totalAmount + sale.taxAmount).toFixed(3)} DNT</div>
            </div>
            
            {/* Delivery Receipt Section */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Bon de livraison
                </h3>
                
                {deliveryReceipt ? (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleEditReceipt}>
                      <Edit className="h-4 w-4 mr-2" />
                      Modifier
                    </Button>
                    <PDFDownloadLink
                      document={
                        <DeliveryReceiptPDFDocument 
                          deliveryReceipt={deliveryReceipt} 
                          sale={sale}
                          companySettings={companySettings}
                        />
                      }
                      fileName={`bon-de-livraison-${deliveryReceipt.deliveryNumber}.pdf`}
                    >
                      {({ loading }) => (
                        <Button variant="outline" size="sm" disabled={loading}>
                          <Download className="h-4 w-4 mr-2" />
                          {loading ? "Préparation..." : "Télécharger"}
                        </Button>
                      )}
                    </PDFDownloadLink>
                  </div>
                ) : (
                  <Button 
                    onClick={() => setIsFormOpen(true)} 
                    size="sm"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Créer un bon
                  </Button>
                )}
              </div>
              
              {deliveryReceipt ? (
                <div className="text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div><strong>Numéro:</strong> {deliveryReceipt.deliveryNumber}</div>
                    <div><strong>Date:</strong> {new Date(deliveryReceipt.deliveryDate).toLocaleDateString("fr-FR")}</div>
                    {deliveryReceipt.driverName && (
                      <div><strong>Chauffeur:</strong> {deliveryReceipt.driverName}</div>
                    )}
                    {deliveryReceipt.vehicleRegistration && (
                      <div><strong>Immatriculation:</strong> {deliveryReceipt.vehicleRegistration}</div>
                    )}
                  </div>
                  
                  <div className="mt-3">
                    <h4 className="font-medium mb-2">Articles livrés:</h4>
                    <div className="border rounded-md overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left p-2">Produit</th>
                            <th className="text-right p-2">Quantité</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deliveryReceipt.items?.map((item: any) => (
                            <tr key={item.id} className="border-t">
                              <td className="p-2">{item.productName}</td>
                              <td className="p-2 text-right">{item.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Aucun bon de livraison généré pour cette vente.
                </p>
              )}
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Articles</h3>
              <div className="border rounded-md overflow-hidden">
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
                    {sale.items?.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="p-2">{item.productName}</td>
                        <td className="p-2 text-right">{item.quantity}</td>
                        <td className="p-2 text-right">{item.unitPrice.toFixed(3)} DNT</td>
                        <td className="p-2 text-right">{item.totalPrice.toFixed(3)} DNT</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Updated to remove the sale prop since DeliveryReceiptForm no longer requires it */}
      <DeliveryReceiptForm
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setIsEditing(false);
        }}
        onReceiptCreated={handleReceiptCreated}
      />
    </>
  );
}