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
  getDashboardStats: () => ipcRenderer.invoke("get-dashboard-stats"),

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
  updateQuoteStatus: (id, status) =>
    ipcRenderer.invoke("update-quote-status", id, status),
  deleteQuote: (id) => ipcRenderer.invoke("delete-quote", id),
  
  // --- PDF Generation API ---
  generateInvoicePDF: (invoiceId) =>
    ipcRenderer.invoke("generate-invoice-pdf", invoiceId),
  openPDF: (filePath) => ipcRenderer.invoke("open-pdf", filePath),

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

