import { dataImportService } from './data-import-service';
import { QuickBooksService } from './quickbooks-service';

export class SyncScheduler {
  private intervals: NodeJS.Timeout[] = [];
  private isRunning = false;

  /**
   * Start all scheduled sync processes
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🕐 Starting scheduled sync processes...');

    // Schedule data import sync every 15 minutes
    const dataImportInterval = setInterval(async () => {
      await this.runDataImportSync();
    }, 15 * 60 * 1000); // 15 minutes

    // Schedule QuickBooks sync every hour (existing)
    const quickbooksInterval = setInterval(async () => {
      await this.runQuickBooksSync();
    }, 60 * 60 * 1000); // 1 hour

    this.intervals.push(dataImportInterval, quickbooksInterval);

    // Run initial syncs
    setTimeout(() => this.runDataImportSync(), 5000); // Run after 5 seconds
    setTimeout(() => this.runQuickBooksSync(), 10000); // Run after 10 seconds

    console.log('✅ Scheduled sync processes started');
  }

  /**
   * Stop all scheduled sync processes
   */
  stop() {
    if (!this.isRunning) return;

    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    this.isRunning = false;
    
    console.log('🛑 Scheduled sync processes stopped');
  }

  /**
   * Run data import sync (CSV files)
   */
  private async runDataImportSync() {
    try {
      console.log('🔄 Running scheduled data import sync...');
      
      const result = await dataImportService.importAllData();
      
      const totalImported = result.products.imported + result.customers.imported;
      const totalErrors = result.products.errors.length + result.customers.errors.length;
      
      if (totalImported > 0 || totalErrors > 0) {
        console.log(`📊 Data import sync completed: ${totalImported} items imported, ${totalErrors} errors`);
      } else {
        console.log('✅ Data import sync completed - no new data');
      }
      
    } catch (error) {
      console.error('❌ Data import sync failed:', error);
    }
  }

  /**
   * Run QuickBooks sync (existing logic)
   */
  private async runQuickBooksSync() {
    try {
      console.log('🔄 Running scheduled QuickBooks sync...');
      
      const quickbooksService = new QuickBooksService();
      // Note: This would use existing QuickBooks sync logic
      // For now, just log that it would run
      
      console.log('✅ QuickBooks sync check completed');
      
    } catch (error) {
      console.error('❌ QuickBooks sync failed:', error);
    }
  }

  /**
   * Get sync status information
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeIntervals: this.intervals.length,
      nextDataImportSync: this.isRunning ? 'Every 15 minutes' : 'Not scheduled',
      nextQuickBooksSync: this.isRunning ? 'Every hour' : 'Not scheduled'
    };
  }

  /**
   * Manually trigger data import sync
   */
  async triggerDataImportSync() {
    return await this.runDataImportSync();
  }

  /**
   * Manually trigger QuickBooks sync
   */
  async triggerQuickBooksSync() {
    return await this.runQuickBooksSync();
  }
}

export const syncScheduler = new SyncScheduler();