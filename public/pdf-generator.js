const PDFDocument = require("pdfkit")
const fs = require("fs")
const path = require("path")

class InvoicePDFGenerator {
  constructor() {
    this.doc = null
    this.currentY = 0
  }

  generateInvoice(invoiceData, outputPath) {
    return new Promise((resolve, reject) => {
      try {
        this.doc = new PDFDocument({ margin: 50 })
        const stream = fs.createWriteStream(outputPath)
        this.doc.pipe(stream)

        // Generate PDF content
        this.addHeader(invoiceData)
        this.addCompanyInfo()
        this.addClientInfo(invoiceData)
        this.addInvoiceDetails(invoiceData)
        this.addItemsTable(invoiceData.items)
        this.addTotals(invoiceData)
        this.addFooter()

        this.doc.end()

        stream.on("finish", () => {
          resolve(outputPath)
        })

        stream.on("error", (error) => {
          reject(error)
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  addHeader(invoiceData) {
    // Company logo area (placeholder)
    this.doc.rect(50, 50, 100, 60).stroke().fontSize(10).text("LOGO", 85, 75, { align: "center" })

    // Invoice title
    this.doc.fontSize(24).font("Helvetica-Bold").text("FACTURE", 400, 50, { align: "right" })

    // Invoice number and date
    this.doc
      .fontSize(12)
      .font("Helvetica")
      .text(`N° ${invoiceData.number}`, 400, 80, { align: "right" })
      .text(`Date: ${this.formatDate(invoiceData.issueDate)}`, 400, 95, { align: "right" })

    if (invoiceData.dueDate) {
      this.doc.text(`Échéance: ${this.formatDate(invoiceData.dueDate)}`, 400, 110, { align: "right" })
    }

    this.currentY = 140
  }

  addCompanyInfo() {
    this.doc.fontSize(14).font("Helvetica-Bold").text("GestVente SARL", 50, this.currentY)

    this.doc
      .fontSize(10)
      .font("Helvetica")
      .text("123 Rue de l'Entreprise", 50, this.currentY + 20)
      .text("75001 Paris, France", 50, this.currentY + 35)
      .text("Tél: 01 23 45 67 89", 50, this.currentY + 50)
      .text("Email: contact@gestvente.fr", 50, this.currentY + 65)
      .text("SIRET: 123 456 789 00012", 50, this.currentY + 80)

    this.currentY += 110
  }

  addClientInfo(invoiceData) {
    // Client info box
    this.doc.rect(300, this.currentY, 250, 100).stroke()

    this.doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Facturé à:", 310, this.currentY + 10)

    this.doc
      .fontSize(10)
      .font("Helvetica")
      .text(invoiceData.clientName, 310, this.currentY + 30)

    if (invoiceData.clientCompany) {
      this.doc.text(invoiceData.clientCompany, 310, this.currentY + 45)
    }

    // Add client address if available
    if (invoiceData.clientAddress) {
      const addressLines = invoiceData.clientAddress.split(",")
      let yOffset = 60
      addressLines.forEach((line) => {
        this.doc.text(line.trim(), 310, this.currentY + yOffset)
        yOffset += 12
      })
    }

    this.currentY += 130
  }

  addInvoiceDetails(invoiceData) {
    // Add some spacing
    this.currentY += 20

    // Status badge
    const statusColor = this.getStatusColor(invoiceData.status)
    this.doc
      .rect(50, this.currentY, 80, 20)
      .fillAndStroke(statusColor, "#000000")
      .fillColor("#FFFFFF")
      .fontSize(10)
      .font("Helvetica-Bold")
      .text(invoiceData.status, 55, this.currentY + 6)
      .fillColor("#000000")

    this.currentY += 40
  }

  addItemsTable(items) {
    const tableTop = this.currentY
    const tableLeft = 50
    const tableWidth = 500

    // Table header
    this.doc
      .rect(tableLeft, tableTop, tableWidth, 25)
      .fillAndStroke("#f0f0f0", "#000000")
      .fillColor("#000000")
      .fontSize(10)
      .font("Helvetica-Bold")

    // Header text
    this.doc
      .text("Description", tableLeft + 5, tableTop + 8)
      .text("Qté", tableLeft + 250, tableTop + 8)
      .text("Prix unit.", tableLeft + 300, tableTop + 8)
      .text("Total", tableLeft + 400, tableTop + 8)

    // Table rows
    let currentRowY = tableTop + 25
    this.doc.font("Helvetica").fontSize(9)

    items.forEach((item, index) => {
      const rowHeight = 20
      const isEvenRow = index % 2 === 0

      // Alternate row background
      if (isEvenRow) {
        this.doc.rect(tableLeft, currentRowY, tableWidth, rowHeight).fillAndStroke("#f9f9f9", "#e0e0e0")
      } else {
        this.doc.rect(tableLeft, currentRowY, tableWidth, rowHeight).stroke("#e0e0e0")
      }

      this.doc.fillColor("#000000")

      // Item details
      this.doc
        .text(item.productName || item.name, tableLeft + 5, currentRowY + 6, { width: 240 })
        .text(item.quantity.toString(), tableLeft + 250, currentRowY + 6)
        .text(`${item.unitPrice.toFixed(2)} €`, tableLeft + 300, currentRowY + 6)
        .text(`${item.totalPrice.toFixed(2)} €`, tableLeft + 400, currentRowY + 6)

      currentRowY += rowHeight
    })

    this.currentY = currentRowY + 20
  }

  addTotals(invoiceData) {
    const totalsX = 350
    const lineHeight = 15

    // Subtotal
    this.doc
      .fontSize(10)
      .font("Helvetica")
      .text("Sous-total HT:", totalsX, this.currentY)
      .text(`${invoiceData.amount.toFixed(2)} €`, totalsX + 100, this.currentY, { align: "right" })

    // Tax
    this.currentY += lineHeight
    this.doc
      .text("TVA (20%):", totalsX, this.currentY)
      .text(`${invoiceData.taxAmount.toFixed(2)} €`, totalsX + 100, this.currentY, { align: "right" })

    // Total line
    this.currentY += lineHeight
    this.doc
      .moveTo(totalsX, this.currentY)
      .lineTo(totalsX + 150, this.currentY)
      .stroke()

    // Total amount
    this.currentY += 10
    this.doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Total TTC:", totalsX, this.currentY)
      .text(`${invoiceData.totalAmount.toFixed(2)} €`, totalsX + 100, this.currentY, { align: "right" })

    this.currentY += 30
  }

  addFooter() {
    const footerY = 700

    // Payment terms
    this.doc
      .fontSize(9)
      .font("Helvetica")
      .text("Conditions de paiement:", 50, footerY)
      .text("Paiement à 30 jours par virement bancaire", 50, footerY + 12)
      .text("En cas de retard de paiement, des pénalités de 3% par mois seront appliquées.", 50, footerY + 24)

    // Bank details
    this.doc
      .text("Coordonnées bancaires:", 50, footerY + 50)
      .text("IBAN: FR76 1234 5678 9012 3456 7890 123", 50, footerY + 62)
      .text("BIC: ABCDEFGH", 50, footerY + 74)

    // Footer line
    this.doc
      .moveTo(50, footerY + 100)
      .lineTo(550, footerY + 100)
      .stroke()

    this.doc.fontSize(8).text("GestVente SARL - Capital social: 10 000€ - RCS Paris 123 456 789", 50, footerY + 110, {
      align: "center",
      width: 500,
    })
  }

  formatDate(dateString) {
    const date = new Date(dateString)
    return date.toLocaleDateString("fr-FR")
  }

  getStatusColor(status) {
    switch (status) {
      case "Payée":
        return "#22c55e" // Green
      case "En attente":
        return "#f59e0b" // Orange
      case "En retard":
        return "#ef4444" // Red
      default:
        return "#6b7280" // Gray
    }
  }
}

module.exports = InvoicePDFGenerator
