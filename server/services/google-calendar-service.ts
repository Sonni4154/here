import { google } from 'googleapis';
import { storage } from '../storage';

interface CalendarEvent {
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  colorId?: string;
}

interface ClockEvent {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  customerId?: string;
  customerName?: string;
  action: 'clock_in' | 'clock_out';
  timestamp: Date;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  notes?: string;
}

export class GoogleCalendarService {
  private oauth2Client: any;
  private calendar: any;
  private companyCalendarId: string;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NODE_ENV === 'production' 
        ? 'https://www.wemakemarin.com/api/integrations/google/callback'
        : 'http://localhost:5000/api/integrations/google/callback'
    );

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    this.companyCalendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
  }

  // Generate OAuth authorization URL
  getAuthorizationUrl(userId: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state,
      prompt: 'consent'
    });
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(code: string): Promise<any> {
    const { tokens } = await this.oauth2Client.getAccessToken(code);
    this.oauth2Client.setCredentials(tokens);
    return tokens;
  }

  // Set credentials from stored tokens
  async setCredentials(userId: string): Promise<boolean> {
    try {
      const integration = await storage.getIntegration(userId, 'google_calendar');
      if (!integration || !integration.isActive) {
        return false;
      }

      this.oauth2Client.setCredentials({
        access_token: integration.accessToken,
        refresh_token: integration.refreshToken,
      });

      return true;
    } catch (error) {
      console.error('Error setting Google Calendar credentials:', error);
      return false;
    }
  }

  // Refresh access token if needed
  async refreshTokenIfNeeded(userId: string): Promise<void> {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      if (credentials.access_token) {
        // Update stored tokens
        const integration = await storage.getIntegration(userId, 'google_calendar');
        if (integration) {
          await storage.upsertIntegration({
            ...integration,
            accessToken: credentials.access_token,
            refreshToken: credentials.refresh_token || integration.refreshToken,
          });
        }
        
        this.oauth2Client.setCredentials(credentials);
      }
    } catch (error) {
      console.error('Error refreshing Google Calendar token:', error);
      throw error;
    }
  }

  // Create calendar event for clock in/out
  async createClockEvent(clockEvent: ClockEvent): Promise<string | null> {
    try {
      const event = await this.buildClockEventData(clockEvent);
      
      const response = await this.calendar.events.insert({
        calendarId: this.companyCalendarId,
        requestBody: event,
      });

      return response.data.id;
    } catch (error) {
      console.error('Error creating clock event:', error);
      throw error;
    }
  }

  // Update existing calendar event (for clock out)
  async updateClockEvent(eventId: string, clockEvent: ClockEvent): Promise<void> {
    try {
      // Get existing event
      const existingEvent = await this.calendar.events.get({
        calendarId: this.companyCalendarId,
        eventId: eventId,
      });

      // Update with clock out time
      const updatedEvent = {
        ...existingEvent.data,
        end: {
          dateTime: clockEvent.timestamp.toISOString(),
          timeZone: 'America/Los_Angeles', // Adjust for your timezone
        },
        summary: this.buildEventSummary(clockEvent, true),
        description: this.buildEventDescription(clockEvent, true),
      };

      await this.calendar.events.update({
        calendarId: this.companyCalendarId,
        eventId: eventId,
        requestBody: updatedEvent,
      });
    } catch (error) {
      console.error('Error updating clock event:', error);
      throw error;
    }
  }

  // Build calendar event data
  private async buildClockEventData(clockEvent: ClockEvent): Promise<CalendarEvent> {
    const isClockOut = clockEvent.action === 'clock_out';
    
    return {
      summary: this.buildEventSummary(clockEvent, isClockOut),
      description: this.buildEventDescription(clockEvent, isClockOut),
      start: {
        dateTime: clockEvent.timestamp.toISOString(),
        timeZone: 'America/Los_Angeles', // Adjust for your timezone
      },
      end: {
        dateTime: isClockOut 
          ? clockEvent.timestamp.toISOString()
          : new Date(clockEvent.timestamp.getTime() + 60 * 60 * 1000).toISOString(), // +1 hour placeholder
        timeZone: 'America/Los_Angeles',
      },
      attendees: clockEvent.employeeEmail ? [{
        email: clockEvent.employeeEmail,
        displayName: clockEvent.employeeName,
      }] : undefined,
      colorId: clockEvent.action === 'clock_in' ? '2' : '11', // Green for clock in, red for clock out
    };
  }

  // Build event summary
  private buildEventSummary(clockEvent: ClockEvent, isComplete: boolean): string {
    const action = clockEvent.action === 'clock_in' ? 'Work Session' : 'Work End';
    const customer = clockEvent.customerName ? ` - ${clockEvent.customerName}` : '';
    const status = isComplete ? ' (Complete)' : ' (In Progress)';
    
    return `${clockEvent.employeeName}: ${action}${customer}${status}`;
  }

  // Build event description
  private buildEventDescription(clockEvent: ClockEvent, isComplete: boolean): string {
    let description = `Employee: ${clockEvent.employeeName}\n`;
    description += `Action: ${clockEvent.action.replace('_', ' ').toUpperCase()}\n`;
    description += `Time: ${clockEvent.timestamp.toLocaleString()}\n`;
    
    if (clockEvent.customerName) {
      description += `Customer: ${clockEvent.customerName}\n`;
    }
    
    if (clockEvent.location) {
      description += `Location: ${clockEvent.location.address || `${clockEvent.location.lat}, ${clockEvent.location.lng}`}\n`;
    }
    
    if (clockEvent.notes) {
      description += `Notes: ${clockEvent.notes}\n`;
    }
    
    description += `\nStatus: ${isComplete ? 'Work session completed' : 'Work session in progress'}`;
    
    return description;
  }

  // Get calendar events for a date range
  async getEvents(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      const response = await this.calendar.events.list({
        calendarId: this.companyCalendarId,
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw error;
    }
  }

  // Create work schedule events
  async createScheduleEvent(schedule: {
    employeeId: string;
    employeeName: string;
    employeeEmail: string;
    customerId?: string;
    customerName?: string;
    startTime: Date;
    endTime: Date;
    taskDescription?: string;
    location?: string;
  }): Promise<string | null> {
    try {
      const event: CalendarEvent = {
        summary: `Scheduled: ${schedule.employeeName}${schedule.customerName ? ` - ${schedule.customerName}` : ''}`,
        description: this.buildScheduleDescription(schedule),
        start: {
          dateTime: schedule.startTime.toISOString(),
          timeZone: 'America/Los_Angeles',
        },
        end: {
          dateTime: schedule.endTime.toISOString(),
          timeZone: 'America/Los_Angeles',
        },
        attendees: [{
          email: schedule.employeeEmail,
          displayName: schedule.employeeName,
        }],
        colorId: '9', // Blue for scheduled events
      };

      const response = await this.calendar.events.insert({
        calendarId: this.companyCalendarId,
        requestBody: event,
      });

      return response.data.id;
    } catch (error) {
      console.error('Error creating schedule event:', error);
      throw error;
    }
  }

  // Build schedule event description
  private buildScheduleDescription(schedule: any): string {
    let description = `Scheduled Work Session\n\n`;
    description += `Employee: ${schedule.employeeName}\n`;
    description += `Start: ${schedule.startTime.toLocaleString()}\n`;
    description += `End: ${schedule.endTime.toLocaleString()}\n`;
    
    if (schedule.customerName) {
      description += `Customer: ${schedule.customerName}\n`;
    }
    
    if (schedule.location) {
      description += `Location: ${schedule.location}\n`;
    }
    
    if (schedule.taskDescription) {
      description += `Task: ${schedule.taskDescription}\n`;
    }
    
    description += `\nThis is a scheduled work session. Actual clock in/out times will create separate calendar events.`;
    
    return description;
  }

  // Sync employee schedules to calendar
  async syncEmployeeSchedules(userId: string): Promise<void> {
    try {
      if (!await this.setCredentials(userId)) {
        throw new Error('Google Calendar not connected');
      }

      // Get upcoming schedules
      const schedules = await storage.getUpcomingSchedules();
      
      for (const schedule of schedules) {
        // Check if event already exists
        const existingEvent = await this.findExistingScheduleEvent(schedule);
        
        if (!existingEvent) {
          await this.createScheduleEvent(schedule);
          
          // Log activity
          await storage.createActivityLog({
            userId,
            type: 'calendar_sync',
            description: `Created calendar event for ${schedule.employeeName}`,
            metadata: { scheduleId: schedule.id, action: 'create_event' },
          });
        }
      }
    } catch (error) {
      console.error('Error syncing employee schedules:', error);
      throw error;
    }
  }

  // Find existing schedule event
  private async findExistingScheduleEvent(schedule: any): Promise<any> {
    try {
      const events = await this.getEvents(
        new Date(schedule.startTime.getTime() - 60 * 60 * 1000), // 1 hour before
        new Date(schedule.endTime.getTime() + 60 * 60 * 1000)    // 1 hour after
      );

      return events.find(event => 
        event.summary?.includes(schedule.employeeName) &&
        event.summary?.includes('Scheduled')
      );
    } catch (error) {
      console.error('Error finding existing schedule event:', error);
      return null;
    }
  }

  // Delete calendar event
  async deleteEvent(eventId: string): Promise<void> {
    try {
      await this.calendar.events.delete({
        calendarId: this.companyCalendarId,
        eventId: eventId,
      });
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw error;
    }
  }

  // Get calendar information
  async getCalendarInfo(): Promise<any> {
    try {
      const response = await this.calendar.calendars.get({
        calendarId: this.companyCalendarId,
      });

      return response.data;
    } catch (error) {
      console.error('Error getting calendar info:', error);
      throw error;
    }
  }
}