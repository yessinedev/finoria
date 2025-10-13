// PDF and Invoice PDF Generation IPC handlers
const path = require("path");
const os = require("os");
const InvoicePDFGenerator = require("../pdf-generator");
const { dialog, shell } = require("electron");

module.exports = (ipcMain, db, mainWindow) => {
  ipcMain.handle("generate-invoice-pdf", async (event, invoiceId) => {
    try {
      // Get invoice data with all related information
      const invoice = db
        .prepare(
          `
        SELECT i.*, c.name as clientName, c.company as clientCompany, c.address as clientAddress
        FROM invoices i
        JOIN clients c ON i.clientId = c.id
        WHERE i.id = ?
      `
        )
        .get(invoiceId);
      if (!invoice) {
        throw new Error("Facture introuvable");
      }
      // Get invoice items with current product information
      const items = db
        .prepare(
          `
        SELECT si.*, p.description as productDescription
        FROM sale_items si
        LEFT JOIN products p ON si.productId = p.id
        WHERE si.saleId = ?
      `
        )
        .all(invoice.saleId);
      // Prepare invoice data for PDF generation
      const invoiceData = {
        ...invoice,
        items: items,
      };
      // Generate unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `Facture_${invoice.number}_${timestamp}.pdf`;
      // Show save dialog
      const result = await dialog.showSaveDialog(mainWindow, {
        title: "Enregistrer la facture PDF",
        defaultPath: path.join(os.homedir(), "Downloads", filename),
        filters: [{ name: "PDF Files", extensions: ["pdf"] }],
      });
      if (result.canceled) {
        return { success: false, message: "Enregistrement annulé" };
      }
      // Generate PDF
      const pdfGenerator = new InvoicePDFGenerator();
      const outputPath = await pdfGenerator.generateInvoice(
        invoiceData,
        result.filePath
      );
      return {
        success: true,
        message: "Facture PDF générée avec succès",
        filePath: outputPath,
      };
    } catch (error) {
      console.error("Error generating PDF:", error);
      return {
        success: false,
        message: `Erreur lors de la génération du PDF: ${error.message}`,
      };
    }
  });

  ipcMain.handle("open-pdf", async (event, filePath) => {
    try {
      await shell.openPath(filePath);
      return { success: true };
    } catch (error) {
      console.error("Error opening PDF:", error);
      return { success: false, message: error.message };
    }
  });
};
