# Mock Data Generation Script

This script generates realistic mock data for testing the Finoria application.

## Overview

The script creates sample data for all the main entities in the application:
- Categories (20)
- TVA rates (4 common rates: 0%, 7%, 13%, 19%)
- Clients (100)
- Suppliers (50)
- Products (200)
- Sales (100)
- Supplier Orders (50)

## Usage

To generate mock data, run:

```bash
npm run generate-mock-data
```

## Data Generation Details

### Categories
Generates 20 unique product categories using Faker.js commerce department names.

### TVA Rates
Creates the standard TVA rates used in Tunisia:
- 0% (exempt)
- 7% (reduced rate)
- 13% (intermediate rate)
- 19% (standard rate)

### Clients
Generates 100 clients with:
- Realistic names
- Email addresses
- Phone numbers (+216 format for Tunisia)
- Addresses
- Company names
- Tax IDs

### Suppliers
Generates 50 suppliers with similar data to clients.

### Products
Creates 200 products with:
- Unique names and descriptions
- Randomly assigned categories
- Stock levels (0-1000)
- Active status
- Product references
- Randomly assigned TVA rates
- Purchase and selling prices

### Sales
Generates 100 sales records with:
- Random clients
- 1-10 items per sale
- Accurate pricing and tax calculations
- Realistic dates from the past 2 years

### Supplier Orders
Creates 50 supplier orders with:
- Random suppliers
- 1-15 items per order
- Realistic quantities and pricing
- Order and delivery dates
- Random statuses

## Customization

You can modify the script to generate different quantities of data by changing the count parameters in the `generateAllMockData()` function.

## Notes

- The script will skip duplicate entries for categories and TVA rates
- All generated data maintains referential integrity
- Existing data in the database will not be affected
- The script uses realistic Tunisian data formats where applicable