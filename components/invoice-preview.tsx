"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  Download,
  Printer,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  Mail,
  Phone,
  MapPin,
  Loader2,
  Check,
  Clock,
  AlertCircle,
  X,
} from "lucide-react"

interface InvoiceItem {
  id: number
  productName: string
  description: string
  quantity: number
  unitPrice: number
  discount: number
  totalPrice: number
}

interface Invoice {
  id: number
  number: string
  saleId: number
  clientName: string
  clientCompany: string
  clientEmail: string
  clientPhone: string
  clientAddress: string
  amount: number
  taxAmount: number
  totalAmount: number
  issueDate: string
  dueDate: string
  status: "Payée" | "En attente" | "En retard" | "Annulée"
  items: InvoiceItem[]
  notes?: string
  paymentTerms?: string
}

interface InvoicePreviewProps {
  invoice: Invoice
  isOpen: boolean
  onClose: () => void
  // onDownloadPDF: (invoice: Invoice) => Promise<void> // This prop might no longer be needed for this button's action
  onPrint: (invoice: Invoice) => void
  onStatusChange?: (invoiceId: number, status: string) => void
}

export default function InvoicePreview({
  invoice,
  isOpen,
  onClose,
  // onDownloadPDF, // Prop might be removed or repurposed
  onPrint,
  onStatusChange,
}: InvoicePreviewProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)

  const handleDownload = async () => {
    setIsDownloading(true);
    const invoiceContentElement = document.getElementById('invoice-preview-content');

    if (invoiceContentElement) {
      try {
        const canvas = await html2canvas(invoiceContentElement, {
          scale: 2, // Improves quality
          useCORS: true, // If you have external images
          scrollY: -window.scrollY, // Adjust for full page capture if needed
          windowWidth: invoiceContentElement.scrollWidth,
          windowHeight: invoiceContentElement.scrollHeight,
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'p',
          unit: 'px',
          format: [canvas.width, canvas.height],
        });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`facture-${invoice.number}.pdf`);
      } catch (error) {
        console.error("Error generating PDF:", error);
        // Handle error (e.g., show a notification to the user)
      } finally {
        setIsDownloading(false);
      }
    } else {
      console.error("Invoice content element not found");
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    setIsPrinting(true)
    try {
      onPrint(invoice)
    } finally {
      setIsPrinting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Payée":
        return "bg-green-100 text-green-800 border-green-200"
      case "En attente":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "En retard":
        return "bg-red-100 text-red-800 border-red-200"
      case "Annulée":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Payée":
        return <Check className="h-4 w-4" />
      case "En attente":
        return <Clock className="h-4 w-4" />
      case "En retard":
        return <AlertCircle className="h-4 w-4" />
      case "Annulée":
        return <X className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  const isOverdue = new Date(invoice.dueDate) < new Date() && invoice.status !== "Payée"

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Facture {invoice.number}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Badge className={`${getStatusColor(invoice.status)} flex items-center gap-1`}>
                {getStatusIcon(invoice.status)}
                {invoice.status}
              </Badge>
              {isOverdue && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  En retard
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto" id="invoice-preview-content"> {/* Added id here */}
          <div className="space-y-6 p-1">
            {/* Invoice Header */}
            <Card className="border-2 border-primary/20">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Building2 className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-primary">GestVente SARL</h2>
                      <p className="text-sm text-muted-foreground">Gestion & Facturation</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h1 className="text-3xl font-bold text-primary">FACTURE</h1>
                    <p className="text-lg font-semibold text-muted-foreground">{invoice.number}</p>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Company and Client Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Company Info */}
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Émetteur
                  </h3>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="font-semibold">GestVente SARL</p>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>123 Rue de l'Entreprise, 75001 Paris</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>01 23 45 67 89</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>contact@gestvente.fr</span>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="text-xs text-muted-foreground">
                    <p>SIRET: 123 456 789 00012</p>
                    <p>TVA: FR12345678901</p>
                  </div>
                </CardContent>
              </Card>

              {/* Client Info */}
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Facturé à
                  </h3>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="font-semibold">{invoice.clientName}</p>
                    <p className="text-sm font-medium text-muted-foreground">{invoice.clientCompany}</p>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {invoice.clientAddress && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{invoice.clientAddress}</span>
                      </div>
                    )}
                    {invoice.clientPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>{invoice.clientPhone}</span>
                      </div>
                    )}
                    {invoice.clientEmail && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>{invoice.clientEmail}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Invoice Details */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Détails de la facture
                </h3>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Date d'émission</p>
                    <p className="font-semibold">{formatDate(invoice.issueDate)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Date d'échéance</p>
                    <p className={`font-semibold ${isOverdue ? "text-red-600" : ""}`}>{formatDate(invoice.dueDate)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Conditions de paiement</p>
                    <p className="font-semibold">{invoice.paymentTerms || "30 jours net"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Invoice Items */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-lg">Articles facturés</h3>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Description</TableHead>
                        <TableHead className="text-center font-semibold">Qté</TableHead>
                        <TableHead className="text-right font-semibold">Prix unitaire</TableHead>
                        <TableHead className="text-center font-semibold">Remise</TableHead>
                        <TableHead className="text-right font-semibold">Total HT</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoice.items.map((item, index) => (
                        <TableRow key={item.id} className={index % 2 === 0 ? "bg-muted/20" : ""}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.productName}</p>
                              {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                          <TableCell className="text-center">{item.discount > 0 ? `${item.discount}%` : "-"}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(item.totalPrice)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Totals */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-end">
                  <div className="w-full max-w-sm space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Sous-total HT:</span>
                      <span className="font-medium">{formatCurrency(invoice.amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">TVA (20%):</span>
                      <span className="font-medium">{formatCurrency(invoice.taxAmount)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total TTC:</span>
                      <span className="text-primary">{formatCurrency(invoice.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {/* {invoice.notes && (
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-lg">Notes</h3>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{invoice.notes}</p>
                </CardContent>
              </Card>
            )} */}

            {/* Payment Information */}
            {/* <Card className="border-primary/20">
              <CardHeader className="bg-primary/5">
                <h3 className="font-semibold text-lg">Informations de paiement</h3>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium mb-2">Coordonnées bancaires:</p>
                    <div className="space-y-1 text-muted-foreground">
                      <p>IBAN: FR76 1234 5678 9012 3456 7890 123</p>
                      <p>BIC: ABCDEFGH</p>
                      <p>Banque: Crédit Exemple</p>
                    </div>
                  </div>
                  <div>
                    <p className="font-medium mb-2">Conditions:</p>
                    <div className="space-y-1 text-muted-foreground">
                      <p>• Paiement à 30 jours par virement</p>
                      <p>• Pénalités de retard: 3% par mois</p>
                      <p>• Escompte: 2% si paiement sous 8 jours</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card> */}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 border-t pt-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="flex gap-2">
              {onStatusChange && (
                <div className="flex gap-1">
                  {invoice.status !== "Payée" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onStatusChange(invoice.id, "Payée")}
                      className="text-green-600 border-green-200 hover:bg-green-50"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Marquer payée
                    </Button>
                  )}
                  {invoice.status !== "Annulée" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onStatusChange(invoice.id, "Annulée")}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Annuler
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePrint} disabled={isPrinting}>
                {isPrinting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
                Imprimer
              </Button>
              <Button onClick={handleDownload} disabled={isDownloading}>
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Télécharger PDF
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
