import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/common/FormField";
import type { Client } from "@/types/types";
import { clientSchema } from "@/lib/validation/schemas";
import { z } from "zod";

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
  // Validation errors state
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    try {
      clientSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path.length > 0) {
            newErrors[err.path[0]] = err.message;
          }
        });
        setErrors(newErrors);
        return false;
      }
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData, editingClient);
    }
  };

  // Update form field and clear error for that field
  const handleFieldChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

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
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label="Nom complet"
            id="clientName"
            value={formData.name}
            onChange={(e) => handleFieldChange("name", e.target.value)}
            required
            error={errors.name}
          />
          <FormField
            label="Entreprise"
            id="clientCompany"
            value={formData.company}
            onChange={(e) => handleFieldChange("company", e.target.value)}
            error={errors.company}
          />
          <FormField
            label="Email"
            id="clientEmail"
            value={formData.email}
            onChange={(e) => handleFieldChange("email", e.target.value)}
            type="email"
            required
            error={errors.email}
          />
          <FormField
            label="Téléphone"
            id="clientPhone"
            value={formData.phone}
            onChange={(e) => handleFieldChange("phone", e.target.value)}
            error={errors.phone}
          />
          <FormField
            label="Adresse"
            id="clientAddress"
            value={formData.address}
            onChange={(e) => handleFieldChange("address", e.target.value)}
            textarea
            error={errors.address}
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