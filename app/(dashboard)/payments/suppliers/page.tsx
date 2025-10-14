import SupplierPayments from "@/components/payments/supplier-payments";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Paiements Fournisseurs | GestVente",
  description: "Gérez les paiements à vos fournisseurs",
};

export default function SupplierPaymentsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8">
      <SupplierPayments />
    </div>
  );
}