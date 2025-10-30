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
import { PDFViewer } from "@react-pdf/renderer";
import { ReceptionNotePDFDocument } from "@/components/suppliers/reception-note-pdf";

interface ReceptionNoteViewModalProps {
  open: boolean;
  onClose: () => void;
  receptionNote: ReceptionNote | null;
  companySettings?: any;
  supplierOrder?: any;
}

export function ReceptionNoteViewModal({ 
  open, 
  onClose, 
  receptionNote,
  companySettings,
  supplierOrder,
}: ReceptionNoteViewModalProps) {
  if (!receptionNote) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Aperçu du bon de réception
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <div className="h-full border rounded-lg overflow-hidden">
            <PDFViewer className="w-full h-full min-h-[500px]" showToolbar={false}>
              <ReceptionNotePDFDocument
                receptionNote={receptionNote}
                supplierOrder={supplierOrder || receptionNote.supplierOrder}
                companySettings={companySettings}
              />
            </PDFViewer>
          </div>
        </div>
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose} variant="outline">Fermer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}