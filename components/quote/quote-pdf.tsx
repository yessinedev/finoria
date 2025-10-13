import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";
import type { Quote, LineItem } from "@/types/types";

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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "TND",
  }).format(amount);
}

export function QuotePDFDocument({ quote }: { quote: Quote }) {
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
            <Text style={styles.cardContent}>GestVente SARL</Text>
            <Text style={styles.cardContent}>123 Rue de l'Entreprise, 75001 Paris</Text>
            <Text style={styles.cardContent}>Tél: 01 23 45 67 89</Text>
            <Text style={styles.cardContent}>contact@gestvente.fr</Text>
            <Text style={styles.cardContent}>SIRET: 123 456 789 00012</Text>
            <Text style={styles.cardContent}>TVA: FR12345678901</Text>
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

        {/* Quote Details */}
        <View style={styles.section}>
          <Text style={[styles.cardTitle, { color: '#222', marginBottom: 2 }]}>Détails du devis</Text>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.totalsLabel}>Date d'émission</Text>
              <Text style={styles.cardContent}>{formatDate(quote.issueDate)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.totalsLabel}>Date de validité</Text>
              <Text style={styles.cardContent}>{formatDate(quote.dueDate)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.totalsLabel}>Conditions de paiement</Text>
              <Text style={styles.cardContent}>{quote.paymentTerms || '30 jours net'}</Text>
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
          {quote.items.map((item: LineItem, idx: number) => (
            <View style={styles.tableRow} key={item.id}>
              <Text style={[styles.tableCell, { flex: 2 }]}>{item.name}</Text>
              <Text style={styles.tableCell}>{item.quantity}</Text>
              <Text style={styles.tableCell}>{formatCurrency(item.unitPrice)}</Text>
              <Text style={styles.tableCell}>{item.discount > 0 ? `${item.discount}%` : '-'}</Text>
              <Text style={styles.tableCell}>{formatCurrency(item.total)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsBox}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Sous-total HT:</Text>
            <Text style={styles.totalsValue}>{formatCurrency(quote.amount)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>TVA ({quote.taxAmount && quote.amount ? ((quote.taxAmount / quote.amount) * 100).toFixed(0) : '20'}%):</Text>
            <Text style={styles.totalsValue}>{formatCurrency(quote.taxAmount)}</Text>
          </View>
          <View style={[styles.totalsRow, { borderTopWidth: 1, borderTopColor: '#e5e7eb', marginTop: 4, paddingTop: 4 }]}>
            <Text style={[styles.totalsLabel, { fontSize: 14 }]}>Total TTC:</Text>
            <Text style={[styles.totalsValue, { color: '#6366f1', fontSize: 14 }]}>{formatCurrency(quote.totalAmount)}</Text>
          </View>
        </View>

        {/* Notes */}
        {quote.notes && (
          <Text style={styles.notes}>{quote.notes}</Text>
        )}

        {/* Footer */}
        <Text style={styles.footer} fixed>
          Ce devis a été généré par GestVente. Merci pour votre confiance.
        </Text>
      </Page>
    </Document>
  );
}
