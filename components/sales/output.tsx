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
  ArrowUpDown,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { useDataTable } from "@/hooks/use-data-table";
import { db } from "@/lib/database";
import type { Product } from "@/types/types";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

export default function Output() {
  const [outputs, setOutputs] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [outputToDelete, setOutputToDelete] = useState<any | null>(null);
  const { toast } = useToast();

  // Data table configuration
  const {
    data: filteredOutputs,
    searchTerm,
    setSearchTerm,
    handleSort,
    handleFilter,
    clearFilters,
    sortConfig,
    filters,
  } = useDataTable(outputs, { key: "outputDate", direction: "desc" });

  const columns = [
    {
      key: "outputNumber" as keyof any,
      label: "N° Bon de sortie",
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
      key: "productName" as keyof any,
      label: "Produit",
      sortable: true,
      filterable: true,
    },
    {
      key: "quantity" as keyof any,
      label: "Quantité",
      sortable: true,
    },
    {
      key: "outputDate" as keyof any,
      label: "Date de sortie",
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString("fr-FR"),
    },
    {
      key: "destination" as keyof any,
      label: "Destination",
      sortable: true,
      filterable: true,
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
      // Load products to create outputs from
      const productsResult = await db.products.getAll();
      if (productsResult.success) {
        setProducts(productsResult.data || []);
        // Create mock outputs from products (in a real app, these would come from a database)
        const mockOutputs = (productsResult.data || []).slice(0, 10).map((product: Product, index: number) => ({
          id: index + 1,
          outputNumber: `BS-${new Date().getFullYear()}-${String(index + 1).padStart(4, '0')}`,
          productName: product.name,
          productId: product.id,
          quantity: Math.floor(Math.random() * 100) + 1,
          outputDate: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString(),
          destination: ["Entrepôt A", "Entrepôt B", "Client Direct", "Transit"][Math.floor(Math.random() * 4)],
          status: ["En préparation", "Expédié", "Livré", "Annulé"][Math.floor(Math.random() * 4)],
        }));
        setOutputs(mockOutputs);
      } else {
        setError(productsResult.error || "Erreur lors du chargement des produits");
        toast({
          title: "Erreur",
          description: productsResult.error || "Erreur lors du chargement des produits",
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

  const handleViewOutput = (output: any) => {
    // In a real app, this would open an output details modal
    alert(`Voir les détails du bon de sortie ${output.outputNumber}`);
  };

  const handleCreateOutput = () => {
    // In a real app, this would open an output creation form
    alert("Créer un nouveau bon de sortie");
  };

  const handleEditOutput = (output: any) => {
    // In a real app, this would open an output edit form
    alert(`Modifier le bon de sortie ${output.outputNumber}`);
  };

  const handleDeleteOutput = (output: any) => {
    setOutputToDelete(output);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteOutput = () => {
    // In a real app, this would delete the output
    toast({
      title: "Succès",
      description: "Bon de sortie supprimé avec succès",
    });
    // Refresh data
    loadData();
    setIsDeleteDialogOpen(false);
    setOutputToDelete(null);
  };

  const renderActions = (output: any) => (
    <div className="flex justify-end gap-2">
      <Button variant="outline" size="sm" onClick={() => handleViewOutput(output)}>
        <Eye className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleEditOutput(output)}>
        <Edit className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleDeleteOutput(output)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  if (loading) {
    return (
      <div className="p-6 flex flex-col gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Gestion des bons de sortie</h1>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Gestion des bons de sortie</h1>
          <p className="text-muted-foreground">
            Consultez et gérez tous vos bons de sortie ({outputs.length} bon{outputs.length > 1 ? "s" : ""} de sortie)
          </p>
        </div>
        <Button onClick={handleCreateOutput} className="w-fit">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau bon de sortie
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Outputs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Liste des bons de sortie ({filteredOutputs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredOutputs}
            columns={columns}
            sortConfig={sortConfig}
            searchTerm={searchTerm}
            filters={filters}
            onSort={handleSort}
            onSearch={setSearchTerm}
            onFilter={handleFilter}
            onClearFilters={clearFilters}
            loading={loading}
            emptyMessage="Aucun bon de sortie trouvé"
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
              Êtes-vous sûr de vouloir supprimer le bon de sortie "{outputToDelete?.outputNumber}" ? 
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
              onClick={confirmDeleteOutput}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}