import React from "react"
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Image,
} from "@react-pdf/renderer"
import type { SupplierOrder, SupplierOrderItem, ReceptionNote } from "@/types/types";
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
  label: {
    color: '#64748b',
    fontSize: 11,
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

export function ReceptionNotePDFDocument({ 
  receptionNote, 
  supplierOrder,
  companySettings 
}: { 
  receptionNote: ReceptionNote & { supplierName?: string; supplierOrderNumber?: string; supplierCompany?: string; supplierAddress?: string; supplierPhone?: string; supplierEmail?: string }; 
  supplierOrder?: SupplierOrder;
  companySettings?: any 
}) {
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
                <Text style={styles.title}>Bon de Réception</Text>
                <Text style={styles.subtitle}>Document de réception</Text>
              </View>
            )}
          </View>
          <View>
            <Text style={{ fontSize: 16, fontWeight: 700, color: '#6366f1' }}>{receptionNote.receptionNumber}</Text>
            <Text style={styles.subtitle}>Date: {formatDate(receptionNote.receptionDate)}</Text>
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
            {companySettings?.taxId && <Text style={styles.cardContent}>Numéro Fiscal: {companySettings.taxId}</Text>}
            {companySettings?.tvaNumber && <Text style={styles.cardContent}>Numéro TVA: {companySettings.tvaNumber}</Text>}
          </View>
          <View style={[styles.card, { flex: 1 }]}> {/* Supplier */}
            <Text style={styles.cardTitle}>Fournisseur</Text>
            <Text style={styles.cardContent}>{receptionNote.supplierName || supplierOrder?.supplierName || 'N/A'}</Text>
            {(receptionNote.supplierCompany || supplierOrder?.supplierCompany) && <Text style={styles.cardContent}>{receptionNote.supplierCompany || supplierOrder?.supplierCompany}</Text>}
            {(receptionNote.supplierAddress || supplierOrder?.supplierAddress) && <Text style={styles.cardContent}>{receptionNote.supplierAddress || supplierOrder?.supplierAddress}</Text>}
            {(receptionNote.supplierPhone || supplierOrder?.supplierPhone) && <Text style={styles.cardContent}>{receptionNote.supplierPhone || supplierOrder?.supplierPhone}</Text>}
            {(receptionNote.supplierEmail || supplierOrder?.supplierEmail) && <Text style={styles.cardContent}>{receptionNote.supplierEmail || supplierOrder?.supplierEmail}</Text>}
          </View>
        </View>

        {/* Reception Details */}
        <View style={styles.section}>
          <Text style={[styles.cardTitle, { color: '#222', marginBottom: 2 }]}>Détails de la réception</Text>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Date de réception</Text>
              <Text style={styles.cardContent}>{formatDate(receptionNote.receptionDate)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Chauffeur</Text>
              <Text style={styles.cardContent}>{receptionNote.driverName || '-'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Immatriculation</Text>
              <Text style={styles.cardContent}>{receptionNote.vehicleRegistration || '-'}</Text>
            </View>
          </View>
        </View>

        {/* Related Supplier Order Info */}
        <View style={styles.section}>
          <Text style={[styles.cardTitle, { color: '#222', marginBottom: 2 }]}>Commande associée</Text>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Numéro de commande</Text>
              <Text style={styles.cardContent}>{receptionNote.supplierOrderNumber || supplierOrder?.orderNumber || 'N/A'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Date de commande</Text>
              <Text style={styles.cardContent}>{formatDate(supplierOrder?.orderDate || receptionNote.receptionDate)}</Text>
            </View>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, { flex: 2 }]}>Description</Text>
            <Text style={styles.tableCell}>Qté commandée</Text>
            <Text style={styles.tableCell}>Qté reçue</Text>
            <Text style={styles.tableCell}>Écart</Text>
          </View>
          {Array.isArray(receptionNote.items) && receptionNote.items.map((item, idx) => (
            <View style={styles.tableRow} key={item.id || idx}>
              <Text style={[styles.tableCell, { flex: 2 }]}>{item.productName}</Text>
              <Text style={styles.tableCell}>{formatQuantity(item.orderedQuantity)}</Text>
              <Text style={styles.tableCell}>{formatQuantity(item.receivedQuantity)}</Text>
              <Text style={styles.tableCell}>
                {item.orderedQuantity !== item.receivedQuantity ? 
                  formatQuantity(item.receivedQuantity - item.orderedQuantity) : 
                  '-'}
              </Text>
            </View>
          ))}
        </View>

        {/* Notes */}
        {receptionNote.notes && (
          <View style={styles.section}>
            <Text style={[styles.cardTitle, { color: '#222', marginBottom: 2 }]}>Notes</Text>
            <Text style={styles.cardContent}>{receptionNote.notes}</Text>
          </View>
        )}

        <Text style={styles.notes}>
          Signature du réceptionniste: _____________________     Signature du fournisseur: _____________________
        </Text>
        <Text style={styles.notes}>
          Date et heure de réception: ____/____/______ à ____:____
        </Text>

        {/* Footer - Removed hardcoded text */}
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