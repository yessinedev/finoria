"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Truck,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  AlertCircle,
  AlertTriangle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { useDataTable } from "@/hooks/use-data-table";
import { db } from "@/lib/database";
import type { Sale } from "@/types/types";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

export default function Delivery() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deliveryToDelete, setDeliveryToDelete] = useState<any | null>(null);
  const { toast } = useToast();

  // Data table configuration
  const {
    data: filteredDeliveries,
    searchTerm,
    setSearchTerm,
    handleSort,
    handleFilter,
    clearFilters,
    sortConfig,
    filters,
  } = useDataTable(deliveries, { key: "deliveryDate", direction: "desc" });

  const columns = [
    {
      key: "deliveryNumber" as keyof any,
      label: "N° Bon de livraison",
      sortable: true,
      filterable: true,
      render: (value: string) => (
        <div className="flex items-center gap-1">
          <Truck className="h-4 w-4" />
          <span className="font-mono font-medium text-primary">{value}</span>
        </div>
      ),
    },
    {
      key: "clientName" as keyof any,
      label: "Client",
      sortable: true,
      filterable: true,
      render: (value: string, delivery: any) => (
        <div>
          {value}
          {delivery.clientCompany && <div className="text-sm text-muted-foreground">({delivery.clientCompany})</div>}
        </div>
      ),
    },
    {
      key: "saleNumber" as keyof any,
      label: "Commande client",
      sortable: true,
      filterable: true,
    },
    {
      key: "deliveryDate" as keyof any,
      label: "Date de livraison",
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString("fr-FR"),
    },
    {
      key: "status" as keyof any,
      label: "Statut",
      sortable: true,
      filterable: true,
      filterType: "select" as const,
      filterOptions: [
        { label: "En préparation", value: "En préparation" },
        { label: "Expédié", value: "Expédié" },
        { label: "Livré", value: "Livré" },
        { label: "Annulé", value: "Annulé" },
      ],
      render: (value: string) => (
        <Badge variant={getStatusVariant(value)}>
          {value}
        </Badge>
      ),
    },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load sales to create deliveries from
      const salesResult = await db.sales.getAll();
      if (salesResult.success) {
        setSales(salesResult.data || []);
        // Create mock deliveries from sales (in a real app, these would come from a database)
        const mockDeliveries = (salesResult.data || []).map((sale: Sale, index: number) => ({
          id: index + 1,
          deliveryNumber: `BL-${new Date().getFullYear()}-${String(index + 1).padStart(4, '0')}`,
          clientName: sale.clientName,
          clientCompany: sale.clientCompany,
          saleId: sale.id,
          saleNumber: `CMD-${sale.id}`,
          deliveryDate: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString(),
          status: ["En préparation", "Expédié", "Livré", "Annulé"][Math.floor(Math.random() * 4)],
          items: sale.items || [],
        }));
        setDeliveries(mockDeliveries);
      } else {
        setError(salesResult.error || "Erreur lors du chargement des commandes");
        toast({
          title: "Erreur",
          description: salesResult.error || "Erreur lors du chargement des commandes",
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

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "Livré":
        return "default";
      case "Expédié":
        return "secondary";
      case "En préparation":
        return "outline";
      case "Annulé":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const handleViewDelivery = (delivery: any) => {
    // In a real app, this would open a delivery details modal
    alert(`Voir les détails du bon de livraison ${delivery.deliveryNumber}`);
  };

  const handleCreateDelivery = () => {
    // In a real app, this would open a delivery creation form
    alert("Créer un nouveau bon de livraison");
  };

  const handleEditDelivery = (delivery: any) => {
    // In a real app, this would open a delivery edit form
    alert(`Modifier le bon de livraison ${delivery.deliveryNumber}`);
  };

  const handleDeleteDelivery = (delivery: any) => {
    setDeliveryToDelete(delivery);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteDelivery = () => {
    // In a real app, this would delete the delivery
    toast({
      title: "Succès",
      description: "Bon de livraison supprimé avec succès",
    });
    // Refresh data
    loadData();
    setIsDeleteDialogOpen(false);
    setDeliveryToDelete(null);
  };

  const renderActions = (delivery: any) => (
    <div className="flex justify-end gap-2">
      <Button variant="outline" size="sm" onClick={() => handleViewDelivery(delivery)}>
        <Eye className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleEditDelivery(delivery)}>
        <Edit className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleDeleteDelivery(delivery)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  if (loading) {
    return (
      <div className="p-6 flex flex-col gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Gestion des bons de livraison</h1>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Gestion des bons de livraison</h1>
          <p className="text-muted-foreground">
            Consultez et gérez tous vos bons de livraison ({deliveries.length} bon{deliveries.length > 1 ? "s" : ""} de livraison)
          </p>
        </div>
        <Button onClick={handleCreateDelivery} className="w-fit">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau bon de livraison
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Deliveries Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Liste des bons de livraison ({filteredDeliveries.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredDeliveries}
            columns={columns}
            sortConfig={sortConfig}
            searchTerm={searchTerm}
            filters={filters}
            onSort={handleSort}
            onSearch={setSearchTerm}
            onFilter={handleFilter}
            onClearFilters={clearFilters}
            loading={loading}
            emptyMessage="Aucun bon de livraison trouvé"
            actions={renderActions}
          />
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
              Êtes-vous sûr de vouloir supprimer le bon de livraison "{deliveryToDelete?.deliveryNumber}" ? 
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
              onClick={confirmDeleteDelivery}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
