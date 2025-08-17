/**
 * Real-time collaboration and presence service
 * Manages user presence, activity tracking, and WebSocket connections
 */

import { db } from "../db";
import { userPresence, collaborationActivity, users } from "@shared/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import type { 
  InsertUserPresence, 
  UserPresence, 
  InsertCollaborationActivity,
  CollaborationActivity 
} from "@shared/schema";

interface PresenceUpdate {
  userId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  currentPage?: string;
  currentActivity?: string;
  currentCustomer?: string;
  deviceInfo?: string;
  sessionId?: string;
}

interface ActivityEvent {
  userId: string;
  activityType: string;
  activityData?: any;
  resourceId?: string;
  resourceType?: string;
  description?: string;
}

interface TypingIndicator {
  userId: string;
  isTyping: boolean;
  typingIn?: string;
}

export class PresenceService {
  private static instance: PresenceService;
  private activeConnections = new Map<string, WebSocket>();
  private userSessions = new Map<string, Set<string>>(); // userId -> sessionIds

  static getInstance(): PresenceService {
    if (!PresenceService.instance) {
      PresenceService.instance = new PresenceService();
    }
    return PresenceService.instance;
  }

  /**
   * Update user presence status
   */
  async updatePresence(presenceData: PresenceUpdate): Promise<UserPresence> {
    try {
      // First try to update existing presence record
      const [updated] = await db
        .update(userPresence)
        .set({
          status: presenceData.status,
          currentPage: presenceData.currentPage,
          currentActivity: presenceData.currentActivity,
          currentCustomer: presenceData.currentCustomer,
          deviceInfo: presenceData.deviceInfo,
          sessionId: presenceData.sessionId,
          lastSeen: new Date(),
          updatedAt: new Date()
        })
        .where(eq(userPresence.userId, presenceData.userId))
        .returning();

      if (updated) {
        // Broadcast presence update to all connected clients
        this.broadcastPresenceUpdate(updated);
        return updated;
      }

      // If no existing record, create new one
      const [created] = await db
        .insert(userPresence)
        .values({
          userId: presenceData.userId,
          status: presenceData.status,
          currentPage: presenceData.currentPage,
          currentActivity: presenceData.currentActivity,
          currentCustomer: presenceData.currentCustomer,
          deviceInfo: presenceData.deviceInfo,
          sessionId: presenceData.sessionId,
          lastSeen: new Date()
        })
        .returning();

      this.broadcastPresenceUpdate(created);
      return created;

    } catch (error) {
      console.error('Error updating presence:', error);
      throw new Error('Failed to update user presence');
    }
  }

  /**
   * Get all online users with their presence information
   */
  async getOnlineUsers(): Promise<UserPresence[]> {
    try {
      // Get users who have been active in the last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      const onlineUsers = await db
        .select({
          id: userPresence.id,
          userId: userPresence.userId,
          status: userPresence.status,
          currentPage: userPresence.currentPage,
          currentActivity: userPresence.currentActivity,
          currentCustomer: userPresence.currentCustomer,
          lastSeen: userPresence.lastSeen,
          sessionId: userPresence.sessionId,
          deviceInfo: userPresence.deviceInfo,
          isTyping: userPresence.isTyping,
          typingIn: userPresence.typingIn,
          createdAt: userPresence.createdAt,
          updatedAt: userPresence.updatedAt,
          userName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
          userRole: users.role,
          userEmail: users.email,
          profileImageUrl: users.profileImageUrl
        })
        .from(userPresence)
        .innerJoin(users, eq(userPresence.userId, users.id))
        .where(
          and(
            gte(userPresence.lastSeen, fiveMinutesAgo),
            eq(userPresence.status, 'online')
          )
        );

      return onlineUsers as any;
    } catch (error) {
      console.error('Error getting online users:', error);
      return [];
    }
  }

  /**
   * Record user activity for collaboration tracking
   */
  async recordActivity(activityData: ActivityEvent): Promise<CollaborationActivity> {
    try {
      const [activity] = await db
        .insert(collaborationActivity)
        .values({
          userId: activityData.userId,
          activityType: activityData.activityType,
          activityData: activityData.activityData,
          resourceId: activityData.resourceId,
          resourceType: activityData.resourceType,
          description: activityData.description
        })
        .returning();

      // Update user's current activity in presence
      await this.updatePresence({
        userId: activityData.userId,
        status: 'online',
        currentActivity: activityData.description
      });

      // Broadcast activity to interested users
      this.broadcastActivity(activity);
      
      return activity;
    } catch (error) {
      console.error('Error recording activity:', error);
      throw new Error('Failed to record activity');
    }
  }

  /**
   * Update typing indicator
   */
  async updateTypingIndicator(typingData: TypingIndicator): Promise<void> {
    try {
      await db
        .update(userPresence)
        .set({
          isTyping: typingData.isTyping,
          typingIn: typingData.typingIn,
          updatedAt: new Date()
        })
        .where(eq(userPresence.userId, typingData.userId));

      // Broadcast typing indicator
      this.broadcastTypingIndicator(typingData);
    } catch (error) {
      console.error('Error updating typing indicator:', error);
    }
  }

  /**
   * Get recent collaboration activities
   */
  async getRecentActivities(limit: number = 50): Promise<CollaborationActivity[]> {
    try {
      // Get activities from the last 24 hours
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const activities = await db
        .select({
          id: collaborationActivity.id,
          userId: collaborationActivity.userId,
          activityType: collaborationActivity.activityType,
          activityData: collaborationActivity.activityData,
          resourceId: collaborationActivity.resourceId,
          resourceType: collaborationActivity.resourceType,
          description: collaborationActivity.description,
          duration: collaborationActivity.duration,
          createdAt: collaborationActivity.createdAt,
          userName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
          userRole: users.role
        })
        .from(collaborationActivity)
        .innerJoin(users, eq(collaborationActivity.userId, users.id))
        .where(gte(collaborationActivity.createdAt, yesterday))
        .orderBy(sql`${collaborationActivity.createdAt} DESC`)
        .limit(limit);

      return activities as any;
    } catch (error) {
      console.error('Error getting recent activities:', error);
      return [];
    }
  }

  /**
   * Handle user disconnection
   */
  async handleDisconnect(userId: string, sessionId?: string): Promise<void> {
    try {
      // Remove session from active connections
      if (sessionId) {
        this.activeConnections.delete(sessionId);
        
        const userSessions = this.userSessions.get(userId);
        if (userSessions) {
          userSessions.delete(sessionId);
          if (userSessions.size === 0) {
            this.userSessions.delete(userId);
            // Set user offline if no more sessions
            await this.updatePresence({
              userId,
              status: 'offline'
            });
          }
        }
      } else {
        // Set user offline
        await this.updatePresence({
          userId,
          status: 'offline'
        });
      }
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  }

  /**
   * Add WebSocket connection
   */
  addConnection(sessionId: string, ws: WebSocket, userId: string): void {
    this.activeConnections.set(sessionId, ws);
    
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId)!.add(sessionId);

    // Set user online
    this.updatePresence({
      userId,
      status: 'online',
      sessionId
    });
  }

  /**
   * Broadcast presence update to all connected clients
   */
  private broadcastPresenceUpdate(presence: UserPresence): void {
    const message = JSON.stringify({
      type: 'presence_update',
      data: presence,
      timestamp: new Date().toISOString()
    });

    this.activeConnections.forEach((ws) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(message);
      }
    });
  }

  /**
   * Broadcast activity to connected clients
   */
  private broadcastActivity(activity: CollaborationActivity): void {
    const message = JSON.stringify({
      type: 'activity_update',
      data: activity,
      timestamp: new Date().toISOString()
    });

    this.activeConnections.forEach((ws) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(message);
      }
    });
  }

  /**
   * Broadcast typing indicator
   */
  private broadcastTypingIndicator(typingData: TypingIndicator): void {
    const message = JSON.stringify({
      type: 'typing_indicator',
      data: typingData,
      timestamp: new Date().toISOString()
    });

    this.activeConnections.forEach((ws) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(message);
      }
    });
  }

  /**
   * Cleanup offline users (run periodically)
   */
  async cleanupOfflineUsers(): Promise<void> {
    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      
      await db
        .update(userPresence)
        .set({ status: 'offline' })
        .where(
          and(
            eq(userPresence.status, 'online'),
            sql`${userPresence.lastSeen} < ${tenMinutesAgo}`
          )
        );
    } catch (error) {
      console.error('Error cleaning up offline users:', error);
    }
  }
}

export const presenceService = PresenceService.getInstance();