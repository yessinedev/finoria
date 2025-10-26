import type { Category } from "@/types/types";

interface ElectronAPI {
  // Categories
  getCategories: () => Promise<any[]>;
  createCategory: (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => Promise<any>;
  updateCategory: (id: number, category: Partial<Omit<Category, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<any>;
  deleteCategory: (id: number) => Promise<boolean>;

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

  // Supplier Invoices
  getSupplierInvoices: () => Promise<any[]>;
  createSupplierInvoice: (invoice: any) => Promise<any>;
  updateSupplierInvoice: (id: number, invoice: any) => Promise<any>;
  deleteSupplierInvoice: (id: number) => Promise<boolean>;
  updateSupplierInvoiceStatus: (id: number, status: string) => Promise<any>;

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
  getSaleItems: (saleId: number) => Promise<any[]>;
  updateSaleStatus: (id: number, status: string) => Promise<any>;
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

  // Quotes
  getQuotes: () => Promise<any[]>;
  createQuote: (quote: any) => Promise<any>;
  updateQuote: (id: number, quote: any) => Promise<any>;
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
  updatePurchaseOrderStatus: (id: number, status: string) => Promise<any>;
  generatePurchaseOrderFromSale: (saleId: number, deliveryDate: string) => Promise<any>;
  getPurchaseOrderItems: (purchaseOrderId: number) => Promise<any[]>;

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
    delete: (id: number) =>
      this.handle(
        () => window.electronAPI?.deleteCategory(id) || Promise.resolve(false),
        "deleteCategory"
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
          window.electronAPI?.createSupplier(supplier) || Promise.resolve(null),
        "createSupplier"
      ),
    update: (id: number, supplier: any) =>
      this.handle(
        () =>
          window.electronAPI?.updateSupplier(id, supplier) ||
          Promise.resolve(null),
        "updateSupplier"
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
          window.electronAPI?.deleteSupplierOrder(id) || Promise.resolve(false),
        "deleteSupplierOrder"
      ),
    updateStatus: (id: number, status: string) =>
      this.handle(
        () =>
          window.electronAPI?.updateSupplierOrderStatus(id, status) ||
          Promise.resolve(null),
        "updateSupplierOrderStatus"
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
    delete: (id: number) =>
      this.handle(
        () =>
          window.electronAPI?.deleteSupplierInvoice(id) ||
          Promise.resolve(false),
        "deleteSupplierInvoice"
      ),
    updateStatus: (id: number, status: string) =>
      this.handle(
        () =>
          window.electronAPI?.updateSupplierInvoiceStatus(id, status) ||
          Promise.resolve(null),
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
    getItems: (saleId: number) =>
      this.handle(
        () => window.electronAPI?.getSaleItems(saleId) || Promise.resolve([]),
        "getSaleItems"
      ),
    updateStatus: (id: number, status: string) =>
      this.handle(
        () =>
          window.electronAPI?.updateSaleStatus(id, status) ||
          Promise.resolve(null),
        "updateSaleStatus"
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
        () =>
          window.electronAPI?.updateInvoiceStatus(id, status) ||
          Promise.resolve(null),
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
        () =>
          window.electronAPI?.updateCreditNoteStatus(id, status) ||
          Promise.resolve(null),
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
    updateStatus: (id: number, status: string) =>
      this.handle(
        () =>
          window.electronAPI?.updatePurchaseOrderStatus(id, status) ||
          Promise.resolve(null),
        "updatePurchaseOrderStatus"
      ),
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

export const db = new DatabaseService();
