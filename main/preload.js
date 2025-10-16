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
  deleteProduct: (id) => ipcRenderer.invoke("delete-product", id),

  // --- Sales API ---
  createSale: (sale) => ipcRenderer.invoke("create-sale", sale),
  getSales: () => ipcRenderer.invoke("get-sales"),
  getSaleItems: (saleId) => ipcRenderer.invoke("get-sale-items", saleId),
  updateSaleStatus: (id, status) =>
    ipcRenderer.invoke("update-sale-status", id, status),

  // --- Dashboard API ---
  getDashboardStats: (dateRange) => ipcRenderer.invoke("get-dashboard-stats", dateRange),

  // --- Invoices API ---
  getInvoices: () => ipcRenderer.invoke("get-invoices"),
  createInvoice: (invoice) => ipcRenderer.invoke("create-invoice", invoice),
  updateInvoiceStatus: (id, status) =>
    ipcRenderer.invoke("update-invoice-status", id, status),
  generateInvoiceFromSale: (saleId) =>
    ipcRenderer.invoke("generate-invoice-from-sale", saleId),

  // --- Quotes API ---
  getQuotes: () => ipcRenderer.invoke("get-quotes"),
  createQuote: (quote) => ipcRenderer.invoke("create-quote", quote),
  updateQuote: (id, quote) => ipcRenderer.invoke("update-quote", id, quote),
  deleteQuote: (id) => ipcRenderer.invoke("delete-quote", id),
  getQuoteItems: (quoteId) => ipcRenderer.invoke("get-quote-items", quoteId),
  
  // --- Stock Movements API ---
  getStockMovements: () => ipcRenderer.invoke("get-stock-movements"),
  createStockMovement: (movement) => ipcRenderer.invoke("create-stock-movement", movement),
  getStockMovementsByProduct: (productId) => ipcRenderer.invoke("get-stock-movements-by-product", productId),

  // --- Client Payments API ---
  getClientPayments: () => ipcRenderer.invoke("get-client-payments"),
  createClientPayment: (payment) => ipcRenderer.invoke("create-client-payment", payment),
  updateClientPayment: (id, payment) => ipcRenderer.invoke("update-client-payment", id, payment),
  deleteClientPayment: (id) => ipcRenderer.invoke("delete-client-payment", id),

  // --- Supplier Payments API ---
  getSupplierPayments: () => ipcRenderer.invoke("get-supplier-payments"),
  createSupplierPayment: (payment) => ipcRenderer.invoke("create-supplier-payment", payment),
  updateSupplierPayment: (id, payment) => ipcRenderer.invoke("update-supplier-payment", id, payment),
  deleteSupplierPayment: (id) => ipcRenderer.invoke("delete-supplier-payment", id),

  // --- Enterprise Settings API ---
  getEnterpriseSettings: () => ipcRenderer.invoke("get-enterprise-settings"),
  createEnterpriseSettings: (settings) => ipcRenderer.invoke("create-enterprise-settings", settings),
  updateEnterpriseSettings: (id, settings) => ipcRenderer.invoke("update-enterprise-settings", id, settings),

  
  // --- Device API ---
  getFingerprint: () => ipcRenderer.invoke("get-machine-fingerprint"),

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
});