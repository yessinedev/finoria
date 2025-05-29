import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import CategoryManager from "@/components/category-manager";
import type { Category } from "@/types/types";

interface CategoryManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onCategoriesChange: (categories: Category[]) => void;
}

export default function CategoryManagerModal({
  open,
  onOpenChange,
  categories,
  onCategoriesChange,
}: CategoryManagerModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full sm:max-w-[900px] mx-auto" style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <DialogHeader>
          <DialogTitle>Gestion des catégories</DialogTitle>
        </DialogHeader>
        <CategoryManager
          categories={categories}
          onCategoriesChange={onCategoriesChange}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
