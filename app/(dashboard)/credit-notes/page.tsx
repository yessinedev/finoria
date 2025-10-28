import CreditNotes from "@/components/credit-notes/credit-notes";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Factures d'avoir | Vente Pro",
  description: "Gérez vos factures d'avoir",
};

export default function CreditNotesPage() {
  return <CreditNotes />;
}