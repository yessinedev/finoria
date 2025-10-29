"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  FileText,
  AlertCircle,
  CalendarIcon,
  Building2,
  Calculator,
  Wand2,
  Eye,
  Save,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { db } from "@/lib/database";
import type { Sale } from "@/types/types";
import { FormField } from "@/components/common/FormField";
import { EntitySelect } from "@/components/common/EntitySelect";
import { FinancialSummaryCard } from "@/components/common/FinancialSummaryCard";
import InvoicePreviewModal from "@/components/invoices/InvoicePreviewModal";
import { Label } from "@/components/ui/label";
import { invoiceSchema } from "@/lib/validation/schemas";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

interface InvoiceGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onInvoiceGenerated: () => void;
  availableSales: Sale[];
}

export default function InvoiceGenerator({
  isOpen,
  onClose,
  onInvoiceGenerated,
  availableSales,
}: InvoiceGeneratorProps) {
  const { toast } = useToast();
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [formData, setFormData] = useState({
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    paymentTerms: "30 jours net",
    notes: "",
    customNumber: "",
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<any>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [companySettings, setCompanySettings] = useState<any>(null);

  // Load company settings
  useEffect(() => {
    const loadCompanySettings = async () => {
      try {
        const result = await db.settings.get();
        if (result.success && result.data) {
          setCompanySettings(result.data);
        }
      } catch (error) {
        console.error("Error loading company settings:", error);
      }
    };

    if (isOpen) {
      loadCompanySettings();
    }
  }, [isOpen]);

  // Clear error when sale is selected
  useEffect(() => {
    if (selectedSale && error) {
      setError(null);
    }
  }, [selectedSale, error]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "DNT",
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(amount);
  };

  const paymentTermsOptions = [
    { value: "15 jours net", label: "15 jours net" },
    { value: "30 jours net", label: "30 jours net" },
    { value: "45 jours net", label: "45 jours net" },
    { value: "60 jours net", label: "60 jours net" },
    { value: "Paiement comptant", label: "Paiement comptant" },
    { value: "Paiement à réception", label: "Paiement à réception" },
  ];

  const validateForm = () => {
    try {
      if (!selectedSale) {
        setError("Veuillez sélectionner une vente");
        return false;
      }

      const invoiceData = {
        number:
          formData.customNumber.trim() !== ""
            ? formData.customNumber.trim()
            : generatePreviewInvoiceNumber(),
        saleId: selectedSale.id,
        clientId: selectedSale.clientId,
        amount: selectedSale.totalAmount - selectedSale.taxAmount, // HT amount
        taxAmount: selectedSale.taxAmount, // TVA amount
        totalAmount: selectedSale.totalAmount, // TTC amount
        status: "En attente",
        issueDate: new Date().toISOString(),
        dueDate: formData.dueDate.toISOString(),
      };

      invoiceSchema.parse(invoiceData);
      setFormErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path.length > 0) {
            newErrors[err.path[0]] = err.message;
          }
        });
        setFormErrors(newErrors);
        return false;
      }
      return false;
    }
  };

  const handleSaleSelection = (saleId: string) => {
    const sale = availableSales.find((s) => s.id.toString() === saleId);
    setSelectedSale(sale || null);
    setError(null);
  };

  const handleGenerateInvoice = async () => {
    if (!validateForm()) {
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Always provide a valid invoice number
      const invoiceNumber =
        formData.customNumber.trim() !== ""
          ? formData.customNumber.trim()
          : generatePreviewInvoiceNumber();
      
      // Calculate amounts with timbre fiscal
      const htAmount = selectedSale.totalAmount - selectedSale.taxAmount;
      const tvaAmount = selectedSale.taxAmount;
      const ttcAmount = selectedSale.totalAmount;
      const timbreFiscal = companySettings?.timbreFiscal || 1.000;
      const finalAmount = ttcAmount + timbreFiscal;
      
      const invoiceData = {
        number: invoiceNumber,
        saleId: selectedSale.id,
        dueDate: formData.dueDate.toISOString(),
        amount: htAmount, // HT amount
        taxAmount: tvaAmount, // TVA amount
        totalAmount: finalAmount, // TTC amount + timbre fiscal
        clientId: selectedSale.clientId,
        status: "En attente",
        notes: formData.notes,
      };

      const result = await db.invoices.create(invoiceData);
      if (result.success) {
        onInvoiceGenerated();
        onClose();
        // Reset form
        setSelectedSale(null);
        setFormData({
          dueDate: new Date(Date.now()),
          paymentTerms: "30 jours net",
          notes: "",
          customNumber: "",
        });
        setFormErrors({});
        toast({
          title: "Succès",
          description: "Facture générée avec succès",
        });
      } else {
        setError(result.error || "Erreur lors de la génération de la facture");
        toast({
          title: "Erreur",
          description:
            result.error || "Erreur lors de la génération de la facture",
          variant: "destructive",
        });
      }
    } catch (error) {
      setError("Erreur inattendue lors de la génération");
      toast({
        title: "Erreur",
        description: "Erreur inattendue lors de la génération",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const resetForm = () => {
    setSelectedSale(null);
    setFormData({
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      paymentTerms: "30 jours net",
      notes: "",
      customNumber: "",
    });
    setFormErrors({});
  };

  const generatePreviewInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `FAC-${year}${month}-${random}`;
  };

  const handleShowPreview = () => {
    if (!validateForm() || !selectedSale) {
      return;
    }

    // Generate preview based on current workflow
    const invoiceNumber =
      formData.customNumber.trim() !== ""
        ? formData.customNumber.trim()
        : generatePreviewInvoiceNumber();
    
    // Calculate amounts with timbre fiscal
    const htAmount = selectedSale.totalAmount - selectedSale.taxAmount;
    const tvaAmount = selectedSale.taxAmount;
    const ttcAmount = selectedSale.totalAmount;
    const timbreFiscal = companySettings?.timbreFiscal || 1.000;
    const finalAmount = ttcAmount + timbreFiscal;
    
    const previewData = {
      number: invoiceNumber,
      saleId: selectedSale.id,
      clientId: selectedSale.clientId,
      clientName: selectedSale.clientName,
      clientCompany: selectedSale.clientCompany,
      clientEmail: selectedSale.clientEmail,
      clientPhone: selectedSale.clientPhone,
      clientAddress: selectedSale.clientAddress,
      clientTaxId: selectedSale.clientTaxId,
      amount: htAmount,
      taxAmount: tvaAmount,
      totalAmount: finalAmount,
      status: "En attente",
      issueDate: new Date().toISOString(),
      dueDate: formData.dueDate.toISOString(),
      notes: formData.notes,
      items: selectedSale.items,
      paymentTerms: formData.paymentTerms,
    };

    setPreviewInvoice(previewData);
    setShowPreview(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
          resetForm();
          onClose();
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              Générateur de facture
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            <div className="flex flex-col gap-2 p-1">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
                {/* Left Column - Sale Selection and Configuration */}
                <div className="lg:col-span-1 flex flex-col gap-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Sélection de la vente *
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <EntitySelect
                        label="Vente à facturer"
                        id="sale"
                        value={selectedSale?.id?.toString() || ""}
                        onChange={handleSaleSelection}
                        options={availableSales}
                        getOptionLabel={(sale) => `Vente #${sale.id} - ${new Date(sale.saleDate).toLocaleDateString("fr-FR")} - ${formatCurrency(sale.totalAmount)}`}
                        getOptionValue={(sale) => sale.id.toString()}
                        required
                      />
                      {formErrors.saleId && (
                        <p className="text-sm text-red-500 mt-1">{formErrors.saleId}</p>
                      )}

                      {selectedSale && (
                        <Card className="border-primary/20 bg-primary/5">
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-primary" />
                              <span className="font-medium">Détails de la vente</span>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-muted-foreground">Client:</p>
                                <p className="font-medium">{selectedSale.clientName}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Entreprise:</p>
                                <p className="font-medium">{selectedSale.clientCompany}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Date de vente:</p>
                                <p className="font-medium">
                                  {new Date(selectedSale.saleDate).toLocaleDateString("fr-FR")}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Montant TTC:</p>
                                <p className="font-medium text-primary">
                                  {formatCurrency(selectedSale.totalAmount)}
                                </p>
                              </div>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-sm mb-1">
                                Articles ({selectedSale?.items?.length}):
                              </p>
                              <div className="space-y-1">
                                {selectedSale?.items?.slice(0, 3).map((item) => (
                                  <div key={item.id} className="text-xs bg-background/50 p-2 rounded">
                                    <span className="font-medium">{item.productName}</span>
                                    <span className="text-muted-foreground ml-2">
                                      {item.quantity}x {formatCurrency(item.unitPrice)}
                                    </span>
                                  </div>
                                ))}
                                {(selectedSale?.items?.length ?? 0) > 3 && (
                                  <p className="text-xs text-muted-foreground">
                                    +{(selectedSale?.items?.length ?? 0) - 3} autre(s) article(s)
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        Configuration de la facture
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                      <FormField
                        label="Numéro de facture (optionnel)"
                        id="customNumber"
                        value={formData.customNumber}
                        onChange={(e) => setFormData({ ...formData, customNumber: e.target.value })}
                        placeholder={`Auto: ${generatePreviewInvoiceNumber()}`}
                        error={formErrors.number}
                      />

                      <div className="flex flex-col gap-2">
                        <Label>Date d'échéance *</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !formData.dueDate && "text-muted-foreground",
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData.dueDate ? (
                                format(formData.dueDate, "PPP", { locale: fr })
                              ) : (
                                <span>Sélectionner une date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={formData.dueDate}
                              onSelect={(date) => date && setFormData({ ...formData, dueDate: date })}
                            />
                          </PopoverContent>
                        </Popover>
                        {formErrors.dueDate && (
                          <p className="text-sm text-red-500 mt-1">{formErrors.dueDate}</p>
                        )}
                      </div>

                      <EntitySelect
                        label="Conditions de paiement"
                        id="paymentTerms"
                        value={formData.paymentTerms}
                        onChange={(value) => setFormData({ ...formData, paymentTerms: value })}
                        options={paymentTermsOptions}
                        getOptionLabel={(opt) => opt.label}
                        getOptionValue={(opt) => opt.value}
                      />

                      <FormField
                        label="Notes (optionnel)"
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        textarea
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - Financial Summary */}
                <div className="lg:col-span-2 flex flex-col gap-2">
                  {selectedSale && (
                    <Card className="flex-1 flex flex-col">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Calculator className="h-5 w-5" />
                          Récapitulatif financier
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col">
                        <div className="flex-1 overflow-auto mb-4">
                          <table className="w-full">
                            <thead className="bg-muted">
                              <tr>
                                <th className="text-left p-2">Article</th>
                                <th className="text-right p-2 w-20">Qté</th>
                                <th className="text-right p-2 w-24">Prix unit.</th>
                                <th className="text-right p-2 w-20">Remise %</th>
                                <th className="text-right p-2 w-24">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedSale.items.map((item) => (
                                <tr key={item.id} className="border-t">
                                  <td className="p-2">
                                    <div>
                                      <div className="font-medium">{item.productName}</div>
                                    </div>
                                  </td>
                                  <td className="p-2 text-right">{item.quantity}</td>
                                  <td className="p-2 text-right">{item.unitPrice.toFixed(3)} DNT</td>
                                  <td className="p-2 text-right">{item.discount > 0 ? item.discount.toFixed(2) : '-'}</td>
                                  <td className="p-2 text-right font-medium">{item.totalPrice.toFixed(3)} DNT</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Financial Summary */}
                        <div className="border-t pt-4">
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Sous-total HT:</span>
                              <span>{(selectedSale.totalAmount - selectedSale.taxAmount).toFixed(3)} DNT</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>TVA:</span>
                              <span>{selectedSale.taxAmount.toFixed(3)} DNT</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Timbre Fiscal:</span>
                              <span>{(companySettings?.timbreFiscal || 1.000).toFixed(3)} DNT</span>
                            </div>
                            <div className="border-t pt-2">
                              <div className="flex justify-between font-semibold">
                                <span>Total TTC:</span>
                                <span>{(selectedSale.totalAmount + (companySettings?.timbreFiscal || 1.000)).toFixed(3)} DNT</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex-shrink-0 border-t pt-4">
            <div className="flex flex-col sm:flex-row gap-3 justify-between">
              <Button variant="outline" onClick={onClose} disabled={isGenerating}>
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleShowPreview}
                  disabled={isGenerating || !selectedSale}
                  className="border-primary text-primary hover:bg-primary/10"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Aperçu
                </Button>
                <Button 
                  onClick={handleGenerateInvoice} 
                  disabled={isGenerating || !selectedSale}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isGenerating ? "Génération..." : "Générer la facture"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showPreview && previewInvoice && (
        <InvoicePreviewModal
          invoice={previewInvoice}
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          companySettings={companySettings}
        />
      )}
    </>
  );
}