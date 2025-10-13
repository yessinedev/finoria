import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';

// Register font
Font.register({
  family: 'Roboto',
  src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf',
  fontWeight: 'normal',
});

Font.register({
  family: 'Roboto',
  src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf',
  fontWeight: 'bold',
});

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontFamily: 'Roboto',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  heading: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  label: {
    fontSize: 12,
    fontWeight: 'normal',
  },
  value: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  table: {
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000',
    marginBottom: 20,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableColHeader: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000',
    backgroundColor: '#f0f0f0',
    padding: 5,
  },
  tableCol: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000',
    padding: 5,
  },
  tableCellHeader: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  tableCell: {
    fontSize: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 10,
    color: '#888',
  },
});

interface SupplierInvoicePDFProps {
  invoice: any; // Replace with proper type
}

const SupplierInvoicePDF: React.FC<SupplierInvoicePDFProps> = ({ invoice }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>FACTURE FOURNISSEUR</Text>
            <Text style={styles.label}>Numéro: {invoice.invoiceNumber}</Text>
            <Text style={styles.label}>Date: {new Date(invoice.issueDate).toLocaleDateString('fr-FR')}</Text>
          </View>
          <View>
            <Text style={styles.heading}>Fournisseur</Text>
            <Text style={styles.label}>{invoice.supplierName}</Text>
            {invoice.supplierCompany && <Text style={styles.label}>{invoice.supplierCompany}</Text>}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Date d'émission:</Text>
            <Text style={styles.value}>{new Date(invoice.issueDate).toLocaleDateString('fr-FR')}</Text>
          </View>
          {invoice.dueDate && (
            <View style={styles.row}>
              <Text style={styles.label}>Date d'échéance:</Text>
              <Text style={styles.value}>{new Date(invoice.dueDate).toLocaleDateString('fr-FR')}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Statut:</Text>
            <Text style={styles.value}>{invoice.status}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Détails de la facture</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <View style={styles.tableColHeader}>
                <Text style={styles.tableCellHeader}>Description</Text>
              </View>
              <View style={styles.tableColHeader}>
                <Text style={styles.tableCellHeader}>Quantité</Text>
              </View>
              <View style={styles.tableColHeader}>
                <Text style={styles.tableCellHeader}>Prix unitaire</Text>
              </View>
              <View style={styles.tableColHeader}>
                <Text style={styles.tableCellHeader}>Total</Text>
              </View>
            </View>
            {/* In a real app, you would map through invoice items here */}
            <View style={styles.tableRow}>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>Service de consultation</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>1</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{invoice.amount.toFixed(3)} TND</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{invoice.amount.toFixed(3)} TND</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Sous-total:</Text>
            <Text style={styles.value}>{invoice.amount.toFixed(3)} TND</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>TVA ({((invoice.taxAmount / invoice.amount) * 100).toFixed(1)}%):</Text>
            <Text style={styles.value}>{invoice.taxAmount.toFixed(3)} TND</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { fontWeight: 'bold' }]}>Total:</Text>
            <Text style={[styles.value, { fontWeight: 'bold' }]}>{invoice.totalAmount.toFixed(3)} TND</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Merci pour votre confiance. Cette facture a été générée automatiquement par VentePro.
        </Text>
      </Page>
    </Document>
  );
};

export default SupplierInvoicePDF;