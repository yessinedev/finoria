import React from "react"
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Image,
} from "@react-pdf/renderer"
import type { SupplierInvoice } from "@/types/types";
import { formatCurrency, formatQuantity } from "@/lib/utils";

function formatDate(dateString: string) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const styles = StyleSheet.create({
  page: {
    fontSize: 11,
    padding: 32,
    backgroundColor: '#fff',
    color: '#222',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#e0e7ff',
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    color: '#6366f1',
    fontWeight: 700,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  logoBox: {
    backgroundColor: '#eef2ff',
    borderRadius: 8,
    padding: 8,
    marginRight: 8,
    width: 80,
    height: 80,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  companyNameBox: {
    backgroundColor: '#eef2ff',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    minWidth: 120,
    justifyContent: 'center',
  },
  companyNameText: {
    fontSize: 16,
    color: '#6366f1',
    fontWeight: 700,
    textAlign: 'center',
  },
  section: {
    marginTop: 16,
    marginBottom: 8,
  },
  card: {
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#f8fafc',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#6366f1',
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardContent: {
    fontSize: 11,
    color: '#222',
  },
  table: {
    width: 'auto',
    marginTop: 8,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    alignItems: 'center',
  },
  tableHeader: {
    backgroundColor: '#eef2ff',
    fontWeight: 700,
  },
  tableCell: {
    padding: 6,
    fontSize: 11,
    flexGrow: 1,
  },
  tableCellRight: {
    textAlign: 'right',
    flexGrow: 1,
  },
  totalsBox: {
    marginTop: 12,
    marginLeft: 'auto',
    width: 220,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 10,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 12,
    marginBottom: 2,
  },
  totalsLabel: {
    color: '#64748b',
  },
  totalsValue: {
    fontWeight: 700,
  },
  footerLayout: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
    justifyContent: 'space-between',
  },
  tvaBreakdownBox: {
    flex: 1,
    maxWidth: 280,
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: 8,
    backgroundColor: '#f8fafc',
  },
  tvaBreakdownTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#6366f1',
    marginBottom: 6,
  },
  tvaBreakdownTable: {
    width: '100%',
  },
  tvaBreakdownRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 3,
  },
  tvaBreakdownHeader: {
    backgroundColor: '#eef2ff',
    fontWeight: 700,
    fontSize: 9,
  },
  tvaBreakdownCell: {
    flex: 1,
    fontSize: 10,
    paddingHorizontal: 4,
  },
  tvaBreakdownCellRight: {
    flex: 1,
    fontSize: 10,
    paddingHorizontal: 4,
    textAlign: 'right',
  },
  notes: {
    marginTop: 12,
    fontSize: 10,
    color: '#64748b',
  },
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 32,
    right: 32,
    fontSize: 9,
    color: '#888',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    textAlign: 'center',
  },
})

export function SupplierInvoicePDFDocument({ invoice, companySettings, products }: { invoice: SupplierInvoice; companySettings?: any; products?: any[] }) {
  // Calculate Total HT (sum of all item totals after discount)
  // For supplier invoices: Total HT = sum of item totals
  const totalHT = Array.isArray(invoice.items) 
    ? invoice.items.reduce((sum, item) => sum + item.totalPrice, 0)
    : invoice.amount;

  // Calculate TVA breakdown by rate: TVA = Total HT × taux_TVA (no FODEC for supplier invoices)
  const tvaBreakdown: Record<number, { baseAmount: number; tvaAmount: number }> = {};
  
  if (Array.isArray(invoice.items) && Array.isArray(products)) {
    invoice.items.forEach((item: any) => {
      const product = products.find(p => p.id === item.productId);
      const tvaRate = (product && 'tvaRate' in product) ? product.tvaRate : 0;
      
      if (!tvaBreakdown[tvaRate]) {
        tvaBreakdown[tvaRate] = { baseAmount: 0, tvaAmount: 0 };
      }
      
      tvaBreakdown[tvaRate].baseAmount += item.totalPrice;
      // TVA = Total HT × taux_TVA (no FODEC for supplier invoices)
      tvaBreakdown[tvaRate].tvaAmount += (item.totalPrice * tvaRate) / 100;
    });
  }

  // Calculate totals
  const totalBaseHT = Object.values(tvaBreakdown).reduce((sum, values) => sum + values.baseAmount, 0) || totalHT;
  const totalTVA = Object.values(tvaBreakdown).reduce((sum, values) => sum + values.tvaAmount, 0);
  const timbreFiscal = companySettings?.timbreFiscal || 1.000;

  // Calculate Total TTC: Total HT + TVA + Timbre Fiscal (no FODEC for supplier invoices)
  const finalAmount = totalHT + totalTVA + timbreFiscal;

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {companySettings?.logo ? (
              <View style={styles.logoBox}>
                <Image style={styles.logoImage} src={companySettings.logo} />
              </View>
            ) : (
              <View style={styles.companyNameBox}>
                <Text style={styles.companyNameText}>{companySettings?.name || 'Votre Entreprise'}</Text>
              </View>
            )}
          </View>
          <View>
            <Text style={{ fontSize: 16, fontWeight: 700, color: '#6366f1' }}>{invoice.invoiceNumber}</Text>
            <Text style={styles.subtitle}>Date: {formatDate(invoice.issueDate)}</Text>
          </View>
        </View>

        {/* Company & Supplier Info */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
          <View style={[styles.card, { flex: 1 }]}> {/* Company */}
            <Text style={styles.cardTitle}>Émetteur</Text>
            <Text style={styles.cardContent}>{companySettings?.name}</Text>
            <Text style={styles.cardContent}>{companySettings?.address}</Text>
            <Text style={styles.cardContent}>Tél: {companySettings?.phone}</Text>
            <Text style={styles.cardContent}>{companySettings?.email}</Text>
            {companySettings?.taxId && <Text style={styles.cardContent}>SIRET: {companySettings.taxId}</Text>}
            {companySettings?.tvaNumber && <Text style={styles.cardContent}>N° TVA: {companySettings.tvaNumber}</Text>}
          </View>
          <View style={[styles.card, { flex: 1 }]}> {/* Supplier */}
            <Text style={styles.cardTitle}>Fournisseur</Text>
            <Text style={styles.cardContent}>{invoice.supplierName}</Text>
            {invoice.supplierCompany && <Text style={styles.cardContent}>{invoice.supplierCompany}</Text>}
            {invoice.supplierAddress && <Text style={styles.cardContent}>{invoice.supplierAddress}</Text>}
            {invoice.supplierPhone && <Text style={styles.cardContent}>Tél: {invoice.supplierPhone}</Text>}
            {invoice.supplierEmail && <Text style={styles.cardContent}>{invoice.supplierEmail}</Text>}
            {invoice.supplierTaxId && <Text style={styles.cardContent}>N° fiscal: {invoice.supplierTaxId}</Text>}
          </View>
        </View>

        {/* Invoice Details */}
        <View style={styles.section}>
          <Text style={[styles.cardTitle, { color: '#222', marginBottom: 2 }]}>Détails de la facture</Text>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.totalsLabel}>Date d'émission</Text>
              <Text style={styles.cardContent}>{formatDate(invoice.issueDate)}</Text>
            </View>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, { flex: 2 }]}>Description</Text>
            <Text style={styles.tableCell}>Qté</Text>
            <Text style={styles.tableCell}>Prix unitaire</Text>
            <Text style={styles.tableCell}>Remise</Text>
            <Text style={styles.tableCell}>Total HT</Text>
          </View>
          {Array.isArray(invoice.items) && invoice.items.map((item: any, idx: number) => (
            <View style={styles.tableRow} key={item.id || idx}>
              <Text style={[styles.tableCell, { flex: 2 }]}>{item.productName}</Text>
              <Text style={styles.tableCell}>{formatQuantity(item.quantity)}</Text>
              <Text style={styles.tableCell}>{formatCurrency(item.unitPrice)}</Text>
              <Text style={styles.tableCell}>{item.discount > 0 ? `${item.discount}%` : '-'}</Text>
              <Text style={styles.tableCell}>{formatCurrency(item.totalPrice)}</Text>
            </View>
          ))}
        </View>

        {/* Footer Layout: VAT Breakdown Table + Totals */}
        <View style={styles.footerLayout}>
          {/* VAT Breakdown Table */}
          <View style={styles.tvaBreakdownBox}>
            <Text style={styles.tvaBreakdownTitle}>Détail TVA</Text>
            <View style={styles.tvaBreakdownTable}>
              {/* Table Header */}
              <View style={[styles.tvaBreakdownRow, styles.tvaBreakdownHeader]}>
                <Text style={styles.tvaBreakdownCell}>Taux TVA</Text>
                <Text style={styles.tvaBreakdownCellRight}>Base HT</Text>
                <Text style={styles.tvaBreakdownCellRight}>Montant TVA</Text>
              </View>
              {/* Table Rows */}
              {Object.keys(tvaBreakdown).length > 0 ? (
                Object.entries(tvaBreakdown)
                  .sort(([a], [b]) => Number(b) - Number(a)) // Sort by rate descending
                  .map(([rate, values]) => (
                    <View style={styles.tvaBreakdownRow} key={rate}>
                      <Text style={styles.tvaBreakdownCell}>{Number(rate).toFixed(0)}%</Text>
                      <Text style={styles.tvaBreakdownCellRight}>{formatCurrency(values.baseAmount)}</Text>
                      <Text style={styles.tvaBreakdownCellRight}>{formatCurrency(values.tvaAmount)}</Text>
                    </View>
                  ))
              ) : (
                <View style={styles.tvaBreakdownRow}>
                  <Text style={styles.tvaBreakdownCell}>0%</Text>
                  <Text style={styles.tvaBreakdownCellRight}>{formatCurrency(totalHT)}</Text>
                  <Text style={styles.tvaBreakdownCellRight}>{formatCurrency(0)}</Text>
                </View>
              )}
              {/* Total Row */}
              <View style={[styles.tvaBreakdownRow, { backgroundColor: '#eef2ff', fontWeight: 700 }]}>
                <Text style={[styles.tvaBreakdownCell, { fontWeight: 700 }]}>Total</Text>
                <Text style={[styles.tvaBreakdownCellRight, { fontWeight: 700 }]}>{formatCurrency(totalHT)}</Text>
                <Text style={[styles.tvaBreakdownCellRight, { fontWeight: 700 }]}>{formatCurrency(totalTVA)}</Text>
              </View>
            </View>
          </View>

          {/* Totals Box */}
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Sous-total HT:</Text>
              <Text style={styles.totalsValue}>{formatCurrency(totalHT)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>TVA:</Text>
              <Text style={styles.totalsValue}>{formatCurrency(totalTVA)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Timbre Fiscal:</Text>
              <Text style={styles.totalsValue}>{formatCurrency(timbreFiscal)}</Text>
            </View>
            <View style={[styles.totalsRow, { borderTopWidth: 1, borderTopColor: '#e5e7eb', marginTop: 4, paddingTop: 4 }]}>
              <Text style={[styles.totalsLabel, { fontSize: 14 }]}>Total TTC:</Text>
              <Text style={[styles.totalsValue, { color: '#6366f1', fontSize: 14 }]}>{formatCurrency(finalAmount)}</Text>
            </View>
          </View>
        </View>

        {/* Footer - Removed hardcoded text */}
      </Page>
    </Document>
  )
}