interface ElectronAPI {
  // Categories
  getCategories: () => Promise<any[]>;
  createCategory: (category: any) => Promise<any>;
  updateCategory: (id: number, category: any) => Promise<any>;
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
  updateProductStock: (id: number, quantity: number) => Promise<any>;
  createProduct: (product: any) => Promise<any>;
  updateProduct: (id: number, product: any) => Promise<any>;
  deleteProduct: (id: number) => Promise<boolean>;

  // Sales
  createSale: (sale: any) => Promise<any>;
  getSales: () => Promise<any[]>;
  getSaleItems: (saleId: number) => Promise<any[]>;
  updateSaleStatus: (id: number, status: string) => Promise<any>;

  // Dashboard
  getDashboardStats: (dateRange?: string) => Promise<any>;

  // Invoices
  getInvoices: () => Promise<any[]>;
  createInvoice: (invoice: any) => Promise<any>;
  updateInvoiceStatus: (id: number, status: string) => Promise<any>;
  generateInvoiceFromSale: (saleId: number) => Promise<any>;

  // --- Quotes API ---
  getQuotes: () => Promise<any[]>;
  createQuote: (quote: any) => Promise<any>;
  updateQuote: (id: number, quote: any) => Promise<any>;
  deleteQuote: (id: number) => Promise<boolean>;
  getQuoteItems: (quoteId: number) => Promise<any[]>;

  // Stock Movements
  getStockMovements: () => Promise<any[]>;
  createStockMovement: (movement: any) => Promise<any>;
  getStockMovementsByProduct: (productId: number) => Promise<any[]>;

  // Client Payments
  getClientPayments: () => Promise<any[]>;
  createClientPayment: (payment: any) => Promise<any>;
  updateClientPayment: (id: number, payment: any) => Promise<any>;
  deleteClientPayment: (id: number) => Promise<boolean>;

  // Supplier Payments
  getSupplierPayments: () => Promise<any[]>;
  createSupplierPayment: (payment: any) => Promise<any>;
  updateSupplierPayment: (id: number, payment: any) => Promise<any>;
  deleteSupplierPayment: (id: number) => Promise<boolean>;

  // Enterprise Settings
  getEnterpriseSettings: () => Promise<any>;
  createEnterpriseSettings: (settings: any) => Promise<any>;
  updateEnterpriseSettings: (id: number, settings: any) => Promise<any>;

  // PDF Generation
  generateInvoicePDF: (invoiceId: number) => Promise<any>;
  openPDF: (filePath: string) => Promise<any>;

  // Device
  getFingerprint: () => Promise<string>;

  // Data listeners for real-time updates
  onDataChange: (
    callback: (table: string, action: string, data: any) => void
  ) => void;
  removeDataListener: (callback: Function) => void;

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
    create: (category: any) =>
      this.handle(
        () =>
          window.electronAPI?.createCategory(category) || Promise.resolve(null),
        "createCategory"
      ),
    update: (id: number, category: any) =>
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
    generatePDF: (invoiceId: number) =>
      this.handle(
        () =>
          window.electronAPI?.generateInvoicePDF(invoiceId) ||
          Promise.resolve(null),
        "generateInvoicePDF"
      ),
    openPDF: (filePath: string) =>
      this.handle(
        () => window.electronAPI?.openPDF(filePath) || Promise.resolve(null),
        "openPDF"
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

  // --- Client Payments API ---
  clientPayments = {
    getAll: () =>
      this.handle(
        () => window.electronAPI?.getClientPayments() || Promise.resolve([]),
        "getClientPayments"
      ),
    create: (payment: any) =>
      this.handle(
        () =>
          window.electronAPI?.createClientPayment(payment) ||
          Promise.resolve(null),
        "createClientPayment"
      ),
    update: (id: number, payment: any) =>
      this.handle(
        () =>
          window.electronAPI?.updateClientPayment(id, payment) ||
          Promise.resolve(null),
        "updateClientPayment"
      ),
    delete: (id: number) =>
      this.handle(
        () =>
          window.electronAPI?.deleteClientPayment(id) || Promise.resolve(false),
        "deleteClientPayment"
      ),
  };

  // --- Supplier Payments API ---
  supplierPayments = {
    getAll: () => this.handle(() => window.electronAPI?.getSupplierPayments() || Promise.resolve([]), "getSupplierPayments"),
    create: (payment: any) => this.handle(() => window.electronAPI?.createSupplierPayment(payment) || Promise.resolve(null), "createSupplierPayment"),
    update: (id: number, payment: any) => this.handle(() => window.electronAPI?.updateSupplierPayment(id, payment) || Promise.resolve(null), "updateSupplierPayment"),
    delete: (id: number) => this.handle(() => window.electronAPI?.deleteSupplierPayment(id) || Promise.resolve(false), "deleteSupplierPayment"),
  };

  // --- Device API ---
  device = {
    getFingerprint: () => this.handle(() => window.electronAPI?.getFingerprint() || Promise.resolve(""), "getFingerprint"),
  };

}

export const db = new DatabaseService();
