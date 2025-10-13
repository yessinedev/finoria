import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Category } from "@/types/types";
import { z } from "zod";

const colorOptions = [
  { name: "Bleu", value: "blue", class: "bg-blue-100 text-blue-800 border-blue-200" },
  { name: "Vert", value: "green", class: "bg-green-100 text-green-800 border-green-200" },
  { name: "Orange", value: "orange", class: "bg-orange-100 text-orange-800 border-orange-200" },
  { name: "Violet", value: "purple", class: "bg-purple-100 text-purple-800 border-purple-200" },
  { name: "Rouge", value: "red", class: "bg-red-100 text-red-800 border-red-200" },
  { name: "Jaune", value: "yellow", class: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  { name: "Rose", value: "pink", class: "bg-pink-100 text-pink-800 border-pink-200" },
  { name: "Gris", value: "gray", class: "bg-gray-100 text-gray-800 border-gray-200" },
];

// Category validation schema
const categorySchema = z.object({
  name: z.string().min(1, "Le nom de la catégorie est requis"),
  description: z.string().optional(),
  color: z.string().min(1, "La couleur est requise"),
  isActive: z.boolean(),
});

interface CategoryFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (formData: any, editingCategory: Category | null) => Promise<void>;
  editingCategory: Category | null;
  saving: boolean;
  error: string | null;
  formData: any;
  setFormData: (data: any) => void;
  onReset: () => void;
}

export default function CategoryFormModal({
  open,
  onOpenChange,
  onSubmit,
  editingCategory,
  saving,
  error,
  formData,
  setFormData,
  onReset,
}: CategoryFormModalProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Clear error when form fields change
  useEffect(() => {
    setErrors({});
  }, [formData]);

  const validateForm = () => {
    try {
      const categoryData = {
        name: formData.name,
        description: formData.description,
        color: formData.color,
        isActive: formData.isActive,
      };
      
      categorySchema.parse(categoryData);
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
      onSubmit(formData, editingCategory);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editingCategory ? "Modifier la catégorie" : "Nouvelle catégorie"}</DialogTitle>
        </DialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="categoryName">Nom de la catégorie *</Label>
            <Input
              id="categoryName"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Services, Matériel..."
              required
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name}</p>
            )}
          </div>
          <div>
            <Label htmlFor="categoryDescription">Description</Label>
            <Textarea
              id="categoryDescription"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description de la catégorie..."
              rows={2}
              className={errors.description ? "border-red-500" : ""}
            />
            {errors.description && (
              <p className="text-sm text-red-500 mt-1">{errors.description}</p>
            )}
          </div>
          <div>
            <Label>Couleur *</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: color.value })}
                  className={`p-2 rounded-md border-2 text-xs font-medium transition-all ${
                    formData.color === color.value
                      ? `${color.class} border-current ring-2 ring-offset-2 ring-current`
                      : `${color.class} border-transparent hover:border-current`
                  } ${errors.color ? "ring-red-500 ring-2" : ""}`}
                >
                  {color.name}
                </button>
              ))}
            </div>
            {errors.color && (
              <p className="text-sm text-red-500 mt-1">{errors.color}</p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="categoryActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="categoryActive">Catégorie active</Label>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onReset} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Enregistrement..." : editingCategory ? "Modifier" : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}