"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EntitySelect } from "@/components/common/EntitySelect";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { ClientPayment, SupplierPayment, Invoice, SupplierInvoice } from "@/types/types";

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  payment?: ClientPayment | SupplierPayment | null;
  invoice?: Invoice | SupplierInvoice | null;
  type: "client" | "supplier";
  clients?: any[];
  suppliers?: any[];
  invoices?: Invoice[];
  supplierInvoices?: SupplierInvoice[];
}

const PAYMENT_METHODS = [
  { value: "comptant", label: "Comptant" },
  { value: "cheque", label: "Chèque" },
  { value: "virement", label: "Virement bancaire" },
  { value: "traite", label: "Traite" },
  { value: "carte", label: "Carte bancaire" },
  { value: "autre", label: "Autre" },
];

export default function PaymentDialog({
  isOpen,
  onClose,
  onSuccess,
  payment,
  invoice,
  type,
  clients = [],
  suppliers = [],
  invoices = [],
  supplierInvoices = [],
}: PaymentDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [paymentDate, setPaymentDate] = useState<Date>(
    payment?.paymentDate ? new Date(payment.paymentDate) : new Date()
  );
  // Initialize form data based on payment or invoice
  const getInitialFormData = () => {
    if (payment) {
      return {
        clientId: type === "client" && "clientId" in payment ? (payment.clientId?.toString() || "") : "",
        supplierId: type === "supplier" && "supplierId" in payment ? (payment.supplierId?.toString() || "") : "",
        invoiceId: (payment.invoiceId || "").toString(),
        amount: payment.amount,
        paymentMethod: payment.paymentMethod || "",
        reference: payment.reference || "",
        notes: payment.notes || "",
      };
    } else if (invoice) {
      return {
        clientId: type === "client" && "clientId" in invoice ? (invoice.clientId?.toString() || "") : "",
        supplierId: type === "supplier" && "supplierId" in invoice ? (invoice.supplierId?.toString() || "") : "",
        invoiceId: invoice.id.toString(),
        amount: invoice.totalAmount,
        paymentMethod: "",
        reference: "",
        notes: "",
      };
    }
    return {
      clientId: "",
      supplierId: "",
      invoiceId: "",
      amount: 0,
      paymentMethod: "",
      reference: "",
      notes: "",
    };
  };

  const [formData, setFormData] = useState({
    clientId: "",
    supplierId: "",
    invoiceId: "",
    amount: 0,
    paymentMethod: "",
    reference: "",
    notes: "",
  });
  const [existingPayments, setExistingPayments] = useState<any[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [remainingBalance, setRemainingBalance] = useState(0);

  // Update form data when dialog opens or invoice/payment changes
  useEffect(() => {
    if (isOpen) {
      if (payment) {
        setFormData({
          clientId: type === "client" && "clientId" in payment ? (payment.clientId?.toString() || "") : "",
          supplierId: type === "supplier" && "supplierId" in payment ? (payment.supplierId?.toString() || "") : "",
          invoiceId: (payment.invoiceId || "").toString(),
          amount: payment.amount,
          paymentMethod: payment.paymentMethod || "",
          reference: payment.reference || "",
          notes: payment.notes || "",
        });
        setPaymentDate(new Date(payment.paymentDate));
      } else if (invoice) {
        // Extract clientId or supplierId from invoice
        let clientIdValue = "";
        let supplierIdValue = "";
        
        if (type === "client" && "clientId" in invoice) {
          clientIdValue = invoice.clientId.toString();
        } else if (type === "supplier" && "supplierId" in invoice) {
          supplierIdValue = invoice.supplierId.toString();
        }
        
        setFormData({
          clientId: clientIdValue,
          supplierId: supplierIdValue,
          invoiceId: invoice.id.toString(),
          amount: invoice.totalAmount,
          paymentMethod: "",
          reference: "",
          notes: "",
        });
        setPaymentDate(new Date());
      } else {
        // Reset form when opening without invoice/payment
        setFormData({
          clientId: "",
          supplierId: "",
          invoiceId: "",
          amount: 0,
          paymentMethod: "",
          reference: "",
          notes: "",
        });
        setPaymentDate(new Date());
      }
    }
  }, [isOpen, payment, invoice, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that invoice is selected
    if (!formData.invoiceId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une facture",
        variant: "destructive",
      });
      return;
    }

    // Validate payment amount
    const paymentAmount = Number(formData.amount);
    if (paymentAmount <= 0) {
      toast({
        title: "Erreur",
        description: "Le montant du paiement doit être supérieur à 0",
        variant: "destructive",
      });
      return;
    }

    if (selectedInvoice && paymentAmount > remainingBalance) {
      toast({
        title: "Erreur",
        description: `Le montant du paiement (${paymentAmount.toFixed(3)}) dépasse le solde restant (${remainingBalance.toFixed(3)})`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const paymentData = {
        ...formData,
        paymentDate: paymentDate.toISOString(),
        clientId: type === "client" ? Number(formData.clientId) : undefined,
        supplierId: type === "supplier" ? Number(formData.supplierId) : undefined,
        invoiceId: Number(formData.invoiceId),
        amount: paymentAmount,
      };

      let result;
      if (payment) {
        // Update payment
        result =
          type === "client"
            ? await window.electronAPI?.updateClientPayment(payment.id, paymentData)
            : await window.electronAPI?.updateSupplierPayment(payment.id, paymentData);
      } else {
        // Create payment
        result =
          type === "client"
            ? await window.electronAPI?.createClientPayment(paymentData)
            : await window.electronAPI?.createSupplierPayment(paymentData);
      }

      if (result) {
        toast({
          title: "Succès",
          description: payment
            ? "Paiement modifié avec succès"
            : "Paiement créé avec succès",
        });
        onSuccess();
        onClose();
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form to initial state
    setFormData({
      clientId: invoice && type === "client" && "clientId" in invoice ? invoice.clientId.toString() : "",
      supplierId: invoice && type === "supplier" && "supplierId" in invoice ? invoice.supplierId.toString() : "",
      invoiceId: invoice ? invoice.id.toString() : "",
      amount: invoice ? invoice.totalAmount : 0,
      paymentMethod: "",
      reference: "",
      notes: "",
    });
    setPaymentDate(new Date());
    onClose();
  };

  // Filter invoices based on selected client/supplier - only show invoices for selected client/supplier
  const availableInvoices = type === "client"
    ? invoices.filter((inv) => formData.clientId && inv.clientId === Number(formData.clientId))
    : supplierInvoices.filter(
        (inv) => formData.supplierId && inv.supplierId === Number(formData.supplierId)
      );

  // Get selected invoice
  const selectedInvoice = type === "client"
    ? invoices.find((inv) => inv.id === Number(formData.invoiceId))
    : supplierInvoices.find((inv) => inv.id === Number(formData.invoiceId));

  // Load existing payments when invoice is selected
  useEffect(() => {
    const loadInvoicePayments = async () => {
      if (formData.invoiceId && selectedInvoice) {
        try {
          const paymentsResult = type === "client"
            ? await window.electronAPI?.getInvoicePayments(Number(formData.invoiceId))
            : await window.electronAPI?.getSupplierInvoicePayments(Number(formData.invoiceId));
          
          const payments = paymentsResult || [];
          // Exclude current payment if updating
          const filteredPayments = payment 
            ? payments.filter((p: any) => p.id !== payment.id)
            : payments;
          
          setExistingPayments(filteredPayments);
          
          // Calculate total paid (excluding current payment if updating)
          const paid = filteredPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
          setTotalPaid(paid);
          
          // Calculate remaining balance
          const remaining = selectedInvoice.totalAmount - paid;
          setRemainingBalance(Math.max(0, remaining));
          
          // Auto-set amount to remaining balance if it's the full amount
          if (!payment && remaining > 0 && remaining < selectedInvoice.totalAmount) {
            setFormData(prev => ({ ...prev, amount: remaining }));
          }
        } catch (error) {
          console.error("Error loading invoice payments:", error);
        }
      } else {
        setExistingPayments([]);
        setTotalPaid(0);
        setRemainingBalance(0);
      }
    };

    loadInvoicePayments();
  }, [formData.invoiceId, selectedInvoice, payment, type]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>
            {payment ? "Modifier le paiement" : "Ajouter un paiement"} ({type === "client" ? "Client" : "Fournisseur"})
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client/Supplier Selection */}
          {type === "client" ? (
            <div className="space-y-2">
              <EntitySelect
                label="Client *"
                id="clientId"
                value={formData.clientId || ""}
                onChange={(value) =>
                  setFormData({ ...formData, clientId: value, invoiceId: "" })
                }
                options={clients || []}
                getOptionLabel={(client) =>
                  `${client.name}${client.company ? ` (${client.company})` : ""}`
                }
                getOptionValue={(client) => client.id.toString()}
                required
              />
            </div>
          ) : (
            <div className="space-y-2">
              <EntitySelect
                label="Fournisseur"
                id="supplierId"
                value={formData.supplierId || ""}
                onChange={(value) =>
                  setFormData({ ...formData, supplierId: value, invoiceId: "" })
                }
                options={suppliers || []}
                getOptionLabel={(supplier) =>
                  `${supplier.name}${supplier.company ? ` (${supplier.company})` : ""}`
                }
                getOptionValue={(supplier) => supplier.id.toString()}
                required
              />
            </div>
          )}

          {/* Invoice Selection */}
          <div className="space-y-2">
            {invoice && (
              <div className="text-sm text-muted-foreground mb-2">
                Facture pré-sélectionnée
              </div>
            )}
            {!invoice && (type === "client" ? !formData.clientId : !formData.supplierId) && (
              <div className="text-sm text-muted-foreground mb-2">
                Veuillez sélectionner un {type === "client" ? "client" : "fournisseur"} pour voir ses factures
              </div>
            )}
            {type === "client" ? (
              <EntitySelect
                label="Facture"
                id="invoiceId"
                value={formData.invoiceId.toString()}
                onChange={(value) => {
                  const selectedInv = availableInvoices.find((inv) => inv.id === Number(value)) as Invoice | undefined;
                  setFormData({
                    ...formData,
                    invoiceId: value,
                    amount: selectedInv?.totalAmount || formData.amount,
                  });
                }}
                options={availableInvoices as Invoice[]}
                getOptionLabel={(inv: Invoice) => {
                  return `${inv.number} - ${new Date(inv.issueDate).toLocaleDateString("fr-FR")} - ${inv.totalAmount.toFixed(3)} DNT`;
                }}
                getOptionValue={(inv: Invoice) => inv.id.toString()}
                placeholder={formData.clientId ? "Sélectionner une facture" : "Sélectionnez d'abord un client"}
                required
              />
            ) : (
              <EntitySelect
                label="Facture"
                id="invoiceId"
                value={formData.invoiceId.toString()}
                onChange={(value) => {
                  const selectedInv = availableInvoices.find((inv) => inv.id === Number(value)) as SupplierInvoice | undefined;
                  setFormData({
                    ...formData,
                    invoiceId: value,
                    amount: selectedInv?.totalAmount || formData.amount,
                  });
                }}
                options={availableInvoices as SupplierInvoice[]}
                getOptionLabel={(inv: SupplierInvoice) => {
                  return `${inv.invoiceNumber} - ${new Date(inv.issueDate).toLocaleDateString("fr-FR")} - ${inv.totalAmount.toFixed(3)} DNT`;
                }}
                getOptionValue={(inv: SupplierInvoice) => inv.id.toString()}
                placeholder={formData.supplierId ? "Sélectionner une facture" : "Sélectionnez d'abord un fournisseur"}
                required
              />
            )}
            {selectedInvoice && (
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">
                  <span className="font-medium">Montant total:</span> {selectedInvoice.totalAmount.toFixed(3)} DNT
                </p>
                {totalPaid > 0 && (
                  <p className="text-muted-foreground">
                    <span className="font-medium">Montant payé:</span> {totalPaid.toFixed(3)} DNT
                  </p>
                )}
                <p className={remainingBalance > 0 ? "text-orange-600 font-medium" : "text-green-600 font-medium"}>
                  <span className="font-medium">Solde restant:</span> {remainingBalance.toFixed(3)} DNT
                </p>
              </div>
            )}
            {existingPayments.length > 0 && (
              <div className="mt-2 p-2 bg-muted rounded text-sm">
                <p className="font-medium mb-1">Paiements existants ({existingPayments.length}):</p>
                <ul className="space-y-1 max-h-24 overflow-y-auto">
                  {existingPayments.map((p: any) => (
                    <li key={p.id} className="flex justify-between text-xs">
                      <span>{new Date(p.paymentDate).toLocaleDateString("fr-FR")} - {p.paymentMethod || "Non spécifié"}</span>
                      <span className="font-medium">{p.amount.toFixed(3)} DNT</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label htmlFor="paymentDate">Date de paiement *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !paymentDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {paymentDate ? (
                    format(paymentDate, "PPP", { locale: fr })
                  ) : (
                    <span>Sélectionner une date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={paymentDate}
                  onSelect={(date) => date && setPaymentDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Montant *</Label>
            <Input
              id="amount"
              type="number"
              step="0.001"
              min="0"
              max={selectedInvoice ? remainingBalance : undefined}
              value={formData.amount}
              onChange={(e) => {
                const value = Number(e.target.value);
                const maxAmount = selectedInvoice ? remainingBalance : Infinity;
                setFormData({ ...formData, amount: Math.min(value, maxAmount) });
              }}
              required
            />
            {selectedInvoice && (
              <p className="text-xs text-muted-foreground">
                Maximum: {remainingBalance.toFixed(3)} DNT (solde restant)
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Méthode de paiement</Label>
            <Select
              value={formData.paymentMethod}
              onValueChange={(value) =>
                setFormData({ ...formData, paymentMethod: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une méthode" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reference */}
          <div className="space-y-2">
            <Label htmlFor="reference">Référence (n° chèque, virement, etc.)</Label>
            <Input
              id="reference"
              value={formData.reference}
              onChange={(e) =>
                setFormData({ ...formData, reference: e.target.value })
              }
              placeholder="Ex: CHQ-123456"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Notes supplémentaires..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              <X className="h-4 w-4 mr-2" />
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Enregistrement..." : payment ? "Modifier" : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

