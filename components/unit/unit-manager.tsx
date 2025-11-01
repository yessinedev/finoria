"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Edit, Ruler, AlertCircle, MoreVertical } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { useDataTable } from "@/hooks/use-data-table";
import { db } from "@/lib/database";
import { toast } from "@/components/ui/use-toast";
import type { Unit } from "@/types/types";
import UnitFormModal from "@/components/unit/UnitFormModal";
import UnitDeleteDialog from "@/components/unit/UnitDeleteDialog";
import { ActionsDropdown } from "@/components/common/actions-dropdown";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export default function UnitManager({
  units,
  onUnitsChange,
  onClose,
}: {
  units: Unit[];
  onUnitsChange: (units: Unit[]) => void;
  onClose: () => void;
}) {
  const [localUnits, setLocalUnits] = useState<Unit[]>(units);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    description: "",
    isActive: true,
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Data table configuration
  const {
    data: filteredUnits,
    searchTerm,
    setSearchTerm,
    handleSort,
    handleFilter,
    clearFilters,
    sortConfig,
    filters,
  } = useDataTable(localUnits, { key: "name", direction: "asc" });

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUnits = filteredUnits.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUnits.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const columns = [
    {
      key: "name" as keyof Unit,
      label: "Nom",
      sortable: true,
      filterable: true,
      render: (value: string, unit: Unit) => (
        <div className="flex items-center gap-2">
          <Ruler className="h-4 w-4" />
          <span className="font-medium">{value}</span>
          {unit.symbol && (
            <Badge variant="outline">{unit.symbol}</Badge>
          )}
        </div>
      ),
    },
    {
      key: "description" as keyof Unit,
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
      key: "isActive" as keyof Unit,
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
    setLocalUnits(units);
    // Reset to first page when units change
    setCurrentPage(1);
  }, [units]);


  useEffect((): (() => void) => {
    loadUnits();

    // Subscribe to real-time updates
    const unsubscribe = db.subscribe((table) => {
      if (table === "units") {
        loadUnits();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadUnits = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await db.units.getAll();
      if (result.success) {
        setLocalUnits(result.data || []);
        onUnitsChange(result.data || []);
      } else {
        setError(result.error || "Erreur lors du chargement des unités");
      }
    } catch (err) {
      setError("Erreur inattendue lors du chargement des unités");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      symbol: "",
      description: "",
      isActive: true,
    });
    setEditingUnit(null);
    setIsDialogOpen(false);
    setError(null);
  };

  const handleUnitFormSubmit = async (formData: any, editingUnit: Unit | null) => {
    console.log("[handleUnitFormSubmit] Called with:", { formData, editingUnit });
    setSaving(true);
    setError(null);
    try {
      let result;
      if (editingUnit) {
        console.log("[handleUnitFormSubmit] Updating unit:", editingUnit.id, formData);
        result = await db.units.update(editingUnit.id, formData);
        console.log("[handleUnitFormSubmit] Update result:", result);
      } else {
        console.log("[handleUnitFormSubmit] Creating unit:", formData);
        result = await db.units.create(formData);
        console.log("[handleUnitFormSubmit] Create result:", result);
      }
      if (result.success) {
        await loadUnits();
        resetForm();
        toast({
          title: "Succès",
          description: editingUnit
            ? "Unité mise à jour avec succès"
            : "Unité créée avec succès",
        });
      } else {
        console.error("[handleUnitFormSubmit] Error:", result.error);
        setError(result.error || "Erreur lors de la sauvegarde");
        toast({
          title: "Erreur",
          description: result.error || "Erreur lors de la sauvegarde",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[handleUnitFormSubmit] Exception:", error);
      const errorMessage = error instanceof Error ? error.message : "Erreur inattendue lors de la sauvegarde";
      setError(errorMessage);
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (unit: Unit) => {
    setEditingUnit(unit);
    setFormData({
      name: unit.name,
      symbol: unit.symbol || "",
      description: unit.description || "",
      isActive: unit.isActive,
    });
    setIsDialogOpen(true);
  };

  const toggleUnitStatus = async (id: number) => {
    const unit = localUnits.find((u) => u.id === id);
    if (!unit) return;

    const result = await db.units.update(id, {
      ...unit,
      isActive: !unit.isActive,
    });
    if (result.success) {
      await loadUnits();
      toast({
        title: "Succès",
        description: "Statut de l'unité mis à jour avec succès",
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

  const handleDelete = (unit: Unit) => {
    setUnitToDelete(unit);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!unitToDelete) return;

    try {
      const result = await db.units.delete(unitToDelete.id);
      if (result.success) {
        await loadUnits();
        toast({
          title: "Succès",
          description: "Unité supprimée avec succès",
        });
      } else {
        toast({
          title: "Erreur",
          description: result.error || "Erreur lors de la suppression",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur inattendue lors de la suppression",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setUnitToDelete(null);
    }
  };

  const renderActions = (unit: Unit) => (
    <ActionsDropdown
      actions={[
        {
          label: unit.isActive ? "Désactiver" : "Activer",
          onClick: () => toggleUnitStatus(unit.id),
        },
        {
          label: "Modifier",
          icon: <Edit className="h-4 w-4" />,
          onClick: () => handleEdit(unit),
        },
        {
          label: "Supprimer",
          icon: <MoreVertical className="h-4 w-4" />,
          onClick: () => handleDelete(unit),
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
            Gérez les unités utilisées pour vos produits (
            {localUnits.length} unité{localUnits.length > 1 ? "s" : ""})
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingUnit(null);
            resetForm();
            setIsDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle unité
        </Button>
      </div>

      <UnitFormModal
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleUnitFormSubmit}
        editingUnit={editingUnit}
        saving={saving}
        error={error}
        formData={formData}
        setFormData={setFormData}
        onReset={resetForm}
      />

      {error && !isDialogOpen && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ruler className="h-5 w-5" />
            Liste des unités
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={currentUnits}
            columns={columns}
            sortConfig={sortConfig}
            searchTerm={searchTerm}
            filters={filters}
            onSort={handleSort}
            onSearch={setSearchTerm}
            onFilter={handleFilter}
            onClearFilters={clearFilters}
            loading={loading}
            emptyMessage="Aucune unité trouvée"
            actions={renderActions}
          />
          
          {/* Pagination */}
          {filteredUnits.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Affichage de {indexOfFirstItem + 1} à {Math.min(indexOfLastItem, filteredUnits.length)} sur {filteredUnits.length} unité{filteredUnits.length > 1 ? "s" : ""}
              </div>
              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => paginate(Math.max(1, currentPage - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      let pageNumber;
                      if (totalPages <= 7) {
                        pageNumber = i + 1;
                      } else if (currentPage <= 4) {
                        pageNumber = i + 1;
                      } else if (currentPage >= totalPages - 3) {
                        pageNumber = totalPages - 6 + i;
                      } else {
                        pageNumber = currentPage - 3 + i;
                      }
                      
                      return (
                        <PaginationItem key={pageNumber}>
                          <PaginationLink
                            onClick={() => paginate(pageNumber)}
                            isActive={currentPage === pageNumber}
                            className="cursor-pointer"
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <UnitDeleteDialog
        unit={unitToDelete}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onDelete={confirmDelete}
      />
    </div>
  );
}

