import { db } from "../db";
import { 
  workflowTriggers, 
  workflowExecutions, 
  workflowActionTemplates,
  type WorkflowTrigger,
  type WorkflowExecution,
  type InsertWorkflowExecution
} from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface TriggerData {
  event: string;
  data: any;
  userId: string;
  timestamp: Date;
  metadata?: any;
}

export interface WorkflowAction {
  type: string;
  config: any;
  retryOnFail?: boolean;
  timeout?: number;
}

export interface ActionResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: Date;
}

export class WorkflowEngine {
  private actionHandlers: Map<string, (config: any, triggerData: TriggerData) => Promise<ActionResult>> = new Map();

  constructor() {
    this.registerDefaultActions();
  }

  private registerDefaultActions() {
    // Notification actions
    this.registerAction('send_notification', this.sendNotification.bind(this));
    this.registerAction('send_email', this.sendEmail.bind(this));
    
    // Data processing actions
    this.registerAction('create_time_entry', this.createTimeEntry.bind(this));
    this.registerAction('create_schedule', this.createSchedule.bind(this));
    this.registerAction('update_status', this.updateStatus.bind(this));
    
    // Integration actions
    this.registerAction('sync_quickbooks', this.syncQuickbooks.bind(this));
    this.registerAction('sync_google_calendar', this.syncGoogleCalendar.bind(this));
    this.registerAction('create_jotform_submission', this.createJotformSubmission.bind(this));
    
    // Analytics actions
    this.registerAction('log_activity', this.logActivity.bind(this));
    this.registerAction('update_metrics', this.updateMetrics.bind(this));
  }

  registerAction(type: string, handler: (config: any, triggerData: TriggerData) => Promise<ActionResult>) {
    this.actionHandlers.set(type, handler);
  }

  async trigger(event: string, data: any, userId: string, metadata?: any): Promise<void> {
    const triggerData: TriggerData = {
      event,
      data,
      userId,
      timestamp: new Date(),
      metadata
    };

    console.log(`🔄 Workflow trigger: ${event} for user ${userId}`);

    // Find active triggers for this event
    const triggers = await db
      .select()
      .from(workflowTriggers)
      .where(
        and(
          eq(workflowTriggers.isActive, true),
          eq(workflowTriggers.triggerEvent, event)
        )
      )
      .orderBy(workflowTriggers.priority);

    console.log(`📋 Found ${triggers.length} active triggers for event: ${event}`);

    // Execute each trigger
    for (const trigger of triggers) {
      if (this.shouldExecuteTrigger(trigger, triggerData)) {
        await this.executeTrigger(trigger, triggerData);
      }
    }
  }

  private shouldExecuteTrigger(trigger: WorkflowTrigger, triggerData: TriggerData): boolean {
    if (!trigger.conditions) return true;

    const conditions = trigger.conditions as any;
    
    // Check user conditions
    if (conditions.userId && conditions.userId !== triggerData.userId) {
      return false;
    }

    // Check data conditions
    if (conditions.dataConditions) {
      for (const [key, expectedValue] of Object.entries(conditions.dataConditions)) {
        if (triggerData.data[key] !== expectedValue) {
          return false;
        }
      }
    }

    // Check time conditions
    if (conditions.timeWindow) {
      const now = new Date();
      const hour = now.getHours();
      if (hour < conditions.timeWindow.start || hour > conditions.timeWindow.end) {
        return false;
      }
    }

    return true;
  }

  private async executeTrigger(trigger: WorkflowTrigger, triggerData: TriggerData): Promise<void> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`⚡ Executing trigger: ${trigger.name} (${executionId})`);

    // Create execution record
    const [execution] = await db
      .insert(workflowExecutions)
      .values({
        triggerId: trigger.id,
        status: 'running',
        triggerData: triggerData as any,
        startedAt: new Date(),
        attemptNumber: 1,
      })
      .returning();

    const actions = trigger.actions as WorkflowAction[];
    const results: ActionResult[] = [];
    let hasErrors = false;

    try {
      // Execute actions sequentially
      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        console.log(`🎯 Executing action ${i + 1}/${actions.length}: ${action.type}`);

        try {
          const handler = this.actionHandlers.get(action.type);
          if (!handler) {
            throw new Error(`No handler registered for action type: ${action.type}`);
          }

          const result = await handler(action.config, triggerData);
          results.push(result);

          if (!result.success) {
            hasErrors = true;
            if (!action.retryOnFail) {
              break; // Stop execution if action fails and retry is not enabled
            }
          }
        } catch (error) {
          console.error(`❌ Action ${action.type} failed:`, error);
          results.push({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date(),
          });
          hasErrors = true;
          
          if (!action.retryOnFail) {
            break;
          }
        }
      }

      // Update execution status
      await db
        .update(workflowExecutions)
        .set({
          status: hasErrors ? 'failed' : 'completed',
          executionResults: results as any,
          completedAt: new Date(),
          errorMessage: hasErrors ? 'One or more actions failed' : null,
        })
        .where(eq(workflowExecutions.id, execution.id));

      console.log(`✅ Trigger execution ${hasErrors ? 'completed with errors' : 'successful'}: ${trigger.name}`);

    } catch (error) {
      console.error(`💥 Trigger execution failed: ${trigger.name}`, error);
      
      await db
        .update(workflowExecutions)
        .set({
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        })
        .where(eq(workflowExecutions.id, execution.id));
    }
  }

  // Action handlers
  private async sendNotification(config: any, triggerData: TriggerData): Promise<ActionResult> {
    console.log(`📢 Sending notification: ${config.message}`);
    
    // In a real implementation, this would integrate with a notification service
    // For now, we'll simulate the notification
    return {
      success: true,
      data: { notificationId: `notif_${Date.now()}` },
      timestamp: new Date(),
    };
  }

  private async sendEmail(config: any, triggerData: TriggerData): Promise<ActionResult> {
    console.log(`📧 Sending email to: ${config.to}`);
    
    // In a real implementation, this would integrate with an email service
    return {
      success: true,
      data: { emailId: `email_${Date.now()}` },
      timestamp: new Date(),
    };
  }

  private async createTimeEntry(config: any, triggerData: TriggerData): Promise<ActionResult> {
    console.log(`⏰ Creating time entry from workflow`);
    
    try {
      // This would create a time entry based on the trigger data
      // For now, we'll simulate success
      return {
        success: true,
        data: { timeEntryId: `time_${Date.now()}` },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create time entry',
        timestamp: new Date(),
      };
    }
  }

  private async createSchedule(config: any, triggerData: TriggerData): Promise<ActionResult> {
    console.log(`📅 Creating schedule entry from workflow`);
    
    try {
      // This would create a schedule entry
      return {
        success: true,
        data: { scheduleId: `schedule_${Date.now()}` },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create schedule',
        timestamp: new Date(),
      };
    }
  }

  private async updateStatus(config: any, triggerData: TriggerData): Promise<ActionResult> {
    console.log(`📊 Updating status: ${config.entity} -> ${config.status}`);
    
    try {
      // This would update entity status
      return {
        success: true,
        data: { updatedEntity: config.entity, newStatus: config.status },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update status',
        timestamp: new Date(),
      };
    }
  }

  private async syncQuickbooks(config: any, triggerData: TriggerData): Promise<ActionResult> {
    console.log(`💼 Syncing with QuickBooks`);
    
    try {
      // This would trigger QuickBooks sync
      return {
        success: true,
        data: { syncId: `qb_sync_${Date.now()}` },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync with QuickBooks',
        timestamp: new Date(),
      };
    }
  }

  private async syncGoogleCalendar(config: any, triggerData: TriggerData): Promise<ActionResult> {
    console.log(`📆 Syncing with Google Calendar`);
    
    try {
      // This would trigger Google Calendar sync
      return {
        success: true,
        data: { calendarSyncId: `gcal_sync_${Date.now()}` },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync with Google Calendar',
        timestamp: new Date(),
      };
    }
  }

  private async createJotformSubmission(config: any, triggerData: TriggerData): Promise<ActionResult> {
    console.log(`📝 Creating JotForm submission`);
    
    try {
      // This would create a JotForm submission
      return {
        success: true,
        data: { submissionId: `jf_sub_${Date.now()}` },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create JotForm submission',
        timestamp: new Date(),
      };
    }
  }

  private async logActivity(config: any, triggerData: TriggerData): Promise<ActionResult> {
    console.log(`📝 Logging activity: ${config.description}`);
    
    try {
      // This would log activity to the database
      return {
        success: true,
        data: { activityLogId: `activity_${Date.now()}` },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to log activity',
        timestamp: new Date(),
      };
    }
  }

  private async updateMetrics(config: any, triggerData: TriggerData): Promise<ActionResult> {
    console.log(`📈 Updating metrics: ${config.metric}`);
    
    try {
      // This would update metrics
      return {
        success: true,
        data: { metric: config.metric, value: config.value },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update metrics',
        timestamp: new Date(),
      };
    }
  }

  // Management methods
  async createTrigger(triggerData: any): Promise<WorkflowTrigger> {
    const [trigger] = await db
      .insert(workflowTriggers)
      .values(triggerData)
      .returning();
    
    console.log(`✨ Created workflow trigger: ${trigger.name}`);
    return trigger;
  }

  async getTriggers(): Promise<WorkflowTrigger[]> {
    return await db
      .select()
      .from(workflowTriggers)
      .orderBy(workflowTriggers.priority);
  }

  async getExecutions(triggerId?: string): Promise<WorkflowExecution[]> {
    const query = db.select().from(workflowExecutions);
    
    if (triggerId) {
      return await query.where(eq(workflowExecutions.triggerId, triggerId));
    }
    
    return await query.orderBy(workflowExecutions.createdAt);
  }

  async getActionTemplates(): Promise<any[]> {
    return await db
      .select()
      .from(workflowActionTemplates)
      .where(eq(workflowActionTemplates.isActive, true));
  }
}

// Export singleton instance
export const workflowEngine = new WorkflowEngine();