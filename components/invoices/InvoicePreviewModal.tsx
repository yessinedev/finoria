import InvoicePreview from "./invoice-preview";
import type { Invoice } from "@/types/types";

interface InvoicePreviewModalProps {
  invoice: Invoice | null;
  open: boolean;
  onClose: () => void;
  onPrint: (invoice: Invoice) => void;
  onStatusChange?: (invoiceId: number, status: string) => void;
  companySettings?: any;
  products?: any[];
}

export default function InvoicePreviewModal({
  invoice,
  open,
  onClose,
  onPrint,
  onStatusChange,
  companySettings,
  products,
}: InvoicePreviewModalProps) {
  if (!invoice) return null;
  return (
    <InvoicePreview
      invoice={invoice}
      isOpen={open}
      onClose={onClose}
      onPrint={onPrint}
      onStatusChange={onStatusChange}
      companySettings={companySettings}
      products={products}
    />
  );
}