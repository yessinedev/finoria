import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db } from "@/lib/database";
import type { Sale } from "@/types/types";
import { useToast } from "@/hooks/use-toast";

interface SaleDetailsModalProps {
  sale: Sale | null;
  open: boolean;
  onClose: () => void;
}

export default function SaleDetailsModal({ sale, open, onClose }: SaleDetailsModalProps) {
  const [status, setStatus] = useState(sale?.status || "En attente");
  const { toast } = useToast();
  
  if (!sale) return null;
  
  const handleStatusChange = async (newStatus: string) => {
    try {
      const result = await db.sales.updateStatus(sale.id, newStatus);
      if (result.success) {
        setStatus(newStatus);
        toast({
          title: "Succès",
          description: "Statut mis à jour avec succès",
        });
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
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Détails de la vente #{sale.id}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><strong>Client:</strong> {sale.clientName}</div>
            <div><strong>Date:</strong> {new Date(sale.saleDate).toLocaleDateString("fr-FR")}</div>
            <div><strong>Montant HT:</strong> {sale.totalAmount.toFixed(3)} TND</div>
            <div><strong>TVA:</strong> {sale.taxAmount.toFixed(3)} TND</div>
            <div><strong>Montant TTC:</strong> {(sale.totalAmount + sale.taxAmount).toFixed(3)} TND</div>
            <div>
              <strong>Statut:</strong>
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="En attente">En attente</SelectItem>
                  <SelectItem value="Confirmée">Confirmée</SelectItem>
                  <SelectItem value="Livrée">Livrée</SelectItem>
                  <SelectItem value="Annulée">Annulée</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                      <td className="p-2 text-right">{item.unitPrice.toFixed(3)} TND</td>
                      <td className="p-2 text-right">{item.totalPrice.toFixed(3)} TND</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
