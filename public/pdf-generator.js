const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

class InvoicePDFGenerator {
  constructor() {
    this.doc = null;
    this.currentY = 0;
  }

  generateInvoice(invoiceData, outputPath) {
    return new Promise((resolve, reject) => {
      try {
        this.doc = new PDFDocument({ margin: 40, size: "A4" });
        const stream = fs.createWriteStream(outputPath);
        this.doc.pipe(stream);

        this.addHeader(invoiceData);
        this.addCompanyAndClientInfo(invoiceData);
        this.addInvoiceDetails(invoiceData);
        this.addItemsTable(invoiceData.items);
        this.addTotals(invoiceData);
        this.addNotes(invoiceData);
        this.addFooter();

        this.doc.end();

        stream.on("finish", () => resolve(outputPath));
        stream.on("error", (error) => reject(error));
      } catch (error) {
        reject(error);
      }
    });
  }

  addHeader(invoiceData) {
    // Logo (replace with your logo if available)
    // this.doc
    //   .stroke()
    //   .fontSize(10)
    //   .text("LOGO", 85, 75, { align: "right" });

    // Title and number
    this.doc
      .fontSize(28)
      .fillColor("#6366f1") // primary
      .font("Helvetica-Bold")
      .text("FACTURE", 100, 48);
    this.doc
      .fontSize(12)
      .fillColor("#222")
      .font("Helvetica")
      .text(`N° ${invoiceData.number}`, 100, 80)
      .text(`Date: ${this.formatDate(invoiceData.issueDate)}`, 100, 98);
    if (invoiceData.dueDate) {
      this.doc.text(
        `Échéance: ${this.formatDate(invoiceData.dueDate)}`,
        100,
        114
      );
    }
    this.currentY = 140;
  }

  addCompanyAndClientInfo(invoiceData) {
    // Company Card
    this.doc
      .roundedRect(40, this.currentY, 220, 100, 10)
      .fillAndStroke("#f3f4f6", "#e5e7eb");
    this.doc
      .fontSize(14)
      .fillColor("#3535fa")
      .font("Helvetica-Bold")
      .text("GestVente SARL", 52, this.currentY + 12);
    this.doc
      .fontSize(10)
      .fillColor("#222")
      .font("Helvetica")
      .text("123 Rue de l'Entreprise", 52, this.currentY + 32)
      .text("75001 Paris, France", 52, this.currentY + 46)
      .text("Tél: 01 23 45 67 89", 52, this.currentY + 60)
      .text("Email: contact@gestvente.fr", 52, this.currentY + 74)
      .text("SIRET: 123 456 789 00012", 52, this.currentY + 88);
    // Client Card
    this.doc
      .roundedRect(320, this.currentY, 220, 100, 10)
      .fillAndStroke("#f3f4f6", "#e5e7eb");
    this.doc
      .fontSize(12)
      .fillColor("#6366f1")
      .font("Helvetica-Bold")
      .text("Facturé à", 332, this.currentY + 12);
    this.doc
      .fontSize(10)
      .fillColor("#222")
      .font("Helvetica")
      .text(invoiceData.clientName, 332, this.currentY + 32);
    if (invoiceData.clientCompany) {
      this.doc.text(invoiceData.clientCompany, 332, this.currentY + 46);
    }
    if (invoiceData.clientAddress) {
      const addressLines = invoiceData.clientAddress.split(",");
      let yOffset = 60;
      addressLines.forEach((line) => {
        this.doc.text(line.trim(), 332, this.currentY + yOffset);
        yOffset += 12;
      });
    }
    if (invoiceData.clientPhone) {
      this.doc.text(invoiceData.clientPhone, 332, this.currentY + 82);
    }
    if (invoiceData.clientEmail) {
      this.doc.text(invoiceData.clientEmail, 332, this.currentY + 94);
    }
    this.currentY += 120;
  }

  addInvoiceDetails(invoiceData) {
    // Status badge
    const statusColor = this.getStatusColor(invoiceData.status);
    this.doc
      .roundedRect(40, this.currentY, 90, 28, 8)
      .fillAndStroke(statusColor, statusColor);
    this.doc
      .fillColor("#fff")
      .fontSize(12)
      .font("Helvetica-Bold")
      .text(invoiceData.status, 40, this.currentY + 8, {
        width: 90,
        align: "center",
      });
    // Payment terms
    this.doc
      .fontSize(10)
      .fillColor("#222")
      .font("Helvetica")
      .text("Conditions de paiement :", 150, this.currentY + 6)
      .text(
        invoiceData.paymentTerms || "30 jours net",
        150,
        this.currentY + 20
      );
    this.currentY += 40;
  }

  addItemsTable(items) {
    const tableTop = this.currentY;
    const tableLeft = 40;
    const tableWidth = 500;
    // Table header
    this.doc
      .roundedRect(tableLeft, tableTop, tableWidth, 28, 6)
      .fillAndStroke("#6366f1", "#6366f1");
    this.doc
      .fillColor("#fff")
      .fontSize(11)
      .font("Helvetica-Bold")
      .text("Description", tableLeft + 8, tableTop + 9)
      .text("Qté", tableLeft + 220, tableTop + 9)
      .text("Prix unit.", tableLeft + 270, tableTop + 9)
      .text("Remise", tableLeft + 350, tableTop + 9)
      .text("Total HT", tableLeft + 430, tableTop + 9);
    // Table rows
    let currentRowY = tableTop + 28;
    this.doc.font("Helvetica").fontSize(10);
    items.forEach((item, index) => {
      const rowHeight = 22;
      const isEvenRow = index % 2 === 0;
      // Alternate row background
      if (isEvenRow) {
        this.doc
          .rect(tableLeft, currentRowY, tableWidth, rowHeight)
          .fillAndStroke("#f3f4f6", "#e5e7eb");
      } else {
        this.doc
          .rect(tableLeft, currentRowY, tableWidth, rowHeight)
          .stroke("#e5e7eb");
      }
      this.doc.fillColor("#222");
      this.doc
        .text(item.productName || item.name, tableLeft + 8, currentRowY + 7, {
          width: 200,
        })
        .text(item.quantity.toString(), tableLeft + 220, currentRowY + 7)
        .text(
          `${item.unitPrice.toFixed(2)} €`,
          tableLeft + 270,
          currentRowY + 7
        )
        .text(
          item.discount > 0 ? `${item.discount}%` : "-",
          tableLeft + 350,
          currentRowY + 7
        )
        .text(
          `${item.totalPrice.toFixed(2)} €`,
          tableLeft + 430,
          currentRowY + 7
        );
      currentRowY += rowHeight;
    });
    this.currentY = currentRowY + 10;
  }

  addTotals(invoiceData) {
    const totalsX = 320;
    const boxY = this.currentY;
    // Totals card
    this.doc
      .roundedRect(totalsX, boxY, 220, 70, 10)
      .fillAndStroke("#f3f4f6", "#e5e7eb");
    this.doc
      .fontSize(11)
      .fillColor("#222")
      .font("Helvetica")
      .text("Sous-total HT:", totalsX + 12, boxY + 14)
      .text(`${invoiceData.amount.toFixed(2)} €`, totalsX + 120, boxY + 14, {
        align: "right",
        width: 80,
      })
      .text("TVA (20%):", totalsX + 12, boxY + 30)
      .text(`${invoiceData.taxAmount.toFixed(2)} €`, totalsX + 120, boxY + 30, {
        align: "right",
        width: 80,
      });
    // Separator
    this.doc
      .moveTo(totalsX + 12, boxY + 48)
      .lineTo(totalsX + 208, boxY + 48)
      .stroke("#e5e7eb");
    // Total
    this.doc
      .fontSize(14)
      .fillColor("#6366f1")
      .font("Helvetica-Bold")
      .text("Total TTC:", totalsX + 12, boxY + 54)
      .text(
        `${invoiceData.totalAmount.toFixed(2)} €`,
        totalsX + 120,
        boxY + 54,
        { align: "right", width: 80 }
      );
    this.currentY += 90;
  }

  addNotes(invoiceData) {
    if (invoiceData.notes) {
      this.doc
        .roundedRect(40, this.currentY, 500, 40, 8)
        .fillAndStroke("#f3f4f6", "#e5e7eb");
      this.doc
        .fontSize(10)
        .fillColor("#6366f1")
        .font("Helvetica-Bold")
        .text("Notes", 52, this.currentY + 10);
      this.doc
        .fontSize(10)
        .fillColor("#222")
        .font("Helvetica")
        .text(invoiceData.notes, 110, this.currentY + 10, { width: 420 });
      this.currentY += 55;
    }
  }

  addFooter() {
    const footerY = 760;
    this.doc
      .fontSize(9)
      .fillColor("#888")
      .font("Helvetica")
      .text(
        "Conditions de paiement : Paiement à 30 jours par virement bancaire. En cas de retard de paiement, des pénalités de 3% par mois seront appliquées.",
        40,
        footerY,
        { width: 500 }
      );
    this.doc
      .fontSize(9)
      .fillColor("#888")
      .font("Helvetica")
      .text(
        "Coordonnées bancaires : IBAN: FR76 1234 5678 9012 3456 7890 123 | BIC: ABCDEFGH | Banque: Crédit Exemple",
        40,
        footerY + 16,
        { width: 500 }
      );
    this.doc
      .moveTo(40, footerY + 36)
      .lineTo(540, footerY + 36)
      .stroke("#e5e7eb");
    this.doc
      .fontSize(8)
      .fillColor("#888")
      .text(
        "GestVente SARL - Capital social: 10 000€ - RCS Paris 123 456 789",
        40,
        footerY + 40,
        { align: "center", width: 500 }
      );
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR");
  }

  getStatusColor(status) {
    switch (status) {
      case "Payée":
        return "#22c55e"; // Green
      case "En attente":
        return "#f59e0b"; // Orange
      case "En retard":
        return "#ef4444"; // Red
      case "Annulée":
        return "#6b7280"; // Gray
      default:
        return "#6366f1"; // Primary
    }
  }
}

module.exports = InvoicePDFGenerator;
