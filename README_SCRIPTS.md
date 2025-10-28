# Database Scripts

This project includes several utility scripts for managing database data during development.

## Available Scripts

### Generate Mock Data
Populates the database with realistic sample data for testing.

```bash
npm run generate-mock-data
```

This script creates:
- 20 product categories
- 4 TVA rates (0%, 7%, 13%, 19%)
- 100 clients
- 50 suppliers
- 200 products
- 100 sales
- 50 supplier orders

### Clear Data
Removes all data from all tables while preserving the schema.

```bash
npm run clear-data
```

### Check Data
Displays a summary of data in the database including record counts and sample records.

```bash
npm run check-data
```

## Usage Workflow

1. Clear existing data (if needed):
   ```bash
   npm run clear-data
   ```

2. Generate new mock data:
   ```bash
   npm run generate-mock-data
   ```

3. Check the generated data:
   ```bash
   npm run check-data
   ```

## Notes

- All scripts maintain referential integrity
- The mock data generation uses realistic Tunisian data formats
- Scripts will not affect the schema, only the data
- The clear-data script removes all records but keeps table structures