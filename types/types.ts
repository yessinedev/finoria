export interface Category {
  id: number;
  name: string;
  description: string;
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: number;
  name: string;
  company: string;
  email: string;
  phone?: string;
  address?: string;
}

export interface Supplier {
  id: number;
  name: string;
  company: string;
  email: string;
  phone?: string;
  address?: string;
  taxId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LineItem {
  id: number;
  productId: number;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface Sale {
  id: number;
  clientId: number;
  clientName: string;
  clientCompany?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  totalAmount: number;
  taxAmount: number;
  discountAmount?: number;
  finalAmount?: number;
  status: string;
  saleDate: string;
  items?: SaleItem[];
}

export interface SaleItem {
  id: number;
  productId: number;
  productName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  totalPrice: number;
}

export interface SupplierOrder {
  id: number;
  supplierId: number;
  supplierName: string;
  supplierCompany?: string;
  supplierEmail?: string;
  supplierPhone?: string;
  supplierAddress?: string;
  orderNumber: string;
  totalAmount: number;
  taxAmount: number;
  status: string;
  orderDate: string;
  deliveryDate?: string;
  items?: SupplierOrderItem[];
}

export interface SupplierOrderItem {
  id: number;
  productId: number;
  productName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface SupplierInvoice {
  id: number;
  supplierId: number;
  supplierName: string;
  supplierCompany?: string;
  supplierEmail?: string;
  supplierPhone?: string;
  supplierAddress?: string;
  orderId?: number;
  invoiceNumber: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  issueDate: string;
  dueDate?: string;
  paymentDate?: string;
  status: string;
  items?: SupplierInvoiceItem[];
}

export interface SupplierInvoiceItem {
  id: number;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export type InvoiceStatus = "Payée" | "En attente" | "En retard" | "Annulée";

export interface Invoice {
  id: number;
  number: string;
  saleId: number;
  clientName: string;
  clientCompany: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  items: InvoiceItem[];
  notes?: string;
  paymentTerms?: string;
}

export interface InvoiceItem {
  id: number;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
}

export interface Quote {
  id: number;
  number: string;
  clientId: number;
  clientName: string;
  clientCompany?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  issueDate: string;
  dueDate: string;
  paymentTerms?: string;
  status: "En attente" | "Accepté" | "Refusé" | "Envoyé" | "Brouillon";
  items: LineItem[];
  notes?: string;
}

export interface DashboardStats {
  todayRevenue: number;
  monthlyRevenue: number;
  totalClients: number;
  activeClients: number;
  totalProducts: number;
  lowStockProducts: number;
  totalSales: number;
  pendingInvoices: number;
  overdueInvoices: number;
  recentSales: Array<{
    id: number;
    client: string;
    amount: number;
    date: string;
    status: string;
  }>;
  salesByMonth: Array<{
    month: string;
    revenue: number;
    sales: number;
  }>;
  topProducts: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  clientDistribution: Array<{
    name: string;
    value: number;
  }>;
}
