# Reception Note (Bon de Réception) Feature Implementation

## Overview
This document describes the implementation of the reception note feature in the purchases section of the application. The feature allows users to create and manage reception notes for purchase orders, including details such as received items, quantities, delivery information, and any discrepancies between ordered and received goods.

## Features Implemented

### 1. Database Schema
- Added `reception_notes` table to store reception note information
- Added `reception_note_items` table to store items in each reception note
- Fields include: driver name, vehicle registration, reception date, notes, etc.

### 2. Backend (IPC Handlers)
- Created `reception-notes.js` IPC handler with the following functions:
  - `create-reception-note`: Create a new reception note
  - `get-reception-notes`: Get all reception notes
  - `get-reception-note`: Get a specific reception note by ID
  - `get-reception-note-by-order`: Get reception note by supplier order ID
  - `delete-reception-note`: Delete a reception note

### 3. Frontend Services
- Updated `database.ts` to include reception note operations
- Updated `preload.js` to expose reception note functions to the renderer process

### 4. UI Components
- Created `ReceptionNoteForm.tsx` for creating reception notes with driver and vehicle information
- Created `ReceptionNotePDFDocument.tsx` for generating PDF reception notes
- Created `reception-notes.tsx` for managing reception notes in a dedicated page
- Updated `supplier-orders.tsx` to include reception note creation functionality

### 5. Navigation
- Added "Bon de réception" navigation item to the sidebar under "Gestion d'achats"
- Created dedicated page route at `/suppliers/reception-notes`

### 6. Types
- Added `ReceptionNote` and `ReceptionNoteItem` interfaces to `types.ts`

## How to Use

### Access Reception Notes
1. Navigate to the application sidebar
2. Expand "Gestion d'achats"
3. Click on "Bon de réception"
4. View all reception notes in a table format

### Create a Reception Note from Supplier Orders
1. Navigate to "Gestion d'achats" → "Commande fournisseur"
2. Find the supplier order you want to create a reception note for
3. Click the package icon in the actions column
4. Fill in the driver name, vehicle registration, and adjust received quantities if needed
5. Add any notes if necessary
6. Click "Créer le bon de réception"

### Create a Reception Note from Reception Notes Page
1. Navigate to "Gestion d'achats" → "Bon de réception"
2. Click the "+ Nouveau bon de réception" button
3. Select a supplier order from the dropdown
4. Fill in the driver name, vehicle registration, and adjust received quantities if needed
5. Add any notes if necessary
6. Click "Créer le bon de réception"

### View Existing Reception Notes
1. Navigate to "Gestion d'achats" → "Bon de réception"
2. View all existing reception notes in a table
3. Download any receipt as PDF using the download button

## Technical Details

### Database Structure
```sql
-- Reception notes table
CREATE TABLE IF NOT EXISTS reception_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplierOrderId INTEGER NOT NULL,
  receptionNumber TEXT NOT NULL UNIQUE,
  driverName TEXT,
  vehicleRegistration TEXT,
  receptionDate DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplierOrderId) REFERENCES supplier_orders(id) ON DELETE CASCADE
);

-- Reception note items table
CREATE TABLE IF NOT EXISTS reception_note_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  receptionNoteId INTEGER NOT NULL,
  productId INTEGER NOT NULL,
  productName TEXT NOT NULL,
  orderedQuantity INTEGER NOT NULL,
  receivedQuantity INTEGER NOT NULL,
  unitPrice REAL NOT NULL,
  FOREIGN KEY (receptionNoteId) REFERENCES reception_notes(id) ON DELETE CASCADE,
  FOREIGN KEY (productId) REFERENCES products(id)
);
```

### API Functions
- `db.receptionNotes.create(receptionNoteData)`
- `db.receptionNotes.getAll()`
- `db.receptionNotes.getOne(id)`
- `db.receptionNotes.getByOrder(supplierOrderId)`
- `db.receptionNotes.delete(id)`

## Navigation Structure
The reception notes feature is accessible through:
- Sidebar: Gestion d'achats → Bon de réception
- Direct URL: /suppliers/reception-notes

## Form Fields
- **Supplier Order Selection**: Dropdown to select an existing supplier order (only in standalone mode)
- **Driver Name**: Text input for the driver's name
- **Vehicle Registration**: Text input for the vehicle's registration number
- **Item Quantities**: Inputs for received quantities (defaults to ordered quantities)
- **Notes**: Text area for additional information

## Validation
- Supplier order must be selected or pre-provided before submission
- Form provides user feedback for errors
- Loading states indicate when operations are in progress
- Discrepancy warnings when received quantities differ from ordered quantities

## Stock Management
- Product stock is automatically updated when reception notes are created
- Stock movements are recorded for audit trail
- Stock is adjusted when reception notes are deleted

## Future Improvements
1. Add editing functionality for existing reception notes
2. Implement a proper numbering system for reception notes
3. Add reception status tracking (received, partially received, etc.)
4. Add signature fields for digital signing
5. Implement reception note templates customization