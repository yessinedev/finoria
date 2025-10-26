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
  ShoppingCart, 
  X, 
  AlertTriangle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { db } from "@/lib/database";
import { SupplierOrder, Supplier, Product } from "@/types/types";
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
import { supplierOrderSchema, SupplierOrderFormData } from "@/lib/validation/schemas";
import { z } from "zod";
import { StatusDropdown } from "@/components/common/StatusDropdown";

export default function SupplierOrders() {
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<SupplierOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<SupplierOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<SupplierOrder | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof SupplierOrder; direction: 'asc' | 'desc' }>({ 
    key: 'orderDate', 
    direction: 'desc' 
  });
  
  // Inline editing state
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    supplierId: 0,
    orderNumber: "",
    totalAmount: 0,
    taxAmount: 0,
    status: "En attente",
    orderDate: new Date().toISOString().split("T")[0],
    deliveryDate: "",
  });

  // Order items state
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemUnitPrice, setItemUnitPrice] = useState(0);

  // Validation errors state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadOrders();
    loadSuppliers();
    loadProducts();
  }, []);

  useEffect(() => {
    let filtered = orders.filter(
      (order) =>
        order.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
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
    
    setFilteredOrders(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchTerm, orders, sortConfig]);

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
      };
      
      supplierOrderSchema.parse(mainData);
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
      const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const taxAmount = subtotal * 0.19; // 19% VAT
      const totalAmount = subtotal + taxAmount;

      const orderData = {
        ...formData,
        supplierId: Number(formData.supplierId),
        totalAmount: Number(totalAmount.toFixed(3)),
        taxAmount: Number(taxAmount.toFixed(2)),
        items: orderItems,
      };

      const response = await db.supplierOrders.create(orderData);
      if (response.success && response.data) {
        // Only update product stock if the order status is "Livrée"
        // According to requirements, stock should only be updated when status is "Livrée"
        if (formData.status === "Livrée") {
          for (const item of orderItems) {
            try {
              // Get current stock
              const stockResponse = await db.products.getStock(item.productId);
              const currentStock = stockResponse.success && stockResponse.data !== undefined ? stockResponse.data : 0;
              
              // Update stock (add quantity from purchase order)
              const newStock = currentStock + item.quantity;
              await db.products.updateStock(item.productId, newStock);
              
              // Create stock movement record
              await db.stockMovements.create({
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                movementType: 'IN',
                sourceType: 'supplier_order',
                sourceId: response.data.id,
                reference: `Order #${response.data.id}`,
                reason: 'Commande d\'achat livrée'
              });
            } catch (stockError) {
              console.error(`Failed to update stock for product ${item.productId}:`, stockError);
            }
          }
        }
        
        // Refresh orders to get the complete data with supplier information
        await loadOrders();
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
      const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const taxAmount = subtotal * 0.19; // 19% VAT
      const totalAmount = subtotal + taxAmount;

      const orderData = {
        ...formData,
        supplierId: Number(formData.supplierId),
        totalAmount: Number(totalAmount.toFixed(3)),
        taxAmount: Number(taxAmount.toFixed(2)),
        items: orderItems, // This can be empty array
      };

      const response = await db.supplierOrders.update(currentOrder.id, orderData);
      if (response.success && response.data) {
        // Check if status changed to "Livrée" and update stock if needed
        const previousStatus = currentOrder.status;
        const newStatus = formData.status;
        
        // If status changed to "Livrée", update stock
        if (previousStatus !== "Livrée" && newStatus === "Livrée" && orderItems.length > 0) {
          // Update product stock for each item in the order
          for (const item of orderItems) {
            try {
              // Get current stock
              const stockResponse = await db.products.getStock(item.productId);
              const currentStock = stockResponse.success && stockResponse.data !== undefined ? stockResponse.data : 0;
              
              // Update stock (add quantity from purchase order)
              const newStock = currentStock + item.quantity;
              await db.products.updateStock(item.productId, newStock);
              
              // Create stock movement record
              await db.stockMovements.create({
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                movementType: 'IN',
                sourceType: 'supplier_order',
                sourceId: response.data.id,
                reference: `Order #${response.data.id}`,
                reason: 'Commande d\'achat livrée'
              });
            } catch (stockError) {
              console.error(`Failed to update stock for product ${item.productId}:`, stockError);
            }
          }
        }
        
        // Handle stock updates for order items when not related to status change
        if (previousStatus !== "Livrée" && newStatus !== "Livrée" && orderItems.length > 0) {
          // Handle quantity changes for non-delivered orders
          // First, we need to get the original order to understand what changed
          const originalOrder = orders.find(o => o.id === currentOrder.id);
          
          // If we have the original order, we need to adjust stock based on differences
          if (originalOrder) {
            // Create a map of original quantities
            const originalQuantities: Record<number, number> = {};
            if (originalOrder.items) {
              originalOrder.items.forEach(item => {
                originalQuantities[item.productId] = item.quantity;
              });
            }
            
            // Process new items and quantity changes
            for (const item of orderItems) {
              const originalQuantity = originalQuantities[item.productId] || 0;
              const quantityDifference = item.quantity - originalQuantity;
              
              if (quantityDifference !== 0) {
                try {
                  // Get current stock
                  const stockResponse = await db.products.getStock(item.productId);
                  const currentStock = stockResponse.success && stockResponse.data !== undefined ? stockResponse.data : 0;
                  
                  // Update stock based on the difference
                  const newStock = currentStock + quantityDifference;
                  await db.products.updateStock(item.productId, newStock);
                  
                  // Create stock movement record
                  await db.stockMovements.create({
                    productId: item.productId,
                    productName: item.productName,
                    quantity: Math.abs(quantityDifference),
                    movementType: quantityDifference > 0 ? 'IN' : 'OUT',
                    sourceType: 'supplier_order',
                    sourceId: response.data.id,
                    reference: `Order #${response.data.id}`,
                    reason: quantityDifference > 0 
                      ? 'Quantité de commande d\'achat augmentée' 
                      : 'Quantité de commande d\'achat réduite'
                  });
                } catch (stockError) {
                  console.error(`Failed to update stock for product ${item.productId}:`, stockError);
                }
              }
            }
          } else {
            // If we can't find the original order, just add the new stock
            for (const item of orderItems) {
              try {
                // Get current stock
                const stockResponse = await db.products.getStock(item.productId);
                const currentStock = stockResponse.success && stockResponse.data !== undefined ? stockResponse.data : 0;
                
                // Update stock (add quantity from purchase order)
                const newStock = currentStock + item.quantity;
                await db.products.updateStock(item.productId, newStock);
                
                // Create stock movement record
                await db.stockMovements.create({
                  productId: item.productId,
                  productName: item.productName,
                  quantity: item.quantity,
                  movementType: 'IN',
                  sourceType: 'supplier_order',
                  sourceId: response.data.id,
                  reference: `Order #${response.data.id}`,
                  reason: 'Commande d\'achat mise à jour'
                });
              } catch (stockError) {
                console.error(`Failed to update stock for product ${item.productId}:`, stockError);
              }
            }
          }
        }
        
        // Refresh orders to get the complete data with supplier information
        await loadOrders();
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
        setIsDeleteDialogOpen(false);
        setOrderToDelete(null);
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
      orderNumber: `PO-${Date.now()}`,
      totalAmount: 0,
      taxAmount: 0,
      status: "En attente",
      orderDate: new Date().toISOString().split("T")[0],
      deliveryDate: "",
    });
    setOrderItems([]);
    setSelectedProduct(null);
    setItemQuantity(1);
    setItemUnitPrice(0);
    setCurrentOrder(null);
    setErrors({});
    setItemErrors({});
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
    setOrderItems(order.items || []);
    setCurrentOrder(order);
    setErrors({});
    setItemErrors({});
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (order: SupplierOrder) => {
    setOrderToDelete(order);
    setIsDeleteDialogOpen(true);
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
        return <Badge variant="secondary" className="bg-orange-500 hover:bg-orange-600 text-white">En attente</Badge>;
      case "Confirmée":
        return <Badge variant="default">Confirmée</Badge>;
      case "Livrée":
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white">Livrée</Badge>;
      case "Annulée":
        return <Badge variant="destructive">Annulée</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const addOrderItem = () => {
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
      discount: 0, // Default discount value
      totalPrice: parseFloat(totalPrice.toFixed(2)),
    };

    setOrderItems([...orderItems, newItem]);
    setSelectedProduct(null);
    setItemQuantity(1);
    setItemUnitPrice(product.purchasePrice || 0);
    setItemErrors({}); // Clear item errors when adding new item
  };

  const removeOrderItem = (id: number) => {
    setOrderItems(orderItems.filter(item => item.id !== id));
  };

  // Sorting functions
  const requestSort = (key: keyof SupplierOrder) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    try {
      const result = await db.supplierOrders.updateStatus(orderId, newStatus);
      if (result.success) {
        toast({
          title: "Succès",
          description: "Statut mis à jour avec succès",
        });
      } else {
        throw new Error(result.error || "Erreur lors de la mise à jour du statut");
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour du statut",
        variant: "destructive",
      });
    }
  };

  // Inline editing functions
  const startEditing = (orderId: number, field: string, value: string) => {
    setEditingOrderId(orderId);
    setEditingField(field);
    setEditingValue(value);
  };

  const saveEditing = async () => {
    if (editingOrderId === null || editingField === null) return;

    try {
      // Find the order to update
      const order = orders.find(o => o.id === editingOrderId);
      if (!order) return;

      // Update the specific field
      const updatedOrder = { ...order, [editingField]: editingValue };
      const result = await db.supplierOrders.update(editingOrderId, updatedOrder);
      
      if (result.success) {
        await loadOrders();
        setEditingOrderId(null);
        setEditingField(null);
        setEditingValue("");
        toast({
          title: "Succès",
          description: "Commande mise à jour avec succès",
        });
      } else {
        toast({
          title: "Erreur",
          description: result.error || "Erreur lors de la mise à jour",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour",
        variant: "destructive",
      });
    }
  };

  

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-8 w-8 text-primary" />
            Commandes Fournisseurs
          </h1>
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
          <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {currentOrder ? "Modifier la commande" : "Nouvelle commande"}
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
                  <Label htmlFor="orderNumber">Numéro de commande *</Label>
                  <Input
                    id="orderNumber"
                    value={formData.orderNumber}
                    onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                    className={errors.orderNumber ? "border-red-500" : ""}
                    required
                  />
                  {errors.orderNumber && (
                    <p className="text-sm text-red-500">{errors.orderNumber}</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orderDate">Date de commande *</Label>
                  <Input
                    id="orderDate"
                    type="date"
                    value={formData.orderDate}
                    onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                    className={errors.orderDate ? "border-red-500" : ""}
                    required
                  />
                  {errors.orderDate && (
                    <p className="text-sm text-red-500">{errors.orderDate}</p>
                  )}
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
                                    setItemUnitPrice(product.purchasePrice || product.price || 0);
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
                                      Achat: {product.purchasePrice ? product.purchasePrice.toFixed(3) : 'N/A'} DNT • Stock: {product.stock}
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
                      {(itemQuantity * itemUnitPrice).toFixed(3)} DNT
                    </div>
                  </div>
                  <div className="md:col-span-1">
                    <Button
                      type="button"
                      onClick={addOrderItem}
                      className="w-full"
                      disabled={!selectedProduct || itemQuantity <= 0 || itemUnitPrice <= 0}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Order Items Table */}
              {orderItems.length > 0 && (
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
                      {orderItems.map((item, index) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.unitPrice.toFixed(3)} DNT</TableCell>
                          <TableCell>{item.totalPrice.toFixed(3)} DNT</TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeOrderItem(item.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}



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
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Rechercher des commandes..."
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
              <TableHead>
                <div className="flex items-center gap-1">
                  <ShoppingCart className="h-4 w-4" />
                  <span>Fournisseur</span>
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => requestSort('orderDate')}>
                <div className="flex items-center gap-1">
                  <ShoppingCart className="h-4 w-4" />
                  <span>Date</span>
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => requestSort('totalAmount')}>
                <div className="flex items-center gap-1">
                  <ShoppingCart className="h-4 w-4" />
                  <span>Montant</span>
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center gap-1">
                  <ShoppingCart className="h-4 w-4" />
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
            ) : currentOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Aucune commande trouvée
                </TableCell>
              </TableRow>
            ) : (
              currentOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    {order.supplierName} {order.supplierCompany && `(${order.supplierCompany})`}
                  </TableCell>
                  <TableCell>
                    {editingOrderId === order.id && editingField === 'orderDate' ? (
                      <Input
                        type="date"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={saveEditing}
                        onKeyDown={(e) => e.key === 'Enter' && saveEditing()}
                        autoFocus
                      />
                    ) : (
                      <div 
                        onClick={() => startEditing(order.id, 'orderDate', order.orderDate.split('T')[0])}
                        className="cursor-pointer hover:underline"
                      >
                        {format(new Date(order.orderDate), "dd/MM/yyyy", { locale: fr })}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {order.totalAmount.toFixed(3)} DNT
                  </TableCell>
                  <TableCell>
                    <StatusDropdown
                      currentValue={order.status}
                      options={[
                        { value: "En attente", label: "En attente", variant: "secondary" },
                        { value: "Confirmée", label: "Confirmée", variant: "default" },
                        { value: "Livrée", label: "Livrée", variant: "default" },
                        { value: "Annulée", label: "Annulée", variant: "destructive" },
                      ]}
                      onStatusChange={(newStatus) => handleStatusChange(order.id, newStatus)}
                    />
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
                        onClick={() => openDeleteDialog(order)}
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
            Affichage de {indexOfFirstItem + 1} à {Math.min(indexOfLastItem, filteredOrders.length)} sur {filteredOrders.length} commandes
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
              Êtes-vous sûr de vouloir supprimer cette commande fournisseur ? 
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
              onClick={() => orderToDelete && handleDelete(orderToDelete.id)}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}