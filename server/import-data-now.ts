/**
 * Simple data import script for immediate execution
 */

import { dataImportService } from './services/data-import-service';

async function importDataNow() {
  console.log('🚀 Starting data import...');

  try {
    const result = await dataImportService.importAllData();
    
    console.log('\n📊 Import completed:');
    console.log(`Products: ${result.products.imported} imported, ${result.products.errors.length} errors`);
    console.log(`Customers: ${result.customers.imported} imported, ${result.customers.errors.length} errors`);
    
    if (result.products.errors.length > 0) {
      console.log('\nProduct errors:');
      result.products.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    if (result.customers.errors.length > 0) {
      console.log('\nCustomer errors:');
      result.customers.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    return result;
  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  }
}

importDataNow()
  .then(() => {
    console.log('\n✅ Data import completed successfully!');
    process.exit(0);
  })
  .catch(() => {
    process.exit(1);
  });