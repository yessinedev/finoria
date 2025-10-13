"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit, Trash2, ShoppingCart } from "lucide-react";
import { db } from "@/lib/database";
import { SupplierOrder, Supplier } from "@/types/types";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function SupplierOrders() {
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<SupplierOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<SupplierOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    supplierId: 0,
    orderNumber: "",
    totalAmount: 0,
    taxAmount: 0,
    status: "En attente",
    orderDate: new Date().toISOString().split("T")[0],
    deliveryDate: "",
  });

  useEffect(() => {
    loadOrders();
    loadSuppliers();
  }, []);

  useEffect(() => {
    const filtered = orders.filter(
      (order) =>
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredOrders(filtered);
  }, [searchTerm, orders]);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const response = await db.supplierOrders.getAll();
      if (response.success && response.data) {
        setOrders(response.data);
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement des commandes fournisseurs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadSuppliers = async () => {
    try {
      const response = await db.suppliers.getAll();
      if (response.success && response.data) {
        setSuppliers(response.data);
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement des fournisseurs",
        variant: "destructive",
      });
    }
  };

  const handleCreate = async () => {
    try {
      const orderData = {
        ...formData,
        supplierId: Number(formData.supplierId),
        totalAmount: Number(formData.totalAmount),
        taxAmount: Number(formData.taxAmount),
      };

      const response = await db.supplierOrders.create(orderData);
      if (response.success && response.data) {
        setOrders([...orders, response.data]);
        resetForm();
        setIsDialogOpen(false);
        toast({
          title: "Succès",
          description: "Commande fournisseur créée avec succès",
        });
      } else {
        throw new Error(response.error || "Erreur lors de la création");
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de la création de la commande",
        variant: "destructive",
      });
    }
  };

  const handleUpdate = async () => {
    if (!currentOrder) return;
    
    try {
      const orderData = {
        ...formData,
        supplierId: Number(formData.supplierId),
        totalAmount: Number(formData.totalAmount),
        taxAmount: Number(formData.taxAmount),
      };

      const response = await db.supplierOrders.update(currentOrder.id, orderData);
      if (response.success && response.data) {
        setOrders(
          orders.map((o) => (o.id === currentOrder.id ? response.data : o))
        );
        resetForm();
        setIsDialogOpen(false);
        toast({
          title: "Succès",
          description: "Commande fournisseur mise à jour avec succès",
        });
      } else {
        throw new Error(response.error || "Erreur lors de la mise à jour");
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de la mise à jour de la commande",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await db.supplierOrders.delete(id);
      if (response.success) {
        setOrders(orders.filter((o) => o.id !== id));
        toast({
          title: "Succès",
          description: "Commande fournisseur supprimée avec succès",
        });
      } else {
        throw new Error(response.error || "Erreur lors de la suppression");
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de la suppression de la commande",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      supplierId: 0,
      orderNumber: "",
      totalAmount: 0,
      taxAmount: 0,
      status: "En attente",
      orderDate: new Date().toISOString().split("T")[0],
      deliveryDate: "",
    });
    setCurrentOrder(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (order: SupplierOrder) => {
    setFormData({
      supplierId: order.supplierId,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      taxAmount: order.taxAmount,
      status: order.status,
      orderDate: order.orderDate.split("T")[0],
      deliveryDate: order.deliveryDate ? order.deliveryDate.split("T")[0] : "",
    });
    setCurrentOrder(order);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentOrder) {
      handleUpdate();
    } else {
      handleCreate();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "En attente":
        return <Badge variant="secondary">En attente</Badge>;
      case "Confirmée":
        return <Badge variant="default">Confirmée</Badge>;
      case "Livrée":
        return <Badge variant="default">Livrée</Badge>;
      case "Annulée":
        return <Badge variant="destructive">Annulée</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Commandes Fournisseurs</h1>
          <p className="text-muted-foreground">
            Gérez les commandes passées auprès de vos fournisseurs
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle commande
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {currentOrder ? "Modifier la commande" : "Nouvelle commande"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="supplierId">Fournisseur *</Label>
                <Select
                  value={formData.supplierId.toString()}
                  onValueChange={(value) => setFormData({ ...formData, supplierId: Number(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un fournisseur" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id.toString()}>
                        {supplier.name} {supplier.company && `(${supplier.company})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="orderNumber">Numéro de commande *</Label>
                <Input
                  id="orderNumber"
                  value={formData.orderNumber}
                  onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orderDate">Date de commande *</Label>
                <Input
                  id="orderDate"
                  type="date"
                  value={formData.orderDate}
                  onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryDate">Date de livraison prévue</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalAmount">Montant total (TND) *</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  step="0.01"
                  value={formData.totalAmount}
                  onChange={(e) => setFormData({ ...formData, totalAmount: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxAmount">Montant TVA (TND) *</Label>
                <Input
                  id="taxAmount"
                  type="number"
                  step="0.01"
                  value={formData.taxAmount}
                  onChange={(e) => setFormData({ ...formData, taxAmount: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Statut</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="En attente">En attente</SelectItem>
                    <SelectItem value="Confirmée">Confirmée</SelectItem>
                    <SelectItem value="Livrée">Livrée</SelectItem>
                    <SelectItem value="Annulée">Annulée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button type="submit">
                  {currentOrder ? "Mettre à jour" : "Créer"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6">
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Rechercher des commandes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numéro</TableHead>
              <TableHead>Fournisseur</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Aucune commande trouvée
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.orderNumber}</TableCell>
                  <TableCell>
                    {order.supplierName} {order.supplierCompany && `(${order.supplierCompany})`}
                  </TableCell>
                  <TableCell>
                    {format(new Date(order.orderDate), "dd/MM/yyyy", { locale: fr })}
                  </TableCell>
                  <TableCell>
                    {order.totalAmount.toFixed(3)} TND
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(order.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(order)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(order.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}