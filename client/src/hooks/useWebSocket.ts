/**
 * WebSocket hook for real-time collaboration features
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './useAuth';

export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp?: string;
}

interface UseWebSocketOptions {
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { user } = useAuth();
  const { reconnectInterval = 5000, maxReconnectAttempts = 5 } = options;
  
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  
  const ws = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<NodeJS.Timeout>();
  
  const connect = useCallback(() => {
    if (!user?.id) return;
    
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      ws.current = new WebSocket(`${protocol}//${host}/ws?userId=${user.id}&sessionId=${sessionId}`);
      
      ws.current.onopen = () => {
        console.log('🔗 WebSocket connected for collaboration');
        setIsConnected(true);
        reconnectAttempts.current = 0;
      };
      
      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.current.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        setIsConnected(false);
        
        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          console.log(`Reconnecting... attempt ${reconnectAttempts.current}`);
          
          reconnectTimer.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };
      
      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }, [user?.id, reconnectInterval, maxReconnectAttempts]);
  
  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
    }
    
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    
    setIsConnected(false);
  }, []);
  
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        ...message,
        timestamp: new Date().toISOString()
      }));
    }
  }, []);
  
  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'initial_presence':
        setOnlineUsers(message.data || []);
        break;
        
      case 'recent_activities':
        setRecentActivities(message.data || []);
        break;
        
      case 'presence_update':
        setOnlineUsers(prev => {
          const updated = [...prev];
          const index = updated.findIndex(u => u.userId === message.data.userId);
          
          if (index >= 0) {
            updated[index] = message.data;
          } else {
            updated.push(message.data);
          }
          
          return updated.filter(u => u.status !== 'offline');
        });
        break;
        
      case 'activity_update':
        setRecentActivities(prev => [message.data, ...prev.slice(0, 49)]);
        break;
        
      case 'typing_indicator':
        setTypingUsers(prev => {
          const updated = new Map(prev);
          
          if (message.data.isTyping) {
            updated.set(message.data.userId, message.data.typingIn || 'form');
          } else {
            updated.delete(message.data.userId);
          }
          
          return updated;
        });
        
        // Clear typing indicator after 3 seconds
        setTimeout(() => {
          setTypingUsers(prev => {
            const updated = new Map(prev);
            updated.delete(message.data.userId);
            return updated;
          });
        }, 3000);
        break;
        
      case 'ack':
        // Message acknowledged
        break;
        
      case 'error':
        console.error('WebSocket error:', message);
        break;
        
      default:
        console.log('Unknown message type:', message.type);
    }
  }, []);
  
  // WebSocket API methods
  const updatePresence = useCallback((presenceData: any) => {
    sendMessage({
      type: 'presence_update',
      data: presenceData
    });
  }, [sendMessage]);
  
  const recordActivity = useCallback((activityData: any) => {
    sendMessage({
      type: 'activity_record',
      data: activityData
    });
  }, [sendMessage]);
  
  const updateTypingIndicator = useCallback((isTyping: boolean, typingIn?: string) => {
    sendMessage({
      type: 'typing_indicator',
      data: { isTyping, typingIn }
    });
  }, [sendMessage]);
  
  const trackPageView = useCallback((page: string, pageTitle?: string) => {
    sendMessage({
      type: 'page_view',
      data: { page, pageTitle }
    });
  }, [sendMessage]);
  
  const trackCustomerView = useCallback((customerId: string, customerName: string) => {
    sendMessage({
      type: 'customer_view',
      data: { customerId, customerName }
    });
  }, [sendMessage]);
  
  const trackFormEdit = useCallback((formType: string, resourceId?: string, resourceType?: string) => {
    sendMessage({
      type: 'form_edit',
      data: { formType, resourceId, resourceType }
    });
  }, [sendMessage]);
  
  const trackTaskUpdate = useCallback((action: string, taskId: string, taskTitle: string) => {
    sendMessage({
      type: 'task_update',
      data: { action, taskId, taskTitle }
    });
  }, [sendMessage]);
  
  // Connect on mount, disconnect on unmount
  useEffect(() => {
    if (user?.id) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [user?.id, connect, disconnect]);
  
  // Send heartbeat every 30 seconds
  useEffect(() => {
    if (!isConnected) return;
    
    const heartbeat = setInterval(() => {
      sendMessage({ type: 'heartbeat' });
    }, 30000);
    
    return () => clearInterval(heartbeat);
  }, [isConnected, sendMessage]);
  
  return {
    isConnected,
    onlineUsers,
    recentActivities,
    typingUsers,
    updatePresence,
    recordActivity,
    updateTypingIndicator,
    trackPageView,
    trackCustomerView,
    trackFormEdit,
    trackTaskUpdate,
    connect,
    disconnect
  };
}