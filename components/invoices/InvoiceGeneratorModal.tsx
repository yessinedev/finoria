import InvoiceGenerator from "./invoice-generator";
import type { Sale } from "@/types/types";

interface InvoiceGeneratorModalProps {
  open: boolean;
  onClose: () => void;
  onInvoiceGenerated: () => void;
  availableSales: Sale[];
}

export default function InvoiceGeneratorModal({
  open,
  onClose,
  onInvoiceGenerated,
  availableSales,
}: InvoiceGeneratorModalProps) {
  return (
    <InvoiceGenerator
      isOpen={open}
      onClose={onClose}
      onInvoiceGenerated={onInvoiceGenerated}
      availableSales={availableSales}
    />
  );
}
