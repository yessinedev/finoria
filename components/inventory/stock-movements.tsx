"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  TrendingUp, 
  TrendingDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { db } from "@/lib/database";
import { StockMovement } from "@/types/types";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function StockMovements() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [filteredMovements, setFilteredMovements] = useState<StockMovement[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [movementSortConfig, setMovementSortConfig] = useState<{ key: keyof StockMovement; direction: 'asc' | 'desc' }>({ 
    key: 'createdAt', 
    direction: 'desc' 
  });
  const [movementLoading, setMovementLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [movementCurrentPage, setMovementCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const { toast } = useToast();

  useEffect(() => {
    loadMovements();
  }, []);

  useEffect(() => {
    let filtered = movements.filter(
      (movement) =>
        movement.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        movement.reference.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Apply sorting
    if (movementSortConfig.key) {
      filtered.sort((a, b) => {
        // Add null checks for the sort keys
        const aValue = a[movementSortConfig.key];
        const bValue = b[movementSortConfig.key];
        
        if (aValue == null || bValue == null) {
          return 0;
        }
        
        if (aValue < bValue) {
          return movementSortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return movementSortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    setFilteredMovements(filtered);
    setMovementCurrentPage(1); // Reset to first page when filters change
  }, [searchTerm, movements, movementSortConfig]);

  const loadMovements = async () => {
    try {
      setMovementLoading(true);
      setError(null);
      
      // Check if electronAPI is available
      if (typeof window === "undefined" || !window.electronAPI) {
        throw new Error("Electron API not available");
      }
      
      const response = await db.stockMovements.getAll();
      if (response.success && response.data) {
        setMovements(response.data);
      } else {
        throw new Error(response.error || "Failed to load stock movements");
      }
    } catch (error) {
      console.error("Error loading stock movements:", error);
      setError(error instanceof Error ? error.message : "Erreur lors du chargement des mouvements de stock");
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors du chargement des mouvements de stock",
        variant: "destructive",
      });
    } finally {
      setMovementLoading(false);
    }
  };

  // Sorting functions
  const requestMovementSort = (key: keyof StockMovement) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (movementSortConfig.key === key && movementSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setMovementSortConfig({ key, direction });
  };

  // Get movement type badge
  const getMovementTypeBadge = (type: 'IN' | 'OUT') => {
    if (type === 'IN') {
      return <Badge variant="default" className="bg-green-500">Entrée</Badge>;
    } else {
      return <Badge variant="destructive">Sortie</Badge>;
    }
  };

  // Pagination
  const indexOfLastMovement = movementCurrentPage * itemsPerPage;
  const indexOfFirstMovement = indexOfLastMovement - itemsPerPage;
  const currentMovements = filteredMovements.slice(indexOfFirstMovement, indexOfLastMovement);
  const totalMovementPages = Math.ceil(filteredMovements.length / itemsPerPage);

  const paginateMovements = (pageNumber: number) => setMovementCurrentPage(pageNumber);

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            Mouvements de stock
          </h1>
          <p className="text-muted-foreground">
            Historique des mouvements de stock
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Rechercher des mouvements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stock Movements Tab */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Historique des mouvements ({filteredMovements.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => requestMovementSort('createdAt')}>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      <span>Date</span>
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => requestMovementSort('productName')}>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      <span>Produit</span>
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => requestMovementSort('reference')}>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      <span>Référence</span>
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => requestMovementSort('movementType')}>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      <span>Type</span>
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => requestMovementSort('quantity')}>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      <span>Quantité</span>
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      <span>Raison</span>
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movementLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      Chargement...
                    </TableCell>
                  </TableRow>
                ) : currentMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      Aucun mouvement trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  currentMovements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        {format(new Date(movement.createdAt), "dd/MM/yyyy HH:mm", { locale: fr })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {movement.productName}
                      </TableCell>
                      <TableCell>
                        {movement.reference}
                      </TableCell>
                      <TableCell>
                        {getMovementTypeBadge(movement.movementType)}
                      </TableCell>
                      <TableCell>
                        <div className={`font-medium ${movement.movementType === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                          {movement.movementType === 'IN' ? '+' : '-'}{movement.quantity}
                        </div>
                      </TableCell>
                      <TableCell>
                        {movement.reason}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalMovementPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Affichage de {indexOfFirstMovement + 1} à {Math.min(indexOfLastMovement, filteredMovements.length)} sur {filteredMovements.length} mouvements
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => paginateMovements(movementCurrentPage - 1)}
                  disabled={movementCurrentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-medium">
                  Page {movementCurrentPage} sur {totalMovementPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => paginateMovements(movementCurrentPage + 1)}
                  disabled={movementCurrentPage === totalMovementPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}