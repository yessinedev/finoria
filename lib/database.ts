import type { Category, Unit } from "@/types/types";

interface ElectronAPI {
  // Categories
  getCategories: () => Promise<any[]>;
  createCategory: (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => Promise<any>;
  updateCategory: (id: number, category: Partial<Omit<Category, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<any>;
  deleteCategory: (id: number) => Promise<boolean>;

  // Units
  getUnits: () => Promise<any[]>;
  getUnitById: (id: number) => Promise<any>;
  createUnit: (unit: Omit<Unit, 'id' | 'createdAt' | 'updatedAt'>) => Promise<any>;
  updateUnit: (id: number, unit: Partial<Omit<Unit, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<any>;
  deleteUnit: (id: number) => Promise<boolean>;

  // Clients
  getClients: () => Promise<any[]>;
  createClient: (client: any) => Promise<any>;
  updateClient: (id: number, client: any) => Promise<any>;
  deleteClient: (id: number) => Promise<boolean>;

  // Suppliers
  getSuppliers: () => Promise<any[]>;
  createSupplier: (supplier: any) => Promise<any>;
  updateSupplier: (id: number, supplier: any) => Promise<any>;
  deleteSupplier: (id: number) => Promise<boolean>;

  // Supplier Orders
  getSupplierOrders: () => Promise<any[]>;
  createSupplierOrder: (order: any) => Promise<any>;
  updateSupplierOrder: (id: number, order: any) => Promise<any>;
  deleteSupplierOrder: (id: number) => Promise<boolean>;
  // Removed updateSupplierOrderStatus function

  // Supplier Invoices
  getSupplierInvoices: () => Promise<any[]>;
  createSupplierInvoice: (invoice: any) => Promise<any>;
  updateSupplierInvoice: (id: number, invoice: any) => Promise<any>;
  updateSupplierInvoiceStatus: (id: number, status: string) => Promise<any>;
  deleteSupplierInvoice: (id: number) => Promise<boolean>;

  // Products
  getProducts: () => Promise<any[]>;
  getProductById: (id: number) => Promise<any>;
  getProductStock: (id: number) => Promise<number>;
  checkProductStock: (id: number, requestedQuantity: number) => Promise<{ available: boolean; stock: number }>;
  updateProductStock: (id: number, quantity: number) => Promise<any>;
  createProduct: (product: any) => Promise<any>;
  updateProduct: (id: number, product: any) => Promise<any>;
  deleteProduct: (id: number) => Promise<boolean>;

  // Sales
  createSale: (sale: any) => Promise<any>;
  getSales: () => Promise<any[]>;
  getSalesWithItems: () => Promise<any[]>;
  getSale: (id: number) => Promise<any>;
  getSaleItems: (saleId: number) => Promise<any[]>;
  deleteSale: (id: number) => Promise<boolean>;

  // Dashboard
  getDashboardStats: (dateRange?: string) => Promise<any>;

  // Invoices
  getInvoices: () => Promise<any[]>;
  createInvoice: (invoice: any) => Promise<any>;
  updateInvoiceStatus: (id: number, status: string) => Promise<any>;
  generateInvoiceFromSale: (saleId: number) => Promise<any>;
  generateInvoiceFromQuote: (quoteId: number) => Promise<any>;
  getInvoiceItems: (invoiceId: number) => Promise<any[]>;
  checkInvoiceDueDates: () => Promise<void>;
  checkSupplierInvoiceDueDates: () => Promise<void>;

  // Quotes
  getQuotes: () => Promise<any[]>;
  createQuote: (quote: any) => Promise<any>;
  updateQuote: (id: number, quote: any) => Promise<any>;
  updateQuoteStatus: (id: number, status: string) => Promise<any>;
  deleteQuote: (id: number) => Promise<boolean>;
  getQuoteItems: (quoteId: number) => Promise<any[]>;

  // Credit Notes
  getCreditNotes: () => Promise<any[]>;
  createCreditNote: (creditNote: any) => Promise<any>;
  updateCreditNoteStatus: (id: number, status: string) => Promise<any>;
  generateCreditNoteFromInvoice: (invoiceId: number, reason: string) => Promise<any>;
  getCreditNoteItems: (creditNoteId: number) => Promise<any[]>;

  // Purchase Orders
  getPurchaseOrders: () => Promise<any[]>;
  createPurchaseOrder: (purchaseOrder: any) => Promise<any>;
  // Removed updatePurchaseOrderStatus function
  generatePurchaseOrderFromSale: (saleId: number, deliveryDate: string) => Promise<any>;
  getPurchaseOrderItems: (purchaseOrderId: number) => Promise<any[]>;

  // TVA
  getTvaRates: () => Promise<any[]>;
  createTvaRate: (tvaRate: any) => Promise<any>;
  updateTvaRate: (id: number, tvaRate: any) => Promise<any>;
  deleteTvaRate: (id: number) => Promise<boolean>;
  getTvaRate: (id: number) => Promise<any>;

  // Delivery Receipts
  createDeliveryReceipt: (deliveryReceipt: any) => Promise<any>;
  updateDeliveryReceipt: (id: number, deliveryReceipt: any) => Promise<any>;
  getDeliveryReceipts: () => Promise<any[]>;
  getDeliveryReceipt: (id: number) => Promise<any>;
  getDeliveryReceiptBySale: (saleId: number) => Promise<any>;
  deleteDeliveryReceipt: (id: number) => Promise<boolean>;

  // Reception Notes
  createReceptionNote: (receptionNote: any) => Promise<any>;
  getReceptionNotes: () => Promise<any[]>;
  getReceptionNote: (id: number) => Promise<any>;
  getReceptionNoteByOrder: (supplierOrderId: number) => Promise<any>;
  updateReceptionNote: (id: number, receptionNote: any) => Promise<any>;
  deleteReceptionNote: (id: number) => Promise<boolean>;

  // Stock Movements
  getStockMovements: () => Promise<any[]>;
  createStockMovement: (movement: any) => Promise<any>;
  getStockMovementsByProduct: (productId: number) => Promise<any[]>;

  // Enterprise Settings
  getEnterpriseSettings: () => Promise<any>;
  createEnterpriseSettings: (settings: any) => Promise<any>;
  updateEnterpriseSettings: (id: number, settings: any) => Promise<any>;

  // Database
  exportDatabase: () => Promise<{ success: boolean; path?: string; filename?: string; error?: string }>;
  importDatabase: () => Promise<{ success: boolean; backupPath?: string; message?: string; error?: string }>;

  // Device
  getFingerprint: () => Promise<string>;
  checkForUpdates: () => Promise<{ success: boolean; data?: { available: boolean; version?: string; url?: string }; error?: string }>;
  downloadUpdate: () => Promise<{ success: boolean; data?: { version: string }; error?: string }>;
  quitAndInstall: () => Promise<void>;

  // Payments
  getClientPayments: () => Promise<any[]>;
  getInvoicePayments: (invoiceId: number) => Promise<any[]>;
  createClientPayment: (payment: any) => Promise<any>;
  updateClientPayment: (id: number, payment: any) => Promise<any>;
  deleteClientPayment: (id: number) => Promise<boolean>;
  getSupplierPayments: () => Promise<any[]>;
  getSupplierInvoicePayments: (invoiceId: number) => Promise<any[]>;
  createSupplierPayment: (payment: any) => Promise<any>;
  updateSupplierPayment: (id: number, payment: any) => Promise<any>;
  deleteSupplierPayment: (id: number) => Promise<boolean>;

  // Data listeners for real-time updates
  onDataChange: (
    callback: (table: string, action: string, data: any) => void
  ) => void;
  removeDataListener: (callback: Function) => void;
  
  // Update events
  onUpdateAvailable: (callback: (info: any) => void) => void;
  onUpdateNotAvailable: (callback: () => void) => void;
  onUpdateError: (callback: (error: string) => void) => void;
  onUpdateDownloadProgress: (callback: (progress: any) => void) => void;
  onUpdateDownloaded: (callback: (info: any) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// --- Database Service ---
class DatabaseService {
  private listeners: Set<Function> = new Set();

  constructor() {
    // Set up data change listener
    if (typeof window !== "undefined" && window.electronAPI) {
      window.electronAPI.onDataChange(
        (table: string, action: string, data: any) => {
          this.notifyListeners(table, action, data);
        }
      );
    }
  }

  // --- Real-time Data Subscription ---
  subscribe(callback: (table: string, action: string, data: any) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(table: string, action: string, data: any) {
    this.listeners.forEach((callback) => {
      try {
        callback(table, action, data);
      } catch (error) {
        console.error("Error in data change listener:", error);
      }
    });
  }

  // --- Error Handling Wrapper ---
  private async handle<T>(
    operation: () => Promise<T>,
    name: string
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      // Check if we're in a browser environment and electronAPI is available
      if (typeof window === "undefined" || !window.electronAPI) {
        console.warn(`Electron API not available for operation: ${name}`);
        return {
          success: false,
          error: "Electron API not available",
        };
      }
      const data = await operation();
      return { success: true, data };
    } catch (error) {
      console.error(`Database operation failed (${name}):`, error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  // --- Categories API ---
  categories = {
    getAll: () =>
      this.handle(
        () => window.electronAPI?.getCategories() || Promise.resolve([]),
        "getCategories"
      ),
    create: (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) =>
      this.handle(
        () =>
          window.electronAPI?.createCategory(category) || Promise.resolve(null),
        "createCategory"
      ),
    update: (id: number, category: Partial<Omit<Category, 'id' | 'createdAt' | 'updatedAt'>>) =>
      this.handle(
        () =>
          window.electronAPI?.updateCategory(id, category) ||
          Promise.resolve(null),
        "updateCategory"
      ),
    canDelete: (id: number) =>
      this.handle(
        () => window.electronAPI?.canDeleteCategory(id) || Promise.resolve(false),
        "canDeleteCategory"
      ),
    delete: (id: number) =>
      this.handle(
        () => window.electronAPI?.deleteCategory(id) || Promise.resolve(false),
        "deleteCategory"
      ),
  };

  // --- Units API ---
  units = {
    getAll: () =>
      this.handle(
        () => window.electronAPI?.getUnits() || Promise.resolve([]),
        "getUnits"
      ),
    getOne: (id: number) =>
      this.handle(
        () => window.electronAPI?.getUnitById(id) || Promise.resolve(null),
        "getUnit"
      ),
    create: (unit: Omit<Unit, 'id' | 'createdAt' | 'updatedAt'>) =>
      this.handle(
        () =>
          window.electronAPI?.createUnit(unit) || Promise.resolve(null),
        "createUnit"
      ),
    update: (id: number, unit: Partial<Omit<Unit, 'id' | 'createdAt' | 'updatedAt'>>) =>
      this.handle(
        () =>
          window.electronAPI?.updateUnit(id, unit) ||
          Promise.resolve(null),
        "updateUnit"
      ),
    canDelete: (id: number) =>
      this.handle(
        () => window.electronAPI?.canDeleteUnit(id) || Promise.resolve(false),
        "canDeleteUnit"
      ),
    delete: (id: number) =>
      this.handle(
        () => window.electronAPI?.deleteUnit(id) || Promise.resolve(false),
        "deleteUnit"
      ),
  };

  // --- Clients API ---
  clients = {
    getAll: () =>
      this.handle(
        () => window.electronAPI?.getClients() || Promise.resolve([]),
        "getClients"
      ),
    create: (client: any) =>
      this.handle(
        () => window.electronAPI?.createClient(client) || Promise.resolve(null),
        "createClient"
      ),
    update: (id: number, client: any) =>
      this.handle(
        () =>
          window.electronAPI?.updateClient(id, client) || Promise.resolve(null),
        "updateClient"
      ),
    canDelete: (id: number) =>
      this.handle(
        () => window.electronAPI?.canDeleteClient(id) || Promise.resolve(false),
        "canDeleteClient"
      ),
    delete: (id: number) =>
      this.handle(
        () => window.electronAPI?.deleteClient(id) || Promise.resolve(false),
        "deleteClient"
      ),
  };

  // --- Suppliers API ---
  suppliers = {
    getAll: () =>
      this.handle(
        () => window.electronAPI?.getSuppliers() || Promise.resolve([]),
        "getSuppliers"
      ),
    create: (supplier: any) =>
      this.handle(
        () =>
          window.electronAPI?.createSupplier(supplier) ||
          Promise.resolve(null),
        "createSupplier"
      ),
    update: (id: number, supplier: any) =>
      this.handle(
        () =>
          window.electronAPI?.updateSupplier(id, supplier) ||
          Promise.resolve(null),
        "updateSupplier"
      ),
    canDelete: (id: number) =>
      this.handle(
        () => window.electronAPI?.canDeleteSupplier(id) || Promise.resolve(false),
        "canDeleteSupplier"
      ),
    delete: (id: number) =>
      this.handle(
        () => window.electronAPI?.deleteSupplier(id) || Promise.resolve(false),
        "deleteSupplier"
      ),
  };

  // --- Supplier Orders API ---
  supplierOrders = {
    getAll: () =>
      this.handle(
        () => window.electronAPI?.getSupplierOrders() || Promise.resolve([]),
        "getSupplierOrders"
      ),
    create: (order: any) =>
      this.handle(
        () =>
          window.electronAPI?.createSupplierOrder(order) ||
          Promise.resolve(null),
        "createSupplierOrder"
      ),
    update: (id: number, order: any) =>
      this.handle(
        () =>
          window.electronAPI?.updateSupplierOrder(id, order) ||
          Promise.resolve(null),
        "updateSupplierOrder"
      ),
    delete: (id: number) =>
      this.handle(
        () =>
          window.electronAPI?.deleteSupplierOrder(id) ||
          Promise.resolve(false),
        "deleteSupplierOrder"
      ),
    // Removed updateStatus function
    getItems: (orderId: number) =>
      this.handle(
        () =>
          window.electronAPI?.getPurchaseOrderItems(orderId) ||
          Promise.resolve([]),
        "getPurchaseOrderItems"
      ),
  };

  // --- Supplier Invoices API ---
  supplierInvoices = {
    getAll: () =>
      this.handle(
        () => window.electronAPI?.getSupplierInvoices() || Promise.resolve([]),
        "getSupplierInvoices"
      ),
    create: (invoice: any) =>
      this.handle(
        () =>
          window.electronAPI?.createSupplierInvoice(invoice) ||
          Promise.resolve(null),
        "createSupplierInvoice"
      ),
    update: (id: number, invoice: any) =>
      this.handle(
        () =>
          window.electronAPI?.updateSupplierInvoice(id, invoice) ||
          Promise.resolve(null),
        "updateSupplierInvoice"
      ),
    canDelete: (id: number) =>
      this.handle(
        () => window.electronAPI?.canDeleteSupplierInvoice(id) || Promise.resolve(false),
        "canDeleteSupplierInvoice"
      ),
    delete: (id: number) =>
      this.handle(
        () =>
          window.electronAPI?.deleteSupplierInvoice(id) ||
          Promise.resolve(false),
        "deleteSupplierInvoice"
      ),
    updateStatus: (id: number, status: string) =>
      this.handle(
        () => window.electronAPI?.updateSupplierInvoiceStatus(id, status),
        "updateSupplierInvoiceStatus"
      ),
  };

  // --- Products API ---
  products = {
    getAll: () =>
      this.handle(
        () => window.electronAPI?.getProducts() || Promise.resolve([]),
        "getProducts"
      ),
    getOne: (id: number) =>
      this.handle(
        () => window.electronAPI?.getProductById(id) || Promise.resolve(null),
        "getProduct"
      ),
    create: (product: any) =>
      this.handle(
        () =>
          window.electronAPI?.createProduct(product) || Promise.resolve(null),
        "createProduct"
      ),
    getStock: (id: number) =>
      this.handle(
        () => window.electronAPI?.getProductStock(id) || Promise.resolve(0),
        "getProductStock"
      ),
    checkStock: (id: number, requestedQuantity: number) =>
      this.handle(
        () => window.electronAPI?.checkProductStock(id, requestedQuantity) || Promise.resolve({ available: true, stock: 0 }),
        "checkProductStock"
      ),
    updateStock: (id: number, quantity: number) =>
      this.handle(
        () =>
          window.electronAPI?.updateProductStock(id, quantity) ||
          Promise.resolve(null),
        "updateProductStock"
      ),
    update: (id: number, product: any) =>
      this.handle(
        () =>
          window.electronAPI?.updateProduct(id, product) ||
          Promise.resolve(null),
        "updateProduct"
      ),
    canDelete: (id: number) =>
      this.handle(
        () => window.electronAPI?.canDeleteProduct(id) || Promise.resolve(false),
        "canDeleteProduct"
      ),
    delete: (id: number) =>
      this.handle(
        () => window.electronAPI?.deleteProduct(id) || Promise.resolve(false),
        "deleteProduct"
      ),
  };

  // --- Sales API ---
  sales = {
    create: (sale: any) =>
      this.handle(
        () => window.electronAPI?.createSale(sale) || Promise.resolve(null),
        "createSale"
      ),
    getAll: () =>
      this.handle(
        () => window.electronAPI?.getSales() || Promise.resolve([]),
        "getSales"
      ),
    getAllWithItems: () =>
      this.handle(
        () => window.electronAPI?.getSalesWithItems() || Promise.resolve([]),
        "getSalesWithItems"
      ),
    getOne: (id: number) =>
      this.handle(
        () => window.electronAPI?.getSale(id) || Promise.resolve(null),
        "getSale"
      ),
      getItems: (saleId: number) =>
      this.handle(
        () => window.electronAPI?.getSaleItems(saleId) || Promise.resolve([]),
        "getSaleItems"
      ),
    delete: (id: number) =>
      this.handle(
        () => window.electronAPI?.deleteSale(id) || Promise.resolve(false),
        "deleteSale"
      ),
  };

  // --- Dashboard API ---
  dashboard = {
    getStats: (dateRange?: string) =>
      this.handle(
        () =>
          window.electronAPI?.getDashboardStats(dateRange) ||
          Promise.resolve({}),
        "getDashboardStats"
      ),
  };

  // --- Invoices API ---
  invoices = {
    getAll: () =>
      this.handle(
        () => window.electronAPI?.getInvoices() || Promise.resolve([]),
        "getInvoices"
      ),
    create: (invoice: any) =>
      this.handle(
        () =>
          window.electronAPI?.createInvoice(invoice) || Promise.resolve(null),
        "createInvoice"
      ),
    updateStatus: (id: number, status: string) =>
      this.handle(
        () => window.electronAPI?.updateInvoiceStatus(id, status),
        "updateInvoiceStatus"
      ),
    generateFromSale: (saleId: number) =>
      this.handle(
        () =>
          window.electronAPI?.generateInvoiceFromSale(saleId) ||
          Promise.resolve(null),
        "generateInvoiceFromSale"
      ),
    generateFromQuote: (quoteId: number) =>
      this.handle(
        () =>
          window.electronAPI?.generateInvoiceFromQuote(quoteId) ||
          Promise.resolve(null),
        "generateInvoiceFromQuote"
      ),
    getItems: (invoiceId: number) =>
      this.handle(
        () => window.electronAPI?.getInvoiceItems(invoiceId) || Promise.resolve([]),
        "getInvoiceItems"
      ),
  };

  // --- Quotes API ---
  quotes = {
    getAll: () =>
      this.handle(
        () => window.electronAPI?.getQuotes() || Promise.resolve([]),
        "getQuotes"
      ),
    create: (quote: any) =>
      this.handle(
        () => window.electronAPI?.createQuote(quote) || Promise.resolve(null),
        "createQuote"
      ),
    update: (id: number, quote: any) =>
      this.handle(
        () =>
          window.electronAPI?.updateQuote(id, quote) || Promise.resolve(null),
        "updateQuote"
      ),
    // Update quote status with improved error handling
    updateStatus: (id: number, status: string) =>
      this.handle(
        () => window.electronAPI?.updateQuoteStatus(id, status),
        "updateQuoteStatus"
      ),
    canDelete: (id: number) =>
      this.handle(
        () => window.electronAPI?.canDeleteQuote(id) || Promise.resolve(false),
        "canDeleteQuote"
      ),
    delete: (id: number) =>
      this.handle(
        () => window.electronAPI?.deleteQuote(id) || Promise.resolve(false),
        "deleteQuote"
      ),
    getItems: (quoteId: number) =>
      this.handle(
        () => window.electronAPI?.getQuoteItems(quoteId) || Promise.resolve([]),
        "getQuoteItems"
      ),
  };

  // --- Credit Notes API ---
  creditNotes = {
    getAll: () =>
      this.handle(
        () => window.electronAPI?.getCreditNotes() || Promise.resolve([]),
        "getCreditNotes"
      ),
    create: (creditNote: any) =>
      this.handle(
        () =>
          window.electronAPI?.createCreditNote(creditNote) ||
          Promise.resolve(null),
        "createCreditNote"
      ),
    updateStatus: (id: number, status: string) =>
      this.handle(
        () => window.electronAPI?.updateCreditNoteStatus(id, status),
        "updateCreditNoteStatus"
      ),
    generateFromInvoice: (invoiceId: number, reason: string) =>
      this.handle(
        () =>
          window.electronAPI?.generateCreditNoteFromInvoice(invoiceId, reason) ||
          Promise.resolve(null),
        "generateCreditNoteFromInvoice"
      ),
    getItems: (creditNoteId: number) =>
      this.handle(
        () => window.electronAPI?.getCreditNoteItems(creditNoteId) || Promise.resolve([]),
        "getCreditNoteItems"
      ),
  };

  // --- Purchase Orders API ---
  purchaseOrders = {
    getAll: () =>
      this.handle(
        () => window.electronAPI?.getPurchaseOrders() || Promise.resolve([]),
        "getPurchaseOrders"
      ),
    create: (purchaseOrder: any) =>
      this.handle(
        () =>
          window.electronAPI?.createPurchaseOrder(purchaseOrder) ||
          Promise.resolve(null),
        "createPurchaseOrder"
      ),
    // Removed updateStatus function
    generateFromSale: (saleId: number, deliveryDate: string) =>
      this.handle(
        () =>
          window.electronAPI?.generatePurchaseOrderFromSale(saleId, deliveryDate) ||
          Promise.resolve(null),
        "generatePurchaseOrderFromSale"
      ),
    getItems: (purchaseOrderId: number) =>
      this.handle(
        () =>
          window.electronAPI?.getPurchaseOrderItems(purchaseOrderId) ||
          Promise.resolve([]),
        "getPurchaseOrderItems"
      ),
  };

  // --- TVA API ---
  tva = {
    getAll: () =>
      this.handle(
        () => window.electronAPI?.getTvaRates() || Promise.resolve([]),
        "getTvaRates"
      ),
    create: (tvaRate: any) =>
      this.handle(
        () => window.electronAPI?.createTvaRate(tvaRate) || Promise.resolve(null),
        "createTvaRate"
      ),
    update: (id: number, tvaRate: any) =>
      this.handle(
        () => window.electronAPI?.updateTvaRate(id, tvaRate) || Promise.resolve(null),
        "updateTvaRate"
      ),
    canDelete: (id: number) =>
      this.handle(
        () => window.electronAPI?.canDeleteTvaRate(id) || Promise.resolve(false),
        "canDeleteTvaRate"
      ),
    delete: (id: number) =>
      this.handle(
        () => window.electronAPI?.deleteTvaRate(id) || Promise.resolve(false),
        "deleteTvaRate"
      ),
    getOne: (id: number) =>
      this.handle(
        () => window.electronAPI?.getTvaRate(id) || Promise.resolve(null),
        "getTvaRate"
      ),
  };

  // --- Delivery Receipts API ---
  deliveryReceipts = {
    create: (deliveryReceipt: any) =>
      this.handle(
        () => window.electronAPI?.createDeliveryReceipt(deliveryReceipt) || Promise.resolve(null),
        "createDeliveryReceipt"
      ),
    update: (id: number, deliveryReceipt: any) =>
      this.handle(
        () => window.electronAPI?.updateDeliveryReceipt(id, deliveryReceipt) || Promise.resolve(null),
        "updateDeliveryReceipt"
      ),
    getAll: () =>
      this.handle(
        () => window.electronAPI?.getDeliveryReceipts() || Promise.resolve([]),
        "getDeliveryReceipts"
      ),
    getOne: (id: number) =>
      this.handle(
        () => window.electronAPI?.getDeliveryReceipt(id) || Promise.resolve(null),
        "getDeliveryReceipt"
      ),
    getBySale: (saleId: number) =>
      this.handle(
        async () => {
          const result = await window.electronAPI?.getDeliveryReceiptBySale(saleId) || Promise.resolve(null);
          return result;
        },
        "getDeliveryReceiptBySale"
      ),
    delete: (id: number) =>
      this.handle(
        () => window.electronAPI?.deleteDeliveryReceipt(id) || Promise.resolve(false),
        "deleteDeliveryReceipt"
      ),
  };

  // --- Reception Notes API ---
  receptionNotes = {
    create: (receptionNote: any) =>
      this.handle(
        () => window.electronAPI?.createReceptionNote(receptionNote) || Promise.resolve(null),
        "createReceptionNote"
      ),
    getAll: () =>
      this.handle(
        () => window.electronAPI?.getReceptionNotes() || Promise.resolve([]),
        "getReceptionNotes"
      ),
    getOne: (id: number) =>
      this.handle(
        () => window.electronAPI?.getReceptionNote(id) || Promise.resolve(null),
        "getReceptionNote"
      ),
    getByOrder: (supplierOrderId: number) =>
      this.handle(
        () => window.electronAPI?.getReceptionNoteByOrder(supplierOrderId) || Promise.resolve(null),
        "getReceptionNoteByOrder"
      ),
    update: (id: number, receptionNote: any) =>
      this.handle(
        () => window.electronAPI?.updateReceptionNote(id, receptionNote) || Promise.resolve(null),
        "updateReceptionNote"
      ),
    delete: (id: number) =>
      this.handle(
        () => window.electronAPI?.deleteReceptionNote(id) || Promise.resolve(false),
        "deleteReceptionNote"
      ),
  };

  // --- Payments API ---
  payments = {
    // Client Payments
    clientPayments: {
      getAll: () =>
        this.handle(
          () => window.electronAPI?.getClientPayments() || Promise.resolve([]),
          "getClientPayments"
        ),
      getByInvoice: (invoiceId: number) =>
        this.handle(
          () => window.electronAPI?.getInvoicePayments(invoiceId) || Promise.resolve([]),
          "getInvoicePayments"
        ),
      create: (payment: any) =>
        this.handle(
          () => window.electronAPI?.createClientPayment(payment) || Promise.resolve(null),
          "createClientPayment"
        ),
      update: (id: number, payment: any) =>
        this.handle(
          () => window.electronAPI?.updateClientPayment(id, payment) || Promise.resolve(null),
          "updateClientPayment"
        ),
      delete: (id: number) =>
        this.handle(
          () => window.electronAPI?.deleteClientPayment(id) || Promise.resolve(false),
          "deleteClientPayment"
        ),
    },
    // Supplier Payments
    supplierPayments: {
      getAll: () =>
        this.handle(
          () => window.electronAPI?.getSupplierPayments() || Promise.resolve([]),
          "getSupplierPayments"
        ),
      getByInvoice: (invoiceId: number) =>
        this.handle(
          () => window.electronAPI?.getSupplierInvoicePayments(invoiceId) || Promise.resolve([]),
          "getSupplierInvoicePayments"
        ),
      create: (payment: any) =>
        this.handle(
          () => window.electronAPI?.createSupplierPayment(payment) || Promise.resolve(null),
          "createSupplierPayment"
        ),
      update: (id: number, payment: any) =>
        this.handle(
          () => window.electronAPI?.updateSupplierPayment(id, payment) || Promise.resolve(null),
          "updateSupplierPayment"
        ),
      delete: (id: number) =>
        this.handle(
          () => window.electronAPI?.deleteSupplierPayment(id) || Promise.resolve(false),
          "deleteSupplierPayment"
        ),
    },
  };

  // --- Stock Movements API ---
  stockMovements = {
    getAll: () =>
      this.handle(
        () => window.electronAPI?.getStockMovements() || Promise.resolve([]),
        "getStockMovements"
      ),
    create: (movement: any) =>
      this.handle(
        () =>
          window.electronAPI?.createStockMovement(movement) ||
          Promise.resolve(null),
        "createStockMovement"
      ),
    getByProduct: (productId: number) =>
      this.handle(
        () =>
          window.electronAPI?.getStockMovementsByProduct(productId) ||
          Promise.resolve([]),
        "getStockMovementsByProduct"
      ),
  };

  // --- Enterprise Settings API ---
  settings = {
    get: () =>
      this.handle(
        () =>
          window.electronAPI?.getEnterpriseSettings() || Promise.resolve({}),
        "getEnterpriseSettings"
      ),
    create: (settings: any) =>
      this.handle(
        () =>
          window.electronAPI?.createEnterpriseSettings(settings) ||
          Promise.resolve(null),
        "createEnterpriseSettings"
      ),
    update: (id: number, settings: any) =>
      this.handle(
        () =>
          window.electronAPI?.updateEnterpriseSettings(id, settings) ||
          Promise.resolve(null),
        "updateEnterpriseSettings"
      ),
  };


  // --- Database API ---
  database = {
    export: () =>
      this.handle(
        () => window.electronAPI?.exportDatabase() || Promise.resolve({ success: false, error: "Electron API not available" }),
        "exportDatabase"
      ),
    import: () =>
      this.handle(
        () => window.electronAPI?.importDatabase() || Promise.resolve({ success: false, error: "Electron API not available" }),
        "importDatabase"
      ),
  };

  // --- Device API ---
  device = {
    getFingerprint: () =>
      this.handle(
        () => window.electronAPI?.getFingerprint() || Promise.resolve(""),
        "getFingerprint"
      ),
    checkForUpdates: () =>
      this.handle(
        () => window.electronAPI?.checkForUpdates() || Promise.resolve({ success: false, error: "Electron API not available" }),
        "checkForUpdates"
      ),
    downloadUpdate: () =>
      this.handle(
        () => window.electronAPI?.downloadUpdate() || Promise.resolve({ success: false, error: "Electron API not available" }),
        "downloadUpdate"
      ),
    quitAndInstall: () =>
      this.handle(
        () => window.electronAPI?.quitAndInstall() || Promise.resolve(),
        "quitAndInstall"
      ),
  };
}

const db = new DatabaseService();
export { db };