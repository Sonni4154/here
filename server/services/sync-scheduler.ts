import { storage } from '../storage';
import { QuickBooksService } from './quickbooks-service';

export class SyncScheduler {
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private quickbooksService: QuickBooksService;

  constructor() {
    this.quickbooksService = new QuickBooksService();
  }

  // Start automated sync for a user
  async startAutomatedSync(userId: string, intervalMinutes: number = 60): Promise<void> {
    // Clear existing interval if any
    this.stopAutomatedSync(userId);

    console.log(`Starting automated sync for user ${userId} every ${intervalMinutes} minutes`);

    const interval = setInterval(async () => {
      try {
        await this.performScheduledSync(userId);
      } catch (error) {
        console.error(`Scheduled sync failed for user ${userId}:`, error);
        
        // Log the failure
        await storage.createActivityLog({
          userId,
          type: 'scheduled_sync_error',
          description: `Automated sync failed: ${error.message}`,
          metadata: { 
            error: error.message,
            timestamp: new Date(),
            intervalMinutes
          }
        });
      }
    }, intervalMinutes * 60 * 1000);

    this.intervals.set(userId, interval);

    // Log that automated sync started
    await storage.createActivityLog({
      userId,
      type: 'automated_sync_started',
      description: `Automated QuickBooks sync started (every ${intervalMinutes} minutes)`,
      metadata: { intervalMinutes, timestamp: new Date() }
    });
  }

  // Stop automated sync for a user
  stopAutomatedSync(userId: string): void {
    const interval = this.intervals.get(userId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(userId);
      console.log(`Stopped automated sync for user ${userId}`);
    }
  }

  // Perform the actual sync
  private async performScheduledSync(userId: string): Promise<void> {
    console.log(`Starting scheduled sync for user ${userId}`);

    // Check if QuickBooks is connected
    const integration = await storage.getIntegration(userId, 'quickbooks');
    if (!integration || !integration.isActive) {
      console.log(`QuickBooks not connected for user ${userId}, skipping sync`);
      return;
    }

    const startTime = new Date();
    let syncResults = {
      customers: 0,
      items: 0,
      invoices: 0,
      errors: []
    };

    try {
      // Sync customers
      try {
        console.log('Syncing customers...');
        const customerResult = await this.quickbooksService.syncCustomers(userId);
        syncResults.customers = customerResult?.count || 0;
      } catch (error) {
        console.error('Customer sync error:', error);
        syncResults.errors.push(`Customers: ${error.message}`);
      }

      // Sync items/products
      try {
        console.log('Syncing items...');
        const itemResult = await this.quickbooksService.syncItems(userId);
        syncResults.items = itemResult?.count || 0;
      } catch (error) {
        console.error('Item sync error:', error);
        syncResults.errors.push(`Items: ${error.message}`);
      }

      // Sync recent invoices (last 30 days)
      try {
        console.log('Syncing recent invoices...');
        const invoiceResult = await this.quickbooksService.syncRecentInvoices(userId, 30);
        syncResults.invoices = invoiceResult?.count || 0;
      } catch (error) {
        console.error('Invoice sync error:', error);
        syncResults.errors.push(`Invoices: ${error.message}`);
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // Log successful sync
      await storage.createActivityLog({
        userId,
        type: 'scheduled_sync',
        description: `Automated sync completed: ${syncResults.customers} customers, ${syncResults.items} items, ${syncResults.invoices} invoices`,
        metadata: {
          ...syncResults,
          duration: `${Math.round(duration / 1000)}s`,
          timestamp: endTime
        }
      });

      console.log(`Scheduled sync completed for user ${userId} in ${Math.round(duration / 1000)}s`);

    } catch (error) {
      console.error(`Scheduled sync failed for user ${userId}:`, error);
      throw error;
    }
  }

  // Start sync for all connected users
  async startSyncForAllUsers(intervalMinutes: number = 60): Promise<void> {
    try {
      // Get all active QuickBooks integrations
      const integrations = await storage.getActiveIntegrations('quickbooks');
      
      console.log(`Starting automated sync for ${integrations.length} connected users`);
      
      for (const integration of integrations) {
        await this.startAutomatedSync(integration.userId, intervalMinutes);
      }
    } catch (error) {
      console.error('Error starting sync for all users:', error);
    }
  }

  // Stop sync for all users
  stopSyncForAllUsers(): void {
    console.log('Stopping automated sync for all users');
    for (const [userId, interval] of this.intervals) {
      clearInterval(interval);
      console.log(`Stopped sync for user ${userId}`);
    }
    this.intervals.clear();
  }

  // Get sync status for a user
  getSyncStatus(userId: string): { isActive: boolean; intervalMinutes?: number } {
    const hasInterval = this.intervals.has(userId);
    return {
      isActive: hasInterval,
      intervalMinutes: hasInterval ? 60 : undefined // Default interval
    };
  }

  // Get sync status for all users
  getAllSyncStatuses(): { userId: string; isActive: boolean }[] {
    const statuses: { userId: string; isActive: boolean }[] = [];
    
    for (const userId of this.intervals.keys()) {
      statuses.push({
        userId,
        isActive: true
      });
    }
    
    return statuses;
  }

  // Manual trigger for immediate sync
  async triggerImmediateSync(userId: string): Promise<void> {
    console.log(`Triggering immediate sync for user ${userId}`);
    await this.performScheduledSync(userId);
  }
}

// Global scheduler instance
export const syncScheduler = new SyncScheduler();

// Auto-start sync for connected users on server startup
export async function initializeScheduledSync(): Promise<void> {
  try {
    console.log('Initializing scheduled QuickBooks sync...');
    
    // Start sync every 60 minutes for all connected users
    await syncScheduler.startSyncForAllUsers(60);
    
    console.log('Scheduled QuickBooks sync initialized');
  } catch (error) {
    console.error('Failed to initialize scheduled sync:', error);
  }
}

// Graceful shutdown
export function shutdownScheduledSync(): void {
  console.log('Shutting down scheduled sync...');
  syncScheduler.stopSyncForAllUsers();
}