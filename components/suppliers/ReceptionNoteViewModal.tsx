import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Package, User, Car, Calendar, FileText } from "lucide-react";
import type { ReceptionNote } from "@/types/types";

interface ReceptionNoteViewModalProps {
  open: boolean;
  onClose: () => void;
  receptionNote: ReceptionNote | null;
}

export function ReceptionNoteViewModal({ 
  open, 
  onClose, 
  receptionNote 
}: ReceptionNoteViewModalProps) {
  if (!receptionNote) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Détails du bon de réception
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Header Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-semibold">Informations générales</h3>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">N° Bon de réception:</span>
                  <span className="font-mono">{receptionNote.receptionNumber}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Date de réception:</span>
                  <span>{new Date(receptionNote.receptionDate).toLocaleDateString("fr-FR")}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold">Informations du transport</h3>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Chauffeur:</span>
                  <span>{receptionNote.driverName || "Non spécifié"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Immatriculation:</span>
                  <span>{receptionNote.vehicleRegistration || "Non spécifié"}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Supplier Order Information */}
          <div>
            <h3 className="text-lg font-semibold">Commande fournisseur associée</h3>
            <div className="mt-2 p-3 bg-muted rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <span className="font-medium">N° Commande:</span>
                  <span className="ml-2">{receptionNote.supplierOrder?.orderNumber || receptionNote.supplierOrderNumber || "N/A"}</span>
                </div>
                <div>
                  <span className="font-medium">Fournisseur:</span>
                  <span className="ml-2">
                    {receptionNote.supplierOrder?.supplierName || receptionNote.supplierName || "N/A"}
                    {(receptionNote.supplierOrder?.supplierCompany || receptionNote.supplierCompany) && 
                      ` (${receptionNote.supplierOrder?.supplierCompany || receptionNote.supplierCompany})`}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Date de commande:</span>
                  <span className="ml-2">
                    {receptionNote.supplierOrder?.orderDate 
                      ? new Date(receptionNote.supplierOrder.orderDate).toLocaleDateString("fr-FR") 
                      : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Montant total:</span>
                  <span className="ml-2">
                    {receptionNote.supplierOrder?.totalAmount 
                      ? `${receptionNote.supplierOrder.totalAmount.toFixed(3)} DNT` 
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Items Table */}
          <div>
            <h3 className="text-lg font-semibold">Articles reçus</h3>
            <div className="border rounded-md mt-2 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead className="text-right">Qté commandée</TableHead>
                    <TableHead className="text-right">Qté reçue</TableHead>
                    <TableHead className="text-right">Prix unitaire</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receptionNote.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell className="text-right">{item.orderedQuantity}</TableCell>
                      <TableCell className="text-right">{item.receivedQuantity}</TableCell>
                      <TableCell className="text-right">{item.unitPrice.toFixed(3)} DNT</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          
          {/* Notes */}
          {receptionNote.notes && (
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notes
              </h3>
              <div className="mt-2 p-3 bg-muted rounded-lg">
                <p className="whitespace-pre-wrap">{receptionNote.notes}</p>
              </div>
            </div>
          )}
          
          <Separator />
          
          <div className="flex justify-end">
            <Button onClick={onClose}>Fermer</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}