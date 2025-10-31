import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import UnitManager from "@/components/unit/unit-manager";
import type { Unit } from "@/types/types";

interface UnitManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  units: Unit[];
  onUnitsChange: (units: Unit[]) => void;
}

export default function UnitManagerModal({
  open,
  onOpenChange,
  units,
  onUnitsChange,
}: UnitManagerModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full sm:max-w-[900px] mx-auto" style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <DialogHeader>
          <DialogTitle>Gestion des unités</DialogTitle>
        </DialogHeader>
        <UnitManager
          units={units}
          onUnitsChange={onUnitsChange}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

