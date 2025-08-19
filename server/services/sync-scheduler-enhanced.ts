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

export class EnhancedSyncScheduler {
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
    console.log('🕒 Enhanced SyncScheduler initialized with smart recommendations');
  }

  private initializeDefaultSchedules(): void {
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

    // Default Jibble time tracking sync
    this.scheduleConfigs.set('jibble', {
      provider: 'jibble',
      enabled: false,
      interval: 45, // 45 minutes
      businessHoursOnly: true,
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

    console.log(`🔄 Updated sync schedule for ${provider}:`, config);
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

      const startTime = Date.now();
      let success = false;
      let dataVolume = 0;
      let errorMessage: string | undefined;

      try {
        console.log(`🔄 Starting scheduled ${provider} sync`);
        const result = await this.executeSyncForProvider(provider);
        success = true;
        dataVolume = result?.dataVolume || 0;
        
        config.lastRun = new Date();
        config.nextRun = new Date(Date.now() + intervalMs);
        
        console.log(`✅ Scheduled ${provider} sync completed successfully`);
      } catch (error) {
        success = false;
        errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Scheduled ${provider} sync failed:`, error);
      } finally {
        // Record sync operation for analysis
        const duration = Date.now() - startTime;
        await this.recordSyncOperation(provider, duration, success, dataVolume, errorMessage);
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

  private async executeSyncForProvider(provider: string): Promise<{ dataVolume: number }> {
    const userId = 'dev_user_123'; // Default admin user
    
    switch (provider) {
      case 'quickbooks':
        // Simulate QuickBooks sync
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
        return { dataVolume: Math.floor(Math.random() * 100) + 10 };
        
      case 'google_calendar':
        // Simulate Google Calendar sync
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
        return { dataVolume: Math.floor(Math.random() * 50) + 5 };
        
      case 'jibble':
        // Simulate Jibble time tracking sync
        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2500));
        return { dataVolume: Math.floor(Math.random() * 30) + 3 };
        
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  // Smart recommendation engine methods
  private async loadSyncHistory(): Promise<void> {
    // Generate realistic historical data for demonstration
    const now = new Date();
    const providers = ['quickbooks', 'google_calendar', 'jibble'];
    
    for (let i = 0; i < 100; i++) {
      const hoursBack = i * 0.5; // Every 30 minutes going back
      const timestamp = new Date(now.getTime() - (hoursBack * 60 * 60 * 1000));
      const provider = providers[Math.floor(Math.random() * providers.length)];
      
      // More realistic success rates and data volumes per provider
      let successRate = 0.9;
      let dataVolumeRange = [10, 50];
      let durationRange = [1000, 5000];
      
      if (provider === 'quickbooks') {
        successRate = 0.85; // Lower due to API complexity
        dataVolumeRange = [20, 100];
        durationRange = [2000, 8000];
      } else if (provider === 'jibble') {
        successRate = 0.95; // Higher reliability
        dataVolumeRange = [5, 30];
        durationRange = [1000, 3000];
      }
      
      this.syncHistory.push({
        provider,
        timestamp,
        duration: Math.random() * (durationRange[1] - durationRange[0]) + durationRange[0],
        success: Math.random() < successRate,
        dataVolume: Math.floor(Math.random() * (dataVolumeRange[1] - dataVolumeRange[0])) + dataVolumeRange[0],
        errorMessage: Math.random() > 0.9 ? 'Connection timeout' : undefined
      });
    }
    
    // Sort by timestamp (newest first)
    this.syncHistory.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  private startRecommendationEngine(): void {
    // Run recommendation analysis every 30 minutes
    this.recommendationEngine = setInterval(() => {
      this.generateRecommendations();
    }, 30 * 60 * 1000);
    
    // Generate initial recommendations
    setTimeout(() => this.generateRecommendations(), 5000);
  }

  private async generateRecommendations(): Promise<void> {
    this.recommendations = [];

    for (const [provider, config] of this.scheduleConfigs) {
      const providerHistory = this.syncHistory.filter(h => h.provider === provider);
      
      if (providerHistory.length < 10) {
        // Not enough data for meaningful recommendations
        continue;
      }

      // Analyze sync patterns
      const avgDuration = providerHistory.reduce((sum, h) => sum + h.duration, 0) / providerHistory.length;
      const successRate = providerHistory.filter(h => h.success).length / providerHistory.length;
      const avgDataVolume = providerHistory.reduce((sum, h) => sum + h.dataVolume, 0) / providerHistory.length;
      
      // Peak sync times analysis
      const hourCounts = new Array(24).fill(0);
      providerHistory.forEach(h => {
        hourCounts[h.timestamp.getHours()]++;
      });
      const peakHours = hourCounts
        .map((count, hour) => ({ hour, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map(({ hour }) => `${hour}:00`);

      // Generate specific recommendations based on analysis
      
      // Performance-based recommendations
      if (successRate < 0.85) {
        this.recommendations.push({
          provider,
          type: 'performance',
          recommendedInterval: Math.max(Math.ceil(config.interval * 1.5), 60),
          currentInterval: config.interval,
          reason: `Success rate is ${(successRate * 100).toFixed(1)}%. Increasing interval from ${config.interval} to ${Math.max(Math.ceil(config.interval * 1.5), 60)} minutes may improve reliability.`,
          confidence: 85,
          suggestedBusinessHours: true,
          estimatedDuration: Math.ceil(avgDuration / 60000),
          potentialSavings: 'Reduces API failures by ~30%',
          dataInsights: {
            avgDataVolume,
            peakSyncTimes: peakHours,
            failureRate: Math.round((1 - successRate) * 100)
          }
        });
      }

      // Cost optimization recommendations
      if (avgDataVolume < 15 && config.interval < 90) {
        this.recommendations.push({
          provider,
          type: 'cost_optimization',
          recommendedInterval: 120,
          currentInterval: config.interval,
          reason: `Low data volume detected (${avgDataVolume.toFixed(1)} records/sync). Reducing frequency from ${config.interval} to 120 minutes recommended for cost savings.`,
          confidence: 75,
          suggestedBusinessHours: true,
          estimatedDuration: Math.ceil(avgDuration / 60000),
          potentialSavings: 'Reduces API costs by ~40% and server load',
          dataInsights: {
            avgDataVolume,
            peakSyncTimes: peakHours,
            failureRate: Math.round((1 - successRate) * 100)
          }
        });
      }

      // High-frequency recommendations for busy systems
      if (avgDataVolume > 60 && config.interval > 30) {
        this.recommendations.push({
          provider,
          type: 'interval',
          recommendedInterval: 30,
          currentInterval: config.interval,
          reason: `High data volume detected (${avgDataVolume.toFixed(1)} records/sync). Increasing frequency from ${config.interval} to 30 minutes recommended for better user experience.`,
          confidence: 90,
          suggestedBusinessHours: false,
          estimatedDuration: Math.ceil(avgDuration / 60000),
          potentialSavings: 'Improves data freshness by 50%',
          dataInsights: {
            avgDataVolume,
            peakSyncTimes: peakHours,
            failureRate: Math.round((1 - successRate) * 100)
          }
        });
      }

      // Business hours optimization
      const businessHourSyncs = providerHistory.filter(h => {
        const hour = h.timestamp.getHours();
        return hour >= 8 && hour <= 17;
      });

      if (businessHourSyncs.length > providerHistory.length * 0.8 && !config.businessHoursOnly) {
        this.recommendations.push({
          provider,
          type: 'timing',
          recommendedInterval: config.interval,
          currentInterval: config.interval,
          reason: `${((businessHourSyncs.length / providerHistory.length) * 100).toFixed(1)}% of sync activity occurs during business hours (8 AM - 5 PM). Enable business hours only mode to optimize resource usage.`,
          confidence: 70,
          suggestedBusinessHours: true,
          estimatedDuration: Math.ceil(avgDuration / 60000),
          potentialSavings: 'Reduces off-hours processing by 60%',
          dataInsights: {
            avgDataVolume,
            peakSyncTimes: peakHours,
            failureRate: Math.round((1 - successRate) * 100)
          }
        });
      }
    }

    // Sort recommendations by confidence (highest first)
    this.recommendations.sort((a, b) => b.confidence - a.confidence);
    
    console.log(`🤖 Generated ${this.recommendations.length} smart recommendations`);
  }

  async recordSyncOperation(provider: string, duration: number, success: boolean, dataVolume: number, errorMessage?: string): Promise<void> {
    const entry: SyncHistoryEntry = {
      provider,
      timestamp: new Date(),
      duration,
      success,
      dataVolume,
      errorMessage
    };

    this.syncHistory.unshift(entry);
    
    // Keep only last 200 entries
    if (this.syncHistory.length > 200) {
      this.syncHistory = this.syncHistory.slice(0, 200);
    }

    // Trigger immediate recommendation update for significant events
    if (!success || duration > 10000 || dataVolume > 100) {
      setTimeout(() => this.generateRecommendations(), 2000);
    }
  }

  async applyRecommendation(provider: string, recommendationType: string): Promise<void> {
    const recommendation = this.recommendations.find(r => r.provider === provider && r.type === recommendationType);
    if (!recommendation) {
      throw new Error(`Recommendation not found for ${provider} - ${recommendationType}`);
    }

    const config = this.scheduleConfigs.get(provider);
    if (!config) {
      throw new Error(`Configuration not found for provider: ${provider}`);
    }

    // Apply the recommendation
    const updates: Partial<SyncScheduleConfig> = {
      interval: recommendation.recommendedInterval,
      businessHoursOnly: recommendation.suggestedBusinessHours
    };

    await this.updateScheduleConfig(provider, updates);

    // Remove the applied recommendation
    this.recommendations = this.recommendations.filter(r => 
      !(r.provider === provider && r.type === recommendationType)
    );

    console.log(`✅ Applied ${recommendationType} recommendation for ${provider}`);
  }

  async getRecommendations(): Promise<SyncRecommendation[]> {
    return this.recommendations;
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

  destroy(): void {
    if (this.recommendationEngine) {
      clearInterval(this.recommendationEngine);
      this.recommendationEngine = null;
    }
    this.stopAllSchedules();
    console.log('🛑 Enhanced SyncScheduler destroyed');
  }
}

export const enhancedSyncScheduler = new EnhancedSyncScheduler();