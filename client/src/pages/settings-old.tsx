import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Settings as SettingsIcon, ExternalLink, Database, FileSpreadsheet, Calendar, AlertCircle, CheckCircle } from "lucide-react";
import { SiQuickbooks, SiGoogle, SiMicrosoft, SiPostgresql } from "react-icons/si";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// PostgreSQL Connection Form Schema
const postgresqlFormSchema = z.object({
  name: z.string().min(1, "Connection name is required"),
  host: z.string().min(1, "Host is required"),
  port: z.coerce.number().min(1).max(65535, "Port must be between 1 and 65535").default(5432),
  database: z.string().min(1, "Database name is required"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  ssl: z.boolean().default(false),
  autoSync: z.boolean().default(false),
  syncInterval: z.coerce.number().min(5).max(1440).optional(), // 5 minutes to 24 hours
});

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddDatabase, setShowAddDatabase] = useState(false);

  // Queries
  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ["/api/integrations"]
  });

  const { data: databaseConnections = [], isLoading: dbLoading } = useQuery({
    queryKey: ["/api/database-connections"]
  });

  const { data: syncStatus } = useQuery({
    queryKey: ["/api/sync/status"],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // PostgreSQL Form
  const postgresqlForm = useForm({
    resolver: zodResolver(postgresqlFormSchema),
    defaultValues: {
      name: "",
      host: "",
      port: 5432,
      database: "",
      username: "",
      password: "",
      ssl: false,
      autoSync: false,
      syncInterval: 60
    }
  });

  // Mutations
  const syncQuickBooks = useMutation({
    mutationFn: () => apiRequest("/api/integrations/quickbooks/sync", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sync/status"] });
      toast({ title: "QuickBooks sync completed successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Sync failed", description: error.message, variant: "destructive" });
    }
  });

  const initialDataPull = useMutation({
    mutationFn: () => apiRequest("/api/integrations/quickbooks/initial-sync", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Initial QuickBooks data pull completed", description: "Customers, products, and invoices imported" });
    },
    onError: (error: any) => {
      toast({ title: "Data pull failed", description: error.message, variant: "destructive" });
    }
  });

  const toggleAutomatedSync = useMutation({
    mutationFn: (enable: boolean) => {
      const endpoint = enable ? "/api/sync/start-automated" : "/api/sync/stop-automated";
      return apiRequest(endpoint, { 
        method: "POST", 
        body: enable ? { intervalMinutes: 60 } : {} 
      });
    },
    onSuccess: (_, enable) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sync/status"] });
      toast({ 
        title: enable ? "Automated sync enabled" : "Automated sync disabled",
        description: enable ? "QuickBooks will sync every hour" : "Manual sync only"
      });
    },
    onError: (error: any) => {
      toast({ title: "Failed to toggle automated sync", description: error.message, variant: "destructive" });
    }
  });

  const triggerImmediateSync = useMutation({
    mutationFn: () => apiRequest("/api/sync/trigger-immediate", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sync/status"] });
      toast({ title: "Immediate sync completed" });
    },
    onError: (error: any) => {
      toast({ title: "Immediate sync failed", description: error.message, variant: "destructive" });
    }
  });

  // PostgreSQL Database Mutations
  const addDatabaseConnection = useMutation({
    mutationFn: (data: any) => apiRequest("/api/database-connections", { method: "POST", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/database-connections"] });
      postgresqlForm.reset();
      setShowAddDatabase(false);
      toast({ title: "Database connection added successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to add database connection", description: error.message, variant: "destructive" });
    }
  });

  const testDatabaseConnection = useMutation({
    mutationFn: (data: any) => apiRequest("/api/database-connections/test", { method: "POST", body: data }),
    onSuccess: () => {
      toast({ title: "Database connection successful", description: "Connection test passed" });
    },
    onError: (error: any) => {
      toast({ title: "Connection test failed", description: error.message, variant: "destructive" });
    }
  });

  const syncDatabase = useMutation({
    mutationFn: (connectionId: string) => apiRequest(`/api/database-connections/${connectionId}/sync`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/database-connections"] });
      toast({ title: "Database sync completed successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Database sync failed", description: error.message, variant: "destructive" });
    }
  });

  const toggleDatabaseAutoSync = useMutation({
    mutationFn: ({ connectionId, autoSync, syncInterval }: { connectionId: string, autoSync: boolean, syncInterval?: number }) => 
      apiRequest(`/api/database-connections/${connectionId}/auto-sync`, { 
        method: "POST", 
        body: { autoSync, syncInterval } 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/database-connections"] });
      toast({ title: "Auto-sync settings updated" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update auto-sync", description: error.message, variant: "destructive" });
    }
  });

  // Form handlers
  const onSubmitPostgreSQL = (data: any) => {
    addDatabaseConnection.mutate(data);
  };

  const onTestConnection = () => {
    const data = postgresqlForm.getValues();
    testDatabaseConnection.mutate(data);
  };

  const importSampleData = useMutation({
    mutationFn: () => apiRequest("/api/import-sample-data", "POST"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Sample data imported successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
    }
  });

  const quickbooksIntegration = (integrations as any[]).find((int: any) => int.provider === 'quickbooks');
  const googleIntegration = (integrations as any[]).find((int: any) => int.provider === 'google');
  const jotformIntegration = (integrations as any[]).find((int: any) => int.provider === 'jotform');

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge variant="default" className="bg-green-600">
        <CheckCircle className="w-3 h-3 mr-1" />
        Connected
      </Badge>
    ) : (
      <Badge variant="secondary">
        <AlertCircle className="w-3 h-3 mr-1" />
        Not Connected
      </Badge>
    );
  };

  const getLastSyncText = (lastSync: string | null) => {
    if (!lastSync) return "Never synced";
    return `Last synced: ${format(new Date(lastSync), 'MMM dd, yyyy at h:mm a')}`;
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Integrations</h1>
        <p className="text-muted-foreground mt-1">Connect and manage external services</p>
      </div>

      {/* Sync Status Overview */}
      {syncStatus && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <RefreshCw className="w-5 h-5 mr-2" />
              Sync Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {syncStatus.integrations?.map((integration: any) => (
                <div key={integration.provider} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium capitalize">{integration.provider}</p>
                    <p className="text-sm text-muted-foreground">
                      {getLastSyncText(integration.lastSyncAt)}
                    </p>
                  </div>
                  {getStatusBadge(integration.isActive)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Integrations */}
      <div className="space-y-6">
        {/* QuickBooks Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <SiQuickbooks className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle>QuickBooks Online</CardTitle>
                  <CardDescription>Sync customers, products, and invoices</CardDescription>
                </div>
              </div>
              {getStatusBadge(quickbooksIntegration?.isActive || false)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Connect your QuickBooks account to automatically sync customer data, products, and invoices. 
                This enables seamless two-way data flow between your time tracking system and accounting.
              </p>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Features:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Customer data synchronization</li>
                    <li>• Product and service catalog sync</li>
                    <li>• Invoice creation and tracking</li>
                    <li>• Real-time data updates</li>
                  </ul>
                </div>
                
                <div className="flex space-x-2">
                  {quickbooksIntegration?.isActive ? (
                    <>
                      <Button
                        onClick={() => initialDataPull.mutate()}
                        disabled={initialDataPull.isPending}
                        variant="outline"
                        size="sm"
                      >
                        <Database className="w-4 h-4 mr-2" />
                        {initialDataPull.isPending ? "Pulling Data..." : "Pull Data"}
                      </Button>
                      <Button
                        onClick={() => syncQuickBooks.mutate()}
                        disabled={syncQuickBooks.isPending}
                        variant="outline"
                        size="sm"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        {syncQuickBooks.isPending ? "Syncing..." : "Sync Now"}
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => window.location.href = '/api/integrations/quickbooks/connect'}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Connect QuickBooks
                    </Button>
                  )}
                </div>
              </div>

              {quickbooksIntegration?.lastSyncAt && (
                <p className="text-sm text-muted-foreground">
                  {getLastSyncText(quickbooksIntegration.lastSyncAt)}
                </p>
              )}

              {/* Automated Sync Controls */}
              {quickbooksIntegration?.isActive && (
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="automated-sync" className="text-sm font-medium">
                        Automated Sync
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically sync QuickBooks data every hour
                      </p>
                    </div>
                    <Switch
                      id="automated-sync"
                      checked={syncStatus?.syncStatus?.isActive || false}
                      onCheckedChange={(checked) => toggleAutomatedSync.mutate(checked)}
                      disabled={toggleAutomatedSync.isPending}
                    />
                  </div>
                  
                  {syncStatus?.syncStatus?.isActive && (
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="bg-green-50">
                        <Play className="w-3 h-3 mr-1" />
                        Auto-sync Active
                      </Badge>
                      <Button
                        onClick={() => triggerImmediateSync.mutate()}
                        disabled={triggerImmediateSync.isPending}
                        variant="ghost"
                        size="sm"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        {triggerImmediateSync.isPending ? "Syncing..." : "Sync Now"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Google Workspace Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <SiGoogle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <CardTitle>Google Workspace</CardTitle>
                  <CardDescription>Calendar, Sheets, and Drive integration</CardDescription>
                </div>
              </div>
              {getStatusBadge(googleIntegration?.isActive || false)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Connect Google Workspace for employee scheduling, data export to Sheets, and document storage.
              </p>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Features:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Employee calendar scheduling</li>
                    <li>• Export reports to Google Sheets</li>
                    <li>• Store job photos in Drive</li>
                    <li>• Task assignment via Calendar</li>
                  </ul>
                </div>
                
                <div className="flex space-x-2">
                  <Button variant="outline" disabled>
                    <Calendar className="w-4 h-4 mr-2" />
                    Coming Soon
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sample Data Import */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Database className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle>Sample Data Import</CardTitle>
                  <CardDescription>Load real Marin Pest Control data for testing</CardDescription>
                </div>
              </div>
              <Badge variant="outline">Development Tool</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Import real customer and product data from Marin Pest Control CSV files. This includes 466 customers 
                and 89 products/services for comprehensive testing of the autocomplete and management features.
              </p>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Includes:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• 466 real customer records</li>
                    <li>• 89 products and services</li>
                    <li>• Contact information and addresses</li>
                    <li>• Service categories and pricing</li>
                  </ul>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    onClick={() => importSampleData.mutate()}
                    disabled={importSampleData.isPending}
                    variant="outline"
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Import Sample Data
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* JotForm Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <FileSpreadsheet className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <CardTitle>JotForm</CardTitle>
                  <CardDescription>Form submissions and workflow automation</CardDescription>
                </div>
              </div>
              {getStatusBadge(jotformIntegration?.isActive || false)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Automatically process form submissions and trigger workflow actions based on customer requests.
              </p>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Features:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Automatic form processing</li>
                    <li>• Workflow trigger automation</li>
                    <li>• Customer request routing</li>
                    <li>• Real-time notifications</li>
                  </ul>
                </div>
                
                <div className="flex space-x-2">
                  <Button variant="outline" disabled>
                    <Settings className="w-4 h-4 mr-2" />
                    Configure
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Sync Logs */}
        {syncStatus?.recentLogs && syncStatus.recentLogs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Sync Activity</CardTitle>
              <CardDescription>Latest synchronization events and logs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {syncStatus.recentLogs.map((log: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{log.provider}</p>
                      <p className="text-sm text-muted-foreground">{log.description}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                        {log.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(log.timestamp), 'MMM dd, h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}