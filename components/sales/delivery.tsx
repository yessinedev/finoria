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
  ChevronRight,
  Download
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
import { PDFDownloadLink } from "@react-pdf/renderer";
import { DeliveryReceiptPDFDocument } from "@/components/sales/delivery-receipt-pdf";
import DeliveryReceiptForm from "@/components/sales/DeliveryReceiptForm";

export default function Delivery() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deliveryToDelete, setDeliveryToDelete] = useState<any | null>(null);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
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
      
      // Load delivery receipts
      const deliveriesResult = await db.deliveryReceipts.getAll();
      if (deliveriesResult.success) {
        // Transform delivery receipts to match the expected format
        const formattedDeliveries = (deliveriesResult.data || []).map((delivery: any) => ({
          ...delivery,
          saleNumber: `CMD-${delivery.saleId}`,
          items: delivery.items || []
        }));
        setDeliveries(formattedDeliveries);
      } else {
        setError(deliveriesResult.error || "Erreur lors du chargement des bons de livraison");
        toast({
          title: "Erreur",
          description: deliveriesResult.error || "Erreur lors du chargement des bons de livraison",
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

  const handleViewDelivery = (delivery: any) => {
    // In a real app, this would open a delivery details modal
    alert(`Voir les détails du bon de livraison ${delivery.deliveryNumber}`);
  };

  const handleCreateDelivery = () => {
    setIsFormOpen(true);
  };

  const handleEditDelivery = (delivery: any) => {
    // In a real app, this would open a delivery edit form
    alert(`Modifier le bon de livraison ${delivery.deliveryNumber}`);
  };

  const handleDeleteDelivery = (delivery: any) => {
    setDeliveryToDelete(delivery);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteDelivery = async () => {
    if (!deliveryToDelete) return;
    
    try {
      const result = await db.deliveryReceipts.delete(deliveryToDelete.id);
      if (result.success) {
        toast({
          title: "Succès",
          description: "Bon de livraison supprimé avec succès",
        });
        // Refresh data
        loadData();
      } else {
        throw new Error(result.error || "Failed to delete delivery receipt");
      }
    } catch (error) {
      console.error("Failed to delete delivery receipt:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression du bon de livraison",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setDeliveryToDelete(null);
    }
  };

  const handleReceiptCreated = () => {
    setIsFormOpen(false);
    loadData(); // Refresh the delivery receipts list
  };

  const renderActions = (delivery: any) => (
    <div className="flex justify-end gap-2">
      <PDFDownloadLink
        document={
          <DeliveryReceiptPDFDocument 
            deliveryReceipt={delivery} 
            sale={delivery.sale}
            companySettings={companySettings}
          />
        }
        fileName={`bon-de-livraison-${delivery.deliveryNumber}.pdf`}
      >
        {({ loading }) => (
          <Button variant="outline" size="sm" disabled={loading}>
            <Download className="h-4 w-4" />
          </Button>
        )}
      </PDFDownloadLink>
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

      {/* Delivery Receipt Form */}
      <DeliveryReceiptForm
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onReceiptCreated={handleReceiptCreated}
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