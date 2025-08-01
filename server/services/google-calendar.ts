import { google } from 'googleapis';
import { storage } from '../storage';
import type { EmployeeSchedule, InsertEmployeeSchedule } from '@shared/schema';

export interface GoogleCalendarConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accessToken: string;
}

export class GoogleCalendarService {
  private calendar: any;
  private userId: string;
  private integrationId: string;

  constructor(config: GoogleCalendarConfig, userId: string, integrationId: string) {
    this.userId = userId;
    this.integrationId = integrationId;

    const oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret
    );

    oauth2Client.setCredentials({
      refresh_token: config.refreshToken,
      access_token: config.accessToken,
    });

    this.calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  }

  async syncEmployeeSchedules(direction: 'push' | 'pull' | 'bidirectional' = 'bidirectional'): Promise<void> {
    try {
      await storage.createSyncLog({
        userId: this.userId,
        integrationId: this.integrationId,
        operation: 'sync',
        entityType: 'schedule',
        status: 'pending',
        direction,
      });

      if (direction === 'pull' || direction === 'bidirectional') {
        await this.pullEventsFromCalendar();
      }

      if (direction === 'push' || direction === 'bidirectional') {
        await this.pushSchedulesToCalendar();
      }
    } catch (error) {
      console.error('Error syncing with Google Calendar:', error);
      await storage.createSyncLog({
        userId: this.userId,
        integrationId: this.integrationId,
        operation: 'sync',
        entityType: 'schedule',
        status: 'error',
        direction,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private async pullEventsFromCalendar(): Promise<void> {
    try {
      // Get user's Google Calendar ID
      const user = await storage.getUser(this.userId);
      if (!user?.googleCalendarId) {
        console.warn('No Google Calendar ID found for user');
        return;
      }

      const now = new Date();
      const oneMonthFromNow = new Date();
      oneMonthFromNow.setMonth(now.getMonth() + 1);

      const response = await this.calendar.events.list({
        calendarId: user.googleCalendarId,
        timeMin: now.toISOString(),
        timeMax: oneMonthFromNow.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];

      for (const event of events) {
        if (!event.start?.dateTime || !event.end?.dateTime) continue;

        const existingMapping = await storage.getExternalMapping(
          this.userId,
          'google_calendar',
          'schedule',
          event.id
        );

        const scheduleData: InsertEmployeeSchedule = {
          employeeId: this.userId,
          title: event.summary || 'Untitled Event',
          description: event.description || '',
          startTime: new Date(event.start.dateTime),
          endTime: new Date(event.end.dateTime),
          location: event.location || '',
          googleEventId: event.id,
          syncStatus: 'synced',
          createdBy: this.userId,
        };

        if (existingMapping) {
          // Update existing schedule
          await storage.updateEmployeeSchedule(existingMapping.internalId, scheduleData);
          await storage.updateExternalMapping(existingMapping.id, {
            lastSyncAt: new Date(),
          });
        } else {
          // Create new schedule
          const newSchedule = await storage.createEmployeeSchedule(scheduleData);
          await storage.createExternalMapping({
            userId: this.userId,
            provider: 'google_calendar',
            entityType: 'schedule',
            internalId: newSchedule.id,
            externalId: event.id,
          });
        }

        await storage.createSyncLog({
          userId: this.userId,
          integrationId: this.integrationId,
          operation: 'pull',
          entityType: 'schedule',
          externalId: event.id,
          status: 'success',
          direction: 'inbound',
        });
      }
    } catch (error) {
      console.error('Error pulling events from Google Calendar:', error);
      throw error;
    }
  }

  private async pushSchedulesToCalendar(): Promise<void> {
    try {
      const user = await storage.getUser(this.userId);
      if (!user?.googleCalendarId) {
        console.warn('No Google Calendar ID found for user');
        return;
      }

      const schedules = await storage.getEmployeeSchedules(this.userId);
      const unsynced = schedules.filter(s => !s.googleEventId || s.syncStatus !== 'synced');

      for (const schedule of unsynced) {
        try {
          const eventData = {
            summary: schedule.title,
            description: schedule.description || '',
            location: schedule.location || '',
            start: {
              dateTime: schedule.startTime.toISOString(),
              timeZone: 'UTC',
            },
            end: {
              dateTime: schedule.endTime.toISOString(),
              timeZone: 'UTC',
            },
          };

          if (schedule.googleEventId) {
            // Update existing event
            await this.calendar.events.update({
              calendarId: user.googleCalendarId,
              eventId: schedule.googleEventId,
              resource: eventData,
            });
          } else {
            // Create new event
            const response = await this.calendar.events.insert({
              calendarId: user.googleCalendarId,
              resource: eventData,
            });

            // Update local schedule with Google Event ID
            await storage.updateEmployeeSchedule(schedule.id, {
              googleEventId: response.data.id,
              syncStatus: 'synced',
            });

            // Create mapping
            await storage.createExternalMapping({
              userId: this.userId,
              provider: 'google_calendar',
              entityType: 'schedule',
              internalId: schedule.id,
              externalId: response.data.id,
            });
          }

          await storage.createSyncLog({
            userId: this.userId,
            integrationId: this.integrationId,
            operation: 'push',
            entityType: 'schedule',
            entityId: schedule.id,
            externalId: schedule.googleEventId,
            status: 'success',
            direction: 'outbound',
          });
        } catch (error) {
          await storage.updateEmployeeSchedule(schedule.id, {
            syncStatus: 'error',
          });

          await storage.createSyncLog({
            userId: this.userId,
            integrationId: this.integrationId,
            operation: 'push',
            entityType: 'schedule',
            entityId: schedule.id,
            status: 'error',
            direction: 'outbound',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    } catch (error) {
      console.error('Error pushing schedules to Google Calendar:', error);
      throw error;
    }
  }

  async createScheduleEvent(schedule: InsertEmployeeSchedule): Promise<EmployeeSchedule> {
    try {
      // Create schedule in database first
      const newSchedule = await storage.createEmployeeSchedule(schedule);

      // Then sync to Google Calendar if user has calendar integration
      const user = await storage.getUser(schedule.employeeId);
      if (user?.googleCalendarId) {
        const eventData = {
          summary: schedule.title,
          description: schedule.description || '',
          location: schedule.location || '',
          start: {
            dateTime: schedule.startTime.toISOString(),
            timeZone: 'UTC',
          },
          end: {
            dateTime: schedule.endTime.toISOString(),
            timeZone: 'UTC',
          },
        };

        try {
          const response = await this.calendar.events.insert({
            calendarId: user.googleCalendarId,
            resource: eventData,
          });

          // Update schedule with Google Event ID
          await storage.updateEmployeeSchedule(newSchedule.id, {
            googleEventId: response.data.id,
            syncStatus: 'synced',
          });

          // Create mapping
          await storage.createExternalMapping({
            userId: this.userId,
            provider: 'google_calendar',
            entityType: 'schedule',
            internalId: newSchedule.id,
            externalId: response.data.id,
          });
        } catch (error) {
          console.error('Error creating Google Calendar event:', error);
          await storage.updateEmployeeSchedule(newSchedule.id, {
            syncStatus: 'error',
          });
        }
      }

      return newSchedule;
    } catch (error) {
      console.error('Error creating schedule:', error);
      throw error;
    }
  }

  async deleteScheduleEvent(scheduleId: string): Promise<void> {
    try {
      const schedule = await storage.getEmployeeSchedule(scheduleId);
      if (!schedule) return;

      // Delete from Google Calendar if it exists
      if (schedule.googleEventId) {
        const user = await storage.getUser(schedule.employeeId);
        if (user?.googleCalendarId) {
          try {
            await this.calendar.events.delete({
              calendarId: user.googleCalendarId,
              eventId: schedule.googleEventId,
            });
          } catch (error) {
            console.error('Error deleting Google Calendar event:', error);
          }
        }
      }

      // Delete from database
      await storage.deleteEmployeeSchedule(scheduleId);
    } catch (error) {
      console.error('Error deleting schedule:', error);
      throw error;
    }
  }
}

export async function createGoogleCalendarService(userId: string): Promise<GoogleCalendarService | null> {
  try {
    const integration = await storage.getIntegration(userId, 'google_calendar');
    if (!integration || !integration.isActive) {
      return null;
    }

    const config: GoogleCalendarConfig = {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      refreshToken: integration.refreshToken!,
      accessToken: integration.accessToken!,
    };

    return new GoogleCalendarService(config, userId, integration.id);
  } catch (error) {
    console.error('Error creating Google Calendar service:', error);
    return null;
  }
}