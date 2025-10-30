import { z } from 'zod';

// Supplier validation schema
export const supplierSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  company: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.string().length(0)),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxId: z.string().optional(),
});

// Supplier order validation schema
export const supplierOrderSchema = z.object({
  supplierId: z.number().min(1, "Le fournisseur est requis"),
  orderNumber: z.string().min(1, "Le numéro de commande est requis"),
  totalAmount: z.number().min(0, "Le montant total doit être positif"),
  taxAmount: z.number().min(0, "La taxe doit être positive"),
  // Removed status field
  orderDate: z.string().min(1, "La date de commande est requise"),
  deliveryDate: z.string().optional(),
  items: z.array(z.object({
    productId: z.number().min(1, "Le produit est requis"),
    productName: z.string().min(1, "Le nom du produit est requis"),
    quantity: z.number().min(1, "La quantité doit être supérieure à 0"),
    unitPrice: z.number().min(0, "Le prix unitaire doit être positif"),
    discount: z.number().min(0, "La remise doit être positive ou nulle").optional(),
    totalPrice: z.number().min(0, "Le total doit être positif"),
  })).optional(), // Make items optional
});

// Supplier invoice validation schema
export const supplierInvoiceSchema = z.object({
  supplierId: z.number().min(1, "Le fournisseur est requis"),
  orderId: z.number().optional(),
  invoiceNumber: z.string().min(1, "Le numéro de facture est requis"),
  amount: z.number().min(0, "Le montant doit être positif"),
  taxAmount: z.number().min(0, "La taxe doit être positive"),
  totalAmount: z.number().min(0, "Le montant total doit être positif"),
  // Removed status field
  issueDate: z.string().min(1, "La date d'émission est requise"),
  dueDate: z.string().optional(),
  paymentDate: z.string().optional(),
  // Items are optional since they can be auto-populated from orders
  items: z.array(z.object({
    productId: z.number().min(1, "Le produit est requis"),
    productName: z.string().min(1, "Le nom du produit est requis"),
    quantity: z.number().min(1, "La quantité doit être supérieure à 0"),
    unitPrice: z.number().min(0, "Le prix unitaire doit être positif"),
    discount: z.number().min(0, "La remise doit être positive ou nulle").optional(),
    totalPrice: z.number().min(0, "Le total doit être positif"),
  })).optional(),
});

// Product validation schema
export const productSchema = z.object({
  name: z.string().min(1, "Le nom du produit est requis"),
  description: z.string().optional(),
  category: z.string().min(1, "La catégorie est requise"),
  stock: z.number().min(0, "Le stock doit être positif ou nul"),
  reference: z.string().optional(),
  tvaId: z.number().optional(),
  sellingPriceHT: z.number().min(0, "Le prix de vente HT doit être positif").optional(),
  sellingPriceTTC: z.number().min(0, "Le prix de vente TTC doit être positif").optional(),
  purchasePriceHT: z.number().min(0, "Le prix d'achat HT doit être positif").optional(),
});

// Client validation schema
export const clientSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  company: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.string().length(0)),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxId: z.string().optional(), // New tax identification number field
});

// Sale validation schema
export const saleSchema = z.object({
  clientId: z.number().min(1, "Le client est requis"),
  totalAmount: z.number().min(0, "Le montant total doit être positif"),
  taxAmount: z.number().min(0, "La taxe doit être positive"),
  discountAmount: z.number().min(0, "La remise doit être positive ou nulle").optional(),
  finalAmount: z.number().min(0, "Le montant final doit être positif").optional(),
  // Removed status field
  saleDate: z.string().min(1, "La date de vente est requise"),
  items: z.array(z.object({
    productId: z.number().min(1, "Le produit est requis"),
    productName: z.string().min(1, "Le nom du produit est requis"),
    quantity: z.number().min(1, "La quantité doit être supérieure à 0"),
    unitPrice: z.number().min(0, "Le prix unitaire doit être positif"),
    discount: z.number().min(0, "La remise doit être positive ou nulle").optional(),
    totalPrice: z.number().min(0, "Le total doit être positif"),
  })).min(1, "Au moins un article est requis"),
});

// Quote validation schema
export const quoteSchema = z.object({
  clientId: z.number().min(1, "Le client est requis"),
  amount: z.number().min(0, "Le montant doit être positif"),
  taxAmount: z.number().min(0, "La taxe doit être positive"),
  totalAmount: z.number().min(0, "Le montant total doit être positif"),
  // Removed status field
  issueDate: z.string().min(1, "La date d'émission est requise"),
  dueDate: z.string().min(1, "La date d'échéance est requise"),
  items: z.array(z.object({
    productId: z.number().min(1, "Le produit est requis"),
    productName: z.string().min(1, "Le nom du produit est requis"),
    quantity: z.number().min(1, "La quantité doit être supérieure à 0"),
    unitPrice: z.number().min(0, "Le prix unitaire doit être positif"),
    discount: z.number().min(0, "La remise doit être positive ou nulle").optional(),
    totalPrice: z.number().min(0, "Le total doit être positif"),
  })).min(1, "Au moins un article est requis"),
});

// Invoice validation schema
export const invoiceSchema = z.object({
  number: z.string().min(1, "Le numéro de facture est requis"),
  saleId: z.number().min(1, "La vente est requise"),
  clientId: z.number().min(1, "Le client est requis"),
  amount: z.number().min(0, "Le montant doit être positif"),
  taxAmount: z.number().min(0, "La taxe doit être positive"),
  totalAmount: z.number().min(0, "Le montant total doit être positif"),
  // Removed status field
  issueDate: z.string().min(1, "La date d'émission est requise"),
  dueDate: z.string().min(1, "La date d'échéance est requise"),
  items: z.array(z.object({
    productId: z.number().min(1, "Le produit est requis"),
    productName: z.string().min(1, "Le nom du produit est requis"),
    quantity: z.number().min(1, "La quantité doit être supérieure à 0"),
    unitPrice: z.number().min(0, "Le prix unitaire doit être positif"),
    discount: z.number().min(0, "La remise doit être positive ou nulle").optional(),
    totalPrice: z.number().min(0, "Le total doit être positif"),
  })).optional(), // Make items optional since they will be fetched from the sale
});

export type SupplierFormData = z.infer<typeof supplierSchema>;
export type SupplierOrderFormData = z.infer<typeof supplierOrderSchema>;
export type SupplierInvoiceFormData = z.infer<typeof supplierInvoiceSchema>;
export type ProductFormData = z.infer<typeof productSchema>;
export type ClientFormData = z.infer<typeof clientSchema>;
export type SaleFormData = z.infer<typeof saleSchema>;
export type QuoteFormData = z.infer<typeof quoteSchema>;
export type InvoiceFormData = z.infer<typeof invoiceSchema>;