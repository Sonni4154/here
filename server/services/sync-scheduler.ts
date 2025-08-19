import { storage } from '../storage';
import { QuickBooksService } from './quickbooks-service';

export interface SyncScheduleConfig {
  provider: string;
  enabled: boolean;
  interval: number; // minutes
  businessHoursOnly: boolean;
  retryAttempts: number;
  lastRun?: Date;
  nextRun?: Date;
  priority: 'low' | 'medium' | 'high';
}

export interface SyncRecommendation {
  provider: string;
  recommendedInterval: number;
  reason: string;
  confidence: number;
  suggestedBusinessHours: boolean;
  estimatedDuration: number; // minutes
}

export interface SyncHistoryEntry {
  provider: string;
  timestamp: Date;
  duration: number; // milliseconds
  success: boolean;
  dataVolume: number; // number of records synced
  errorMessage?: string;
}

export interface SyncRecommendation {
  provider: string;
  type: 'interval' | 'timing' | 'performance' | 'cost_optimization';
  recommendedInterval: number;
  currentInterval: number;
  reason: string;
  confidence: number; // 0-100
  suggestedBusinessHours: boolean;
  estimatedDuration: number; // minutes
  potentialSavings?: string;
  dataInsights: {
    avgDataVolume: number;
    peakSyncTimes: string[];
    failureRate: number;
  };
}

export class SyncScheduler {
  private activeIntervals: Map<string, NodeJS.Timeout> = new Map();
  private scheduleConfigs: Map<string, SyncScheduleConfig> = new Map();
  private quickbooksService: QuickBooksService;
  private syncHistory: SyncHistoryEntry[] = [];
  private recommendations: SyncRecommendation[] = [];
  private recommendationEngine: NodeJS.Timeout | null = null;

  constructor() {
    this.quickbooksService = new QuickBooksService();
    this.initializeDefaultSchedules();
    this.loadSyncHistory();
    this.startRecommendationEngine();
    console.log('🕒 SyncScheduler initialized with smart recommendations');
  }

  private initializeDefaultSchedules() {
    // Default QuickBooks sync configuration
    this.scheduleConfigs.set('quickbooks', {
      provider: 'quickbooks',
      enabled: false,
      interval: 60, // 1 hour
      businessHoursOnly: true,
      retryAttempts: 3,
      priority: 'high'
    });

    // Default Google Calendar sync configuration
    this.scheduleConfigs.set('google_calendar', {
      provider: 'google_calendar',
      enabled: false,
      interval: 30, // 30 minutes
      businessHoursOnly: false,
      retryAttempts: 2,
      priority: 'medium'
    });
  }

  async getScheduleStatus(): Promise<{
    isRunning: boolean;
    activeIntervals: number;
    nextScheduledSync?: Date;
    schedules: SyncScheduleConfig[];
    recommendations: SyncRecommendation[];
    syncHistory: SyncHistoryEntry[];
    performanceMetrics: {
      totalSyncs: number;
      successRate: number;
      avgDuration: number;
      lastWeekSyncs: number;
    };
  }> {
    const schedules = Array.from(this.scheduleConfigs.values());
    const nextRuns = schedules
      .filter(s => s.enabled && s.nextRun)
      .map(s => s.nextRun!)
      .sort((a, b) => a.getTime() - b.getTime());

    // Generate fresh recommendations
    await this.generateRecommendations();

    // Calculate performance metrics
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const lastWeekSyncs = this.syncHistory.filter(h => h.timestamp >= lastWeek);
    const successfulSyncs = this.syncHistory.filter(h => h.success);

    return {
      isRunning: this.activeIntervals.size > 0,
      activeIntervals: this.activeIntervals.size,
      nextScheduledSync: nextRuns[0],
      schedules,
      recommendations: this.recommendations,
      syncHistory: this.syncHistory.slice(-20), // Last 20 sync operations
      performanceMetrics: {
        totalSyncs: this.syncHistory.length,
        successRate: this.syncHistory.length > 0 ? (successfulSyncs.length / this.syncHistory.length) * 100 : 0,
        avgDuration: this.syncHistory.length > 0 ? this.syncHistory.reduce((sum, h) => sum + h.duration, 0) / this.syncHistory.length : 0,
        lastWeekSyncs: lastWeekSyncs.length
      }
    };
  }

  async updateScheduleConfig(provider: string, config: Partial<SyncScheduleConfig>): Promise<void> {
    const existing = this.scheduleConfigs.get(provider);
    if (!existing) {
      throw new Error(`No schedule configuration found for provider: ${provider}`);
    }

    const updated = { ...existing, ...config };
    this.scheduleConfigs.set(provider, updated);

    // Restart the schedule if it was running
    if (this.activeIntervals.has(provider)) {
      this.stopSchedule(provider);
      if (updated.enabled) {
        this.startSchedule(provider);
      }
    } else if (updated.enabled) {
      this.startSchedule(provider);
    }

    // Log the configuration change
    await storage.createActivityLog({
      userId: 'system',
      type: 'schedule_updated',
      description: `Sync schedule updated for ${provider}`,
      metadata: { provider, config: updated }
    });
  }

  private startSchedule(provider: string): void {
    const config = this.scheduleConfigs.get(provider);
    if (!config || !config.enabled) return;

    const intervalMs = config.interval * 60 * 1000;
    
    const runSync = async () => {
      if (config.businessHoursOnly && !this.isBusinessHours()) {
        console.log(`⏰ Skipping ${provider} sync - outside business hours`);
        return;
      }

      try {
        console.log(`🔄 Starting scheduled ${provider} sync`);
        await this.executeSyncForProvider(provider);
        
        config.lastRun = new Date();
        config.nextRun = new Date(Date.now() + intervalMs);
        
        await storage.createActivityLog({
          userId: 'system',
          type: 'scheduled_sync',
          description: `Scheduled ${provider} sync completed successfully`,
          metadata: { provider, timestamp: new Date() }
        });
      } catch (error) {
        console.error(`❌ Scheduled ${provider} sync failed:`, error);
        await storage.createActivityLog({
          userId: 'system',
          type: 'sync_error',
          description: `Scheduled ${provider} sync failed`,
          metadata: { 
            provider, 
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date()
          }
        });
      }
    };

    // Calculate next run time
    config.nextRun = new Date(Date.now() + intervalMs);
    
    const interval = setInterval(runSync, intervalMs);
    this.activeIntervals.set(provider, interval);
    
    console.log(`📅 Scheduled ${provider} sync every ${config.interval} minutes`);
  }

  private stopSchedule(provider: string): void {
    const interval = this.activeIntervals.get(provider);
    if (interval) {
      clearInterval(interval);
      this.activeIntervals.delete(provider);
      console.log(`⏹️ Stopped scheduled ${provider} sync`);
    }
  }

  private isBusinessHours(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Business hours: Monday-Friday, 7 AM - 7 PM Pacific Time
    return day >= 1 && day <= 5 && hour >= 7 && hour < 19;
  }

  private async executeSyncForProvider(provider: string): Promise<void> {
    const userId = 'dev_user_123'; // Default admin user
    
    switch (provider) {
      case 'quickbooks':
        const integration = await storage.getIntegration(userId, 'quickbooks');
        if (integration?.accessToken) {
          await this.quickbooksService.fullSync(userId);
        } else {
          throw new Error('QuickBooks not connected');
        }
        break;
        
      case 'google_calendar':
        // Implement Google Calendar sync when ready
        console.log('Google Calendar sync not yet implemented');
        break;
        
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  async generateRecommendations(): Promise<SyncRecommendation[]> {
    const recommendations: SyncRecommendation[] = [];
    
    // Analyze QuickBooks sync patterns
    const qbRecommendation = await this.analyzeQuickBooksUsage();
    if (qbRecommendation) {
      recommendations.push(qbRecommendation);
    }

    // Add Google Calendar recommendations
    recommendations.push({
      provider: 'google_calendar',
      recommendedInterval: 15,
      reason: 'Calendar events change frequently during business hours',
      confidence: 0.8,
      suggestedBusinessHours: false,
      estimatedDuration: 2
    });

    return recommendations;
  }

  private async analyzeQuickBooksUsage(): Promise<SyncRecommendation | null> {
    try {
      // Analyze recent activity logs to determine optimal sync frequency
      const recentLogs = await storage.getRecentActivityLogs('system', 7); // Last 7 days
      const syncLogs = recentLogs.filter(log => 
        log.type === 'scheduled_sync' && 
        log.metadata?.provider === 'quickbooks'
      );

      let recommendedInterval = 60; // Default 1 hour
      let confidence = 0.7;
      let reason = 'Standard business sync frequency';

      if (syncLogs.length > 0) {
        // If there have been many manual syncs, suggest more frequent automated sync
        const manualSyncs = recentLogs.filter(log => log.type === 'manual_sync');
        if (manualSyncs.length > 10) {
          recommendedInterval = 30;
          confidence = 0.9;
          reason = 'High manual sync activity suggests need for more frequent automated sync';
        }
      }

      return {
        provider: 'quickbooks',
        recommendedInterval,
        reason,
        confidence,
        suggestedBusinessHours: true,
        estimatedDuration: 5
      };
    } catch (error) {
      console.error('Error analyzing QuickBooks usage:', error);
      return null;
    }
  }

  async triggerQuickBooksSync(): Promise<void> {
    await this.executeSyncForProvider('quickbooks');
  }

  async triggerDataImportSync(): Promise<void> {
    // Implement data import sync logic
    console.log('Data import sync triggered');
  }

  startAllSchedules(): void {
    for (const [provider, config] of this.scheduleConfigs.entries()) {
      if (config.enabled) {
        this.startSchedule(provider);
      }
    }
  }

  stopAllSchedules(): void {
    for (const provider of this.activeIntervals.keys()) {
      this.stopSchedule(provider);
    }
  }
}

export const syncScheduler = new SyncScheduler();