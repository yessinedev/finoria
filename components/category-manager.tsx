"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Tag, Palette, AlertCircle } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { useDataTable } from "@/hooks/use-data-table";
import { db } from "@/lib/database";

interface Category {
  id: number;
  name: string;
  description: string;
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CategoryManagerProps {
  categories: Category[];
  onCategoriesChange: (categories: Category[]) => void;
  onClose: () => void;
}

const colorOptions = [
  {
    name: "Bleu",
    value: "blue",
    class: "bg-blue-100 text-blue-800 border-blue-200",
  },
  {
    name: "Vert",
    value: "green",
    class: "bg-green-100 text-green-800 border-green-200",
  },
  {
    name: "Orange",
    value: "orange",
    class: "bg-orange-100 text-orange-800 border-orange-200",
  },
  {
    name: "Violet",
    value: "purple",
    class: "bg-purple-100 text-purple-800 border-purple-200",
  },
  {
    name: "Rouge",
    value: "red",
    class: "bg-red-100 text-red-800 border-red-200",
  },
  {
    name: "Jaune",
    value: "yellow",
    class: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  {
    name: "Rose",
    value: "pink",
    class: "bg-pink-100 text-pink-800 border-pink-200",
  },
  {
    name: "Gris",
    value: "gray",
    class: "bg-gray-100 text-gray-800 border-gray-200",
  },
];

export default function CategoryManager({
  categories,
  onCategoriesChange,
  onClose,
}: CategoryManagerProps) {
  const [localCategories, setLocalCategories] =
    useState<Category[]>(categories);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "blue",
    isActive: true,
  });

  // Data table configuration
  const {
    data: filteredCategories,
    searchTerm,
    setSearchTerm,
    handleSort,
    handleFilter,
    clearFilters,
    sortConfig,
    filters,
  } = useDataTable(localCategories, { key: "name", direction: "asc" });

  const columns = [
    {
      key: "name" as keyof Category,
      label: "Nom",
      sortable: true,
      filterable: true,
      render: (value: string) => <span className="font-medium">{value}</span>,
    },
    {
      key: "description" as keyof Category,
      label: "Description",
      sortable: true,
      filterable: true,
      render: (value: string) => (
        <span className="text-sm text-muted-foreground">
          {value || "Aucune description"}
        </span>
      ),
    },
    {
      key: "color" as keyof Category,
      label: "Couleur",
      sortable: true,
      render: (value: string) => (
        <Badge className={getColorClass(value)}>
          <Palette className="h-3 w-3 mr-1" />
          {colorOptions.find((c) => c.value === value)?.name}
        </Badge>
      ),
    },
    {
      key: "isActive" as keyof Category,
      label: "Statut",
      sortable: true,
      filterable: true,
      filterType: "select" as const,
      filterOptions: [
        { label: "Active", value: true },
        { label: "Inactive", value: false },
      ],
      render: (value: boolean) => (
        <Badge variant={value ? "default" : "secondary"}>
          {value ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "createdAt" as keyof Category,
      label: "Date de création",
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString("fr-FR"),
    },
  ];

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  useEffect((): (() => void) => {
    loadCategories();

    // Subscribe to real-time updates
    const unsubscribe = db.subscribe((table, action, data) => {
      if (table === "categories") {
        loadCategories();
      }
    });

    return unsubscribe;
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    setError(null);

    const result = await db.categories.getAll();
    if (result.success) {
      setLocalCategories(result.data || []);
      onCategoriesChange(result.data || []);
    } else {
      setError(result.error || "Erreur lors du chargement des catégories");
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    console.log(formData)

    try {
      let result;
      if (editingCategory) {
        result = await db.categories.update(editingCategory.id, formData);
      } else {
        result = await db.categories.create(formData);
      }

      if (result.success) {
        await loadCategories();
        resetForm();
      } else {
        setError(result.error || "Erreur lors de la sauvegarde");
      }
    } catch (error) {
      setError("Erreur inattendue lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", description: "", color: "blue", isActive: true });
    setEditingCategory(null);
    setIsDialogOpen(false);
    setError(null);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
      color: category.color,
      isActive: category.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    const result = await db.categories.delete(id);
    if (result.success) {
      await loadCategories();
    } else {
      setError(result.error || "Erreur lors de la suppression");
    }
  };

  const toggleCategoryStatus = async (id: number) => {
    const category = localCategories.find((c) => c.id === id);
    if (!category) return;

    const result = await db.categories.update(id, {
      ...category,
      isActive: !category.isActive,
    });
    if (result.success) {
      await loadCategories();
    } else {
      setError(result.error || "Erreur lors de la mise à jour");
    }
  };

  const getColorClass = (color: string) => {
    const colorOption = colorOptions.find((option) => option.value === color);
    return colorOption?.class || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const renderActions = (category: Category) => (
    <div className="flex justify-end gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => toggleCategoryStatus(category.id)}
        className="text-xs"
      >
        {category.isActive ? "Désactiver" : "Activer"}
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleEdit(category)}>
        <Edit className="h-4 w-4" />
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la catégorie</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la catégorie "{category.name}"
              ? Cette action est irréversible. Les produits utilisant cette
              catégorie devront être mis à jour manuellement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(category.id)}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Gérez les catégories utilisées pour organiser vos produits (
            {localCategories.length} catégorie
            {localCategories.length > 1 ? "s" : ""})
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle catégorie
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingCategory
                  ? "Modifier la catégorie"
                  : "Nouvelle catégorie"}
              </DialogTitle>
            </DialogHeader>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="categoryName">Nom de la catégorie</Label>
                <Input
                  id="categoryName"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Ex: Services, Matériel..."
                  required
                  disabled={saving}
                />
              </div>

              <div>
                <Label htmlFor="categoryDescription">Description</Label>
                <Textarea
                  id="categoryDescription"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Description de la catégorie..."
                  rows={2}
                  disabled={saving}
                />
              </div>

              <div>
                <Label>Couleur</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, color: color.value })
                      }
                      disabled={saving}
                      className={`p-2 rounded-md border-2 text-xs font-medium transition-all ${
                        formData.color === color.value
                          ? `${color.class} border-current ring-2 ring-offset-2 ring-current`
                          : `${color.class} border-transparent hover:border-current`
                      }`}
                    >
                      {color.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="categoryActive"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300"
                  disabled={saving}
                />
                <Label htmlFor="categoryActive">Catégorie active</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  disabled={saving}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving
                    ? "Enregistrement..."
                    : editingCategory
                    ? "Modifier"
                    : "Créer"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && !isDialogOpen && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Liste des catégories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredCategories}
            columns={columns}
            sortConfig={sortConfig}
            searchTerm={searchTerm}
            filters={filters}
            onSort={handleSort}
            onSearch={setSearchTerm}
            onFilter={handleFilter}
            onClearFilters={clearFilters}
            loading={loading}
            emptyMessage="Aucune catégorie trouvée"
            actions={renderActions}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onClose}>Fermer</Button>
      </div>
    </div>
  );
}
