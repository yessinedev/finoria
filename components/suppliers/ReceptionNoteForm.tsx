import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { db } from "@/lib/database";
import type { SupplierOrder, SupplierOrderItem, ReceptionNote } from "@/types/types";
import { useToast } from "@/hooks/use-toast";
import { Package, User, Car, AlertTriangle, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReceptionNoteFormProps {
  supplierOrder?: SupplierOrder;
  open: boolean;
  onClose: () => void;
  onNoteCreated: (note: ReceptionNote) => void;
}

export default function ReceptionNoteForm({ 
  supplierOrder, 
  open, 
  onClose, 
  onNoteCreated 
}: ReceptionNoteFormProps) {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [supplierOrders, setSupplierOrders] = useState<SupplierOrder[]>([]);
  const [allSupplierOrders, setAllSupplierOrders] = useState<SupplierOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(supplierOrder?.id || null);
  const [driverName, setDriverName] = useState("");
  const [vehicleRegistration, setVehicleRegistration] = useState("");
  const [notes, setNotes] = useState("");
  const [itemQuantities, setItemQuantities] = useState<Record<number, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [supplierSearchOpen, setSupplierSearchOpen] = useState(false);
  const [orderSearchOpen, setOrderSearchOpen] = useState(false);

  useEffect(() => {
    if (open) {
      // If a supplier order is provided, use it directly
      if (supplierOrder) {
        setSelectedOrderId(supplierOrder.id);
        setSupplierOrders([supplierOrder]);
        setSelectedSupplierId(supplierOrder.supplierId);
        // Initialize item quantities with ordered quantities
        const initialQuantities: Record<number, number> = {};
        (supplierOrder.items || []).forEach(item => {
          initialQuantities[item.id] = item.quantity;
        });
        setItemQuantities(initialQuantities);
      } else {
        // Otherwise, load suppliers and orders for selection
        loadSuppliers();
        loadSupplierOrders();
      }
    } else {
      // Reset form when closing
      setSelectedOrderId(supplierOrder?.id || null);
      setSelectedSupplierId(null);
      setDriverName("");
      setVehicleRegistration("");
      setNotes("");
      setItemQuantities({});
    }
  }, [open, supplierOrder]);

  const loadSuppliers = async () => {
    try {
      const result = await db.suppliers.getAll();
      if (result.success) {
        setSuppliers(result.data || []);
      }
    } catch (error) {
      console.error("Failed to load suppliers:", error);
    }
  };

  const loadSupplierOrders = async () => {
    setLoadingOrders(true);
    try {
      const result = await db.supplierOrders.getAll();
      if (result.success) {
        setAllSupplierOrders(result.data || []);
        setSupplierOrders(result.data || []);
      }
    } catch (error) {
      console.error("Failed to load supplier orders:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement des commandes fournisseurs",
        variant: "destructive",
      });
    } finally {
      setLoadingOrders(false);
    }
  };

  // Filter orders when supplier is selected
  useEffect(() => {
    if (selectedSupplierId) {
      const filtered = allSupplierOrders.filter(order => order.supplierId === selectedSupplierId);
      setSupplierOrders(filtered);
      // Reset selected order when supplier changes
      setSelectedOrderId(null);
    } else {
      setSupplierOrders(allSupplierOrders);
    }
  }, [selectedSupplierId, allSupplierOrders]);

  const handleQuantityChange = (itemId: number, value: string) => {
    const numValue = parseInt(value) || 0;
    setItemQuantities(prev => ({
      ...prev,
      [itemId]: numValue
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If a supplier order was provided, use its ID, otherwise use the selected ID
    const orderId = supplierOrder ? supplierOrder.id : selectedOrderId;
    
    if (!orderId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une commande fournisseur",
        variant: "destructive",
      });
      return;
    }
    
    // Find the selected supplier order
    const selectedOrder = supplierOrder || supplierOrders.find(o => o.id === orderId);
    if (!selectedOrder) {
      toast({
        title: "Erreur",
        description: "Commande fournisseur non trouvée",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Generate reception number (you might want to implement a proper numbering system)
      const receptionNumber = `BR-${new Date().getFullYear()}-${orderId.toString().padStart(4, '0')}-${Date.now().toString().slice(-4)}`;
      
      // Prepare items data
      const itemsData = (selectedOrder.items || []).map(item => ({
        productId: item.productId,
        productName: item.productName,
        orderedQuantity: item.quantity,
        receivedQuantity: itemQuantities[item.id] || item.quantity,
        unitPrice: item.unitPrice
      }));
      
      const receptionNoteData = {
        supplierOrderId: orderId,
        receptionNumber,
        driverName: driverName || null,
        vehicleRegistration: vehicleRegistration || null,
        receptionDate: new Date().toISOString(),
        notes: notes || null,
        items: itemsData
      };
      
      const result = await db.receptionNotes.create(receptionNoteData);
      if (result.success && result.data) {
        onNoteCreated(result.data);
        toast({
          title: "Succès",
          description: "Bon de réception créé avec succès!",
        });
        // Reset form
        setSelectedOrderId(supplierOrder?.id || null);
        setDriverName("");
        setVehicleRegistration("");
        setNotes("");
        setItemQuantities({});
        onClose();
      } else {
        throw new Error(result.error || "Failed to create reception note");
      }
    } catch (error) {
      console.error("Failed to create reception note:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la création du bon de réception",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedOrder = supplierOrder || supplierOrders.find(o => o.id === selectedOrderId);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Créer un bon de réception
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Only show order selection if no order was pre-provided */}
          {!supplierOrder && (
            <>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Fournisseur *
                </Label>
                <Popover open={supplierSearchOpen} onOpenChange={setSupplierSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={supplierSearchOpen}
                      className="w-full justify-between"
                    >
                      {selectedSupplierId
                        ? suppliers.find((s) => s.id === selectedSupplierId)?.name +
                          (suppliers.find((s) => s.id === selectedSupplierId)?.company
                            ? ` (${suppliers.find((s) => s.id === selectedSupplierId)?.company})`
                            : "")
                        : "Rechercher un fournisseur..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Rechercher un fournisseur..." />
                      <CommandList>
                        <CommandEmpty>Aucun fournisseur trouvé.</CommandEmpty>
                        <CommandGroup>
                          {suppliers.map((supplier) => (
                            <CommandItem
                              key={supplier.id}
                              value={`${supplier.name} ${supplier.company || ""}`}
                              onSelect={() => {
                                setSelectedSupplierId(supplier.id);
                                setSupplierSearchOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedSupplierId === supplier.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {supplier.name} {supplier.company ? `(${supplier.company})` : ""}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              
              {selectedSupplierId && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Commande fournisseur *
                  </Label>
                  <Popover open={orderSearchOpen} onOpenChange={setOrderSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={orderSearchOpen}
                        className="w-full justify-between"
                        disabled={loadingOrders}
                      >
                        {selectedOrderId
                          ? (() => {
                              const order = supplierOrders.find((o) => o.id === selectedOrderId);
                              return order
                                ? `${order.orderNumber} - ${new Date(order.orderDate).toLocaleDateString("fr-FR")} - ${order.totalAmount.toFixed(3)} DNT`
                                : "Sélectionner une commande...";
                            })()
                          : loadingOrders
                          ? "Chargement..."
                          : supplierOrders.length === 0
                          ? "Aucune commande disponible"
                          : "Rechercher une commande..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Rechercher une commande..." />
                        <CommandList>
                          <CommandEmpty>Aucune commande trouvée.</CommandEmpty>
                          <CommandGroup>
                            {supplierOrders.map((order) => (
                              <CommandItem
                                key={order.id}
                                value={`${order.orderNumber} ${order.orderDate}`}
                                onSelect={() => {
                                  setSelectedOrderId(order.id);
                                  setOrderSearchOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedOrderId === order.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">{order.orderNumber}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {new Date(order.orderDate).toLocaleDateString("fr-FR")} - {order.totalAmount.toFixed(3)} DNT
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
              )}
            </>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="driverName" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Nom du chauffeur
              </Label>
              <Input
                id="driverName"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="Nom du chauffeur"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="vehicleRegistration" className="flex items-center gap-2">
                <Car className="h-4 w-4" />
                Immatriculation du véhicule
              </Label>
              <Input
                id="vehicleRegistration"
                value={vehicleRegistration}
                onChange={(e) => setVehicleRegistration(e.target.value)}
                placeholder="Immatriculation du véhicule"
              />
            </div>
          </div>
          
          {/* Show order details when an order is selected or provided */}
          {selectedOrder && (
            <div className="rounded-lg border p-3 bg-muted/50">
              <h4 className="font-medium mb-2">Détails de la commande</h4>
              <div className="text-sm space-y-1">
                <div><strong>Fournisseur:</strong> {selectedOrder.supplierName}</div>
                <div><strong>Date:</strong> {new Date(selectedOrder.orderDate).toLocaleDateString("fr-FR")}</div>
                <div><strong>Articles:</strong> {(selectedOrder.items || []).length}</div>
              </div>
            </div>
          )}
          
          {/* Items Table */}
          {selectedOrder && selectedOrder.items && selectedOrder.items.length > 0 && (
            <div className="space-y-2">
              <Label>Articles reçus</Label>
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead className="w-24">Qté commandée</TableHead>
                      <TableHead className="w-24">Qté reçue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            value={itemQuantities[item.id] || item.quantity}
                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                            className="w-20"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Discrepancy warning */}
              {selectedOrder.items.some(item => 
                itemQuantities[item.id] !== undefined && 
                itemQuantities[item.id] !== item.quantity
              ) && (
                <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">
                    Des écarts ont été détectés entre les quantités commandées et reçues.
                  </span>
                </div>
              )}
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informations supplémentaires sur la réception..."
              rows={3}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !(supplierOrder || selectedOrderId)}
            >
              {isSubmitting ? "Création..." : "Créer le bon de réception"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}