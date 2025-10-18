import ClientPayments from "@/components/payments/client-payments";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Paiements Clients | GestVente",
  description: "Gérez les paiements de vos clients",
};

export default function ClientPaymentsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8">
      <ClientPayments />
    </div>
  );
}