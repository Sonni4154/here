/**
 * Intuitive Drag-and-Drop Team Productivity Dashboard
 */

import React, { useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, Activity, Clock, TrendingUp, CheckCircle, AlertTriangle, 
  Plus, Settings, BarChart3, Calendar, MapPin, DollarSign,
  Timer, Target, Zap, Award, Eye, Edit, MessageSquare
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useQuery } from '@tanstack/react-query';

// Widget Types
interface Widget {
  id: string;
  type: 'team-stats' | 'active-jobs' | 'recent-activity' | 'performance-metrics' | 'quick-actions' | 'time-tracking' | 'revenue-summary' | 'team-presence';
  title: string;
  size: 'small' | 'medium' | 'large';
  position: number;
  customSettings?: Record<string, any>;
}

// Default dashboard layout
const defaultWidgets: Widget[] = [
  { id: 'team-stats', type: 'team-stats', title: 'Team Overview', size: 'medium', position: 0 },
  { id: 'active-jobs', type: 'active-jobs', title: 'Active Jobs', size: 'large', position: 1 },
  { id: 'performance', type: 'performance-metrics', title: 'Performance Metrics', size: 'medium', position: 2 },
  { id: 'time-tracking', type: 'time-tracking', title: 'Time Tracking', size: 'small', position: 3 },
  { id: 'recent-activity', type: 'recent-activity', title: 'Recent Activity', size: 'large', position: 4 },
  { id: 'revenue', type: 'revenue-summary', title: 'Revenue Summary', size: 'small', position: 5 },
  { id: 'team-presence', type: 'team-presence', title: 'Team Presence', size: 'medium', position: 6 },
  { id: 'quick-actions', type: 'quick-actions', title: 'Quick Actions', size: 'small', position: 7 }
];

// Widget size classes
const sizeClasses = {
  small: 'col-span-1 row-span-1',
  medium: 'col-span-2 row-span-1', 
  large: 'col-span-3 row-span-2'
};

export default function ProductivityDashboard() {
  const { user } = useAuth();
  const { isConnected, onlineUsers, recentActivities } = useWebSocket();
  const [widgets, setWidgets] = useState<Widget[]>(defaultWidgets);
  const [isCustomizing, setIsCustomizing] = useState(false);

  // Fetch dashboard data
  const { data: dashboardStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/stats');
      if (!response.ok) throw new Error('Failed to fetch dashboard stats');
      return response.json();
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { data: timeEntries } = useQuery({
    queryKey: ['time-entries'],
    queryFn: async () => {
      const response = await fetch('/api/time-entries');
      if (!response.ok) throw new Error('Failed to fetch time entries');
      return response.json();
    },
    refetchInterval: 60000
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await fetch('/api/customers');
      if (!response.ok) throw new Error('Failed to fetch customers');
      return response.json();
    }
  });

  // Handle drag and drop
  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(widgets);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update positions
    const updatedWidgets = items.map((widget, index) => ({
      ...widget,
      position: index
    }));

    setWidgets(updatedWidgets);
  }, [widgets]);

  // Widget Components
  const TeamStatsWidget = () => (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Team Overview</CardTitle>
        <Users className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-2xl font-bold">{onlineUsers.length}</div>
            <p className="text-xs text-muted-foreground">Online Now</p>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold">{(customers as any[])?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Total Customers</p>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold">{(timeEntries as any[])?.filter((t: any) => !t.endTime).length || 0}</div>
            <p className="text-xs text-muted-foreground">Active Jobs</p>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold">{(dashboardStats as any)?.completedToday || 0}</div>
            <p className="text-xs text-muted-foreground">Completed Today</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const ActiveJobsWidget = () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Active Jobs
        </CardTitle>
        <CardDescription>Current ongoing work</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px]">
          <div className="space-y-3">
            {(timeEntries as any[])?.filter((entry: any) => !entry.endTime)?.slice(0, 6).map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="space-y-1">
                  <div className="font-medium">{entry.customerName || 'Unknown Customer'}</div>
                  <div className="text-sm text-muted-foreground">{entry.description || 'No description'}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Started {new Date(entry.startTime).toLocaleTimeString()}
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Active
                  </Badge>
                  <div className="text-sm text-muted-foreground mt-1">
                    {entry.employeeName}
                  </div>
                </div>
              </div>
            )) || (
              <div className="text-center py-8 text-muted-foreground">
                No active jobs at the moment
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );

  const PerformanceMetricsWidget = () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Performance Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Daily Target</span>
            <span>78%</span>
          </div>
          <Progress value={78} className="w-full" />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Customer Satisfaction</span>
            <span>94%</span>
          </div>
          <Progress value={94} className="w-full" />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Response Time</span>
            <span>85%</span>
          </div>
          <Progress value={85} className="w-full" />
        </div>
      </CardContent>
    </Card>
  );

  const TimeTrackingWidget = () => (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Time Tracking</CardTitle>
        <Timer className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-2xl font-bold">6.5h</div>
          <p className="text-xs text-muted-foreground">Today's Total</p>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Currently tracking</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const RecentActivityWidget = () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
        <CardDescription>Latest team activities</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px]">
          <div className="space-y-3">
            {recentActivities.slice(0, 8).map((activity, index) => (
              <div key={index} className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{activity.userName?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div className="space-y-1 flex-1">
                  <div className="text-sm">{activity.description || activity.type}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            )) || (
              <div className="text-center py-8 text-muted-foreground">
                No recent activity
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );

  const RevenueSummaryWidget = () => (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Revenue</CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-2xl font-bold">$12.4k</div>
          <p className="text-xs text-muted-foreground">This Month</p>
          <div className="text-xs text-green-600">+12% from last month</div>
        </div>
      </CardContent>
    </Card>
  );

  const TeamPresenceWidget = () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Presence
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {onlineUsers.slice(0, 4).map((user, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">{user.userName?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <span className="text-sm">{user.userName}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {user.currentPage || 'Dashboard'}
              </Badge>
            </div>
          )) || (
            <div className="text-center py-4 text-muted-foreground">
              No team members online
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const QuickActionsWidget = () => (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
        <Zap className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Button size="sm" className="w-full justify-start" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          New Job
        </Button>
        <Button size="sm" className="w-full justify-start" variant="outline">
          <Timer className="h-4 w-4 mr-2" />
          Clock In
        </Button>
        <Button size="sm" className="w-full justify-start" variant="outline">
          <BarChart3 className="h-4 w-4 mr-2" />
          Reports
        </Button>
      </CardContent>
    </Card>
  );

  // Widget renderer
  const renderWidget = (widget: Widget) => {
    switch (widget.type) {
      case 'team-stats': return <TeamStatsWidget />;
      case 'active-jobs': return <ActiveJobsWidget />;
      case 'performance-metrics': return <PerformanceMetricsWidget />;
      case 'time-tracking': return <TimeTrackingWidget />;
      case 'recent-activity': return <RecentActivityWidget />;
      case 'revenue-summary': return <RevenueSummaryWidget />;
      case 'team-presence': return <TeamPresenceWidget />;
      case 'quick-actions': return <QuickActionsWidget />;
      default: return <div>Unknown widget</div>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Productivity Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time insights and customizable widgets for team performance monitoring
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-muted-foreground">
              {isConnected ? 'Live Updates' : 'Offline'}
            </span>
          </div>
          
          <Button
            variant={isCustomizing ? "default" : "outline"}
            onClick={() => setIsCustomizing(!isCustomizing)}
          >
            <Settings className="h-4 w-4 mr-2" />
            {isCustomizing ? 'Done' : 'Customize'}
          </Button>
        </div>
      </div>

      {isCustomizing && (
        <Card>
          <CardHeader>
            <CardTitle>Dashboard Customization</CardTitle>
            <CardDescription>
              Drag and drop widgets to rearrange your dashboard layout
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Customization mode active. Drag widgets to reorder them.
            </div>
          </CardContent>
        </Card>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="dashboard" direction="horizontal">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="grid grid-cols-4 gap-6 auto-rows-fr"
            >
              {widgets
                .sort((a, b) => a.position - b.position)
                .map((widget, index) => (
                  <Draggable
                    key={widget.id}
                    draggableId={widget.id}
                    index={index}
                    isDragDisabled={!isCustomizing}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`${sizeClasses[widget.size]} ${
                          snapshot.isDragging ? 'opacity-50' : ''
                        } ${isCustomizing ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}
                      >
                        {renderWidget(widget)}
                      </div>
                    )}
                  </Draggable>
                ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Performance Summary Footer */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-4 gap-6 text-center">
            <div className="space-y-2">
              <div className="text-2xl font-bold text-blue-600">98.2%</div>
              <div className="text-sm text-muted-foreground">System Uptime</div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-green-600">4.8/5</div>
              <div className="text-sm text-muted-foreground">Avg Rating</div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-purple-600">2.3m</div>
              <div className="text-sm text-muted-foreground">Response Time</div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-orange-600">127</div>
              <div className="text-sm text-muted-foreground">Jobs This Month</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}