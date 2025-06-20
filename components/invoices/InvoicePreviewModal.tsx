import InvoicePreview from "./invoice-preview";
import type { Invoice } from "@/types/types";

interface InvoicePreviewModalProps {
  invoice: Invoice | null;
  open: boolean;
  onClose: () => void;
  onPrint: (invoice: Invoice) => void;
  onStatusChange?: (invoiceId: number, status: string) => void;
}

export default function InvoicePreviewModal({
  invoice,
  open,
  onClose,
  onPrint,
  onStatusChange,
}: InvoicePreviewModalProps) {
  if (!invoice) return null;
  return (
    <InvoicePreview
      invoice={invoice}
      isOpen={open}
      onClose={onClose}
      onPrint={onPrint}
      onStatusChange={onStatusChange}
    />
  );
}
