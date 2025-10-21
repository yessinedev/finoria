import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";
import type { Quote, LineItem } from "@/types/types";
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
});

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("fr-FR");
}

// Removed local formatCurrency function since we're importing it from utils

export function QuotePDFDocument({ quote, companySettings }: { quote: Quote; companySettings?: any }) {
  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>DEVIS</Text>
            <Text style={styles.subtitle}>Gestion & Facturation</Text>
          </View>
          <View>
            <Text style={{ fontSize: 16, fontWeight: 700, color: '#6366f1' }}>{quote.number}</Text>
            <Text style={styles.subtitle}>Date: {formatDate(quote.issueDate)}</Text>
            <Text style={styles.subtitle}>Validité: {formatDate(quote.dueDate)}</Text>
          </View>
        </View>

        {/* Company & Client Info */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
          <View style={[styles.card, { flex: 1 }]}> {/* Company */}
            <Text style={styles.cardTitle}>Émetteur</Text>
            <Text style={styles.cardContent}>{companySettings?.name || 'GestVente SARL'}</Text>
            <Text style={styles.cardContent}>{companySettings?.address || '123 Rue de l\'Entreprise, 75001 Paris'}</Text>
            <Text style={styles.cardContent}>Tél: {companySettings?.phone || '01 23 45 67 89'}</Text>
            <Text style={styles.cardContent}>{companySettings?.email || 'contact@gestvente.fr'}</Text>
            {companySettings?.taxId && <Text style={styles.cardContent}>SIRET: {companySettings.taxId}</Text>}
            {companySettings?.tvaNumber && <Text style={styles.cardContent}>TVA: FR{companySettings.tvaNumber}</Text>}
          </View>
          <View style={[styles.card, { flex: 1 }]}> {/* Client */}
            <Text style={styles.cardTitle}>Destinataire</Text>
            <Text style={styles.cardContent}>{quote.clientName}</Text>
            {quote.clientCompany && <Text style={styles.cardContent}>{quote.clientCompany}</Text>}
            {quote.clientAddress && <Text style={styles.cardContent}>{quote.clientAddress}</Text>}
            {quote.clientPhone && <Text style={styles.cardContent}>{quote.clientPhone}</Text>}
            {quote.clientEmail && <Text style={styles.cardContent}>{quote.clientEmail}</Text>}
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
          {Array.isArray(quote.items) && quote.items.map((item: LineItem, idx: number) => (
            <View style={styles.tableRow} key={item.id || idx}>
              <Text style={[styles.tableCell, { flex: 2 }]}>{item.name || (item as any).productName || 'N/A'}</Text>
              <Text style={styles.tableCell}>{formatQuantity(item.quantity)}</Text>
              <Text style={styles.tableCell}>{formatCurrency(item.unitPrice)}</Text>
              <Text style={styles.tableCell}>{item.discount >= 0 ? `${item.discount}%` : '-'}</Text>
              <Text style={styles.tableCell}>{formatCurrency(item.unitPrice * item.quantity * (1 - item.discount / 100))}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsBox}>
          {/* Calculate subtotal from items */}
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Sous-total HT</Text>
            <Text style={styles.totalsValue}>
              {formatCurrency(
                Array.isArray(quote.items) 
                  ? quote.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity * (1 - item.discount / 100)), 0)
                  : 0
              )}
            </Text>
          </View>
          <View style={styles.totalsRow}>
            {/* Calculate tax percentage from taxAmount and subtotal */}
            <Text style={styles.totalsLabel}>
              TVA {
                Array.isArray(quote.items) && quote.items.length > 0
                  ? Math.round(
                      (quote.taxAmount / 
                       quote.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity * (1 - item.discount / 100)), 0)) * 100
                    ) || 20
                  : 20
              }%
            </Text>
            <Text style={styles.totalsValue}>{formatCurrency(quote.taxAmount || 0)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Total TTC</Text>
            <Text style={styles.totalsValue}>{formatCurrency(quote.totalAmount || 0)}</Text>
          </View>
        </View>

        {/* Notes */}
        {quote.notes && quote.notes.trim() !== '' && (
          <Text style={styles.notes}>{quote.notes}</Text>
        )}

        {/* Footer */}
        {/* Removed: Gestion & Facturation - GestVente SARL - 123 Rue de l'Entreprise, 75001 Paris - Tél: 01 23 45 67 89 - contact@gestvente.fr */}
      </Page>
    </Document>
  );
}
