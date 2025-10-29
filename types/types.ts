export interface Category {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TVA {
  id: number;
  rate: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  stock: number;
  isActive: boolean;
  reference?: string;
  tvaId?: number;
  tvaRate?: number; // TVA rate fetched from the tva table (joined)
  sellingPriceHT?: number;
  sellingPriceTTC?: number;
  purchasePriceHT?: number;
  weightedAverageCostHT?: number;
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
  taxId?: string; // New tax identification number field
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
  productName?: string; // For compatibility with database field
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
  clientTaxId?: string; // New client tax identification number field
  totalAmount: number;
  taxAmount: number;
  discountAmount?: number;
  fodecAmount?: number; // New FODEC tax amount
  finalAmount?: number;
  // Removed status field
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
  orderNumber: string;
  supplierName: string;
  supplierCompany?: string;
  supplierEmail?: string;
  supplierPhone?: string;
  supplierAddress?: string;
  totalAmount: number;
  taxAmount: number;
  // Removed status field
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
  discount: number;
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
  supplierTaxId?: string;
  orderId?: number;
  invoiceNumber: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  issueDate: string;
  dueDate?: string;
  paymentDate?: string;
  status: InvoiceStatus;
  items?: SupplierInvoiceItem[];
}

export interface SupplierInvoiceItem {
  id: number;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
}

export type InvoiceStatus = "Payée" | "En attente" | "En retard" | "Annulée";

export interface Invoice {
  id: number;
  number: string;
  saleId: number;
  clientId: number;
  clientName: string;
  clientCompany: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  clientTaxId?: string; // New client tax identification number field
  amount: number;
  taxAmount: number;
  fodecAmount?: number; // FODEC tax amount
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
  productId: number;
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
  status: string;
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
    // Removed status field
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

export interface StockMovement {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  movementType: 'IN' | 'OUT';
  sourceType: string;
  sourceId: number;
  reference: string;
  reason: string;
  createdAt: string;
}

export interface ClientPayment {
  id: number;
  clientId: number;
  clientName?: string;
  clientCompany?: string;
  invoiceId?: number;
  invoiceNumber?: string;
  amount: number;
  paymentDate: string;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
  createdAt: string;
}

export interface SupplierPayment {
  id: number;
  supplierId: number;
  supplierName?: string;
  supplierCompany?: string;
  invoiceId?: number;
  invoiceNumber?: string;
  amount: number;
  paymentDate: string;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
  createdAt: string;
}

export interface CreditNote {
  id: number;
  number: string;
  originalInvoiceId: number;
  clientId: number;
  clientName: string;
  clientCompany?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  clientTaxId?: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  reason: string;
  issueDate: string;
  dueDate?: string;
  status?: string;
  items: CreditNoteItem[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreditNoteItem {
  id: number;
  productId: number;
  productName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
}

export interface ReceptionNote {
  id: number;
  supplierOrderId: number;
  receptionNumber: string;
  driverName?: string;
  vehicleRegistration?: string;
  receptionDate: string;
  notes?: string;
  createdAt: string;
  items: ReceptionNoteItem[];
  supplierOrder?: SupplierOrder; // Reference to the original supplier order
  // Backward compatible flat fields
  supplierOrderNumber?: string;
  supplierName?: string;
  supplierCompany?: string;
}

export interface ReceptionNoteItem {
  id: number;
  productId: number;
  productName: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unitPrice: number;
}

export interface PurchaseOrder {
  id: number;
  number: string;
  saleId: number;
  clientId: number;
  clientName: string;
  clientCompany?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  orderDate: string;
  deliveryDate?: string;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: number;
  productId: number;
  productName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
}

export interface DeliveryReceipt {
  id: number;
  saleId: number;
  deliveryNumber: string;
  driverName?: string;
  vehicleRegistration?: string;
  deliveryDate: string;
  createdAt: string;
  items: DeliveryReceiptItem[];
}

export interface DeliveryReceiptItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface CompanyInfo {
  name: string
  address: string
  phone: string
  email: string
  website?: string
  city: string
  country: string
  logo?: string
}

export interface TaxInfo {
  taxId: string
  taxStatus: string
  tvaNumber?: number
  timbreFiscal?: number
}

export interface CreateCompanyData extends CompanyInfo, TaxInfo {}
export interface CompanyData extends CompanyInfo, TaxInfo {
  id: number
}


export interface OnboardingData {
  companyInfo: CompanyInfo
  taxInfo: TaxInfo
}