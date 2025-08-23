import { google } from 'googleapis';
import { storage } from '../storage';

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  extendedProperties?: {
    private?: Record<string, string>;
  };
}

interface CalendarConfig {
  calendarId: string;
  name: string;
  color: string;
  syncEnabled: boolean;
}

export class GoogleCalendarService {
  private oauth2Client: any;
  
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NODE_ENV === 'production' 
        ? 'https://www.wemakemarin.com/auth/google/callback'
        : 'http://localhost:5000/auth/google/callback'
    );
  }

  // Initialize with stored tokens
  async initializeForUser(userId: string): Promise<void> {
    const integration = await storage.getIntegration(userId, 'google');
    if (!integration || !integration.accessToken) {
      throw new Error('Google Calendar not connected');
    }

    this.oauth2Client.setCredentials({
      access_token: integration.accessToken,
      refresh_token: integration.refreshToken
    });
  }

  // Get authorization URL
  getAuthUrl(userId: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: JSON.stringify({ userId, timestamp: Date.now() })
    });
  }

  // Handle OAuth callback
  async handleCallback(code: string, userId: string): Promise<void> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      
      await storage.upsertIntegration({
        userId,
        provider: 'google',
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token || '',
        isActive: true,
        lastSyncAt: new Date()
      });
    } catch (error) {
      console.error('Google Calendar auth error:', error);
      throw error;
    }
  }

  // Get calendar list
  async getCalendars(userId: string): Promise<CalendarConfig[]> {
    await this.initializeForUser(userId);
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    try {
      const response = await calendar.calendarList.list();
      
      return (response.data.items || []).map(cal => ({
        calendarId: cal.id!,
        name: cal.summary!,
        color: cal.colorId || '#1976D2',
        syncEnabled: true
      }));
    } catch (error) {
      console.error('Error fetching calendars:', error);
      throw error;
    }
  }

  // Get events from multiple calendars for a specific week
  async getWeekEvents(userId: string, weekStart: string): Promise<any[]> {
    await this.initializeForUser(userId);
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    // Default calendar IDs for Marin Pest Control
    const calendarIds = [
      'primary', // Main calendar
      // Add specific calendar IDs for different service types
      'insect-control@marinpestcontrol.com',
      'rodent-control@marinpestcontrol.com',
      'maintenance@marinpestcontrol.com',
      'exclusion@marinpestcontrol.com'
    ];

    const startDate = new Date(weekStart);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    try {
      const allEvents: any[] = [];

      for (const calendarId of calendarIds) {
        try {
          const response = await calendar.events.list({
            calendarId,
            timeMin: startDate.toISOString(),
            timeMax: endDate.toISOString(),
            singleEvents: true,
            orderBy: 'startTime'
          });

          const events = (response.data.items || []).map(event => ({
            id: event.id,
            title: event.summary || 'Untitled Event',
            start: event.start?.dateTime || event.start?.date,
            end: event.end?.dateTime || event.end?.date,
            description: event.description || '',
            location: event.location || '',
            calendar: this.getCalendarName(calendarId),
            assignee: this.extractAssignee(event.description || '', event.attendees),
            customer: this.extractCustomerInfo(event.description || '', event.location || ''),
            notes: this.parseNotesFromDescription(event.description || ''),
            googleEventId: event.id,
            calendarId
          }));

          allEvents.push(...events);
        } catch (calError) {
          console.warn(`Could not fetch from calendar ${calendarId}:`, calError.message);
          // Continue with other calendars
        }
      }

      return allEvents;
    } catch (error) {
      console.error('Error fetching week events:', error);
      throw error;
    }
  }

  // Get user's assigned tasks
  async getUserTasks(userId: string): Promise<any[]> {
    const user = await storage.getUser(parseInt(userId));
    if (!user) return [];

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekEvents = await this.getWeekEvents(userId, today.toISOString().split('T')[0]);
    
    // Filter events assigned to this user
    return weekEvents.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate >= today && 
             eventDate <= tomorrow &&
             (event.assignee?.includes(user.firstName) || 
              event.assignee?.includes(user.lastName) ||
              event.assignee?.toLowerCase().includes(user.email?.toLowerCase() || ''));
    });
  }

  // Update event with notes
  async addNoteToEvent(userId: string, eventId: string, note: string): Promise<void> {
    await this.initializeForUser(userId);
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    try {
      // First get the event
      const response = await calendar.events.get({
        calendarId: 'primary', // We'll need to track which calendar this came from
        eventId
      });

      const event = response.data;
      const user = await storage.getUser(parseInt(userId));
      const today = new Date().toLocaleDateString('en-US', { 
        month: '2-digit', 
        day: '2-digit', 
        year: '2-digit' 
      });
      
      const newNote = `${today}:${user?.firstName}-${user?.lastName}: ${note}`;
      const existingDescription = event.description || '';
      const updatedDescription = existingDescription + '\n' + newNote;

      // Update the event
      await calendar.events.update({
        calendarId: 'primary',
        eventId,
        requestBody: {
          ...event,
          description: updatedDescription
        }
      });
    } catch (error) {
      console.error('Error adding note to event:', error);
      throw error;
    }
  }

  // Create a clock-in/clock-out event
  async createClockEvent(userId: string, type: 'in' | 'out', customer?: string, location?: string): Promise<void> {
    await this.initializeForUser(userId);
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    const user = await storage.getUser(parseInt(userId));
    const now = new Date();
    const endTime = new Date(now.getTime() + 15 * 60000); // 15 minutes

    try {
      await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: `${user?.firstName} ${user?.lastName} - Clock ${type.toUpperCase()}${customer ? ` - ${customer}` : ''}`,
          description: `Automatic clock ${type} event${customer ? ` for ${customer}` : ''}`,
          location,
          start: {
            dateTime: now.toISOString(),
            timeZone: 'America/Los_Angeles'
          },
          end: {
            dateTime: endTime.toISOString(),
            timeZone: 'America/Los_Angeles'
          },
          colorId: type === 'in' ? '10' : '11' // Green for in, Red for out
        }
      });
    } catch (error) {
      console.error('Error creating clock event:', error);
      throw error;
    }
  }

  // Helper methods
  private getCalendarName(calendarId: string): string {
    const calendarMap: Record<string, string> = {
      'primary': 'Main Calendar',
      'insect-control@marinpestcontrol.com': 'Insect Control / Sprays',
      'rodent-control@marinpestcontrol.com': 'Rodent Control',
      'maintenance@marinpestcontrol.com': 'Maintenance',
      'exclusion@marinpestcontrol.com': 'Exclusion Work'
    };
    
    return calendarMap[calendarId] || 'Other';
  }

  private extractAssignee(description: string, attendees?: any[]): string | undefined {
    // Look for assignee in description
    const assigneeMatch = description.match(/Assigned to:?\s*([^\n]+)/i);
    if (assigneeMatch) return assigneeMatch[1].trim();

    // Look in attendees
    if (attendees && attendees.length > 0) {
      const technicians = ['spencer', 'boden', 'jorge', 'tristan'];
      const assignedTech = attendees.find(attendee => 
        technicians.some(tech => attendee.email?.toLowerCase().includes(tech))
      );
      return assignedTech?.displayName || assignedTech?.email;
    }

    return undefined;
  }

  private extractCustomerInfo(description: string, location: string): any {
    // Try to extract customer info from description or location
    const customerMatch = description.match(/Customer:?\s*([^\n]+)/i);
    const phoneMatch = description.match(/Phone:?\s*([\d\s\-\(\)]+)/i);
    const emailMatch = description.match(/Email:?\s*([^\s\n]+@[^\s\n]+)/i);

    return {
      name: customerMatch?.[1]?.trim() || location.split(',')[0]?.trim() || 'Unknown Customer',
      phone: phoneMatch?.[1]?.trim(),
      email: emailMatch?.[1]?.trim(),
      address: location
    };
  }

  private parseNotesFromDescription(description: string): any[] {
    const notePattern = /(\d{2}\/\d{2}\/\d{2}):([^:]+):\s*([^\n]+)/g;
    const notes = [];
    let match;

    while ((match = notePattern.exec(description)) !== null) {
      notes.push({
        id: `note_${notes.length}`,
        date: match[1],
        technician: match[2],
        content: match[3]
      });
    }

    return notes;
  }
}