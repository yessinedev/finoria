"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CreditCard,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { db } from "@/lib/database";
import type { SupplierPayment, SupplierInvoice, Supplier } from "@/types/types";
import PaymentDialog from "./PaymentDialog";
import { ActionsDropdown } from "@/components/common/actions-dropdown";
import { useToast } from "@/hooks/use-toast";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export default function SupplierPayments() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<SupplierPayment | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<SupplierInvoice | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadData();

    const unsubscribe = db.subscribe((table, action) => {
      if (["supplier_payments", "supplier_invoices"].includes(table)) {
        loadData();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [paymentsResult, invoicesResult, suppliersResult] = await Promise.all([
        db.payments.supplierPayments.getAll(),
        db.supplierInvoices.getAll(),
        db.suppliers.getAll(),
      ]);

      if (paymentsResult.success) {
        setPayments(paymentsResult.data || []);
      }
      if (invoicesResult.success) {
        setInvoices(invoicesResult.data || []);
      }
      if (suppliersResult.success) {
        setSuppliers(suppliersResult.data || []);
      }
    } catch (error: any) {
      setError(error.message || "Erreur lors du chargement des données");
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors du chargement des données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = (invoice?: SupplierInvoice) => {
    setSelectedPayment(null);
    setSelectedInvoice(invoice || null);
    setIsDialogOpen(true);
  };

  const handleEditPayment = (payment: SupplierPayment) => {
    setSelectedPayment(payment);
    setSelectedInvoice(null);
    setIsDialogOpen(true);
  };

  const handleDeletePayment = async (payment: SupplierPayment) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ce paiement de ${payment.amount} DNT ?`)) {
      return;
    }

    try {
      const result = await db.payments.supplierPayments.delete(payment.id);
      if (result.success) {
        toast({
          title: "Succès",
          description: "Paiement supprimé avec succès",
        });
        loadData();
      } else {
        throw new Error(result.error || "Erreur lors de la suppression");
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la suppression du paiement",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "DNT",
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(amount);
  };

  const formatPaymentMethod = (method?: string) => {
    const methods: Record<string, string> = {
      comptant: "Comptant",
      cheque: "Chèque",
      virement: "Virement",
      traite: "Traite",
      carte: "Carte",
      autre: "Autre",
    };
    return method ? methods[method] || method : "-";
  };

  const getPaymentMethodBadge = (method?: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      comptant: "default",
      cheque: "secondary",
      virement: "outline",
      traite: "secondary",
      carte: "outline",
      autre: "outline",
    };
    return variants[method || ""] || "outline";
  };

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPayments = payments.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(payments.length / itemsPerPage);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Paiements fournisseurs</h1>
          <p className="text-muted-foreground">
            Gérez tous les paiements effectués à vos fournisseurs
          </p>
        </div>
        <Button onClick={() => handleAddPayment()}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un paiement
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total des paiements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPaid)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {payments.length} paiement{payments.length > 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paiements ce mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                payments
                  .filter((p) => {
                    const paymentDate = new Date(p.paymentDate);
                    const now = new Date();
                    return (
                      paymentDate.getMonth() === now.getMonth() &&
                      paymentDate.getFullYear() === now.getFullYear()
                    );
                  })
                  .reduce((sum, p) => sum + p.amount, 0)
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Moyenne par paiement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                payments.length > 0 ? totalPaid / payments.length : 0
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Liste des paiements ({payments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun paiement enregistré
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Fournisseur</TableHead>
                    <TableHead>Facture</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Méthode</TableHead>
                    <TableHead>Référence</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {new Date(payment.paymentDate).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {payment.supplierName || "N/A"}
                          </div>
                          {payment.supplierCompany && (
                            <div className="text-sm text-muted-foreground">
                              {payment.supplierCompany}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {payment.invoiceNumber ? (
                          <Badge variant="outline">{payment.invoiceNumber}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPaymentMethodBadge(payment.paymentMethod)}>
                          {formatPaymentMethod(payment.paymentMethod)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {payment.reference ? (
                          <span className="text-sm font-mono">{payment.reference}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <ActionsDropdown
                          actions={[
                            {
                              label: "Modifier",
                              icon: <Edit className="h-4 w-4" />,
                              onClick: () => handleEditPayment(payment),
                            },
                            {
                              label: "Supprimer",
                              icon: <Trash2 className="h-4 w-4" />,
                              onClick: () => handleDeletePayment(payment),
                              className: "text-red-600",
                            },
                          ]}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() =>
                            setCurrentPage((prev) => Math.max(1, prev - 1))
                          }
                          className={
                            currentPage === 1 ? "pointer-events-none opacity-50" : ""
                          }
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      )}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                          }
                          className={
                            currentPage === totalPages
                              ? "pointer-events-none opacity-50"
                              : ""
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <PaymentDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedPayment(null);
          setSelectedInvoice(null);
        }}
        onSuccess={() => {
          loadData();
          setIsDialogOpen(false);
          setSelectedPayment(null);
          setSelectedInvoice(null);
        }}
        payment={selectedPayment}
        invoice={selectedInvoice}
        type="supplier"
        suppliers={suppliers}
        supplierInvoices={invoices}
      />
    </div>
  );
}

