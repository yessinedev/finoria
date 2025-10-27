"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Package,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  AlertCircle,
  AlertTriangle,
  Download
} from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { useDataTable } from "@/hooks/use-data-table";
import { db } from "@/lib/database";
import type { SupplierOrder } from "@/types/types";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { ReceptionNotePDFDocument } from "@/components/suppliers/reception-note-pdf";
import ReceptionNoteForm from "@/components/suppliers/ReceptionNoteForm";

export default function ReceptionNotes() {
  const [receptionNotes, setReceptionNotes] = useState<any[]>([]);
  const [supplierOrders, setSupplierOrders] = useState<SupplierOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [receptionNoteToDelete, setReceptionNoteToDelete] = useState<any | null>(null);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { toast } = useToast();

  // Data table configuration
  const {
    data: filteredReceptionNotes,
    searchTerm,
    setSearchTerm,
    handleSort,
    handleFilter,
    clearFilters,
    sortConfig,
    filters,
  } = useDataTable(receptionNotes, { key: "receptionDate", direction: "desc" });

  const columns = [
    {
      key: "receptionNumber" as keyof any,
      label: "N° Bon de réception",
      sortable: true,
      filterable: true,
      render: (value: string) => (
        <div className="flex items-center gap-1">
          <Package className="h-4 w-4" />
          <span className="font-mono font-medium text-primary">{value}</span>
        </div>
      ),
    },
    {
      key: "supplierName" as keyof any,
      label: "Fournisseur",
      sortable: true,
      filterable: true,
    },
    {
      key: "supplierOrderNumber" as keyof any,
      label: "Commande fournisseur",
      sortable: true,
      filterable: true,
    },
    {
      key: "receptionDate" as keyof any,
      label: "Date de réception",
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString("fr-FR"),
    },
    {
      key: "driverName" as keyof any,
      label: "Chauffeur",
      sortable: true,
      filterable: true,
    },
    {
      key: "vehicleRegistration" as keyof any,
      label: "Immatriculation",
      sortable: true,
      filterable: true,
    },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load company settings
      const settingsResult = await db.settings.get();
      if (settingsResult.success) {
        setCompanySettings(settingsResult.data);
      }
      
      // Load reception notes
      const receptionNotesResult = await db.receptionNotes.getAll();
      if (receptionNotesResult.success) {
        setReceptionNotes(receptionNotesResult.data || []);
      } else {
        setError(receptionNotesResult.error || "Erreur lors du chargement des bons de réception");
        toast({
          title: "Erreur",
          description: receptionNotesResult.error || "Erreur lors du chargement des bons de réception",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Failed to load data:", err);
      setError("Erreur lors du chargement des données");
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement des données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewReceptionNote = (receptionNote: any) => {
    // In a real app, this would open a reception note details modal
    alert(`Voir les détails du bon de réception ${receptionNote.receptionNumber}`);
  };

  const handleCreateReceptionNote = () => {
    setIsFormOpen(true);
  };

  const handleEditReceptionNote = (receptionNote: any) => {
    // In a real app, this would open a reception note edit form
    alert(`Modifier le bon de réception ${receptionNote.receptionNumber}`);
  };

  const handleDeleteReceptionNote = (receptionNote: any) => {
    setReceptionNoteToDelete(receptionNote);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteReceptionNote = async () => {
    if (!receptionNoteToDelete) return;
    
    try {
      const result = await db.receptionNotes.delete(receptionNoteToDelete.id);
      if (result.success) {
        toast({
          title: "Succès",
          description: "Bon de réception supprimé avec succès",
        });
        // Refresh data
        loadData();
      } else {
        throw new Error(result.error || "Failed to delete reception note");
      }
    } catch (error) {
      console.error("Failed to delete reception note:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression du bon de réception",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setReceptionNoteToDelete(null);
    }
  };

  const handleReceptionNoteCreated = () => {
    setIsFormOpen(false);
    loadData(); // Refresh the reception notes list
  };

  const renderActions = (receptionNote: any) => (
    <div className="flex justify-end gap-2">
      <PDFDownloadLink
        document={
          <ReceptionNotePDFDocument 
            receptionNote={receptionNote} 
            supplierOrder={receptionNote.supplierOrder}
            companySettings={companySettings}
          />
        }
        fileName={`bon-de-reception-${receptionNote.receptionNumber}.pdf`}
      >
        {({ loading }) => (
          <Button variant="outline" size="sm" disabled={loading}>
            <Download className="h-4 w-4" />
          </Button>
        )}
      </PDFDownloadLink>
      <Button variant="outline" size="sm" onClick={() => handleViewReceptionNote(receptionNote)}>
        <Eye className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleEditReceptionNote(receptionNote)}>
        <Edit className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleDeleteReceptionNote(receptionNote)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  if (loading) {
    return (
      <div className="p-6 flex flex-col gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Gestion des bons de réception</h1>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Gestion des bons de réception</h1>
          <p className="text-muted-foreground">
            Consultez et gérez tous vos bons de réception ({receptionNotes.length} bon{receptionNotes.length > 1 ? "s" : ""} de réception)
          </p>
        </div>
        <Button onClick={handleCreateReceptionNote} className="w-fit">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau bon de réception
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Reception Notes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Liste des bons de réception ({filteredReceptionNotes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredReceptionNotes}
            columns={columns}
            sortConfig={sortConfig}
            searchTerm={searchTerm}
            filters={filters}
            onSort={handleSort}
            onSearch={setSearchTerm}
            onFilter={handleFilter}
            onClearFilters={clearFilters}
            loading={loading}
            emptyMessage="Aucun bon de réception trouvé"
            actions={renderActions}
          />
        </CardContent>
      </Card>

      {/* Reception Note Form */}
      <ReceptionNoteForm
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onNoteCreated={handleReceptionNoteCreated}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer le bon de réception "{receptionNoteToDelete?.receptionNumber}" ? 
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteReceptionNote}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}