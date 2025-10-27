import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/common/FormField";
import { EntitySelect } from "@/components/common/EntitySelect";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { Category, Product, TVA } from "@/types/types";
import { productSchema } from "@/lib/validation/schemas";
import { z } from "zod";

interface ProductFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (formData: any, editingProduct: Product | null) => Promise<void>;
  editingProduct: Product | null;
  categories: Category[];
  tvaRates: TVA[];
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
  tvaRates,
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
        purchasePrice: formData.purchasePrice,
        category: formData.category,
        stock: formData.stock,
        isActive: formData.isActive,
        reference: formData.reference,
        tvaId: formData.tvaId,
        sellingPriceHT: formData.sellingPriceHT,
        sellingPriceTTC: formData.sellingPriceTTC,
        purchasePriceHT: formData.purchasePriceHT,
        weightedAverageCostHT: formData.weightedAverageCostHT,
      };
      
      // Only include purchasePrice in validation if it's provided
      if (productData.purchasePrice === undefined || productData.purchasePrice === null) {
        delete productData.purchasePrice;
      }
      
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
            <div className="space-y-2">
              <Label htmlFor="price">Prix de vente (DNT) *</Label>
              <Input
                id="price"
                type="number"
                step="0.001"
                value={formData.price.toString()}
                onChange={(e) => setFormData({ ...formData, price: Number.parseFloat(e.target.value) || 0 })}
                required
              />
              {errors.price && <div className="text-xs text-red-600">{errors.price}</div>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Prix d'achat (DNT)</Label>
              <Input
                id="purchasePrice"
                type="number"
                step="0.001"
                value={formData.purchasePrice?.toString() || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || value === null) {
                    setFormData({ ...formData, purchasePrice: undefined });
                  } else {
                    const numValue = Number.parseFloat(value);
                    setFormData({ ...formData, purchasePrice: isNaN(numValue) ? undefined : numValue });
                  }
                }}
              />
              {errors.purchasePrice && <div className="text-xs text-red-600">{errors.purchasePrice}</div>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Stock (0 pour les services)"
              id="stock"
              type="number"
              value={formData.stock.toString()}
              onChange={(e) => setFormData({ ...formData, stock: Number.parseInt(e.target.value) || 0 })}
              error={errors.stock}
            />
          </div>
          
          {/* New VAT and pricing fields */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Référence"
              id="reference"
              value={formData.reference || ""}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              error={errors.reference}
            />
            <EntitySelect
              label="Taux de TVA"
              id="tvaId"
              value={formData.tvaId || ""}
              onChange={(value) => setFormData({ ...formData, tvaId: value ? Number(value) : undefined })}
              options={tvaRates}
              getOptionLabel={(tva) => `${tva.rate}%`}
              getOptionValue={(tva) => tva.id.toString()}
              error={errors.tvaId}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sellingPriceHT">Prix de vente HT (DNT)</Label>
              <Input
                id="sellingPriceHT"
                type="number"
                step="0.001"
                value={formData.sellingPriceHT?.toString() || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || value === null) {
                    setFormData({ ...formData, sellingPriceHT: undefined });
                  } else {
                    const numValue = Number.parseFloat(value);
                    setFormData({ ...formData, sellingPriceHT: isNaN(numValue) ? undefined : numValue });
                  }
                }}
              />
              {errors.sellingPriceHT && <div className="text-xs text-red-600">{errors.sellingPriceHT}</div>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sellingPriceTTC">Prix de vente TTC (DNT)</Label>
              <Input
                id="sellingPriceTTC"
                type="number"
                step="0.001"
                value={formData.sellingPriceTTC?.toString() || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || value === null) {
                    setFormData({ ...formData, sellingPriceTTC: undefined });
                  } else {
                    const numValue = Number.parseFloat(value);
                    setFormData({ ...formData, sellingPriceTTC: isNaN(numValue) ? undefined : numValue });
                  }
                }}
              />
              {errors.sellingPriceTTC && <div className="text-xs text-red-600">{errors.sellingPriceTTC}</div>}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchasePriceHT">Prix d'achat HT (DNT)</Label>
              <Input
                id="purchasePriceHT"
                type="number"
                step="0.001"
                value={formData.purchasePriceHT?.toString() || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || value === null) {
                    setFormData({ ...formData, purchasePriceHT: undefined });
                  } else {
                    const numValue = Number.parseFloat(value);
                    setFormData({ ...formData, purchasePriceHT: isNaN(numValue) ? undefined : numValue });
                  }
                }}
              />
              {errors.purchasePriceHT && <div className="text-xs text-red-600">{errors.purchasePriceHT}</div>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="weightedAverageCostHT">Coût unitaire moyen pondéré HT (DNT)</Label>
              <Input
                id="weightedAverageCostHT"
                type="number"
                step="0.001"
                value={formData.weightedAverageCostHT?.toString() || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || value === null) {
                    setFormData({ ...formData, weightedAverageCostHT: undefined });
                  } else {
                    const numValue = Number.parseFloat(value);
                    setFormData({ ...formData, weightedAverageCostHT: isNaN(numValue) ? undefined : numValue });
                  }
                }}
              />
              {errors.weightedAverageCostHT && <div className="text-xs text-red-600">{errors.weightedAverageCostHT}</div>}
            </div>
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