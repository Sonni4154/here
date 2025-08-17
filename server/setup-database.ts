#!/usr/bin/env tsx
/**
 * Database setup script to populate production database with initial data
 * Run with: npm run setup-db
 */

import { dataImportService } from './services/data-import-service';
import { syncScheduler } from './services/sync-scheduler';

async function setupDatabase() {
  console.log('🚀 Setting up production database...\n');

  try {
    // Import all CSV data
    console.log('📦 Importing products and customers from CSV files...');
    const importResult = await dataImportService.importAllData();

    // Display results
    console.log('\n📊 Import Results:');
    console.log(`   Products: ${importResult.products.imported} imported`);
    if (importResult.products.errors.length > 0) {
      console.log(`   Product errors: ${importResult.products.errors.length}`);
      importResult.products.errors.forEach(error => console.log(`     - ${error}`));
    }

    console.log(`   Customers: ${importResult.customers.imported} imported`);
    if (importResult.customers.errors.length > 0) {
      console.log(`   Customer errors: ${importResult.customers.errors.length}`);
      importResult.customers.errors.forEach(error => console.log(`     - ${error}`));
    }

    const totalImported = importResult.products.imported + importResult.customers.imported;
    console.log(`\n✅ Total items imported: ${totalImported}`);

    // Start the sync scheduler for ongoing updates
    console.log('\n⏰ Starting automated sync scheduler...');
    syncScheduler.start();
    
    const status = syncScheduler.getStatus();
    console.log(`   Status: ${status.isRunning ? 'Running' : 'Stopped'}`);
    console.log(`   Data sync: ${status.nextDataImportSync}`);
    console.log(`   QuickBooks sync: ${status.nextQuickBooksSync}`);

    console.log('\n🎉 Database setup completed successfully!');
    console.log('   - Products and customers have been imported');
    console.log('   - Automated sync is running every 15 minutes');
    console.log('   - QuickBooks sync is scheduled every hour');

  } catch (error) {
    console.error('\n❌ Database setup failed:', error);
    process.exit(1);
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('\n✨ Setup complete. You can now access the application.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

export { setupDatabase };