# Database Persistence Solution

## Problem
After installing a new application update, the existing database was being deleted, causing loss of user data.

## Root Cause
The database was being stored in the application's resources directory (`process.resourcesPath`) which gets overwritten during application updates. This is the default behavior in Electron applications when using `electron-builder`.

## Solution Implemented

### 1. Changed Database Storage Location
Moved the database from the application resources directory to the user data directory which persists across updates:

**Before:**
```javascript
const dbPath = app.isPackaged
  ? path.join(process.resourcesPath, "database.db")
  : path.join(__dirname, "..", "database.db");
```

**After:**
```javascript
const dbPath = app.isPackaged
  ? path.join(app.getPath("userData"), "database.db")
  : path.join(__dirname, "..", "database.db");
```

### 2. Added Database Migration
Implemented a migration function to move existing databases from the old location to the new location:

```javascript
async function migrateDatabaseIfNeeded() {
  if (!app.isPackaged) return; // Only needed in packaged app
  
  const oldDbPath = path.join(process.resourcesPath, "database.db");
  const newDbPath = path.join(app.getPath("userData"), "database.db");
  
  // Check if old database exists and new database doesn't
  const oldDbExists = fsSync.existsSync(oldDbPath);
  const newDbExists = fsSync.existsSync(newDbPath);
  
  if (oldDbExists && !newDbExists) {
    try {
      // Ensure userData directory exists
      await fs.mkdir(app.getPath("userData"), { recursive: true });
      
      // Move database from old location to new location
      await fs.rename(oldDbPath, newDbPath);
      console.log("Database migrated successfully from resources to userData directory");
    } catch (error) {
      console.error("Failed to migrate database:", error);
    }
  } else if (oldDbExists && newDbExists) {
    // Both exist - keep the new one and remove the old one
    try {
      await fs.unlink(oldDbPath);
      console.log("Removed old database from resources directory");
    } catch (error) {
      console.error("Failed to remove old database:", error);
    }
  }
}
```

### 3. Updated Database Export/Import Functions
Modified the database export and import functions to work with the new database location:

```javascript
// In exportDatabase and importDatabase functions
const sourcePath = app.isPackaged
  ? path.join(app.getPath("userData"), "database.db")
  : path.join(__dirname, "..", "..", "database.db");
```

### 4. Configured NSIS Installer
Updated the NSIS installer configuration to preserve user data during updates:

```javascript
nsis: {
  oneClick: false,
  allowToChangeInstallationDirectory: true,
  differentialPackage: true,
  deleteAppDataOnUninstall: false  // Don't delete user data
}
```

## Benefits of This Solution

1. **Data Persistence**: User data is now stored in a location that persists across application updates
2. **Backward Compatibility**: Existing user data is automatically migrated to the new location
3. **No Data Loss**: Even if both old and new databases exist, the solution ensures data integrity
4. **Installer Configuration**: The NSIS installer is configured to not delete user data during updates

## Testing the Solution

1. Install the application
2. Create some data (categories, products, clients, etc.)
3. Update the application to a newer version
4. Verify that all data is still present after the update

## Directory Locations

- **User Data Directory**: `%APPDATA%\Finoria` (Windows)
- **Database File**: `%APPDATA%\Finoria\database.db`
- **Backup Files**: `%USERPROFILE%\Documents\Finoria\Backups\`

This solution ensures that user data is preserved across application updates while maintaining backward compatibility with existing installations.