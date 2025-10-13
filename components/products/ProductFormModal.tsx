import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/common/FormField";
import { EntitySelect } from "@/components/common/EntitySelect";
import { Label } from "@/components/ui/label";
import type { Category, Product } from "@/types/types";
import { productSchema } from "@/lib/validation/schemas";
import { z } from "zod";

interface ProductFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (formData: any, editingProduct: Product | null) => Promise<void>;
  editingProduct: Product | null;
  categories: Category[];
  saving: boolean;
  error: string | null;
  formData: any;
  setFormData: (data: any) => void;
  onReset: () => void;
}

export default function ProductFormModal({
  open,
  onOpenChange,
  onSubmit,
  editingProduct,
  categories,
  saving,
  error,
  formData,
  setFormData,
  onReset,
}: ProductFormModalProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const activeCategories = categories.filter((cat) => cat.isActive);
  
  // Clear error when form fields change
  useEffect(() => {
    setErrors({});
  }, [formData]);

  const validateForm = () => {
    try {
      const productData = {
        name: formData.name,
        description: formData.description,
        price: formData.price,
        category: formData.category,
        stock: formData.stock,
        isActive: formData.isActive,
      };
      
      productSchema.parse(productData);
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
      onSubmit(formData, editingProduct);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{editingProduct ? "Modifier le produit" : "Nouveau produit"}</DialogTitle>
        </DialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Nom du produit *"
              id="productName"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              error={errors.name}
            />
            <EntitySelect
              label="Catégorie *"
              id="category"
              value={formData.category}
              onChange={(value) => setFormData({ ...formData, category: value })}
              options={activeCategories}
              getOptionLabel={(cat) => cat.name}
              getOptionValue={(cat) => cat.name}
              required
              error={errors.category}
            />
          </div>
          <FormField
            label="Description"
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            textarea
            error={errors.description}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Prix unitaire (€) *"
              id="price"
              type="number"
              value={formData.price.toString()}
              onChange={(e) => setFormData({ ...formData, price: Number.parseFloat(e.target.value) || 0 })}
              required
              error={errors.price}
            />
            <FormField
              label="Stock (0 pour les services)"
              id="stock"
              type="number"
              value={formData.stock.toString()}
              onChange={(e) => setFormData({ ...formData, stock: Number.parseInt(e.target.value) || 0 })}
              error={errors.stock}
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
              disabled={saving}
            />
            <Label htmlFor="isActive">Produit actif</Label>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onReset} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Enregistrement..." : editingProduct ? "Modifier" : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}