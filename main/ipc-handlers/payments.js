// Payments IPC handlers
module.exports = (ipcMain, db, notifyDataChange) => {
  // ==================== CLIENT PAYMENTS ====================
  
  // Get all client payments
  ipcMain.handle("get-client-payments", async () => {
    try {
      const payments = db.prepare(`
        SELECT 
          cp.*,
          c.name as clientName,
          c.company as clientCompany,
          i.number as invoiceNumber
        FROM client_payments cp
        LEFT JOIN clients c ON cp.clientId = c.id
        LEFT JOIN invoices i ON cp.invoiceId = i.id
        ORDER BY cp.paymentDate DESC, cp.createdAt DESC
      `).all();
      return payments;
    } catch (error) {
      console.error("Error getting client payments:", error);
      throw new Error("Erreur lors de la récupération des paiements clients");
    }
  });

  // Get payments for a specific invoice
  ipcMain.handle("get-invoice-payments", async (event, invoiceId) => {
    try {
      const payments = db.prepare(`
        SELECT 
          cp.*,
          c.name as clientName,
          c.company as clientCompany
        FROM client_payments cp
        LEFT JOIN clients c ON cp.clientId = c.id
        WHERE cp.invoiceId = ?
        ORDER BY cp.paymentDate DESC, cp.createdAt DESC
      `).all(invoiceId);
      return payments;
    } catch (error) {
      console.error("Error getting invoice payments:", error);
      throw new Error("Erreur lors de la récupération des paiements de la facture");
    }
  });

  // Create client payment
  ipcMain.handle("create-client-payment", async (event, payment) => {
    const transaction = db.transaction((paymentData) => {
      try {
        // Validate that invoiceId is provided (required)
        if (!paymentData.invoiceId) {
          throw new Error("Une facture doit être sélectionnée pour créer un paiement");
        }

        // Get invoice to validate payment amount
        const invoice = db.prepare(`
          SELECT totalAmount, status, dueDate FROM invoices WHERE id = ?
        `).get(paymentData.invoiceId);

        if (!invoice) {
          throw new Error("La facture sélectionnée n'existe pas");
        }

        // Calculate existing payments total (excluding current payment if updating)
        const existingPaymentsTotal = db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as totalPaid
          FROM client_payments
          WHERE invoiceId = ?
        `).get(paymentData.invoiceId);

        const currentTotalPaid = existingPaymentsTotal.totalPaid || 0;
        const remainingAmount = invoice.totalAmount - currentTotalPaid;

        // Validate that the payment amount doesn't exceed the remaining balance
        if (paymentData.amount > remainingAmount) {
          throw new Error(
            `Le montant du paiement (${paymentData.amount.toFixed(3)}) dépasse le solde restant (${remainingAmount.toFixed(3)}). ` +
            `Montant total de la facture: ${invoice.totalAmount.toFixed(3)}, ` +
            `Montant déjà payé: ${currentTotalPaid.toFixed(3)}`
          );
        }

        // Validate that the payment amount is positive
        if (paymentData.amount <= 0) {
          throw new Error("Le montant du paiement doit être supérieur à 0");
        }

        // Insert payment
        const insertPayment = db.prepare(`
          INSERT INTO client_payments (
            clientId, invoiceId, amount, paymentDate, paymentMethod, reference, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        const result = insertPayment.run(
          paymentData.clientId,
          paymentData.invoiceId,
          paymentData.amount,
          paymentData.paymentDate || new Date().toISOString(),
          paymentData.paymentMethod || null,
          paymentData.reference || null,
          paymentData.notes || null
        );

        const paymentId = result.lastInsertRowid;

        // Recalculate total paid amount after inserting the new payment
        const totalPaid = db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as totalPaid
          FROM client_payments
          WHERE invoiceId = ?
        `).get(paymentData.invoiceId);

        // Calculate new status based on total paid
        let newStatus = 'En attente';
        const newRemainingAmount = invoice.totalAmount - (totalPaid.totalPaid || 0);
        
        if (newRemainingAmount <= 0) {
          newStatus = 'Payée';
        } else if (totalPaid.totalPaid > 0) {
          // Partially paid
          newStatus = 'Partiellement payée';
          
          // Check if overdue
          if (invoice.dueDate) {
            const dueDate = new Date(invoice.dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            dueDate.setHours(0, 0, 0, 0);
            
            if (dueDate < today) {
              newStatus = 'En retard';
            }
          }
        } else {
          // Not paid yet, check if overdue
          if (invoice.dueDate) {
            const dueDate = new Date(invoice.dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            dueDate.setHours(0, 0, 0, 0);
            
            if (dueDate < today) {
              newStatus = 'En retard';
            }
          }
        }

        // Update invoice status
        db.prepare(`
          UPDATE invoices SET status = ? WHERE id = ?
        `).run(newStatus, paymentData.invoiceId);

        // Fetch the created payment with joined data
        const createdPayment = db.prepare(`
          SELECT 
            cp.*,
            c.name as clientName,
            c.company as clientCompany,
            i.number as invoiceNumber
          FROM client_payments cp
          LEFT JOIN clients c ON cp.clientId = c.id
          LEFT JOIN invoices i ON cp.invoiceId = i.id
          WHERE cp.id = ?
        `).get(paymentId);

        notifyDataChange("client_payments", "create", createdPayment);
        if (paymentData.invoiceId) {
          notifyDataChange("invoices", "update", { id: paymentData.invoiceId });
        }

        return createdPayment;
      } catch (error) {
        console.error("Error creating client payment:", error);
        throw error;
      }
    });

    try {
      return transaction(payment);
    } catch (error) {
      console.error("Error in transaction:", error);
      throw new Error("Erreur lors de la création du paiement client");
    }
  });

  // Update client payment
  ipcMain.handle("update-client-payment", async (event, id, payment) => {
    const transaction = db.transaction((paymentId, paymentData) => {
      try {
        // Validate that invoiceId is provided (required)
        if (!paymentData.invoiceId) {
          throw new Error("Une facture doit être sélectionnée pour mettre à jour un paiement");
        }

        // Get old payment to check if invoice changed
        const oldPayment = db.prepare(`
          SELECT invoiceId, amount FROM client_payments WHERE id = ?
        `).get(paymentId);

        // Get invoice to validate payment amount
        const invoice = db.prepare(`
          SELECT totalAmount, status, dueDate FROM invoices WHERE id = ?
        `).get(paymentData.invoiceId);

        if (!invoice) {
          throw new Error("La facture sélectionnée n'existe pas");
        }

        // Calculate existing payments total excluding the current payment being updated
        const existingPaymentsTotal = db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as totalPaid
          FROM client_payments
          WHERE invoiceId = ? AND id != ?
        `).get(paymentData.invoiceId, paymentId);

        const currentTotalPaid = existingPaymentsTotal.totalPaid || 0;
        const remainingAmount = invoice.totalAmount - currentTotalPaid;

        // Validate that the payment amount doesn't exceed the remaining balance
        if (paymentData.amount > remainingAmount) {
          throw new Error(
            `Le montant du paiement (${paymentData.amount.toFixed(3)}) dépasse le solde restant (${remainingAmount.toFixed(3)}). ` +
            `Montant total de la facture: ${invoice.totalAmount.toFixed(3)}, ` +
            `Montant déjà payé (hors ce paiement): ${currentTotalPaid.toFixed(3)}`
          );
        }

        // Validate that the payment amount is positive
        if (paymentData.amount <= 0) {
          throw new Error("Le montant du paiement doit être supérieur à 0");
        }

        // Update payment
        const updatePayment = db.prepare(`
          UPDATE client_payments
          SET clientId = ?, invoiceId = ?, amount = ?, paymentDate = ?,
              paymentMethod = ?, reference = ?, notes = ?
          WHERE id = ?
        `);
        
        updatePayment.run(
          paymentData.clientId,
          paymentData.invoiceId,
          paymentData.amount,
          paymentData.paymentDate,
          paymentData.paymentMethod || null,
          paymentData.reference || null,
          paymentData.notes || null,
          paymentId
        );

        // Update invoice statuses (old and new if changed)
        const invoiceIds = new Set();
        if (oldPayment?.invoiceId) invoiceIds.add(oldPayment.invoiceId);
        if (paymentData.invoiceId) invoiceIds.add(paymentData.invoiceId);

        invoiceIds.forEach((invoiceId) => {
          const totalPaid = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) as totalPaid
            FROM client_payments
            WHERE invoiceId = ?
          `).get(invoiceId);

          const invoiceInfo = db.prepare(`
            SELECT totalAmount, dueDate FROM invoices WHERE id = ?
          `).get(invoiceId);

          if (invoiceInfo) {
            let newStatus = 'En attente';
            const newRemainingAmount = invoiceInfo.totalAmount - (totalPaid.totalPaid || 0);
            
            if (newRemainingAmount <= 0) {
              newStatus = 'Payée';
            } else if (totalPaid.totalPaid > 0) {
              // Partially paid
              newStatus = 'Partiellement payée';
              
              // Check if overdue
              if (invoiceInfo.dueDate) {
                const dueDate = new Date(invoiceInfo.dueDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                dueDate.setHours(0, 0, 0, 0);
                
                if (dueDate < today) {
                  newStatus = 'En retard';
                }
              }
            } else {
              // Not paid yet, check if overdue
              if (invoiceInfo.dueDate) {
                const dueDate = new Date(invoiceInfo.dueDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                dueDate.setHours(0, 0, 0, 0);
                
                if (dueDate < today) {
                  newStatus = 'En retard';
                }
              }
            }

            db.prepare(`
              UPDATE invoices SET status = ? WHERE id = ?
            `).run(newStatus, invoiceId);
            notifyDataChange("invoices", "update", { id: invoiceId });
          }
        });

        // Fetch updated payment
        const updatedPayment = db.prepare(`
          SELECT 
            cp.*,
            c.name as clientName,
            c.company as clientCompany,
            i.number as invoiceNumber
          FROM client_payments cp
          LEFT JOIN clients c ON cp.clientId = c.id
          LEFT JOIN invoices i ON cp.invoiceId = i.id
          WHERE cp.id = ?
        `).get(paymentId);

        notifyDataChange("client_payments", "update", updatedPayment);
        return updatedPayment;
      } catch (error) {
        console.error("Error updating client payment:", error);
        throw error;
      }
    });

    try {
      return transaction(id, payment);
    } catch (error) {
      console.error("Error in transaction:", error);
      throw new Error("Erreur lors de la mise à jour du paiement client");
    }
  });

  // Delete client payment
  ipcMain.handle("delete-client-payment", async (event, id) => {
    const transaction = db.transaction((paymentId) => {
      try {
        // Get payment to find associated invoice
        const payment = db.prepare(`
          SELECT invoiceId FROM client_payments WHERE id = ?
        `).get(paymentId);

        // Delete payment
        db.prepare(`DELETE FROM client_payments WHERE id = ?`).run(paymentId);

        // Update invoice status if invoiceId exists
        if (payment?.invoiceId) {
          const totalPaid = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) as totalPaid
            FROM client_payments
            WHERE invoiceId = ?
          `).get(payment.invoiceId);

          const invoice = db.prepare(`
            SELECT totalAmount, dueDate FROM invoices WHERE id = ?
          `).get(payment.invoiceId);

          if (invoice) {
            let newStatus = 'En attente';
            const newRemainingAmount = invoice.totalAmount - (totalPaid.totalPaid || 0);
            
            if (newRemainingAmount <= 0) {
              newStatus = 'Payée';
            } else if (totalPaid.totalPaid > 0) {
              // Partially paid
              newStatus = 'Partiellement payée';
              
              // Check if overdue
              if (invoice.dueDate) {
                const dueDate = new Date(invoice.dueDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                dueDate.setHours(0, 0, 0, 0);
                
                if (dueDate < today) {
                  newStatus = 'En retard';
                }
              }
            } else {
              // Not paid yet, check if overdue
              if (invoice.dueDate) {
                const dueDate = new Date(invoice.dueDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                dueDate.setHours(0, 0, 0, 0);
                
                if (dueDate < today) {
                  newStatus = 'En retard';
                }
              }
            }

            db.prepare(`
              UPDATE invoices SET status = ? WHERE id = ?
            `).run(newStatus, payment.invoiceId);
            notifyDataChange("invoices", "update", { id: payment.invoiceId });
          }
        }

        notifyDataChange("client_payments", "delete", { id: paymentId });
        return true;
      } catch (error) {
        console.error("Error deleting client payment:", error);
        throw error;
      }
    });

    try {
      return transaction(id);
    } catch (error) {
      console.error("Error in transaction:", error);
      throw new Error("Erreur lors de la suppression du paiement client");
    }
  });

  // ==================== SUPPLIER PAYMENTS ====================
  
  // Get all supplier payments
  ipcMain.handle("get-supplier-payments", async () => {
    try {
      const payments = db.prepare(`
        SELECT 
          sp.*,
          s.name as supplierName,
          s.company as supplierCompany,
          si.invoiceNumber
        FROM supplier_payments sp
        LEFT JOIN suppliers s ON sp.supplierId = s.id
        LEFT JOIN supplier_invoices si ON sp.invoiceId = si.id
        ORDER BY sp.paymentDate DESC, sp.createdAt DESC
      `).all();
      return payments;
    } catch (error) {
      console.error("Error getting supplier payments:", error);
      throw new Error("Erreur lors de la récupération des paiements fournisseur");
    }
  });

  // Get payments for a specific supplier invoice
  ipcMain.handle("get-supplier-invoice-payments", async (event, invoiceId) => {
    try {
      const payments = db.prepare(`
        SELECT 
          sp.*,
          s.name as supplierName,
          s.company as supplierCompany
        FROM supplier_payments sp
        LEFT JOIN suppliers s ON sp.supplierId = s.id
        WHERE sp.invoiceId = ?
        ORDER BY sp.paymentDate DESC, sp.createdAt DESC
      `).all(invoiceId);
      return payments;
    } catch (error) {
      console.error("Error getting supplier invoice payments:", error);
      throw new Error("Erreur lors de la récupération des paiements de la facture fournisseur");
    }
  });

  // Create supplier payment
  ipcMain.handle("create-supplier-payment", async (event, payment) => {
    const transaction = db.transaction((paymentData) => {
      try {
        // Validate that invoiceId is provided (required)
        if (!paymentData.invoiceId) {
          throw new Error("Une facture doit être sélectionnée pour créer un paiement");
        }

        // Get invoice to validate payment amount
        const invoice = db.prepare(`
          SELECT totalAmount, status, dueDate FROM supplier_invoices WHERE id = ?
        `).get(paymentData.invoiceId);

        if (!invoice) {
          throw new Error("La facture sélectionnée n'existe pas");
        }

        // Calculate existing payments total
        const existingPaymentsTotal = db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as totalPaid
          FROM supplier_payments
          WHERE invoiceId = ?
        `).get(paymentData.invoiceId);

        const currentTotalPaid = existingPaymentsTotal.totalPaid || 0;
        const remainingAmount = invoice.totalAmount - currentTotalPaid;

        // Validate that the payment amount doesn't exceed the remaining balance
        if (paymentData.amount > remainingAmount) {
          throw new Error(
            `Le montant du paiement (${paymentData.amount.toFixed(3)}) dépasse le solde restant (${remainingAmount.toFixed(3)}). ` +
            `Montant total de la facture: ${invoice.totalAmount.toFixed(3)}, ` +
            `Montant déjà payé: ${currentTotalPaid.toFixed(3)}`
          );
        }

        // Validate that the payment amount is positive
        if (paymentData.amount <= 0) {
          throw new Error("Le montant du paiement doit être supérieur à 0");
        }

        // Insert payment
        const insertPayment = db.prepare(`
          INSERT INTO supplier_payments (
            supplierId, invoiceId, amount, paymentDate, paymentMethod, reference, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        const result = insertPayment.run(
          paymentData.supplierId,
          paymentData.invoiceId,
          paymentData.amount,
          paymentData.paymentDate || new Date().toISOString(),
          paymentData.paymentMethod || null,
          paymentData.reference || null,
          paymentData.notes || null
        );

        const paymentId = result.lastInsertRowid;

        // Recalculate total paid amount after inserting the new payment
        const totalPaid = db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as totalPaid
          FROM supplier_payments
          WHERE invoiceId = ?
        `).get(paymentData.invoiceId);

        // Calculate new status based on total paid
        let newStatus = 'En attente';
        const newRemainingAmount = invoice.totalAmount - (totalPaid.totalPaid || 0);
        
        if (newRemainingAmount <= 0) {
          newStatus = 'Payée';
        } else if (totalPaid.totalPaid > 0) {
          // Partially paid
          newStatus = 'Partiellement payée';
          
          // Check if overdue
          if (invoice.dueDate) {
            const dueDate = new Date(invoice.dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            dueDate.setHours(0, 0, 0, 0);
            
            if (dueDate < today) {
              newStatus = 'En retard';
            }
          }
        } else {
          // Not paid yet, check if overdue
          if (invoice.dueDate) {
            const dueDate = new Date(invoice.dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            dueDate.setHours(0, 0, 0, 0);
            
            if (dueDate < today) {
              newStatus = 'En retard';
            }
          }
        }

        // Update supplier invoice status
        db.prepare(`
          UPDATE supplier_invoices SET status = ? WHERE id = ?
        `).run(newStatus, paymentData.invoiceId);

        // Fetch the created payment
        const createdPayment = db.prepare(`
          SELECT 
            sp.*,
            s.name as supplierName,
            s.company as supplierCompany,
            si.invoiceNumber
          FROM supplier_payments sp
          LEFT JOIN suppliers s ON sp.supplierId = s.id
          LEFT JOIN supplier_invoices si ON sp.invoiceId = si.id
          WHERE sp.id = ?
        `).get(paymentId);

        notifyDataChange("supplier_payments", "create", createdPayment);
        if (paymentData.invoiceId) {
          notifyDataChange("supplier_invoices", "update", { id: paymentData.invoiceId });
        }

        return createdPayment;
      } catch (error) {
        console.error("Error creating supplier payment:", error);
        throw error;
      }
    });

    try {
      return transaction(payment);
    } catch (error) {
      console.error("Error in transaction:", error);
      throw new Error("Erreur lors de la création du paiement fournisseur");
    }
  });

  // Update supplier payment
  ipcMain.handle("update-supplier-payment", async (event, id, payment) => {
    const transaction = db.transaction((paymentId, paymentData) => {
      try {
        // Validate that invoiceId is provided (required)
        if (!paymentData.invoiceId) {
          throw new Error("Une facture doit être sélectionnée pour mettre à jour un paiement");
        }

        // Get old payment to check if invoice changed
        const oldPayment = db.prepare(`
          SELECT invoiceId, amount FROM supplier_payments WHERE id = ?
        `).get(paymentId);

        // Get invoice to validate payment amount
        const invoice = db.prepare(`
          SELECT totalAmount, status, dueDate FROM supplier_invoices WHERE id = ?
        `).get(paymentData.invoiceId);

        if (!invoice) {
          throw new Error("La facture sélectionnée n'existe pas");
        }

        // Calculate existing payments total excluding the current payment being updated
        const existingPaymentsTotal = db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as totalPaid
          FROM supplier_payments
          WHERE invoiceId = ? AND id != ?
        `).get(paymentData.invoiceId, paymentId);

        const currentTotalPaid = existingPaymentsTotal.totalPaid || 0;
        const remainingAmount = invoice.totalAmount - currentTotalPaid;

        // Validate that the payment amount doesn't exceed the remaining balance
        if (paymentData.amount > remainingAmount) {
          throw new Error(
            `Le montant du paiement (${paymentData.amount.toFixed(3)}) dépasse le solde restant (${remainingAmount.toFixed(3)}). ` +
            `Montant total de la facture: ${invoice.totalAmount.toFixed(3)}, ` +
            `Montant déjà payé (hors ce paiement): ${currentTotalPaid.toFixed(3)}`
          );
        }

        // Validate that the payment amount is positive
        if (paymentData.amount <= 0) {
          throw new Error("Le montant du paiement doit être supérieur à 0");
        }

        const updatePayment = db.prepare(`
          UPDATE supplier_payments
          SET supplierId = ?, invoiceId = ?, amount = ?, paymentDate = ?,
              paymentMethod = ?, reference = ?, notes = ?
          WHERE id = ?
        `);
        
        updatePayment.run(
          paymentData.supplierId,
          paymentData.invoiceId,
          paymentData.amount,
          paymentData.paymentDate,
          paymentData.paymentMethod || null,
          paymentData.reference || null,
          paymentData.notes || null,
          paymentId
        );

        // Update invoice statuses (old and new if changed)
        const invoiceIds = new Set();
        if (oldPayment?.invoiceId) invoiceIds.add(oldPayment.invoiceId);
        if (paymentData.invoiceId) invoiceIds.add(paymentData.invoiceId);

        invoiceIds.forEach((invoiceId) => {
          const totalPaid = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) as totalPaid
            FROM supplier_payments
            WHERE invoiceId = ?
          `).get(invoiceId);

          const invoiceInfo = db.prepare(`
            SELECT totalAmount, dueDate FROM supplier_invoices WHERE id = ?
          `).get(invoiceId);

          if (invoiceInfo) {
            let newStatus = 'En attente';
            const newRemainingAmount = invoiceInfo.totalAmount - (totalPaid.totalPaid || 0);
            
            if (newRemainingAmount <= 0) {
              newStatus = 'Payée';
            } else if (totalPaid.totalPaid > 0) {
              // Partially paid
              newStatus = 'Partiellement payée';
              
              // Check if overdue
              if (invoiceInfo.dueDate) {
                const dueDate = new Date(invoiceInfo.dueDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                dueDate.setHours(0, 0, 0, 0);
                
                if (dueDate < today) {
                  newStatus = 'En retard';
                }
              }
            } else {
              // Not paid yet, check if overdue
              if (invoiceInfo.dueDate) {
                const dueDate = new Date(invoiceInfo.dueDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                dueDate.setHours(0, 0, 0, 0);
                
                if (dueDate < today) {
                  newStatus = 'En retard';
                }
              }
            }

            db.prepare(`
              UPDATE supplier_invoices SET status = ? WHERE id = ?
            `).run(newStatus, invoiceId);
            notifyDataChange("supplier_invoices", "update", { id: invoiceId });
          }
        });

        const updatedPayment = db.prepare(`
          SELECT 
            sp.*,
            s.name as supplierName,
            s.company as supplierCompany,
            si.invoiceNumber
          FROM supplier_payments sp
          LEFT JOIN suppliers s ON sp.supplierId = s.id
          LEFT JOIN supplier_invoices si ON sp.invoiceId = si.id
          WHERE sp.id = ?
        `).get(paymentId);

        notifyDataChange("supplier_payments", "update", updatedPayment);
        return updatedPayment;
      } catch (error) {
        console.error("Error updating supplier payment:", error);
        throw error;
      }
    });

    try {
      return transaction(id, payment);
    } catch (error) {
      console.error("Error in transaction:", error);
      throw new Error("Erreur lors de la mise à jour du paiement fournisseur");
    }
  });

  // Delete supplier payment
  ipcMain.handle("delete-supplier-payment", async (event, id) => {
    const transaction = db.transaction((paymentId) => {
      try {
        const payment = db.prepare(`
          SELECT invoiceId FROM supplier_payments WHERE id = ?
        `).get(paymentId);

        db.prepare(`DELETE FROM supplier_payments WHERE id = ?`).run(paymentId);

        if (payment?.invoiceId) {
          const totalPaid = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) as totalPaid
            FROM supplier_payments
            WHERE invoiceId = ?
          `).get(payment.invoiceId);

          const invoice = db.prepare(`
            SELECT totalAmount, dueDate FROM supplier_invoices WHERE id = ?
          `).get(payment.invoiceId);

          if (invoice) {
            let newStatus = 'En attente';
            const newRemainingAmount = invoice.totalAmount - (totalPaid.totalPaid || 0);
            
            if (newRemainingAmount <= 0) {
              newStatus = 'Payée';
            } else if (totalPaid.totalPaid > 0) {
              // Partially paid
              newStatus = 'Partiellement payée';
              
              // Check if overdue
              if (invoice.dueDate) {
                const dueDate = new Date(invoice.dueDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                dueDate.setHours(0, 0, 0, 0);
                
                if (dueDate < today) {
                  newStatus = 'En retard';
                }
              }
            } else {
              // Not paid yet, check if overdue
              if (invoice.dueDate) {
                const dueDate = new Date(invoice.dueDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                dueDate.setHours(0, 0, 0, 0);
                
                if (dueDate < today) {
                  newStatus = 'En retard';
                }
              }
            }

            db.prepare(`
              UPDATE supplier_invoices SET status = ? WHERE id = ?
            `).run(newStatus, payment.invoiceId);
            notifyDataChange("supplier_invoices", "update", { id: payment.invoiceId });
          }
        }

        notifyDataChange("supplier_payments", "delete", { id: paymentId });
        return true;
      } catch (error) {
        console.error("Error deleting supplier payment:", error);
        throw error;
      }
    });

    try {
      return transaction(id);
    } catch (error) {
      console.error("Error in transaction:", error);
      throw new Error("Erreur lors de la suppression du paiement fournisseur");
    }
  });
};

