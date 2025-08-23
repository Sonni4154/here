import { useState, useEffect, useRef } from 'react';
import { useAuth } from './useAuth';

interface OnlineUser {
  id: string;
  userName: string;
  currentPage?: string;
}

interface RecentActivity {
  id: string;
  type: string;
  userName: string;
  description: string;
  timestamp: string;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  onlineUsers: OnlineUser[];
  recentActivities: RecentActivity[];
  sendMessage: (message: any) => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!user) return;

    // Connect to WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        console.log('WebSocket connected');
        
        // Send user identification
        ws.send(JSON.stringify({
          type: 'user_connect',
          userId: user.id,
          userName: user.email?.split('@')[0] || 'Unknown User',
          currentPage: window.location.pathname
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'users_update':
              setOnlineUsers(data.users || []);
              break;
            case 'activity_update':
              setRecentActivities(prev => [data.activity, ...prev].slice(0, 20));
              break;
            case 'activities_update':
              setRecentActivities(data.activities || []);
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log('WebSocket disconnected');
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [user]);

  const sendMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  return {
    isConnected,
    onlineUsers,
    recentActivities,
    sendMessage
  };
}