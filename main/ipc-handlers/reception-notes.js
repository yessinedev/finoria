// Reception Notes IPC handlers
module.exports = (ipcMain, db, notifyDataChange) => {
  // Create a reception note
  ipcMain.handle("create-reception-note", async (event, receptionNote) => {
    const transaction = db.transaction((noteData) => {
      try {
        // Insert reception note
        const noteStmt = db.prepare(`
          INSERT INTO reception_notes (supplierOrderId, receptionNumber, driverName, vehicleRegistration, receptionDate, notes) 
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        const noteResult = noteStmt.run(
          noteData.supplierOrderId,
          noteData.receptionNumber,
          noteData.driverName || null,
          noteData.vehicleRegistration || null,
          noteData.receptionDate || new Date().toISOString(),
          noteData.notes || null
        );
        const noteId = noteResult.lastInsertRowid;
        
        // Insert reception note items
        const itemStmt = db.prepare(`
          INSERT INTO reception_note_items (receptionNoteId, productId, productName, orderedQuantity, receivedQuantity, unitPrice) 
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        noteData.items.forEach((item) => {
          itemStmt.run(
            noteId,
            item.productId,
            item.productName,
            item.orderedQuantity,
            item.receivedQuantity,
            item.unitPrice
          );
        });
        
        // Update product stock for received items
        const updateStockStmt = db.prepare(`
          UPDATE products 
          SET stock = stock + ? 
          WHERE id = ? AND category != 'Service'
        `);
        
        // Create stock movement records for received items
        const insertMovementStmt = db.prepare(`
          INSERT INTO stock_movements (
            productId, productName, quantity, movementType, sourceType, sourceId, reference, reason
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        noteData.items.forEach((item) => {
          // Only update stock for non-service products
          updateStockStmt.run(item.receivedQuantity, item.productId);
          
          // Create stock movement record
          insertMovementStmt.run(
            item.productId,
            item.productName,
            item.receivedQuantity,
            'IN',
            'reception_note',
            noteId,
            `RN-${noteId}`,
            'Réception de marchandises'
          );
        });
        
        return noteId;
      } catch (error) {
        console.error("Error in reception note transaction:", error);
        throw error;
      }
    });
    
    try {
      const noteId = transaction(receptionNote);
      
      // Get the created reception note with items
      const getNote = db.prepare(`
        SELECT rn.*, so.supplierId, so.orderNumber as supplierOrderNumber
        FROM reception_notes rn
        JOIN supplier_orders so ON rn.supplierOrderId = so.id
        WHERE rn.id = ?
      `).get(noteId);
      
      const getItems = db.prepare(`
        SELECT * FROM reception_note_items WHERE receptionNoteId = ?
      `).all(noteId);
      
      const newNote = {
        id: noteId,
        ...receptionNote,
        receptionDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        items: getItems
      };
      
      notifyDataChange("reception-notes", "create", newNote);
      return newNote;
    } catch (error) {
      console.error("Error creating reception note:", error);
      throw new Error("Erreur lors de la création du bon de réception");
    }
  });

  // Get all reception notes
  ipcMain.handle("get-reception-notes", async () => {
    try {
      const notes = db
        .prepare(
          `
        SELECT rn.*, so.supplierId, so.orderNumber as supplierOrderNumber, s.name as supplierName
        FROM reception_notes rn
        JOIN supplier_orders so ON rn.supplierOrderId = so.id
        JOIN suppliers s ON so.supplierId = s.id
        ORDER BY rn.receptionDate DESC
      `
        )
        .all();
      
      // Add items and supplier order details to each note
      const getItems = db.prepare(`
        SELECT * FROM reception_note_items WHERE receptionNoteId = ?
      `);
      
      const getSupplierOrder = db.prepare(`
        SELECT so.id, so.supplierId, so.orderNumber, so.totalAmount, so.taxAmount, 
               so.status, so.orderDate, so.deliveryDate, so.createdAt, so.updatedAt,
               s.name as supplierName, s.company as supplierCompany, s.email as supplierEmail, 
               s.phone as supplierPhone, s.address as supplierAddress
        FROM supplier_orders so
        JOIN suppliers s ON so.supplierId = s.id
        WHERE so.id = ?
      `);
      
      const notesWithItems = notes.map(note => ({
        ...note,
        items: getItems.all(note.id),
        supplierOrder: getSupplierOrder.get(note.supplierOrderId)
      }));
      
      return notesWithItems;
    } catch (error) {
      console.error("Error getting reception notes:", error);
      throw new Error("Erreur lors de la récupération des bons de réception");
    }
  });

  // Get reception note by ID
  ipcMain.handle("get-reception-note", async (event, id) => {
    try {
      const note = db.prepare(`
        SELECT rn.*, so.supplierId, so.orderNumber as supplierOrderNumber, s.name as supplierName, s.company as supplierCompany
        FROM reception_notes rn
        JOIN supplier_orders so ON rn.supplierOrderId = so.id
        JOIN suppliers s ON so.supplierId = s.id
        WHERE rn.id = ?
      `).get(id);
      
      if (!note) {
        throw new Error("Bon de réception non trouvé");
      }
      
      // Get items
      const items = db.prepare(`
        SELECT * FROM reception_note_items WHERE receptionNoteId = ?
      `).all(id);
      
      // Get full supplier order details
      const supplierOrder = db.prepare(`
        SELECT so.id, so.supplierId, so.orderNumber, so.totalAmount, so.taxAmount, 
               so.status, so.orderDate, so.deliveryDate, so.createdAt, so.updatedAt,
               s.name as supplierName, s.company as supplierCompany, s.email as supplierEmail, 
               s.phone as supplierPhone, s.address as supplierAddress
        FROM supplier_orders so
        JOIN suppliers s ON so.supplierId = s.id
        WHERE so.id = ?
      `).get(note.supplierOrderId);
      
      return {
        ...note,
        items,
        supplierOrder
      };
    } catch (error) {
      console.error("Error getting reception note:", error);
      throw new Error("Erreur lors de la récupération du bon de réception");
    }
  });

  // Get reception note by supplier order ID
  ipcMain.handle("get-reception-note-by-order", async (event, supplierOrderId) => {
    try {
      const note = db.prepare(`
        SELECT * FROM reception_notes WHERE supplierOrderId = ?
      `).get(supplierOrderId);
      
      if (!note) {
        return null;
      }
      
      // Get items
      const items = db.prepare(`
        SELECT * FROM reception_note_items WHERE receptionNoteId = ?
      `).all(note.id);
      
      return {
        ...note,
        items
      };
    } catch (error) {
      console.error("Error getting reception note by order:", error);
      throw new Error("Erreur lors de la récupération du bon de réception");
    }
  });

  // Update reception note
  ipcMain.handle("update-reception-note", async (event, id, receptionNote) => {
    try {
      // Start transaction
      const updateNote = db.prepare(`
        UPDATE reception_notes 
        SET supplierOrderId = ?, receptionNumber = ?, driverName = ?, vehicleRegistration = ?, 
            receptionDate = ?, notes = ?
        WHERE id = ?
      `);
      
      const deleteItems = db.prepare("DELETE FROM reception_note_items WHERE receptionNoteId = ?");
      const insertItem = db.prepare(`
        INSERT INTO reception_note_items (
          receptionNoteId, productId, productName, orderedQuantity, receivedQuantity, unitPrice
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      // Update note
      const updateResult = updateNote.run(
        receptionNote.supplierOrderId,
        receptionNote.receptionNumber,
        receptionNote.driverName || null,
        receptionNote.vehicleRegistration || null,
        receptionNote.receptionDate,
        receptionNote.notes || null,
        id
      );
      
      // Check if the update was successful
      if (updateResult.changes === 0) {
        throw new Error("Aucun bon de réception trouvé avec cet ID");
      }
      
      // Only process items if they exist
      if (receptionNote.items && Array.isArray(receptionNote.items)) {
        // Delete existing items
        deleteItems.run(id);
        
        // Insert new items
        for (const item of receptionNote.items) {
          insertItem.run(
            id,
            item.productId,
            item.productName,
            item.orderedQuantity,
            item.receivedQuantity,
            item.unitPrice
          );
        }
      }
      
      const updatedNote = {
        id,
        ...receptionNote,
        updatedAt: new Date().toISOString(),
      };
      
      notifyDataChange("reception-notes", "update", updatedNote);
      return updatedNote;
    } catch (error) {
      console.error("Error updating reception note:", error);
      throw new Error(`Erreur lors de la mise à jour du bon de réception: ${error.message}`);
    }
  });

  // Delete reception note
  ipcMain.handle("delete-reception-note", async (event, id) => {
    try {
      // First get the note to adjust stock
      const note = db.prepare("SELECT * FROM reception_notes WHERE id = ?").get(id);
      if (!note) {
        throw new Error("Bon de réception non trouvé");
      }

      // Get note items
      const items = db.prepare("SELECT * FROM reception_note_items WHERE receptionNoteId = ?").all(id);
      
      // Return stock for each item (subtract the received quantity)
      const updateStockStmt = db.prepare(`
        UPDATE products 
        SET stock = stock - ? 
        WHERE id = ? AND category != 'Service'
      `);
      
      // Create stock movement records for the return
      const insertMovementStmt = db.prepare(`
        INSERT INTO stock_movements (
          productId, productName, quantity, movementType, sourceType, sourceId, reference, reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (const item of items) {
        // Only return stock for non-service products
        updateStockStmt.run(item.receivedQuantity, item.productId);
        
        // Create stock movement record for the return
        insertMovementStmt.run(
          item.productId,
          item.productName,
          item.receivedQuantity,
          'OUT',
          'reception_note_cancellation',
          id,
          `RN-${id}`, 
          'Annulation du bon de réception'
        );
      }

      // Delete reception note items first (due to foreign key constraint)
      const deleteItems = db.prepare("DELETE FROM reception_note_items WHERE receptionNoteId = ?");
      deleteItems.run(id);
      
      // Delete the reception note
      const deleteNote = db.prepare("DELETE FROM reception_notes WHERE id = ?");
      const result = deleteNote.run(id);
      
      if (result.changes === 0) {
        throw new Error("Bon de réception non trouvé");
      }
      
      notifyDataChange("reception-notes", "delete", { id });
      return true;
    } catch (error) {
      console.error("Error deleting reception note:", error);
      throw new Error("Erreur lors de la suppression du bon de réception");
    }
  });
};