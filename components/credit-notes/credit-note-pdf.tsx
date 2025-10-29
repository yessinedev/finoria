import React from "react"
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Image,
} from "@react-pdf/renderer"
import type { CreditNote } from "@/types/types";
import { formatCurrency, formatQuantity } from "@/lib/utils";

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
    borderBottomColor: '#fee2e2',
    paddingBottom: 8,
  },
  logoBox: {
    backgroundColor: '#fef2f2',
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
  title: {
    fontSize: 24,
    color: '#dc2626',
    fontWeight: 700,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
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
    color: '#dc2626',
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
    backgroundColor: '#fef2f2',
    fontWeight: 700,
  },
  tableCell: {
    padding: 6,
    fontSize: 11,
    flexGrow: 1,
  },
  label: {
    color: '#64748b',
    fontSize: 11,
  },
  totalsBox: {
    marginTop: 12,
    marginLeft: 'auto',
    width: 220,
    backgroundColor: '#fef2f2',
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
    backgroundColor: '#fef2f2',
    padding: 8,
    borderRadius: 4,
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
  warningBox: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  warningText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 4,
  },
})

export function CreditNotePDFDocument({ 
  creditNote, 
  companySettings,
  products 
}: { 
  creditNote: CreditNote; 
  companySettings?: any;
  products?: any[]
}) {
  // Calculate totals
  const htAmount = Array.isArray(creditNote.items) 
    ? creditNote.items.reduce((sum, item) => {
        const itemTotal = item.quantity * item.unitPrice;
        const discountAmount = (itemTotal * (item.discount || 0)) / 100;
        return sum + (itemTotal - discountAmount);
      }, 0)
    : 0;

  // Calculate TVA
  let totalTvaAmount = 0;
  
  if (Array.isArray(creditNote.items) && Array.isArray(products)) {
    creditNote.items.forEach((item) => {
      const product = products.find(p => p.id === item.productId);
      const tvaRate = (product && 'tvaRate' in product) ? product.tvaRate : 0;
      const itemTotal = item.quantity * item.unitPrice;
      const discountAmount = (itemTotal * (item.discount || 0)) / 100;
      const itemHT = itemTotal - discountAmount;
      const itemTvaAmount = (itemHT * tvaRate) / 100;
      totalTvaAmount += itemTvaAmount;
    });
  }

  const ttcAmount = htAmount + totalTvaAmount;

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
            <Text style={{ fontSize: 20, fontWeight: 700, color: '#dc2626' }}>AVOIR</Text>
            <Text style={{ fontSize: 16, fontWeight: 700, color: '#dc2626' }}>{creditNote.number}</Text>
            <Text style={styles.subtitle}>Date: {formatDate(creditNote.issueDate)}</Text>
          </View>
        </View>

        {/* Warning Box */}
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>⚠ FACTURE D'AVOIR</Text>
          <Text style={{ fontSize: 10, color: '#991b1b' }}>
            Ce document représente un avoir sur la facture N° {creditNote.invoiceNumber || 'N/A'}
          </Text>
        </View>

        {/* Company & Client Info */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
          <View style={[styles.card, { flex: 1 }]}> {/* Company */}
            <Text style={styles.cardTitle}>Émetteur</Text>
            <Text style={styles.cardContent}>{companySettings?.name || ''}</Text>
            <Text style={styles.cardContent}>{companySettings?.address || ''}</Text>
            <Text style={styles.cardContent}>Tél: {companySettings?.phone || ''}</Text>
            <Text style={styles.cardContent}>{companySettings?.email || ''}</Text>
            {companySettings?.taxId && <Text style={styles.cardContent}>Numéro Fiscal: {companySettings.taxId}</Text>}
            {companySettings?.tvaNumber && <Text style={styles.cardContent}>Numéro TVA: {companySettings.tvaNumber}</Text>}
          </View>
          <View style={[styles.card, { flex: 1 }]}> {/* Client */}
            <Text style={styles.cardTitle}>Client</Text>
            <Text style={styles.cardContent}>{creditNote.clientName || ''}</Text>
            {creditNote.clientCompany && <Text style={styles.cardContent}>{creditNote.clientCompany}</Text>}
            {creditNote.clientAddress && <Text style={styles.cardContent}>{creditNote.clientAddress}</Text>}
            {creditNote.clientPhone && <Text style={styles.cardContent}>{creditNote.clientPhone}</Text>}
            {creditNote.clientEmail && <Text style={styles.cardContent}>{creditNote.clientEmail}</Text>}
            {creditNote.clientTaxId && <Text style={styles.cardContent}>Matricule fiscal: {creditNote.clientTaxId}</Text>}
          </View>
        </View>

        {/* Reason */}
        {creditNote.reason && (
          <View style={styles.section}>
            <Text style={[styles.cardTitle, { color: '#222', marginBottom: 2 }]}>Motif de l'avoir</Text>
            <View style={[styles.card, { backgroundColor: '#fef2f2' }]}>
              <Text style={styles.cardContent}>{creditNote.reason}</Text>
            </View>
          </View>
        )}

        {/* Items Table */}
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, { flex: 2 }]}>Description</Text>
            <Text style={styles.tableCell}>Qté</Text>
            <Text style={styles.tableCell}>Prix unitaire</Text>
            <Text style={styles.tableCell}>Remise %</Text>
            <Text style={styles.tableCell}>Total HT</Text>
          </View>
          {Array.isArray(creditNote.items) && creditNote.items.map((item, idx) => {
            const itemTotal = item.quantity * item.unitPrice;
            const discountAmount = (itemTotal * (item.discount || 0)) / 100;
            const itemHT = itemTotal - discountAmount;
            
            return (
              <View style={styles.tableRow} key={item.id || idx}>
                <Text style={[styles.tableCell, { flex: 2 }]}>{item.productName}</Text>
                <Text style={styles.tableCell}>{formatQuantity(item.quantity)}</Text>
                <Text style={styles.tableCell}>{formatCurrency(item.unitPrice)}</Text>
                <Text style={styles.tableCell}>{(item.discount || 0).toFixed(1)}%</Text>
                <Text style={styles.tableCell}>{formatCurrency(itemHT)}</Text>
              </View>
            );
          })}
        </View>

        {/* Totals Box */}
        <View style={styles.totalsBox}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Sous-total HT:</Text>
            <Text style={styles.totalsValue}>{formatCurrency(htAmount)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>TVA:</Text>
            <Text style={styles.totalsValue}>{formatCurrency(totalTvaAmount)}</Text>
          </View>
          <View style={[styles.totalsRow, { borderTopWidth: 1, borderTopColor: '#fecaca', marginTop: 4, paddingTop: 4 }]}>
            <Text style={[styles.totalsLabel, { fontSize: 14, color: '#dc2626' }]}>Montant de l'avoir TTC:</Text>
            <Text style={[styles.totalsValue, { color: '#dc2626', fontSize: 14 }]}>-{formatCurrency(ttcAmount)}</Text>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.notes}>
          <Text style={{ fontWeight: 700, marginBottom: 4 }}>Note importante:</Text>
          <Text>
            Ce document d'avoir annule partiellement ou totalement la facture de référence. 
            Le montant sera déduit de votre compte ou vous sera remboursé selon les modalités convenues.
          </Text>
        </View>
      </Page>
    </Document>
  )
}

function formatDate(dateString: string) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

