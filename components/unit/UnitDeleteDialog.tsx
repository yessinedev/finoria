import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Unit } from "@/types/types";

interface UnitDeleteDialogProps {
  unit: Unit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
}

export default function UnitDeleteDialog({
  unit,
  open,
  onOpenChange,
  onDelete,
}: UnitDeleteDialogProps) {
  if (!unit) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer l'unité</DialogTitle>
          <DialogDescription>
            Êtes-vous sûr de vouloir supprimer l'unité "{unit.name}" ?
            Cette action est irréversible. Si cette unité est utilisée par des produits,
            la suppression ne sera pas possible.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={onDelete}>
            Supprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

