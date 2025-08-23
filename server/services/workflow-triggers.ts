import { workflowEngine } from './workflow-engine';

// Define common trigger events
export const TRIGGER_EVENTS = {
  // Form submissions
  JOB_FORM_SUBMIT: 'job_form_submit',
  MATERIAL_FORM_SUBMIT: 'material_form_submit',
  TIME_ENTRY_SUBMIT: 'time_entry_submit',
  
  // Time tracking events
  CLOCK_IN: 'clock_in',
  CLOCK_OUT: 'clock_out',
  
  // Status changes
  MATERIAL_APPROVED: 'material_approved',
  TIME_ENTRY_APPROVED: 'time_entry_approved',
  INVOICE_CREATED: 'invoice_created',
  
  // Schedule events
  SCHEDULE_CREATED: 'schedule_created',
  TASK_ASSIGNED: 'task_assigned',
  TASK_COMPLETED: 'task_completed',
  
  // Integration events
  QUICKBOOKS_SYNC: 'quickbooks_sync',
  GOOGLE_CALENDAR_SYNC: 'google_calendar_sync',
} as const;

export class WorkflowTriggerService {
  
  // Initialize default workflow triggers for Marin Pest Control
  async initializeDefaultTriggers(userId: string): Promise<void> {
    console.log('🔧 Initializing default workflow triggers...');

    const defaultTriggers = [
      {
        name: 'Job Form Auto-Processing',
        description: 'Automatically process job form submissions and create time entries',
        triggerType: 'form_submission',
        triggerEvent: TRIGGER_EVENTS.JOB_FORM_SUBMIT,
        conditions: null,
        actions: [
          {
            type: 'create_time_entry',
            config: {
              autoApprove: false,
              notifyManager: true,
            },
            retryOnFail: true,
          },
          {
            type: 'sync_quickbooks',
            config: {
              syncType: 'time_entry',
              immediate: false,
            },
            retryOnFail: true,
          },
          {
            type: 'send_notification',
            config: {
              message: 'New job form submitted and processed',
              type: 'info',
            },
          },
        ],
        priority: 10,
        createdBy: userId,
      },
      
      {
        name: 'Material Approval Workflow',
        description: 'Auto-approve small material expenses and notify for large ones',
        triggerType: 'form_submission',
        triggerEvent: TRIGGER_EVENTS.MATERIAL_FORM_SUBMIT,
        conditions: {
          dataConditions: {
            totalCost: { operator: 'lessThan', value: 100 },
          },
        },
        actions: [
          {
            type: 'update_status',
            config: {
              entity: 'material_entry',
              status: 'approved',
            },
          },
          {
            type: 'log_activity',
            config: {
              description: 'Material expense auto-approved (under $100)',
              type: 'auto_approval',
            },
          },
        ],
        priority: 20,
        createdBy: userId,
      },
      
      {
        name: 'Large Material Expense Alert',
        description: 'Send notification for material expenses over $100',
        triggerType: 'form_submission',
        triggerEvent: TRIGGER_EVENTS.MATERIAL_FORM_SUBMIT,
        conditions: {
          dataConditions: {
            totalCost: { operator: 'greaterThanOrEqual', value: 100 },
          },
        },
        actions: [
          {
            type: 'send_notification',
            config: {
              message: 'Large material expense requires approval',
              type: 'warning',
              recipients: ['manager', 'admin'],
            },
          },
          {
            type: 'send_email',
            config: {
              to: 'manager@marinpestcontrol.com',
              subject: 'Material Expense Approval Required',
              template: 'material_approval_required',
            },
            retryOnFail: true,
          },
        ],
        priority: 15,
        createdBy: userId,
      },
      
      {
        name: 'Clock In Notification',
        description: 'Log activity and sync schedule when employee clocks in',
        triggerType: 'time_entry',
        triggerEvent: TRIGGER_EVENTS.CLOCK_IN,
        conditions: null,
        actions: [
          {
            type: 'log_activity',
            config: {
              description: 'Employee clocked in',
              type: 'clock_in',
            },
          },
          {
            type: 'sync_google_calendar',
            config: {
              updateStatus: 'in_progress',
            },
          },
          {
            type: 'update_metrics',
            config: {
              metric: 'daily_clock_ins',
              operation: 'increment',
            },
          },
        ],
        priority: 30,
        createdBy: userId,
      },
      
      {
        name: 'End of Day Processing',
        description: 'Process daily timesheets and sync with QuickBooks',
        triggerType: 'time_entry',
        triggerEvent: TRIGGER_EVENTS.CLOCK_OUT,
        conditions: {
          timeWindow: {
            start: 16, // 4 PM
            end: 23,   // 11 PM
          },
        },
        actions: [
          {
            type: 'log_activity',
            config: {
              description: 'Employee clocked out - end of day',
              type: 'clock_out',
            },
          },
          {
            type: 'sync_quickbooks',
            config: {
              syncType: 'daily_timesheet',
              immediate: true,
            },
            retryOnFail: true,
          },
          {
            type: 'update_metrics',
            config: {
              metric: 'daily_hours_worked',
              operation: 'calculate',
            },
          },
        ],
        priority: 25,
        createdBy: userId,
      },
      
      {
        name: 'Schedule Creation Automation',
        description: 'Auto-sync new schedules with Google Calendar and notify team',
        triggerType: 'schedule_event',
        triggerEvent: TRIGGER_EVENTS.SCHEDULE_CREATED,
        conditions: null,
        actions: [
          {
            type: 'sync_google_calendar',
            config: {
              action: 'create_event',
              sendInvites: true,
            },
            retryOnFail: true,
          },
          {
            type: 'send_notification',
            config: {
              message: 'New schedule created and synced to calendar',
              type: 'info',
            },
          },
          {
            type: 'log_activity',
            config: {
              description: 'Schedule created and synced',
              type: 'schedule_management',
            },
          },
        ],
        priority: 40,
        createdBy: userId,
      },
      
      {
        name: 'Invoice Creation Workflow',
        description: 'Auto-sync invoices with QuickBooks and send notifications',
        triggerType: 'form_submission',
        triggerEvent: TRIGGER_EVENTS.INVOICE_CREATED,
        conditions: null,
        actions: [
          {
            type: 'sync_quickbooks',
            config: {
              syncType: 'invoice',
              immediate: true,
            },
            retryOnFail: true,
          },
          {
            type: 'send_notification',
            config: {
              message: 'Invoice created and synced to QuickBooks',
              type: 'success',
            },
          },
          {
            type: 'update_metrics',
            config: {
              metric: 'monthly_invoices',
              operation: 'increment',
            },
          },
        ],
        priority: 50,
        createdBy: userId,
      },
    ];

    // Create default triggers
    for (const triggerData of defaultTriggers) {
      try {
        await workflowEngine.createTrigger(triggerData);
        console.log(`✅ Created trigger: ${triggerData.name}`);
      } catch (error) {
        console.error(`❌ Failed to create trigger ${triggerData.name}:`, error);
      }
    }

    console.log('🎉 Default workflow triggers initialized successfully');
  }

  // Trigger form submission workflows
  async triggerFormSubmission(formType: string, data: any, userId: string): Promise<void> {
    const eventMap: Record<string, string> = {
      'job_form': TRIGGER_EVENTS.JOB_FORM_SUBMIT,
      'material_form': TRIGGER_EVENTS.MATERIAL_FORM_SUBMIT,
      'time_entry': TRIGGER_EVENTS.TIME_ENTRY_SUBMIT,
    };

    const event = eventMap[formType];
    if (event) {
      await workflowEngine.trigger(event, data, userId, { formType });
    }
  }

  // Trigger time tracking workflows
  async triggerTimeTracking(action: string, data: any, userId: string): Promise<void> {
    const eventMap: Record<string, string> = {
      'clock_in': TRIGGER_EVENTS.CLOCK_IN,
      'clock_out': TRIGGER_EVENTS.CLOCK_OUT,
    };

    const event = eventMap[action];
    if (event) {
      await workflowEngine.trigger(event, data, userId, { action });
    }
  }

  // Trigger status change workflows
  async triggerStatusChange(entityType: string, status: string, data: any, userId: string): Promise<void> {
    const eventMap: Record<string, string> = {
      'material_approved': TRIGGER_EVENTS.MATERIAL_APPROVED,
      'time_entry_approved': TRIGGER_EVENTS.TIME_ENTRY_APPROVED,
      'invoice_created': TRIGGER_EVENTS.INVOICE_CREATED,
    };

    const event = eventMap[`${entityType}_${status}`];
    if (event) {
      await workflowEngine.trigger(event, data, userId, { entityType, status });
    }
  }

  // Trigger schedule workflows
  async triggerScheduleEvent(action: string, data: any, userId: string): Promise<void> {
    const eventMap: Record<string, string> = {
      'created': TRIGGER_EVENTS.SCHEDULE_CREATED,
      'task_assigned': TRIGGER_EVENTS.TASK_ASSIGNED,
      'task_completed': TRIGGER_EVENTS.TASK_COMPLETED,
    };

    const event = eventMap[action];
    if (event) {
      await workflowEngine.trigger(event, data, userId, { action });
    }
  }
}

export const workflowTriggerService = new WorkflowTriggerService();