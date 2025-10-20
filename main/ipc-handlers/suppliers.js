// Suppliers IPC handlers
module.exports = (ipcMain, db, notifyDataChange) => {
  // Suppliers CRUD
  ipcMain.handle("get-suppliers", async () => {
    try {
      const suppliers = db.prepare("SELECT * FROM suppliers ORDER BY name").all();
      return suppliers;
    } catch (error) {
      console.error("Error getting suppliers:", error);
      throw new Error("Erreur lors de la récupération des fournisseurs");
    }
  });

  ipcMain.handle("create-supplier", async (event, supplier) => {
    try {
      const stmt = db.prepare(`
        INSERT INTO suppliers (name, email, phone, address, company, taxId) 
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        supplier.name,
        supplier.email,
        supplier.phone,
        supplier.address,
        supplier.company,
        supplier.taxId
      );
      const newSupplier = {
        id: result.lastInsertRowid,
        ...supplier,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      notifyDataChange("suppliers", "create", newSupplier);
      return newSupplier;
    } catch (error) {
      console.error("Error creating supplier:", error);
      throw new Error("Erreur lors de la création du fournisseur");
    }
  });

  ipcMain.handle("update-supplier", async (event, id, supplier) => {
    try {
      const stmt = db.prepare(`
        UPDATE suppliers 
        SET name = ?, email = ?, phone = ?, address = ?, company = ?, taxId = ?, updatedAt = CURRENT_TIMESTAMP 
        WHERE id = ?
      `);
      stmt.run(
        supplier.name,
        supplier.email,
        supplier.phone,
        supplier.address,
        supplier.company,
        supplier.taxId,
        id
      );
      const updatedSupplier = {
        id,
        ...supplier,
        updatedAt: new Date().toISOString(),
      };
      notifyDataChange("suppliers", "update", updatedSupplier);
      return updatedSupplier;
    } catch (error) {
      console.error("Error updating supplier:", error);
      throw new Error("Erreur lors de la mise à jour du fournisseur");
    }
  });

  ipcMain.handle("delete-supplier", async (event, id) => {
    try {
      // Check if supplier has orders or invoices
      const ordersCount = db
        .prepare("SELECT COUNT(*) as count FROM supplier_orders WHERE supplierId = ?")
        .get(id);
      if (ordersCount.count > 0) {
        throw new Error(
          "Impossible de supprimer ce fournisseur car il a des commandes associées"
        );
      }
      
      const invoicesCount = db
        .prepare("SELECT COUNT(*) as count FROM supplier_invoices WHERE supplierId = ?")
        .get(id);
      if (invoicesCount.count > 0) {
        throw new Error(
          "Impossible de supprimer ce fournisseur car il a des factures associées"
        );
      }
      
      const stmt = db.prepare("DELETE FROM suppliers WHERE id = ?");
      stmt.run(id);
      notifyDataChange("suppliers", "delete", { id });
      return true;
    } catch (error) {
      console.error("Error deleting supplier:", error);
      throw error;
    }
  });

  // Supplier Orders CRUD
  ipcMain.handle("get-supplier-orders", async () => {
    try {
      const orders = db.prepare(`
        SELECT 
          so.*,
          s.name as supplierName,
          s.company as supplierCompany,
          s.email as supplierEmail,
          s.phone as supplierPhone,
          s.address as supplierAddress
        FROM supplier_orders so
        JOIN suppliers s ON so.supplierId = s.id
        ORDER BY so.orderDate DESC
      `).all();
      
      console.log('Retrieved orders from database:', orders); // Debug log
      
      // Add items to each order
      const getItems = db.prepare(`
        SELECT * FROM supplier_order_items WHERE orderId = ?
      `);
      
      const ordersWithItems = orders.map(order => {
        const items = getItems.all(order.id);
        console.log(`Items for order ${order.id}:`, items); // Debug log
        return {
          ...order,
          items: items
        };
      });
      
      console.log('Orders with items:', ordersWithItems); // Debug log
      
      return ordersWithItems;
    } catch (error) {
      console.error("Error getting supplier orders:", error);
      throw new Error("Erreur lors de la récupération des commandes fournisseurs");
    }
  });

  ipcMain.handle("create-supplier-order", async (event, order) => {
    try {
      // Generate order number if not provided
      const orderNumber = order.orderNumber || `PO-${Date.now()}`;
      
      // Start transaction
      const insertOrder = db.prepare(`
        INSERT INTO supplier_orders (
          supplierId, orderNumber, totalAmount, taxAmount, status, orderDate, deliveryDate
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const insertItem = db.prepare(`
        INSERT INTO supplier_order_items (
          orderId, productId, productName, quantity, unitPrice, discount, totalPrice
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const updateProductStock = db.prepare(`
        UPDATE products SET stock = stock + ? WHERE id = ?
      `);
      
      const orderResult = insertOrder.run(
        order.supplierId,
        orderNumber,
        order.totalAmount,
        order.taxAmount,
        order.status,
        order.orderDate,
        order.deliveryDate
      );
      
      const orderId = orderResult.lastInsertRowid;
      
      // Insert order items and update product stock
      for (const item of order.items) {
        insertItem.run(
          orderId,
          item.productId,
          item.productName,
          item.quantity,
          item.unitPrice,
          item.discount || 0,
          item.totalPrice
        );
        
        // Update product stock
        updateProductStock.run(item.quantity, item.productId);
      }
      
      const newOrder = {
        id: orderId,
        orderNumber,
        ...order,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      notifyDataChange("supplier_orders", "create", newOrder);
      return newOrder;
    } catch (error) {
      console.error("Error creating supplier order:", error);
      throw new Error("Erreur lors de la création de la commande fournisseur");
    }
  });

  ipcMain.handle("update-supplier-order", async (event, id, order) => {
    try {
      // Start transaction
      const updateOrder = db.prepare(`
        UPDATE supplier_orders 
        SET supplierId = ?, orderNumber = ?, totalAmount = ?, taxAmount = ?, 
            status = ?, orderDate = ?, deliveryDate = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      // Update order
      const updateResult = updateOrder.run(
        order.supplierId,
        order.orderNumber,
        order.totalAmount,
        order.taxAmount,
        order.status,
        order.orderDate,
        order.deliveryDate,
        id
      );
      
      // Check if the update was successful
      if (updateResult.changes === 0) {
        throw new Error("Aucune commande trouvée avec cet ID");
      }
      
      // Only process items if they exist
      if (order.items && Array.isArray(order.items)) {
        const deleteItems = db.prepare("DELETE FROM supplier_order_items WHERE orderId = ?");
        const insertItem = db.prepare(`
          INSERT INTO supplier_order_items (
            orderId, productId, productName, quantity, unitPrice, discount, totalPrice
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        // Delete existing items
        deleteItems.run(id);
        
        // Insert new items
        for (const item of order.items) {
          insertItem.run(
            id,
            item.productId,
            item.productName,
            item.quantity,
            item.unitPrice,
            item.discount || 0,
            item.totalPrice
          );
        }
      }
      
      const updatedOrder = {
        id,
        ...order,
        updatedAt: new Date().toISOString(),
      };
      
      notifyDataChange("supplier_orders", "update", updatedOrder);
      return updatedOrder;
    } catch (error) {
      console.error("Error updating supplier order:", error);
      throw new Error(`Erreur lors de la mise à jour de la commande fournisseur: ${error.message}`);
    }
  });

  ipcMain.handle("delete-supplier-order", async (event, id) => {
    try {
      // Check if order has invoices
      const invoicesCount = db
        .prepare("SELECT COUNT(*) as count FROM supplier_invoices WHERE orderId = ?")
        .get(id);
      if (invoicesCount.count > 0) {
        throw new Error(
          "Impossible de supprimer cette commande car elle a des factures associées"
        );
      }
      
      // Start transaction
      const deleteItems = db.prepare("DELETE FROM supplier_order_items WHERE orderId = ?");
      const deleteOrder = db.prepare("DELETE FROM supplier_orders WHERE id = ?");
      
      // Delete items first
      deleteItems.run(id);
      
      // Delete order
      deleteOrder.run(id);
      
      notifyDataChange("supplier_orders", "delete", { id });
      return true;
    } catch (error) {
      console.error("Error deleting supplier order:", error);
      throw error;
    }
  });

  // Supplier Invoices CRUD
  ipcMain.handle("get-supplier-invoices", async () => {
    try {
      const invoices = db.prepare(`
        SELECT 
          si.*,
          s.name as supplierName,
          s.company as supplierCompany,
          s.email as supplierEmail,
          s.phone as supplierPhone,
          s.address as supplierAddress,
          s.taxId as supplierTaxId
        FROM supplier_invoices si
        JOIN suppliers s ON si.supplierId = s.id
        ORDER BY si.issueDate DESC
      `).all();
      
      // Add items to each invoice
      const getItems = db.prepare(`
        SELECT * FROM supplier_invoice_items WHERE invoiceId = ?
      `);
      
      const invoicesWithItems = invoices.map(invoice => ({
        ...invoice,
        items: getItems.all(invoice.id)
      }));
      
      return invoicesWithItems;
    } catch (error) {
      console.error("Error getting supplier invoices:", error);
      throw new Error("Erreur lors de la récupération des factures fournisseurs");
    }
  });

  ipcMain.handle("create-supplier-invoice", async (event, invoice) => {
    try {
      // Start transaction
      const insertInvoice = db.prepare(`
        INSERT INTO supplier_invoices (
          supplierId, orderId, invoiceNumber, amount, taxAmount, totalAmount, 
          status, issueDate, dueDate, paymentDate
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const insertItem = db.prepare(`
        INSERT INTO supplier_invoice_items (
          invoiceId, productId, productName, quantity, unitPrice, discount, totalPrice
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const invoiceResult = insertInvoice.run(
        invoice.supplierId,
        invoice.orderId,
        invoice.invoiceNumber,
        invoice.amount,
        invoice.taxAmount,
        invoice.totalAmount,
        invoice.status,
        invoice.issueDate,
        invoice.dueDate,
        invoice.paymentDate
      );
      
      const invoiceId = invoiceResult.lastInsertRowid;
      
      // Insert invoice items
      if (invoice.items && Array.isArray(invoice.items)) {
        for (const item of invoice.items) {
          insertItem.run(
            invoiceId,
            item.productId,
            item.productName,
            item.quantity,
            item.unitPrice,
            item.discount || 0,
            item.totalPrice
          );
        }
      }
      
      const newInvoice = {
        id: invoiceId,
        ...invoice,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      notifyDataChange("supplier_invoices", "create", newInvoice);
      return newInvoice;
    } catch (error) {
      console.error("Error creating supplier invoice:", error);
      throw new Error("Erreur lors de la création de la facture fournisseur");
    }
  });

  ipcMain.handle("update-supplier-invoice", async (event, id, invoice) => {
    try {
      // Start transaction
      const updateInvoice = db.prepare(`
        UPDATE supplier_invoices 
        SET supplierId = ?, orderId = ?, invoiceNumber = ?, amount = ?, taxAmount = ?, 
            totalAmount = ?, status = ?, issueDate = ?, dueDate = ?, paymentDate = ?, 
            updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      const deleteItems = db.prepare("DELETE FROM supplier_invoice_items WHERE invoiceId = ?");
      const insertItem = db.prepare(`
        INSERT INTO supplier_invoice_items (
          invoiceId, productId, productName, quantity, unitPrice, discount, totalPrice
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      updateInvoice.run(
        invoice.supplierId,
        invoice.orderId,
        invoice.invoiceNumber,
        invoice.amount,
        invoice.taxAmount,
        invoice.totalAmount,
        invoice.status,
        invoice.issueDate,
        invoice.dueDate,
        invoice.paymentDate,
        id
      );
      
      // Update invoice items
      if (invoice.items && Array.isArray(invoice.items)) {
        deleteItems.run(id);
        for (const item of invoice.items) {
          insertItem.run(
            id,
            item.productId,
            item.productName,
            item.quantity,
            item.unitPrice,
            item.discount || 0,
            item.totalPrice
          );
        }
      }
      
      const updatedInvoice = {
        id,
        ...invoice,
        updatedAt: new Date().toISOString(),
      };
      
      notifyDataChange("supplier_invoices", "update", updatedInvoice);
      return updatedInvoice;
    } catch (error) {
      console.error("Error updating supplier invoice:", error);
      throw new Error("Erreur lors de la mise à jour de la facture fournisseur");
    }
  });

  ipcMain.handle("delete-supplier-invoice", async (event, id) => {
    try {
      const stmt = db.prepare("DELETE FROM supplier_invoices WHERE id = ?");
      stmt.run(id);
      notifyDataChange("supplier_invoices", "delete", { id });
      return true;
    } catch (error) {
      console.error("Error deleting supplier invoice:", error);
      throw error;
    }
  });

  ipcMain.handle("update-supplier-invoice-status", async (event, id, status) => {
    try {
      const stmt = db.prepare("UPDATE supplier_invoices SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?");
      stmt.run(status, id);
      notifyDataChange("supplier_invoices", "update", { id, status });
      return { id, status };
    } catch (error) {
      console.error("Error updating supplier invoice status:", error);
      throw new Error("Erreur lors de la mise à jour du statut de facture fournisseur");
    }
  });

  // Stock Movements CRUD
  ipcMain.handle("get-stock-movements", async () => {
    try {
      const movements = db.prepare(`
        SELECT * FROM stock_movements ORDER BY createdAt DESC
      `).all();
      return movements;
    } catch (error) {
      console.error("Error getting stock movements:", error);
      throw new Error("Erreur lors de la récupération des mouvements de stock");
    }
  });

  ipcMain.handle("create-stock-movement", async (event, movement) => {
    try {
      const stmt = db.prepare(`
        INSERT INTO stock_movements (
          productId, productName, quantity, movementType, sourceType, sourceId, reference, reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        movement.productId,
        movement.productName,
        movement.quantity,
        movement.movementType,
        movement.sourceType,
        movement.sourceId,
        movement.reference,
        movement.reason
      );
      
      const newMovement = {
        id: result.lastInsertRowid,
        ...movement,
        createdAt: new Date().toISOString(),
      };
      
      // Don't notify data change for stock movements as they're not real-time updated
      return newMovement;
    } catch (error) {
      console.error("Error creating stock movement:", error);
      throw new Error("Erreur lors de la création du mouvement de stock");
    }
  });

  ipcMain.handle("get-stock-movements-by-product", async (event, productId) => {
    try {
      const movements = db.prepare(`
        SELECT * FROM stock_movements 
        WHERE productId = ? 
        ORDER BY createdAt DESC
      `).all(productId);
      return movements;
    } catch (error) {
      console.error("Error getting stock movements by product:", error);
      throw new Error("Erreur lors de la récupération des mouvements de stock pour le produit");
    }
  });


};