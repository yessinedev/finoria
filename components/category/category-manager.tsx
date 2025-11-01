"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Edit, Tag, AlertCircle, MoreVertical } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { useDataTable } from "@/hooks/use-data-table";
import { db } from "@/lib/database";
import { toast } from "@/components/ui/use-toast";
import type { Category } from "@/types/types";
import CategoryFormModal from "@/components/category/CategoryFormModal";
import CategoryDeleteDialog from "@/components/category/CategoryDeleteDialog";
import { ActionsDropdown } from "@/components/common/actions-dropdown";

export default function CategoryManager({
  categories,
  onCategoriesChange,
  onClose,
}: {
  categories: Category[];
  onCategoriesChange: (categories: Category[]) => void;
  onClose: () => void;
}) {
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

  const loadCategories = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await db.categories.getAll();
      if (result.success) {
        setLocalCategories(result.data || []);
        onCategoriesChange(result.data || []);
      } else {
        setError(result.error || "Erreur lors du chargement des catégories");
      }
    } catch (error) {
      setError("Erreur inattendue lors du chargement des catégories");
    } finally {
      setLoading(false);
    }
  };

  useEffect((): (() => void) => {
    loadCategories();

    // Subscribe to real-time updates
    const unsubscribe = db.subscribe((table) => {
      if (table === "categories") {
        loadCategories();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

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
        toast({
          title: "Succès",
          description: editingCategory 
            ? "Catégorie mise à jour avec succès" 
            : "Catégorie créée avec succès",
        });
      } else {
        setError(result.error || "Erreur lors de la sauvegarde");
        toast({
          title: "Erreur",
          description: result.error || "Erreur lors de la sauvegarde",
          variant: "destructive",
        });
      }
    } catch (error) {
      setError("Erreur inattendue lors de la sauvegarde");
      toast({
        title: "Erreur",
        description: "Erreur inattendue lors de la sauvegarde",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", description: "", isActive: true });
    setEditingCategory(null);
    setIsDialogOpen(false);
    setError(null);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
      isActive: category.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    const result = await db.categories.delete(id);
    if (result.success) {
      await loadCategories();
      toast({
        title: "Succès",
        description: "Catégorie supprimée avec succès",
      });
    } else {
      setError(result.error || "Erreur lors de la suppression");
      toast({
        title: "Erreur",
        description: result.error || "Erreur lors de la suppression",
        variant: "destructive",
      });
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
      toast({
        title: "Succès",
        description: "Statut de la catégorie mis à jour avec succès",
      });
    } else {
      setError(result.error || "Erreur lors de la mise à jour");
      toast({
        title: "Erreur",
        description: result.error || "Erreur lors de la mise à jour",
        variant: "destructive",
      });
    }
  };

  const renderActions = (category: Category) => (
    <ActionsDropdown
      actions={[
        {
          label: category.isActive ? "Désactiver" : "Activer",
          onClick: () => toggleCategoryStatus(category.id),
        },
        {
          label: "Modifier",
          icon: <Edit className="h-4 w-4" />,
          onClick: () => handleEdit(category),
        },
        {
          label: "Supprimer",
          onClick: () => handleDelete(category.id),
          className: "text-red-600",
        },
      ]}
    />
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Gérez les catégories utilisées pour organiser vos produits (
            {localCategories.length} catégorie{localCategories.length > 1 ? "s" : ""})
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
    </div>
  );
}