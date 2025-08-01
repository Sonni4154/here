import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Play, 
  Pause, 
  Settings, 
  History, 
  Zap, 
  CheckCircle, 
  XCircle, 
  Clock,
  Activity,
  Bell,
  Calendar,
  Database,
  Mail,
  Cog
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface WorkflowTrigger {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  triggerType: string;
  triggerEvent: string;
  actions: any[];
  priority: number;
  createdAt: string;
}

interface WorkflowExecution {
  id: string;
  triggerId: string;
  status: string;
  triggerData: any;
  executionResults: any[];
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
}

export default function WorkflowsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: triggers = [], isLoading: triggersLoading } = useQuery<WorkflowTrigger[]>({
    queryKey: ["/api/workflows/triggers"],
  });

  const { data: executions = [], isLoading: executionsLoading } = useQuery<WorkflowExecution[]>({
    queryKey: ["/api/workflows/executions"],
  });

  const initializeDefaultsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/workflows/initialize-defaults", "POST");
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Default workflow triggers have been initialized",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/workflows/triggers"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to initialize default triggers",
        variant: "destructive",
      });
    },
  });

  const manualTriggerMutation = useMutation({
    mutationFn: async ({ event, data }: { event: string; data: any }) => {
      await apiRequest("/api/workflows/trigger-manual", "POST", { event, data });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Workflow has been triggered successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/workflows/executions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to trigger workflow",
        variant: "destructive",
      });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'send_notification':
      case 'send_email':
        return <Bell className="h-4 w-4" />;
      case 'sync_quickbooks':
      case 'sync_google_calendar':
        return <Database className="h-4 w-4" />;
      case 'create_schedule':
        return <Calendar className="h-4 w-4" />;
      case 'create_time_entry':
        return <Clock className="h-4 w-4" />;
      default:
        return <Cog className="h-4 w-4" />;
    }
  };

  const getTriggerTypeColor = (triggerType: string) => {
    switch (triggerType) {
      case 'form_submission':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      case 'time_entry':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'status_change':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
      case 'schedule_event':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
    }
  };

  const demoTriggers = [
    {
      event: 'job_form_submit',
      data: {
        customerId: 'demo_customer',
        serviceType: 'Insect Spraying',
        description: 'Quarterly pest control service',
        estimatedHours: 2,
      },
    },
    {
      event: 'material_form_submit',
      data: {
        itemName: 'Hardware Cloth 1/4"',
        quantity: 5,
        unitCost: 25.99,
        totalCost: 129.95,
      },
    },
    {
      event: 'clock_in',
      data: {
        location: 'Office',
        notes: 'Starting daily rounds',
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Automated Workflows</h1>
          <p className="text-muted-foreground">
            Manage workflow triggers and view automation history
          </p>
        </div>
        <Button
          onClick={() => initializeDefaultsMutation.mutate()}
          disabled={initializeDefaultsMutation.isPending}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Zap className="mr-2 h-4 w-4" />
          Initialize Default Triggers
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Triggers</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {triggers.filter(t => t.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">
              {triggers.length} total triggers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Executions</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {executions.filter(e => 
                new Date(e.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {executions.length > 0 
                ? Math.round((executions.filter(e => e.status === 'completed').length / executions.length) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {executions.filter(e => e.status === 'completed').length} successful
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="triggers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="triggers">Workflow Triggers</TabsTrigger>
          <TabsTrigger value="executions">Execution History</TabsTrigger>
          <TabsTrigger value="test">Test Workflows</TabsTrigger>
        </TabsList>

        {/* Triggers Tab */}
        <TabsContent value="triggers" className="space-y-4">
          {triggersLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : triggers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Zap className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Workflow Triggers</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Initialize default triggers to get started with automated workflows
                </p>
                <Button
                  onClick={() => initializeDefaultsMutation.mutate()}
                  disabled={initializeDefaultsMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Zap className="mr-2 h-4 w-4" />
                  Initialize Default Triggers
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {triggers.map(trigger => (
                <Card key={trigger.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          trigger.isActive ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                        <CardTitle className="text-lg">{trigger.name}</CardTitle>
                        <Badge className={getTriggerTypeColor(trigger.triggerType)}>
                          {trigger.triggerType.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">Priority: {trigger.priority}</Badge>
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription>{trigger.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Trigger Event</h4>
                        <Badge variant="secondary">{trigger.triggerEvent}</Badge>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Actions ({trigger.actions?.length || 0})</h4>
                        <div className="flex flex-wrap gap-2">
                          {trigger.actions?.map((action: any, index: number) => (
                            <div key={index} className="flex items-center space-x-1 bg-muted px-2 py-1 rounded">
                              {getActionIcon(action.type)}
                              <span className="text-sm">{action.type.replace('_', ' ')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Executions Tab */}
        <TabsContent value="executions" className="space-y-4">
          {executionsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : executions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <History className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Executions Yet</h3>
                <p className="text-muted-foreground text-center">
                  Workflow executions will appear here when triggers are activated
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {executions.map(execution => (
                  <Card key={execution.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(execution.status)}
                          <span className="font-medium">
                            {triggers.find(t => t.id === execution.triggerId)?.name || 'Unknown Trigger'}
                          </span>
                        </div>
                        <Badge variant={execution.status === 'completed' ? 'default' : 
                                     execution.status === 'failed' ? 'destructive' : 'secondary'}>
                          {execution.status}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Started: {formatDistanceToNow(new Date(execution.startedAt))} ago</p>
                        {execution.completedAt && (
                          <p>Completed: {formatDistanceToNow(new Date(execution.completedAt))} ago</p>
                        )}
                        {execution.errorMessage && (
                          <p className="text-red-500">Error: {execution.errorMessage}</p>
                        )}
                      </div>

                      {execution.executionResults && execution.executionResults.length > 0 && (
                        <div className="mt-3">
                          <h5 className="text-sm font-medium mb-1">Action Results</h5>
                          <div className="space-y-1">
                            {execution.executionResults.map((result: any, index: number) => (
                              <div key={index} className="flex items-center space-x-2 text-sm">
                                {result.success ? (
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                ) : (
                                  <XCircle className="h-3 w-3 text-red-500" />
                                )}
                                <span>{result.success ? 'Success' : result.error}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* Test Tab */}
        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Workflow Triggers</CardTitle>
              <CardDescription>
                Manually trigger workflows to test automation behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {demoTriggers.map((demo, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{demo.event.replace('_', ' ').toUpperCase()}</h4>
                    <p className="text-sm text-muted-foreground">
                      {demo.event === 'job_form_submit' && 'Simulates job form submission'}
                      {demo.event === 'material_form_submit' && 'Simulates material entry submission'}
                      {demo.event === 'clock_in' && 'Simulates employee clock in'}
                    </p>
                  </div>
                  <Button
                    onClick={() => manualTriggerMutation.mutate({
                      event: demo.event,
                      data: demo.data,
                    })}
                    disabled={manualTriggerMutation.isPending}
                    variant="outline"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Test Trigger
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}