import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface SyncStatus {
  integrations?: Array<{
    provider: string;
    isActive: boolean;
    lastSyncAt: string | null;
    syncStatus: 'pending' | 'syncing' | 'success' | 'error';
  }>;
  recentLogs?: Array<{
    id: string;
    operation: string;
    entityType: string;
    status: string;
    direction: string;
    errorMessage?: string;
    createdAt: string;
  }>;
}

export default function SyncButton() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const { data: syncStatus, isLoading } = useQuery<SyncStatus>({
    queryKey: ["/api/sync/status"],
    refetchInterval: 5000, // Refresh every 5 seconds
    retry: false,
    // Provide fallback data structure
    select: (data) => ({
      integrations: data?.integrations || [],
      recentLogs: data?.recentLogs || []
    })
  });

  const { data: integrations } = useQuery({
    queryKey: ['/api/integrations'],
    refetchInterval: 5000,
  });

  const quickbooksSyncMutation = useMutation({
    mutationFn: async () => {
      // Use the correct endpoint that matches the working backend
      return await apiRequest('/api/quickbooks/trigger-sync', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sync/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
      toast({
        title: "Sync Complete",
        description: "QuickBooks data has been synchronized successfully.",
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Authentication Required",
          description: "You need to log in to access this feature. Redirecting...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      if (error?.needsConnection) {
        toast({
          title: "QuickBooks Not Connected",
          description: "Please connect to QuickBooks first using the Connect button.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sync Failed",
          description: error instanceof Error ? error.message : "Failed to sync with QuickBooks",
          variant: "destructive",
        });
      }
    },
  });

  const connectToQuickBooks = () => {
    // Use same window to avoid popup blockers - fix for development domain
    window.location.href = '/quickbooks/connect';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'syncing':
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-900 text-green-100">Synced</Badge>;
      case 'error':
        return <Badge variant="destructive" className="bg-red-900 text-red-100">Error</Badge>;
      case 'syncing':
        return <Badge variant="outline" className="bg-blue-900 text-blue-100 border-blue-700">Syncing</Badge>;
      default:
        return <Badge variant="secondary" className="bg-slate-800 text-slate-100">Pending</Badge>;
    }
  };

  // Use the same data source as the header for consistency
  const quickbooksIntegration = Array.isArray(integrations) ? integrations.find((i: any) => i.provider === 'quickbooks') : undefined;
  const isSyncing = quickbooksIntegration?.syncStatus === 'syncing' || quickbooksSyncMutation.isPending;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative"
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
          Sync
          {quickbooksIntegration && (
            <div className="ml-2">
              {quickbooksIntegration.connected ? 
                getStatusIcon('success') : 
                getStatusIcon(quickbooksIntegration.syncStatus)
              }
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-slate-900 mb-2">Integration Status</h3>
            <div className="space-y-2">
              {Array.isArray(integrations) ? integrations.map((integration: any) => (
                <div key={integration.provider} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(integration.syncStatus)}
                    <div>
                      <p className="font-medium text-sm capitalize">{integration.provider}</p>
                      {integration.lastSyncAt && (
                        <p className="text-xs text-slate-500">
                          Last sync: {new Date(integration.lastSyncAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(integration.connected ? 'success' : integration.syncStatus)}
                    {integration.provider === 'quickbooks' && integration.connected && (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                            variant="outline"
                            onClick={() => quickbooksSyncMutation.mutate()}
                            disabled={isSyncing}
                          >
                            {isSyncing ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              'Sync Now'
                            )}
                          </Button>
                      </div>
                    )}
                  </div>
                </div>
              )) : null}
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-medium text-slate-900 mb-2">Recent Activity</h3>
            {syncStatus?.recentLogs && syncStatus.recentLogs.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {syncStatus.recentLogs.map((log) => (
                  <div key={log.id} className="flex items-start space-x-2 p-2 text-sm">
                    {getStatusIcon(log.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-900">
                        {log.operation} {log.entityType}
                        <span className="text-slate-500 ml-1">({log.direction})</span>
                      </p>
                      {log.errorMessage && (
                        <p className="text-red-600 text-xs mt-1">{log.errorMessage}</p>
                      )}
                      <p className="text-xs text-slate-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No recent activity</p>
            )}
          </div>

          {quickbooksIntegration && !quickbooksIntegration.isActive && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-3">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <p className="text-sm text-amber-800">
                    QuickBooks integration is not active. Please configure it in the Integrations page.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}