import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Sale } from "@/types/types";

interface SaleDetailsModalProps {
  sale: Sale | null;
  open: boolean;
  onClose: () => void;
}

export default function SaleDetailsModal({ sale, open, onClose }: SaleDetailsModalProps) {
  if (!sale) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Détails de la vente #{sale.id}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <div><strong>Client:</strong> {sale.clientName}</div>
          <div><strong>Date:</strong> {new Date(sale.saleDate).toLocaleDateString("fr-FR")}</div>
          <div><strong>Montant TTC:</strong> {sale.totalAmount + sale.taxAmount} €</div>
          <div><strong>Statut:</strong> {sale.status}</div>
          <div><strong>Articles:</strong>
            <ul className="list-disc ml-6">
              {sale.items?.map((item) => (
                <li key={item.id}>{item.productName} x{item.quantity} ({item.unitPrice} €)</li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
