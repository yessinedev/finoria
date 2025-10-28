import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { db } from "@/lib/database";
import type { Sale, DeliveryReceipt } from "@/types/types";
import { useToast } from "@/hooks/use-toast";
import { Truck, User, Car } from "lucide-react";

interface DeliveryReceiptFormProps {
  sale?: Sale; // Optional sale prop for pre-selection
  deliveryReceipt?: DeliveryReceipt; // Optional existing delivery receipt for editing
  open: boolean;
  onClose: () => void;
  onReceiptCreated: (receipt: DeliveryReceipt) => void;
}

export default function DeliveryReceiptForm({ 
  sale, 
  deliveryReceipt,
  open, 
  onClose, 
  onReceiptCreated 
}: DeliveryReceiptFormProps) {
  const { toast } = useToast();
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(sale?.id || deliveryReceipt?.saleId || null);
  const [driverName, setDriverName] = useState(deliveryReceipt?.driverName || "");
  const [vehicleRegistration, setVehicleRegistration] = useState(deliveryReceipt?.vehicleRegistration || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingSales, setLoadingSales] = useState(false);

  useEffect(() => {
    if (open) {
      // If a sale is provided (from SaleDetailsModal), use it directly
      if (sale) {
        setSelectedSaleId(sale.id);
        setSales([sale]);
      } else if (deliveryReceipt) {
        // If editing an existing delivery receipt, use the provided sale data if available
        if (sale) {
          setSelectedSaleId(sale.id);
          setSales([sale]);
        } else {
          // Otherwise, load the associated sale
          loadSaleForReceipt(deliveryReceipt.saleId);
        }
      } else {
        // Otherwise, load all sales for selection
        loadSales();
      }
      
      // If editing an existing delivery receipt, populate the form fields
      if (deliveryReceipt) {
        setDriverName(deliveryReceipt.driverName || "");
        setVehicleRegistration(deliveryReceipt.vehicleRegistration || "");
      }
    } else {
      // Reset form when closing
      setSelectedSaleId(sale?.id || deliveryReceipt?.saleId || null);
      setDriverName(deliveryReceipt?.driverName || "");
      setVehicleRegistration(deliveryReceipt?.vehicleRegistration || "");
    }
  }, [open, sale, deliveryReceipt]);

  const loadSaleForReceipt = async (saleId: number) => {
    try {
      // In a real implementation, you might want to fetch the specific sale
      // For now, we'll just set the sale ID
      setSelectedSaleId(saleId);
    } catch (error) {
      console.error("Failed to load sale for receipt:", error);
    }
  };

  const loadSales = async () => {
    setLoadingSales(true);
    try {
      const result = await db.sales.getAllWithItems();
      if (result.success) {
        setSales(result.data || []);
      }
    } catch (error) {
      console.error("Failed to load sales:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement des commandes",
        variant: "destructive",
      });
    } finally {
      setLoadingSales(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If a sale was provided, use its ID, otherwise use the selected ID
    const saleId = sale ? sale.id : selectedSaleId;
    
    if (!saleId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une commande",
        variant: "destructive",
      });
      return;
    }
    
    // Find the selected sale
    const selectedSale = sale || sales.find(s => s.id === saleId);
    if (!selectedSale) {
      toast({
        title: "Erreur",
        description: "Commande non trouvée",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // If editing an existing delivery receipt, update it
      if (deliveryReceipt) {
        const deliveryReceiptData = {
          saleId: saleId,
          deliveryNumber: deliveryReceipt.deliveryNumber, // Keep the same number
          driverName: driverName || null,
          vehicleRegistration: vehicleRegistration || null,
          deliveryDate: deliveryReceipt.deliveryDate || new Date().toISOString(),
          items: (selectedSale.items || []).map(item => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice
          }))
        };
        
        const result = await db.deliveryReceipts.update(deliveryReceipt.id, deliveryReceiptData);
        if (result.success && result.data) {
          onReceiptCreated(result.data);
          toast({
            title: "Succès",
            description: "Bon de livraison mis à jour avec succès!",
          });
          onClose();
        } else {
          throw new Error(result.error || "Failed to update delivery receipt");
        }
      } else {
        // Generate delivery number (you might want to implement a proper numbering system)
        const deliveryNumber = `BL-${new Date().getFullYear()}-${saleId.toString().padStart(4, '0')}-${Date.now().toString().slice(-4)}`;
        
        const deliveryReceiptData = {
          saleId: saleId,
          deliveryNumber,
          driverName: driverName || null,
          vehicleRegistration: vehicleRegistration || null,
          deliveryDate: new Date().toISOString(),
          items: (selectedSale.items || []).map(item => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice
          }))
        };
        
        const result = await db.deliveryReceipts.create(deliveryReceiptData);
        if (result.success && result.data) {
          onReceiptCreated(result.data);
          toast({
            title: "Succès",
            description: "Bon de livraison créé avec succès!",
          });
          // Reset form
          setSelectedSaleId(sale?.id || null);
          setDriverName("");
          setVehicleRegistration("");
          onClose();
        } else {
          throw new Error(result.error || "Failed to create delivery receipt");
        }
      }
    } catch (error) {
      console.error("Failed to save delivery receipt:", error);
      toast({
        title: "Erreur",
        description: `Erreur lors de ${deliveryReceipt ? 'la mise à jour' : 'la création'} du bon de livraison`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            {deliveryReceipt ? "Modifier le bon de livraison" : "Créer un bon de livraison"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Only show sale selection if no sale was pre-provided and not editing */}
          {!sale && !deliveryReceipt && (
            <div className="space-y-2">
              <Label htmlFor="saleId" className="flex items-center gap-2">
                Commande client
              </Label>
              <Select 
                value={selectedSaleId?.toString() || ""} 
                onValueChange={(value) => setSelectedSaleId(Number(value))}
                disabled={loadingSales}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingSales ? "Chargement..." : "Sélectionner une commande"} />
                </SelectTrigger>
                <SelectContent>
                  {sales.map((sale) => (
                    <SelectItem key={sale.id} value={sale.id.toString()}>
                      CMD-{sale.id} - {sale.clientName} ({new Date(sale.saleDate).toLocaleDateString("fr-FR")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="driverName" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Nom du chauffeur
            </Label>
            <Input
              id="driverName"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              placeholder="Nom du chauffeur"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="vehicleRegistration" className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              Immatriculation du véhicule
            </Label>
            <Input
              id="vehicleRegistration"
              value={vehicleRegistration}
              onChange={(e) => setVehicleRegistration(e.target.value)}
              placeholder="Immatriculation du véhicule"
            />
          </div>
          
          {/* Show sale details when a sale is selected or provided */}
          {(sale || selectedSaleId || deliveryReceipt) && (
            <div className="rounded-lg border p-3 bg-muted/50">
              <h4 className="font-medium mb-2">Détails de la commande</h4>
              <div className="text-sm space-y-1">
                {(() => {
                  const displaySale = sale || sales.find(s => s.id === selectedSaleId);
                  return displaySale ? (
                    <>
                      <div><strong>Client:</strong> {displaySale.clientName}</div>
                      <div><strong>Date:</strong> {new Date(displaySale.saleDate).toLocaleDateString("fr-FR")}</div>
                      <div><strong>Articles:</strong> {(displaySale.items || []).length}</div>
                    </>
                  ) : null;
                })()}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !(sale || selectedSaleId)}
            >
              {isSubmitting ? "Enregistrement..." : (deliveryReceipt ? "Mettre à jour" : "Créer le bon de livraison")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}