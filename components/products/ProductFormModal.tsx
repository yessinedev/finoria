import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/common/FormField";
import { EntitySelect } from "@/components/common/EntitySelect";
import { Label } from "@/components/ui/label";
import type { Category, Product } from "@/types/types";

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
  const activeCategories = categories.filter((cat) => cat.isActive);
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
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData, editingProduct); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Nom du produit"
              id="productName"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <EntitySelect
              label="Catégorie"
              id="category"
              value={formData.category}
              onChange={(value) => setFormData({ ...formData, category: value })}
              options={activeCategories}
              getOptionLabel={(cat) => cat.name}
              getOptionValue={(cat) => cat.name}
              required
            />
          </div>
          <FormField
            label="Description"
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            textarea
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Prix unitaire (€)"
              id="price"
              type="number"
              value={formData.price.toString()}
              onChange={(e) => setFormData({ ...formData, price: Number.parseFloat(e.target.value) || 0 })}
              required
            />
            <FormField
              label="Stock (0 pour les services)"
              id="stock"
              type="number"
              value={formData.stock.toString()}
              onChange={(e) => setFormData({ ...formData, stock: Number.parseInt(e.target.value) || 0 })}
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
