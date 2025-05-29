import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/common/FormField";
import type { Client } from "@/types/types";

interface ClientFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (formData: any, editingClient: Client | null) => Promise<void>;
  editingClient: Client | null;
  saving: boolean;
  error: string | null;
  formData: any;
  setFormData: (data: any) => void;
  onReset: () => void;
}

export default function ClientFormModal({
  open,
  onOpenChange,
  onSubmit,
  editingClient,
  saving,
  error,
  formData,
  setFormData,
  onReset,
}: ClientFormModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editingClient ? "Modifier le client" : "Nouveau client"}</DialogTitle>
        </DialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData, editingClient); }} className="space-y-4">
          <FormField
            label="Nom complet"
            id="clientName"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <FormField
            label="Entreprise"
            id="clientCompany"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
          />
          <FormField
            label="Email"
            id="clientEmail"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            type="email"
            required
          />
          <FormField
            label="Téléphone"
            id="clientPhone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          <FormField
            label="Adresse"
            id="clientAddress"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            textarea
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onReset} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Enregistrement..." : editingClient ? "Modifier" : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
