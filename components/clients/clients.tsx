"use client";

import type { Client } from "@/types/types";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2, Users, AlertCircle, AlertTriangle, MoreVertical } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DataTable } from "@/components/ui/data-table";
import { useDataTable } from "@/hooks/use-data-table";
import { db } from "@/lib/database";
import ClientFormModal from "@/components/clients/ClientFormModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { ActionsDropdown } from "@/components/common/actions-dropdown";

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [canDeleteMap, setCanDeleteMap] = useState<Record<number, boolean>>({});
  const { toast } = useToast();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    company: "",
  });

  // Data table configuration
  const {
    data: filteredClients,
    searchTerm,
    setSearchTerm,
    handleSort,
    handleFilter,
    clearFilters,
    sortConfig,
    filters,
  } = useDataTable(clients, { key: "name", direction: "asc" });

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentClients = filteredClients.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const columns = [
    {
      key: "name" as keyof Client,
      label: "Nom",
      sortable: true,
      filterable: true,
      render: (value: string, client: Client) => (
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4" />
          <div>
            <div className="font-medium">{value}</div>
            <div className="text-sm text-muted-foreground">{client.company}</div>
          </div>
        </div>
      ),
    },
    {
      key: "email" as keyof Client,
      label: "Email",
      sortable: true,
      filterable: true,
    },
    {
      key: "phone" as keyof Client,
      label: "Téléphone",
      sortable: true,
      filterable: true,
    },
    {
      key: "createdAt" as keyof Client,
      label: "Date de création",
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString("fr-FR"),
    },
  ];

  useEffect((): (() => void) => {
    loadClients();

    // Subscribe to real-time updates
    const unsubscribe = db.subscribe((table) => {
      if (table === "clients") {
        loadClients(); // Refresh data when clients change
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadClients = async () => {
    setLoading(true);
    setError(null);

    const result = await db.clients.getAll();
    if (result.success) {
      setClients(result.data || []);
      // Check which clients can be deleted
      const deleteChecks = await Promise.all(
        (result.data || []).map(async (client) => {
          const checkResult = await db.clients.canDelete(client.id);
          return { id: client.id, canDelete: checkResult.success && checkResult.data };
        })
      );
      const newCanDeleteMap: Record<number, boolean> = {};
      deleteChecks.forEach(({ id, canDelete }) => {
        newCanDeleteMap[id] = canDelete;
      });
      setCanDeleteMap(newCanDeleteMap);
    } else {
      setError(result.error || "Erreur lors du chargement des clients");
    }

    setLoading(false);
  };

  const handleClientFormSubmit = async (formData: any, editingClient: Client | null) => {
    setSaving(true);
    setError(null);
    try {
      let result;
      if (editingClient) {
        result = await db.clients.update(editingClient.id, formData);
      } else {
        result = await db.clients.create(formData);
      }
      if (result.success) {
        await loadClients();
        resetForm();
        toast({
          title: "Succès",
          description: editingClient 
            ? "Client mis à jour avec succès" 
            : "Client créé avec succès",
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
      setError(String(error));
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
    setFormData({ name: "", email: "", phone: "", address: "", company: "" });
    setEditingClient(null);
    setIsDialogOpen(false);
    setError(null);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone || "",
      address: client.address || "",
      company: client.company,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (client: Client) => {
    setClientToDelete(client);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;

    try {
      const result = await db.clients.delete(clientToDelete.id);
      if (result.success) {
        await loadClients();
        setIsDeleteDialogOpen(false);
        setClientToDelete(null);
        toast({
          title: "Succès",
          description: "Client supprimé avec succès",
        });
      } else {
        throw new Error(result.error || "Erreur lors de la suppression");
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de la suppression du client",
        variant: "destructive",
      });
    }
  };

  const renderActions = (client: Client) => (
    <ActionsDropdown
      actions={[
        {
          label: "Modifier",
          icon: <Edit className="h-4 w-4" />,
          onClick: () => handleEdit(client),
        },
        {
          label: "Supprimer",
          icon: <Trash2 className="h-4 w-4" />,
          onClick: () => handleDelete(client),
          className: "text-red-600",
          disabled: !canDeleteMap[client.id],
        },
      ]}
    />
  );

  if (loading && !isDialogOpen) {
    return (
      <div className="p-6 flex flex-col gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Gestion des clients</h1>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Gestion des clients</h1>
          <p className="text-muted-foreground">
            Gérez votre base de données clients ({clients.length} client
            {clients.length > 1 ? "s" : ""})
          </p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau client
        </Button>
        <ClientFormModal
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSubmit={handleClientFormSubmit}
          editingClient={editingClient}
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
            <Users className="h-5 w-5" />
            Liste des clients
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={currentClients}
            columns={columns}
            sortConfig={sortConfig}
            searchTerm={searchTerm}
            filters={filters}
            onSort={handleSort}
            onSearch={setSearchTerm}
            onFilter={handleFilter}
            onClearFilters={clearFilters}
            loading={loading}
            emptyMessage="Aucun client trouvé"
            actions={renderActions}
          />
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Affichage de {indexOfFirstItem + 1} à {Math.min(indexOfLastItem, filteredClients.length)} sur {filteredClients.length} clients
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => paginate(currentPage - 1)}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => paginate(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => paginate(currentPage + 1)}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûrs de vouloir supprimer le client &quot;{clientToDelete?.name}&quot; ? 
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
              onClick={confirmDelete}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}