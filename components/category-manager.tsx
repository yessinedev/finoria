"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Edit, Tag, Palette, AlertCircle } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { useDataTable } from "@/hooks/use-data-table";
import { db } from "@/lib/database";
import type { Category } from "@/types/types";
import CategoryFormModal from "@/components/CategoryFormModal";
import CategoryDeleteDialog from "@/components/CategoryDeleteDialog";

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

  // Modularize form modal logic
  const handleCategoryFormSubmit = async (
    formData: any,
    editingCategory: Category | null
  ) => {
    setSaving(true);
    setError(null);
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
      <CategoryDeleteDialog category={category} onDelete={handleDelete} />
    </div>
  );

  return (
    <div className="space-y-6 ">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Gérez les catégories utilisées pour organiser vos produits (
            {localCategories.length} catégorie
            {localCategories.length > 1 ? "s" : ""})
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setIsDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle catégorie
        </Button>
        <CategoryFormModal
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSubmit={handleCategoryFormSubmit}
          editingCategory={editingCategory}
          saving={saving}
          error={error}
          formData={formData}
          setFormData={setFormData}
          onReset={resetForm}
        />
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
