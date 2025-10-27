# Delivery Receipt (Bon de Livraison) Feature Implementation

## Overview
This document describes the implementation of the delivery receipt feature in the sales section of the application. The feature allows users to generate delivery receipts (bons de livraison) for sales orders, including driver and vehicle information.

## Features Implemented

### 1. Database Schema
- Added `delivery_receipts` table to store delivery receipt information
- Added `delivery_receipt_items` table to store items in each delivery receipt
- Fields include: driver name, vehicle registration, delivery date, etc.

### 2. Backend (IPC Handlers)
- Created `delivery-receipts.js` IPC handler with the following functions:
  - `create-delivery-receipt`: Create a new delivery receipt
  - `get-delivery-receipts`: Get all delivery receipts
  - `get-delivery-receipt`: Get a specific delivery receipt by ID
  - `get-delivery-receipt-by-sale`: Get delivery receipt by sale ID
  - `delete-delivery-receipt`: Delete a delivery receipt

### 3. Frontend Services
- Updated `database.ts` to include delivery receipt operations
- Updated `preload.js` to expose delivery receipt functions to the renderer process

### 4. UI Components
- Created `DeliveryReceiptForm.tsx` for creating delivery receipts with driver and vehicle information
- Updated `SaleDetailsModal.tsx` to include delivery receipt generation functionality
- Created `DeliveryReceiptPDFDocument.tsx` for generating PDF delivery receipts
- Enhanced `delivery.tsx` to display existing delivery receipts

### 5. Navigation
- Created standalone `/delivery-receipts` page route
- Added "Bon de livraison" navigation item to the sidebar under "Gestion de ventes"
- Integrated with existing application navigation patterns

### 6. Types
- Added `DeliveryReceipt` and `DeliveryReceiptItem` interfaces to `types.ts`

## How to Use

### Access Delivery Receipts
1. Navigate to the application sidebar
2. Expand "Gestion de ventes"
3. Click on "Bon de livraison"
4. View all delivery receipts in a table format

### Generate a Delivery Receipt from Sale Details
1. Navigate to the Sales section
2. Open the details of a sale
3. Click "Créer un bon" in the delivery receipt section
4. Fill in the driver name and vehicle registration
5. Click "Créer le bon de livraison"
6. The delivery receipt will be generated and can be downloaded as PDF

### View Existing Delivery Receipts
1. Navigate to "Gestion de ventes" → "Bon de livraison" in the sidebar
2. View all existing delivery receipts in a table
3. Download any receipt as PDF using the download button

## Technical Details

### Database Structure
```sql
-- Delivery receipts table
CREATE TABLE IF NOT EXISTS delivery_receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  saleId INTEGER NOT NULL,
  deliveryNumber TEXT NOT NULL UNIQUE,
  driverName TEXT,
  vehicleRegistration TEXT,
  deliveryDate DATETIME DEFAULT CURRENT_TIMESTAMP,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (saleId) REFERENCES sales(id) ON DELETE CASCADE
);

-- Delivery receipt items table
CREATE TABLE IF NOT EXISTS delivery_receipt_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deliveryReceiptId INTEGER NOT NULL,
  productId INTEGER NOT NULL,
  productName TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unitPrice REAL NOT NULL,
  FOREIGN KEY (deliveryReceiptId) REFERENCES delivery_receipts(id) ON DELETE CASCADE,
  FOREIGN KEY (productId) REFERENCES products(id)
);
```

### API Functions
- `db.deliveryReceipts.create(deliveryReceiptData)`
- `db.deliveryReceipts.getAll()`
- `db.deliveryReceipts.getOne(id)`
- `db.deliveryReceipts.getBySale(saleId)`
- `db.deliveryReceipts.delete(id)`

## Navigation Structure
The delivery receipts feature is accessible through:
- Sidebar: Gestion de ventes → Bon de livraison
- Direct URL: /delivery-receipts

## Future Improvements
1. Add editing functionality for existing delivery receipts
2. Implement a proper numbering system for delivery receipts
3. Add delivery status tracking (en route, delivered, etc.)
4. Add signature fields for digital signing
5. Implement delivery receipt templates customization