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

export function SupplierInvoicePDFDocument({ invoice, companySettings }: { invoice: SupplierInvoice; companySettings?: any }) {
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
              <View style={styles.logoBox}>
                <Text style={styles.title}>Finoria</Text>
                <Text style={styles.subtitle}>Gestion & Facturation</Text>
              </View>
            )}
          </View>
          <View>
            <Text style={{ fontSize: 16, fontWeight: 700, color: '#6366f1' }}>{invoice.invoiceNumber}</Text>
            <Text style={styles.subtitle}>Date: {formatDate(invoice.issueDate)}</Text>
            <Text style={styles.subtitle}>Échéance: {formatDate(invoice.dueDate || '')}</Text>
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
            <View style={{ flex: 1 }}>
              <Text style={styles.totalsLabel}>Date d'échéance</Text>
              <Text style={styles.cardContent}>{formatDate(invoice.dueDate || '')}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.totalsLabel}>Conditions de paiement</Text>
              <Text style={styles.cardContent}>30 jours net</Text>
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
          {invoice.items && invoice.items.map((item: any, idx: number) => (
            <View style={styles.tableRow} key={item.id}>
              <Text style={[styles.tableCell, { flex: 2 }]}>{item.productName}</Text>
              <Text style={styles.tableCell}>{formatQuantity(item.quantity)}</Text>
              <Text style={styles.tableCell}>{formatCurrency(item.unitPrice)}</Text>
              <Text style={styles.tableCell}>{item.discount > 0 ? `${item.discount}%` : '-'}</Text>
              <Text style={styles.tableCell}>{formatCurrency(item.totalPrice)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsBox}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Sous-total HT:</Text>
            <Text style={styles.totalsValue}>{formatCurrency(invoice.amount)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>TVA (19%):</Text>
            <Text style={styles.totalsValue}>{formatCurrency(invoice.taxAmount)}</Text>
          </View>
          <View style={[styles.totalsRow, { borderTopWidth: 1, borderTopColor: '#e5e7eb', marginTop: 4, paddingTop: 4 }]}>
            <Text style={[styles.totalsLabel, { fontSize: 14 }]}>Total TTC:</Text>
            <Text style={[styles.totalsValue, { color: '#6366f1', fontSize: 14 }]}>{formatCurrency(invoice.totalAmount)}</Text>
          </View>
        </View>

        {/* Notes */}

        {/* Footer - Removed hardcoded text */}
      </Page>
    </Document>
  )
}

export default SupplierInvoicePDFDocument