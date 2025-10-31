import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Unit } from "@/types/types";
import { z } from "zod";

// Unit validation schema
const unitSchema = z.object({
  name: z.string().min(1, "Le nom de l'unité est requis"),
  symbol: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean(),
});

interface UnitFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (formData: any, editingUnit: Unit | null) => Promise<void>;
  editingUnit: Unit | null;
  saving: boolean;
  error: string | null;
  formData: any;
  setFormData: (data: any) => void;
  onReset: () => void;
}

export default function UnitFormModal({
  open,
  onOpenChange,
  onSubmit,
  editingUnit,
  saving,
  error,
  formData,
  setFormData,
  onReset,
}: UnitFormModalProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Clear error when form fields change
  useEffect(() => {
    setErrors({});
  }, [formData]);

  const validateForm = () => {
    try {
      const unitData = {
        name: formData.name || "",
        symbol: formData.symbol || "",
        description: formData.description || "",
        isActive: Boolean(formData.isActive),
      };
      
      console.log("[validateForm] Validating unitData:", unitData);
      unitSchema.parse(unitData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("[validateForm] Validation errors:", error.errors);
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path.length > 0) {
            newErrors[err.path[0]] = err.message;
          }
        });
        console.error("[validateForm] Parsed errors:", newErrors);
        setErrors(newErrors);
        return false;
      }
      console.error("[validateForm] Unknown error:", error);
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[UnitFormModal handleSubmit] Form submitted:", { formData, editingUnit });
    if (validateForm()) {
      console.log("[UnitFormModal handleSubmit] Validation passed, calling onSubmit");
      onSubmit(formData, editingUnit);
    } else {
      console.log("[UnitFormModal handleSubmit] Validation failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editingUnit ? "Modifier l'unité" : "Nouvelle unité"}</DialogTitle>
        </DialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="unitName">Nom de l'unité *</Label>
              <Input
                id="unitName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Kilogramme, Mètre..."
                required
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name}</p>
              )}
            </div>
            <div>
              <Label htmlFor="unitSymbol">Symbole</Label>
              <Input
                id="unitSymbol"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                placeholder="Ex: kg, m, pce..."
                className={errors.symbol ? "border-red-500" : ""}
              />
              {errors.symbol && (
                <p className="text-sm text-red-500 mt-1">{errors.symbol}</p>
              )}
            </div>
          </div>
          <div>
            <Label htmlFor="unitDescription">Description</Label>
            <Textarea
              id="unitDescription"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description de l'unité..."
              rows={2}
              className={errors.description ? "border-red-500" : ""}
            />
            {errors.description && (
              <p className="text-sm text-red-500 mt-1">{errors.description}</p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="unitActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="unitActive">Unité active</Label>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onReset} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Enregistrement..." : editingUnit ? "Modifier" : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

