const { contextBridge, ipcRenderer } = require("electron");

// Enhanced preload script with real-time data updates
contextBridge.exposeInMainWorld("electronAPI", {
  // --- Categories API ---
  getCategories: () => ipcRenderer.invoke("get-categories"),
  createCategory: (category) => ipcRenderer.invoke("create-category", category),
  updateCategory: (id, category) =>
    ipcRenderer.invoke("update-category", id, category),
  deleteCategory: (id) => ipcRenderer.invoke("delete-category", id),

  // --- Clients API ---
  getClients: () => ipcRenderer.invoke("get-clients"),
  createClient: (client) => ipcRenderer.invoke("create-client", client),
  updateClient: (id, client) => ipcRenderer.invoke("update-client", id, client),
  deleteClient: (id) => ipcRenderer.invoke("delete-client", id),

  // --- Suppliers API ---
  getSuppliers: () => ipcRenderer.invoke("get-suppliers"),
  createSupplier: (supplier) => ipcRenderer.invoke("create-supplier", supplier),
  updateSupplier: (id, supplier) => ipcRenderer.invoke("update-supplier", id, supplier),
  deleteSupplier: (id) => ipcRenderer.invoke("delete-supplier", id),

  // --- Supplier Orders API ---
  getSupplierOrders: () => ipcRenderer.invoke("get-supplier-orders"),
  createSupplierOrder: (order) => ipcRenderer.invoke("create-supplier-order", order),
  updateSupplierOrder: (id, order) => ipcRenderer.invoke("update-supplier-order", id, order),
  deleteSupplierOrder: (id) => ipcRenderer.invoke("delete-supplier-order", id),

  // --- Supplier Invoices API ---
  getSupplierInvoices: () => ipcRenderer.invoke("get-supplier-invoices"),
  createSupplierInvoice: (invoice) => ipcRenderer.invoke("create-supplier-invoice", invoice),
  updateSupplierInvoice: (id, invoice) => ipcRenderer.invoke("update-supplier-invoice", id, invoice),
  deleteSupplierInvoice: (id) => ipcRenderer.invoke("delete-supplier-invoice", id),
  updateSupplierInvoiceStatus: (id, status) => ipcRenderer.invoke("update-supplier-invoice-status", id, status),

  // --- Products API ---
  getProducts: () => ipcRenderer.invoke("get-products"),
  getProductById: (id) => ipcRenderer.invoke("get-product-by-id", id),
  createProduct: (product) => ipcRenderer.invoke("create-product", product),
  updateProduct: (id, product) =>
    ipcRenderer.invoke("update-product", id, product),
  updateProductStock: (id, quantity) =>
    ipcRenderer.invoke("update-product-stock", id, quantity),
  getProductStock: (id) => ipcRenderer.invoke("get-product-stock", id),
  checkProductStock: (id, requestedQuantity) => ipcRenderer.invoke("check-product-stock", id, requestedQuantity),
  deleteProduct: (id) => ipcRenderer.invoke("delete-product", id),

  // --- Sales API ---
  createSale: (sale) => ipcRenderer.invoke("create-sale", sale),
  getSales: () => ipcRenderer.invoke("get-sales"),
  getSalesWithItems: () => ipcRenderer.invoke("get-sales-with-items"),
  getSaleItems: (saleId) => ipcRenderer.invoke("get-sale-items", saleId),
  updateSaleStatus: (id, status) =>
    ipcRenderer.invoke("update-sale-status", id, status),
  deleteSale: (id) => ipcRenderer.invoke("delete-sale", id),

  // --- Dashboard API ---
  getDashboardStats: (dateRange) => ipcRenderer.invoke("get-dashboard-stats", dateRange),

  // --- Invoices API ---
  getInvoices: () => ipcRenderer.invoke("get-invoices"),
  createInvoice: (invoice) => ipcRenderer.invoke("create-invoice", invoice),
  updateInvoiceStatus: (id, status) =>
    ipcRenderer.invoke("update-invoice-status", id, status),
  generateInvoiceFromSale: (saleId) =>
    ipcRenderer.invoke("generate-invoice-from-sale", saleId),
  generateInvoiceFromQuote: (quoteId) =>
    ipcRenderer.invoke("generate-invoice-from-quote", quoteId),
  getInvoiceItems: (invoiceId) => ipcRenderer.invoke("get-invoice-items", invoiceId),

  // --- Quotes API ---
  getQuotes: () => ipcRenderer.invoke("get-quotes"),
  createQuote: (quote) => ipcRenderer.invoke("create-quote", quote),
  updateQuote: (id, quote) => ipcRenderer.invoke("update-quote", id, quote),
  deleteQuote: (id) => ipcRenderer.invoke("delete-quote", id),
  getQuoteItems: (quoteId) => ipcRenderer.invoke("get-quote-items", quoteId),
  
  // --- Credit Notes API ---
  getCreditNotes: () => ipcRenderer.invoke("get-credit-notes"),
  createCreditNote: (creditNote) => ipcRenderer.invoke("create-credit-note", creditNote),
  updateCreditNoteStatus: (id, status) =>
    ipcRenderer.invoke("update-credit-note-status", id, status),
  generateCreditNoteFromInvoice: (invoiceId, reason) =>
    ipcRenderer.invoke("generate-credit-note-from-invoice", invoiceId, reason),
  getCreditNoteItems: (creditNoteId) => ipcRenderer.invoke("get-credit-note-items", creditNoteId),
  
  // --- Purchase Orders API ---
  getPurchaseOrders: () => ipcRenderer.invoke("get-purchase-orders"),
  createPurchaseOrder: (purchaseOrder) => ipcRenderer.invoke("create-purchase-order", purchaseOrder),
  updatePurchaseOrderStatus: (id, status) =>
    ipcRenderer.invoke("update-purchase-order-status", id, status),
  generatePurchaseOrderFromSale: (saleId, deliveryDate) =>
    ipcRenderer.invoke("generate-purchase-order-from-sale", saleId, deliveryDate),
  getPurchaseOrderItems: (purchaseOrderId) => ipcRenderer.invoke("get-purchase-order-items", purchaseOrderId),
  
  // --- Stock Movements API ---
  getStockMovements: () => ipcRenderer.invoke("get-stock-movements"),
  createStockMovement: (movement) => ipcRenderer.invoke("create-stock-movement", movement),
  getStockMovementsByProduct: (productId) => ipcRenderer.invoke("get-stock-movements-by-product", productId),


  // --- Enterprise Settings API ---
  getEnterpriseSettings: () => ipcRenderer.invoke("get-enterprise-settings"),
  createEnterpriseSettings: (settings) => ipcRenderer.invoke("create-enterprise-settings", settings),
  updateEnterpriseSettings: (id, settings) => ipcRenderer.invoke("update-enterprise-settings", id, settings),

  // --- Database API ---
  exportDatabase: () => ipcRenderer.invoke("export-database"),
  importDatabase: () => ipcRenderer.invoke("import-database"),
  
  // --- Device API ---
  getFingerprint: () => ipcRenderer.invoke("get-machine-fingerprint"),
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  downloadUpdate: () => ipcRenderer.invoke("download-update"),
  quitAndInstall: () => ipcRenderer.invoke("quit-and-install"),

  // --- Real-time Data Updates ---
  onDataChange: (callback) => {
    const listener = (event, table, action, data) => {
      callback(table, action, data);
    };

    ipcRenderer.on("data-changed", listener);

    // Register listener with main process
    ipcRenderer.invoke("register-data-listener");

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener("data-changed", listener);
      ipcRenderer.invoke("unregister-data-listener");
    };
  },

  // --- Update Events ---
  onUpdateAvailable: (callback) => {
    const listener = (event, info) => callback(info);
    ipcRenderer.on("update-available", listener);
    return () => ipcRenderer.removeListener("update-available", listener);
  },
  
  onUpdateNotAvailable: (callback) => {
    const listener = (event) => callback();
    ipcRenderer.on("update-not-available", listener);
    return () => ipcRenderer.removeListener("update-not-available", listener);
  },
  
  onUpdateError: (callback) => {
    const listener = (event, error) => callback(error);
    ipcRenderer.on("update-error", listener);
    return () => ipcRenderer.removeListener("update-error", listener);
  },
  
  onUpdateDownloadProgress: (callback) => {
    const listener = (event, progress) => callback(progress);
    ipcRenderer.on("update-download-progress", listener);
    return () => ipcRenderer.removeListener("update-download-progress", listener);
  },
  
  onUpdateDownloaded: (callback) => {
    const listener = (event, info) => callback(info);
    ipcRenderer.on("update-downloaded", listener);
    return () => ipcRenderer.removeListener("update-downloaded", listener);
  }
});