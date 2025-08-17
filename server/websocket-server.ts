/**
 * WebSocket server for real-time collaboration features
 */

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { presenceService } from './services/presence-service';
import { parse } from 'url';

interface WebSocketWithSession extends WebSocket {
  userId?: string;
  sessionId?: string;
  isAlive?: boolean;
}

interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp?: string;
}

export class CollaborationWebSocketServer {
  private wss: WebSocketServer;
  private pingInterval: NodeJS.Timeout | undefined;

  constructor(server: any) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      verifyClient: this.verifyClient.bind(this)
    });

    this.setupWebSocketHandlers();
    this.startHeartbeat();

    console.log('🔗 WebSocket server initialized for real-time collaboration');
  }

  private verifyClient(info: { origin: string; secure: boolean; req: IncomingMessage }): boolean {
    // Add authentication logic here if needed
    // For now, allow all connections from same origin
    return true;
  }

  private setupWebSocketHandlers(): void {
    this.wss.on('connection', (ws: WebSocketWithSession, req: IncomingMessage) => {
      const url = parse(req.url || '', true);
      const userId = url.query.userId as string;
      const sessionId = url.query.sessionId as string || this.generateSessionId();

      if (!userId) {
        ws.close(1008, 'User ID required');
        return;
      }

      // Setup WebSocket connection
      ws.userId = userId;
      ws.sessionId = sessionId;
      ws.isAlive = true;

      // Add to presence service  
      presenceService.addConnection(sessionId, ws as any, userId);

      console.log(`👤 User ${userId} connected (session: ${sessionId})`);

      // Handle incoming messages
      ws.on('message', async (data: Buffer) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format',
            timestamp: new Date().toISOString()
          }));
        }
      });

      // Handle connection close
      ws.on('close', async () => {
        console.log(`👤 User ${userId} disconnected (session: ${sessionId})`);
        await presenceService.handleDisconnect(userId, sessionId);
      });

      // Handle connection error
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

      // Heartbeat pong response
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Send initial presence data
      this.sendInitialData(ws);
    });
  }

  private async handleMessage(ws: WebSocketWithSession, message: WebSocketMessage): Promise<void> {
    const { type, data } = message;
    const userId = ws.userId!;

    try {
      switch (type) {
        case 'presence_update':
          await presenceService.updatePresence({
            userId,
            status: data.status,
            currentPage: data.currentPage,
            currentActivity: data.currentActivity,
            currentCustomer: data.currentCustomer,
            sessionId: ws.sessionId
          });
          break;

        case 'activity_record':
          await presenceService.recordActivity({
            userId,
            activityType: data.activityType,
            activityData: data.activityData,
            resourceId: data.resourceId,
            resourceType: data.resourceType,
            description: data.description
          });
          break;

        case 'typing_indicator':
          await presenceService.updateTypingIndicator({
            userId,
            isTyping: data.isTyping,
            typingIn: data.typingIn
          });
          break;

        case 'page_view':
          await presenceService.updatePresence({
            userId,
            status: 'online',
            currentPage: data.page,
            currentActivity: `Viewing ${data.pageTitle || data.page}`,
            sessionId: ws.sessionId
          });

          await presenceService.recordActivity({
            userId,
            activityType: 'page_view',
            activityData: { page: data.page, pageTitle: data.pageTitle },
            description: `Viewing ${data.pageTitle || data.page}`
          });
          break;

        case 'customer_view':
          await presenceService.updatePresence({
            userId,
            status: 'online',
            currentCustomer: data.customerId,
            currentActivity: `Working with ${data.customerName}`,
            sessionId: ws.sessionId
          });

          await presenceService.recordActivity({
            userId,
            activityType: 'customer_view',
            activityData: { customerId: data.customerId, customerName: data.customerName },
            resourceId: data.customerId,
            resourceType: 'customer',
            description: `Viewing customer: ${data.customerName}`
          });
          break;

        case 'form_edit':
          await presenceService.recordActivity({
            userId,
            activityType: 'form_edit',
            activityData: { formType: data.formType, resourceId: data.resourceId },
            resourceId: data.resourceId,
            resourceType: data.resourceType,
            description: `Editing ${data.formType} form`
          });
          break;

        case 'task_update':
          await presenceService.recordActivity({
            userId,
            activityType: data.action, // 'task_start', 'task_complete', etc.
            activityData: { taskId: data.taskId, taskTitle: data.taskTitle },
            resourceId: data.taskId,
            resourceType: 'task',
            description: `${data.action.replace('_', ' ')} task: ${data.taskTitle}`
          });
          break;

        case 'heartbeat':
          // Update last seen
          await presenceService.updatePresence({
            userId,
            status: 'online',
            sessionId: ws.sessionId
          });
          break;

        default:
          console.warn('Unknown message type:', type);
      }

      // Send acknowledgment
      ws.send(JSON.stringify({
        type: 'ack',
        originalType: type,
        timestamp: new Date().toISOString()
      }));

    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to process message',
        originalType: type,
        timestamp: new Date().toISOString()
      }));
    }
  }

  private async sendInitialData(ws: WebSocketWithSession): Promise<void> {
    try {
      // Send current online users
      const onlineUsers = await presenceService.getOnlineUsers();
      ws.send(JSON.stringify({
        type: 'initial_presence',
        data: onlineUsers,
        timestamp: new Date().toISOString()
      }));

      // Send recent activities
      const recentActivities = await presenceService.getRecentActivities(20);
      ws.send(JSON.stringify({
        type: 'recent_activities',
        data: recentActivities,
        timestamp: new Date().toISOString()
      }));

    } catch (error) {
      console.error('Error sending initial data:', error);
    }
  }

  private startHeartbeat(): void {
    this.pingInterval = setInterval(() => {
      this.wss.clients.forEach((ws: WebSocketWithSession) => {
        if (ws.isAlive === false) {
          console.log('Terminating inactive WebSocket connection');
          return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // 30 seconds
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public close(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    this.wss.close();
  }
}