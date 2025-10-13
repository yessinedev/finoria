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
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  FileText, 
  Eye, 
  Download, 
  Printer,
  AlertTriangle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { db } from "@/lib/database";
import { SupplierInvoice, Supplier, SupplierOrder, Product } from "@/types/types";
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
import { pdf } from "@react-pdf/renderer";
import SupplierInvoicePDF from "./supplier-invoice-pdf";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supplierInvoiceSchema, SupplierInvoiceFormData } from "@/lib/validation/schemas";
import { z } from "zod";

export default function SupplierInvoices() {
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<SupplierInvoice[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<SupplierInvoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<SupplierInvoice | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<SupplierInvoice | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof SupplierInvoice; direction: 'asc' | 'desc' }>({ 
    key: 'issueDate', 
    direction: 'desc' 
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const { toast } = useToast();

  // Form state
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

  // Invoice items state
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemUnitPrice, setItemUnitPrice] = useState(0);

  // Validation errors state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadInvoices();
    loadSuppliers();
    loadOrders();
    loadProducts();
  }, []);

  useEffect(() => {
    let filtered = invoices.filter(
      (invoice) =>
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        // Add null checks for the sort keys
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue == null || bValue == null) {
          return 0;
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    setFilteredInvoices(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchTerm, invoices, sortConfig]);

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

  const loadProducts = async () => {
    try {
      const response = await db.products.getAll();
      if (response.success && response.data) {
        setProducts(response.data);
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement des produits",
        variant: "destructive",
      });
    }
  };

  const validateForm = () => {
    try {
      // Validate main form data
      const mainData = {
        ...formData,
        supplierId: Number(formData.supplierId),
        orderId: formData.orderId ? Number(formData.orderId) : undefined,
        items: invoiceItems,
      };
      
      supplierInvoiceSchema.parse(mainData);
      setErrors({});
      setItemErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        const newItemErrors: Record<string, string> = {};
        
        error.errors.forEach((err) => {
          if (err.path.length > 0) {
            // Handle items array errors
            if (err.path[0] === 'items' && err.path.length > 2) {
              const itemIndex = err.path[1];
              const fieldName = err.path[2];
              newItemErrors[`${itemIndex}-${fieldName}`] = err.message;
            } else if (err.path[0] !== 'items') {
              newErrors[err.path[0]] = err.message;
            }
          }
        });
        
        setErrors(newErrors);
        setItemErrors(newItemErrors);
        return false;
      }
      return false;
    }
  };

  const handleCreate = async () => {
    if (!validateForm()) {
      toast({
        title: "Erreur de validation",
        description: "Veuillez corriger les erreurs dans le formulaire",
        variant: "destructive",
      });
      return;
    }

    try {
      // Calculate totals
      const subtotal = invoiceItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const taxAmount = subtotal * 0.19; // 19% VAT
      const totalAmount = subtotal + taxAmount;

      const invoiceData = {
        ...formData,
        supplierId: Number(formData.supplierId),
        orderId: formData.orderId ? Number(formData.orderId) : null,
        amount: Number(subtotal.toFixed(2)),
        taxAmount: Number(taxAmount.toFixed(2)),
        totalAmount: Number(totalAmount.toFixed(2)),
        items: invoiceItems,
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
    
    if (!validateForm()) {
      toast({
        title: "Erreur de validation",
        description: "Veuillez corriger les erreurs dans le formulaire",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Calculate totals
      const subtotal = invoiceItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const taxAmount = subtotal * 0.19; // 19% VAT
      const totalAmount = subtotal + taxAmount;

      const invoiceData = {
        ...formData,
        supplierId: Number(formData.supplierId),
        orderId: formData.orderId ? Number(formData.orderId) : null,
        amount: Number(subtotal.toFixed(2)),
        taxAmount: Number(taxAmount.toFixed(2)),
        totalAmount: Number(totalAmount.toFixed(2)),
        items: invoiceItems,
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
        setIsDeleteDialogOpen(false);
        setInvoiceToDelete(null);
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
    setInvoiceItems([]);
    setSelectedProduct(null);
    setItemQuantity(1);
    setItemUnitPrice(0);
    setCurrentInvoice(null);
    setErrors({});
    setItemErrors({});
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
    setInvoiceItems(invoice.items || []);
    setCurrentInvoice(invoice);
    setErrors({});
    setItemErrors({});
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (invoice: SupplierInvoice) => {
    setInvoiceToDelete(invoice);
    setIsDeleteDialogOpen(true);
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

  const handleViewInvoice = (invoice: SupplierInvoice) => {
    setSelectedInvoice(invoice);
    setIsPreviewOpen(true);
  };

  const handleDownloadPDF = async (invoice: SupplierInvoice) => {
    try {
      const blob = await pdf(<SupplierInvoicePDF invoice={invoice} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `facture-fournisseur-${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors du téléchargement du PDF",
        variant: "destructive",
      });
    }
  };

  const addInvoiceItem = () => {
    if (!selectedProduct || itemQuantity <= 0 || itemUnitPrice <= 0) return;

    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    const totalPrice = itemQuantity * itemUnitPrice;

    const newItem = {
      id: Date.now(), // Temporary ID for new items
      productId: selectedProduct,
      productName: product.name,
      quantity: itemQuantity,
      unitPrice: itemUnitPrice,
      totalPrice: parseFloat(totalPrice.toFixed(2)),
    };

    setInvoiceItems([...invoiceItems, newItem]);
    setSelectedProduct(null);
    setItemQuantity(1);
    setItemUnitPrice(0);
    setItemErrors({}); // Clear item errors when adding new item
  };

  const removeInvoiceItem = (id: number) => {
    setInvoiceItems(invoiceItems.filter(item => item.id !== id));
  };

  // Sorting functions
  const requestSort = (key: keyof SupplierInvoice) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentInvoices = filteredInvoices.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Factures Fournisseurs
          </h1>
          <p className="text-muted-foreground">
            Gérez les factures de vos fournisseurs
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle facture
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {currentInvoice ? "Modifier la facture" : "Nouvelle facture"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplierId">Fournisseur *</Label>
                  <Select
                    value={formData.supplierId.toString()}
                    onValueChange={(value) => setFormData({ ...formData, supplierId: Number(value) })}
                  >
                    <SelectTrigger className={errors.supplierId ? "border-red-500" : ""}>
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
                  {errors.supplierId && (
                    <p className="text-sm text-red-500">{errors.supplierId}</p>
                  )}
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
                      {orders
                        .filter(order => order.supplierId === formData.supplierId)
                        .map((order) => (
                          <SelectItem key={order.id} value={order.id.toString()}>
                            {order.orderNumber}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoiceNumber">Numéro de facture *</Label>
                  <Input
                    id="invoiceNumber"
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    className={errors.invoiceNumber ? "border-red-500" : ""}
                    required
                  />
                  {errors.invoiceNumber && (
                    <p className="text-sm text-red-500">{errors.invoiceNumber}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="issueDate">Date d'émission *</Label>
                  <Input
                    id="issueDate"
                    type="date"
                    value={formData.issueDate}
                    onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                    className={errors.issueDate ? "border-red-500" : ""}
                    required
                  />
                  {errors.issueDate && (
                    <p className="text-sm text-red-500">{errors.issueDate}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Date d'échéance *</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className={errors.dueDate ? "border-red-500" : ""}
                    required
                  />
                  {errors.dueDate && (
                    <p className="text-sm text-red-500">{errors.dueDate}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Articles</Label>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                  <div className="md:col-span-5">
                    <Label>Produit</Label>
                    <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={productSearchOpen}
                          className="w-full justify-between"
                        >
                          {selectedProduct
                            ? products.find((product) => product.id === selectedProduct)?.name
                            : "Sélectionner un produit..."}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Rechercher un produit..." />
                          <CommandList>
                            <CommandEmpty>Aucun produit trouvé.</CommandEmpty>
                            <CommandGroup>
                              {products.map((product) => (
                                <CommandItem
                                  key={product.id}
                                  value={product.name}
                                  onSelect={() => {
                                    setSelectedProduct(product.id);
                                    setItemUnitPrice(product.price);
                                    setProductSearchOpen(false);
                                  }}
                                >
                                  <div className="flex flex-col flex-1">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">
                                        {product.name}
                                      </span>
                                    </div>
                                    <span className="text-sm text-muted-foreground">
                                      {product.price.toFixed(2)} TND • Stock: {product.stock}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="itemQuantity">Quantité</Label>
                    <Input
                      id="itemQuantity"
                      type="number"
                      min="1"
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(Number(e.target.value) || 1)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="itemUnitPrice">Prix unitaire</Label>
                    <Input
                      id="itemUnitPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={itemUnitPrice}
                      onChange={(e) => setItemUnitPrice(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Total</Label>
                    <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
                      {(itemQuantity * itemUnitPrice).toFixed(2)} TND
                    </div>
                  </div>
                  <div className="md:col-span-1">
                    <Button
                      type="button"
                      onClick={addInvoiceItem}
                      className="w-full"
                      disabled={!selectedProduct || itemQuantity <= 0 || itemUnitPrice <= 0}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Invoice Items Table */}
              {invoiceItems.length > 0 && (
                <div className="border rounded-md overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead className="w-20">Quantité</TableHead>
                        <TableHead className="w-24">Prix unit.</TableHead>
                        <TableHead className="w-24">Total</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoiceItems.map((item, index) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.unitPrice.toFixed(2)} TND</TableCell>
                          <TableCell>{item.totalPrice.toFixed(2)} TND</TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeInvoiceItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

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
                <Button type="submit" disabled={invoiceItems.length === 0}>
                  {currentInvoice ? "Mettre à jour" : "Créer"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Rechercher des factures..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Responsive table container */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer" onClick={() => requestSort('invoiceNumber')}>
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span>Numéro</span>
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => requestSort('supplierName')}>
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span>Fournisseur</span>
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => requestSort('issueDate')}>
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span>Date</span>
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => requestSort('totalAmount')}>
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span>Montant</span>
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => requestSort('status')}>
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span>Statut</span>
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span>Actions</span>
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : currentInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Aucune facture trouvée
                </TableCell>
              </TableRow>
            ) : (
              currentInvoices.map((invoice) => (
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
                        onClick={() => handleViewInvoice(invoice)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadPDF(invoice)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDeleteDialog(invoice)}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Affichage de {indexOfFirstItem + 1} à {Math.min(indexOfLastItem, filteredInvoices.length)} sur {filteredInvoices.length} factures
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium">
              Page {currentPage} sur {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer la facture "{invoiceToDelete?.invoiceNumber}" ? 
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
              onClick={() => invoiceToDelete && handleDelete(invoiceToDelete.id)}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}