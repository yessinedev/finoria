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
import { Search, Plus, Edit, Trash2, FileText } from "lucide-react";
import { db } from "@/lib/database";
import { SupplierInvoice, Supplier, SupplierOrder } from "@/types/types";
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

export default function SupplierInvoices() {
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<SupplierInvoice[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<SupplierInvoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    supplierId: 0,
    orderId: 0,
    invoiceNumber: "",
    amount: 0,
    taxAmount: 0,
    totalAmount: 0,
    status: "En attente",
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    paymentDate: "",
  });

  useEffect(() => {
    loadInvoices();
    loadSuppliers();
    loadOrders();
  }, []);

  useEffect(() => {
    const filtered = invoices.filter(
      (invoice) =>
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredInvoices(filtered);
  }, [searchTerm, invoices]);

  const loadInvoices = async () => {
    try {
      setIsLoading(true);
      const response = await db.supplierInvoices.getAll();
      if (response.success && response.data) {
        setInvoices(response.data);
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement des factures fournisseurs",
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

  const loadOrders = async () => {
    try {
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
    }
  };

  const handleCreate = async () => {
    try {
      const invoiceData = {
        ...formData,
        supplierId: Number(formData.supplierId),
        orderId: formData.orderId ? Number(formData.orderId) : null,
        amount: Number(formData.amount),
        taxAmount: Number(formData.taxAmount),
        totalAmount: Number(formData.totalAmount),
      };

      const response = await db.supplierInvoices.create(invoiceData);
      if (response.success && response.data) {
        setInvoices([...invoices, response.data]);
        resetForm();
        setIsDialogOpen(false);
        toast({
          title: "Succès",
          description: "Facture fournisseur créée avec succès",
        });
      } else {
        throw new Error(response.error || "Erreur lors de la création");
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de la création de la facture",
        variant: "destructive",
      });
    }
  };

  const handleUpdate = async () => {
    if (!currentInvoice) return;
    
    try {
      const invoiceData = {
        ...formData,
        supplierId: Number(formData.supplierId),
        orderId: formData.orderId ? Number(formData.orderId) : null,
        amount: Number(formData.amount),
        taxAmount: Number(formData.taxAmount),
        totalAmount: Number(formData.totalAmount),
      };

      const response = await db.supplierInvoices.update(currentInvoice.id, invoiceData);
      if (response.success && response.data) {
        setInvoices(
          invoices.map((i) => (i.id === currentInvoice.id ? response.data : i))
        );
        resetForm();
        setIsDialogOpen(false);
        toast({
          title: "Succès",
          description: "Facture fournisseur mise à jour avec succès",
        });
      } else {
        throw new Error(response.error || "Erreur lors de la mise à jour");
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de la mise à jour de la facture",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await db.supplierInvoices.delete(id);
      if (response.success) {
        setInvoices(invoices.filter((i) => i.id !== id));
        toast({
          title: "Succès",
          description: "Facture fournisseur supprimée avec succès",
        });
      } else {
        throw new Error(response.error || "Erreur lors de la suppression");
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de la suppression de la facture",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      supplierId: 0,
      orderId: 0,
      invoiceNumber: "",
      amount: 0,
      taxAmount: 0,
      totalAmount: 0,
      status: "En attente",
      issueDate: new Date().toISOString().split("T")[0],
      dueDate: "",
      paymentDate: "",
    });
    setCurrentInvoice(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (invoice: SupplierInvoice) => {
    setFormData({
      supplierId: invoice.supplierId,
      orderId: invoice.orderId || 0,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount,
      taxAmount: invoice.taxAmount,
      totalAmount: invoice.totalAmount,
      status: invoice.status,
      issueDate: invoice.issueDate.split("T")[0],
      dueDate: invoice.dueDate ? invoice.dueDate.split("T")[0] : "",
      paymentDate: invoice.paymentDate ? invoice.paymentDate.split("T")[0] : "",
    });
    setCurrentInvoice(invoice);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentInvoice) {
      handleUpdate();
    } else {
      handleCreate();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "En attente":
        return <Badge variant="secondary">En attente</Badge>;
      case "Payée":
        return <Badge variant="default">Payée</Badge>;
      case "En retard":
        return <Badge variant="destructive">En retard</Badge>;
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
          <h1 className="text-3xl font-bold">Factures Fournisseurs</h1>
          <p className="text-muted-foreground">
            Gérez les factures reçues de vos fournisseurs
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle facture
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {currentInvoice ? "Modifier la facture" : "Nouvelle facture"}
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
                <Label htmlFor="orderId">Commande associée</Label>
                <Select
                  value={formData.orderId.toString()}
                  onValueChange={(value) => setFormData({ ...formData, orderId: Number(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une commande" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Aucune</SelectItem>
                    {orders.map((order) => (
                      <SelectItem key={order.id} value={order.id.toString()}>
                        {order.orderNumber} - {order.supplierName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">Numéro de facture *</Label>
                <Input
                  id="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="issueDate">Date d'émission *</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Date d'échéance</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Montant HT (TND) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
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
                <Label htmlFor="totalAmount">Montant TTC (TND) *</Label>
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
                    <SelectItem value="Payée">Payée</SelectItem>
                    <SelectItem value="En retard">En retard</SelectItem>
                    <SelectItem value="Annulée">Annulée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentDate">Date de paiement</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                />
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
                  {currentInvoice ? "Mettre à jour" : "Créer"}
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
            placeholder="Rechercher des factures..."
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
            ) : filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Aucune facture trouvée
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                  <TableCell>
                    {invoice.supplierName} {invoice.supplierCompany && `(${invoice.supplierCompany})`}
                  </TableCell>
                  <TableCell>
                    {format(new Date(invoice.issueDate), "dd/MM/yyyy", { locale: fr })}
                  </TableCell>
                  <TableCell>
                    {invoice.totalAmount.toFixed(3)} TND
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(invoice.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(invoice)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(invoice.id)}
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