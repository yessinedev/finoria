import PurchaseOrders from "@/components/purchase-orders/purchase-orders";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bons de commande | Vente Pro",
  description: "Gérez vos bons de commande",
};

export default function PurchaseOrdersPage() {
  return <PurchaseOrders />;
}