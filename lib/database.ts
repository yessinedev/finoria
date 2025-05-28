// Enhanced database service with real-time updates and error handling
interface ElectronAPI {
  // Categories
  getCategories: () => Promise<any[]>
  createCategory: (category: any) => Promise<any>
  updateCategory: (id: number, category: any) => Promise<any>
  deleteCategory: (id: number) => Promise<boolean>

  // Clients
  getClients: () => Promise<any[]>
  createClient: (client: any) => Promise<any>
  updateClient: (id: number, client: any) => Promise<any>
  deleteClient: (id: number) => Promise<boolean>

  // Products
  getProducts: () => Promise<any[]>
  createProduct: (product: any) => Promise<any>
  updateProduct: (id: number, product: any) => Promise<any>
  deleteProduct: (id: number) => Promise<boolean>

  // Sales
  createSale: (sale: any) => Promise<any>
  getSales: () => Promise<any[]>
  getSaleItems: (saleId: number) => Promise<any[]>
  updateSaleStatus: (id: number, status: string) => Promise<any>

  // Dashboard
  getDashboardStats: () => Promise<any>

  // Invoices
  getInvoices: () => Promise<any[]>
  createInvoice: (invoice: any) => Promise<any>
  updateInvoiceStatus: (id: number, status: string) => Promise<any>
  generateInvoiceFromSale: (saleId: number) => Promise<any>

  // PDF Generation
  generateInvoicePDF: (invoiceId: number) => Promise<any>
  openPDF: (filePath: string) => Promise<any>

  // Data listeners for real-time updates
  onDataChange: (callback: (table: string, action: string, data: any) => void) => void
  removeDataListener: (callback: Function) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

// Enhanced database service with real-time updates
class DatabaseService {
  private listeners: Set<Function> = new Set()

  constructor() {
    // Set up data change listener
    if (typeof window !== "undefined" && window.electronAPI) {
      window.electronAPI.onDataChange((table: string, action: string, data: any) => {
        this.notifyListeners(table, action, data)
      })
    }
  }

  // Subscribe to data changes
  subscribe(callback: (table: string, action: string, data: any) => void) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  private notifyListeners(table: string, action: string, data: any) {
    this.listeners.forEach((callback) => {
      try {
        callback(table, action, data)
      } catch (error) {
        console.error("Error in data change listener:", error)
      }
    })
  }

  // Enhanced error handling wrapper
  private async handleDatabaseOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      const data = await operation()
      return { success: true, data }
    } catch (error) {
      console.error(`Database operation failed (${operationName}):`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }
    }
  }

  // Categories
  categories = {
    getAll: () =>
      this.handleDatabaseOperation(() => window.electronAPI?.getCategories() || Promise.resolve([]), "getCategories"),
    create: (category: any) =>
      this.handleDatabaseOperation(
        () => window.electronAPI?.createCategory(category) || Promise.resolve(null),
        "createCategory",
      ),
    update: (id: number, category: any) =>
      this.handleDatabaseOperation(
        () => window.electronAPI?.updateCategory(id, category) || Promise.resolve(null),
        "updateCategory",
      ),
    delete: (id: number) =>
      this.handleDatabaseOperation(
        () => window.electronAPI?.deleteCategory(id) || Promise.resolve(false),
        "deleteCategory",
      ),
  }

  // Clients
  clients = {
    getAll: () =>
      this.handleDatabaseOperation(() => window.electronAPI?.getClients() || Promise.resolve([]), "getClients"),
    create: (client: any) =>
      this.handleDatabaseOperation(
        () => window.electronAPI?.createClient(client) || Promise.resolve(null),
        "createClient",
      ),
    update: (id: number, client: any) =>
      this.handleDatabaseOperation(
        () => window.electronAPI?.updateClient(id, client) || Promise.resolve(null),
        "updateClient",
      ),
    delete: (id: number) =>
      this.handleDatabaseOperation(
        () => window.electronAPI?.deleteClient(id) || Promise.resolve(false),
        "deleteClient",
      ),
  }

  // Products
  products = {
    getAll: () =>
      this.handleDatabaseOperation(() => window.electronAPI?.getProducts() || Promise.resolve([]), "getProducts"),
    create: (product: any) =>
      this.handleDatabaseOperation(
        () => window.electronAPI?.createProduct(product) || Promise.resolve(null),
        "createProduct",
      ),
    update: (id: number, product: any) =>
      this.handleDatabaseOperation(
        () => window.electronAPI?.updateProduct(id, product) || Promise.resolve(null),
        "updateProduct",
      ),
    delete: (id: number) =>
      this.handleDatabaseOperation(
        () => window.electronAPI?.deleteProduct(id) || Promise.resolve(false),
        "deleteProduct",
      ),
  }

  // Sales
  sales = {
    create: (sale: any) =>
      this.handleDatabaseOperation(() => window.electronAPI?.createSale(sale) || Promise.resolve(null), "createSale"),
    getAll: () => this.handleDatabaseOperation(() => window.electronAPI?.getSales() || Promise.resolve([]), "getSales"),
    getItems: (saleId: number) =>
      this.handleDatabaseOperation(
        () => window.electronAPI?.getSaleItems(saleId) || Promise.resolve([]),
        "getSaleItems",
      ),
    updateStatus: (id: number, status: string) =>
      this.handleDatabaseOperation(
        () => window.electronAPI?.updateSaleStatus(id, status) || Promise.resolve(null),
        "updateSaleStatus",
      ),
  }

  // Dashboard
  dashboard = {
    getStats: () =>
      this.handleDatabaseOperation(
        () => window.electronAPI?.getDashboardStats() || Promise.resolve({}),
        "getDashboardStats",
      ),
  }

  // Invoices
  invoices = {
    getAll: () =>
      this.handleDatabaseOperation(() => window.electronAPI?.getInvoices() || Promise.resolve([]), "getInvoices"),
    create: (invoice: any) =>
      this.handleDatabaseOperation(
        () => window.electronAPI?.createInvoice(invoice) || Promise.resolve(null),
        "createInvoice",
      ),
    updateStatus: (id: number, status: string) =>
      this.handleDatabaseOperation(
        () => window.electronAPI?.updateInvoiceStatus(id, status) || Promise.resolve(null),
        "updateInvoiceStatus",
      ),
    generateFromSale: (saleId: number) =>
      this.handleDatabaseOperation(
        () => window.electronAPI?.generateInvoiceFromSale(saleId) || Promise.resolve(null),
        "generateInvoiceFromSale",
      ),
    generatePDF: (invoiceId: number) =>
      this.handleDatabaseOperation(
        () => window.electronAPI?.generateInvoicePDF(invoiceId) || Promise.resolve(null),
        "generateInvoicePDF",
      ),
    openPDF: (filePath: string) =>
      this.handleDatabaseOperation(() => window.electronAPI?.openPDF(filePath) || Promise.resolve(null), "openPDF"),
  }
}

export const db = new DatabaseService()
