import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// Removed Select component imports since we're removing status functionality
import type { Sale } from "@/types/types";

interface SaleDetailsModalProps {
  sale: Sale | null;
  open: boolean;
  onClose: () => void;
}

export default function SaleDetailsModal({ sale, open, onClose }: SaleDetailsModalProps) {
  // Removed status state since we're removing status functionality
  
  if (!sale) return null;
  
  // Removed handleStatusChange function since we're removing status functionality
  
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
            <div><strong>Montant HT:</strong> {sale.totalAmount.toFixed(3)} DNT</div>
            <div><strong>TVA:</strong> {sale.taxAmount.toFixed(3)} DNT</div>
            <div><strong>Montant TTC:</strong> {(sale.totalAmount + sale.taxAmount).toFixed(3)} DNT</div>
            {/* Removed status field display */}
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
  );
}