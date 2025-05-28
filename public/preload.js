const { contextBridge, ipcRenderer } = require("electron");

// Enhanced preload script with real-time data updates
contextBridge.exposeInMainWorld("electronAPI", {
  // Categories
  getCategories: () => ipcRenderer.invoke("get-categories"),
  createCategory: (category) => ipcRenderer.invoke("create-category", category),
  updateCategory: (id, category) =>
    ipcRenderer.invoke("update-category", id, category),
  deleteCategory: (id) => ipcRenderer.invoke("delete-category", id),

  // Clients
  getClients: () => ipcRenderer.invoke("get-clients"),
  createClient: (client) => ipcRenderer.invoke("create-client", client),
  updateClient: (id, client) => ipcRenderer.invoke("update-client", id, client),
  deleteClient: (id) => ipcRenderer.invoke("delete-client", id),

  // Products
  getProducts: () => ipcRenderer.invoke("get-products"),
  createProduct: (product) => ipcRenderer.invoke("create-product", product),
  updateProduct: (id, product) =>
    ipcRenderer.invoke("update-product", id, product),
  deleteProduct: (id) => ipcRenderer.invoke("delete-product", id),

  // Sales
  createSale: (sale) => ipcRenderer.invoke("create-sale", sale),
  getSales: () => ipcRenderer.invoke("get-sales"),
  getSaleItems: (saleId) => ipcRenderer.invoke("get-sale-items", saleId),
  updateSaleStatus: (id, status) =>
    ipcRenderer.invoke("update-sale-status", id, status),

  // Dashboard
  getDashboardStats: () => ipcRenderer.invoke("get-dashboard-stats"),

  // Invoices
  getInvoices: () => ipcRenderer.invoke("get-invoices"),
  createInvoice: (invoice) => ipcRenderer.invoke("create-invoice", invoice),
  updateInvoiceStatus: (id, status) =>
    ipcRenderer.invoke("update-invoice-status", id, status),
  generateInvoiceFromSale: (saleId) =>
    ipcRenderer.invoke("generate-invoice-from-sale", saleId),

  // PDF Generation
  generateInvoicePDF: (invoiceId) =>
    ipcRenderer.invoke("generate-invoice-pdf", invoiceId),
  openPDF: (filePath) => ipcRenderer.invoke("open-pdf", filePath),

  // Real-time data updates
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
