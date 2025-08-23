/**
 * Real-time Collaboration Dashboard
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Activity, Clock, Eye, Edit, MessageSquare, CheckCircle } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/useAuth';
import { OnlineUsersList, PresenceAvatarGroup } from '@/components/collaboration/presence-indicator';

export default function CollaborationDashboard() {
  const { user } = useAuth();
  const { 
    isConnected, 
    onlineUsers, 
    recentActivities, 
    typingUsers,
    trackPageView 
  } = useWebSocket();

  // Track page view when component mounts
  React.useEffect(() => {
    trackPageView('/collaboration', 'Collaboration Dashboard');
  }, [trackPageView]);

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'page_view': return <Eye className="h-4 w-4" />;
      case 'form_edit': return <Edit className="h-4 w-4" />;
      case 'customer_view': return <Users className="h-4 w-4" />;
      case 'task_update': return <CheckCircle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const formatActivityDescription = (activity: any) => {
    if (activity.data?.page) {
      return `Viewed ${activity.data.pageTitle || activity.data.page}`;
    }
    if (activity.data?.customerName) {
      return `Viewed customer: ${activity.data.customerName}`;
    }
    if (activity.data?.formType) {
      return `Editing ${activity.data.formType} form`;
    }
    if (activity.data?.taskTitle) {
      return `${activity.data.action} task: ${activity.data.taskTitle}`;
    }
    return activity.description || activity.type;
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Collaboration</h1>
          <p className="text-muted-foreground">
            Real-time collaboration and activity tracking for Marin Pest Control
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-muted-foreground">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          {onlineUsers.length > 0 && (
            <PresenceAvatarGroup 
              users={onlineUsers} 
              currentUserId={user?.id} 
              maxVisible={5} 
            />
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Connection Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connection Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isConnected ? 'Online' : 'Offline'}
            </div>
            <p className="text-xs text-muted-foreground">
              WebSocket collaboration features
            </p>
          </CardContent>
        </Card>

        {/* Team Online */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Online</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{onlineUsers.length}</div>
            <p className="text-xs text-muted-foreground">
              {onlineUsers.filter(u => u.userId !== user?.id).length} other team members
            </p>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentActivities.length}</div>
            <p className="text-xs text-muted-foreground">
              Activities in the last hour
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Online Team Members */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Online Team Members
            </CardTitle>
            <CardDescription>
              See who's currently working on the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <OnlineUsersList 
                users={onlineUsers} 
                currentUserId={user?.id} 
                maxVisible={10} 
              />
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activities
            </CardTitle>
            <CardDescription>
              Real-time team activity feed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {recentActivities.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No recent activities
                  </p>
                ) : (
                  recentActivities.map((activity, index) => (
                    <div key={index} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                      <div className="flex-shrink-0 mt-0.5">
                        {getActivityIcon(activity.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {activity.userName || 'Unknown User'}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {activity.userRole || 'team'}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground">
                          {formatActivityDescription(activity)}
                        </p>
                        
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(activity.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Typing Indicators */}
      {typingUsers.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Currently Typing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from(typingUsers.entries()).map(([userId, location]) => {
                const user = onlineUsers.find(u => u.userId === userId);
                return (
                  <div key={userId} className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{user?.userName || 'Unknown User'}</span>
                    <span className="text-muted-foreground">is typing in {location}...</span>
                    <div className="flex gap-0.5">
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feature Information */}
      <Card>
        <CardHeader>
          <CardTitle>Real-time Collaboration Features</CardTitle>
          <CardDescription>
            Enhanced productivity through team awareness and activity tracking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium">Presence Tracking</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• See who's online in real-time</li>
                <li>• View current user activities</li>
                <li>• Track page visits and form edits</li>
                <li>• Monitor customer interactions</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Activity Monitoring</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Real-time activity feed</li>
                <li>• Typing indicators for forms</li>
                <li>• Customer and task updates</li>
                <li>• Team performance insights</li>
              </ul>
            </div>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              WebSocket Connection: <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
                {isConnected ? 'Active' : 'Disconnected'}
              </span>
            </span>
            <span className="text-muted-foreground">
              Last updated: {new Date().toLocaleTimeString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}