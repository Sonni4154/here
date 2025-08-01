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

interface SyncStatus {
  integrations: Array<{
    provider: string;
    isActive: boolean;
    lastSyncAt: string | null;
    syncStatus: 'pending' | 'syncing' | 'success' | 'error';
  }>;
  recentLogs: Array<{
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
  });

  const quickbooksSyncMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/sync/quickbooks', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sync/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Sync Complete",
        description: "QuickBooks data has been synchronized successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Failed to sync with QuickBooks",
        variant: "destructive",
      });
    },
  });

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
        return <Badge variant="default" className="bg-green-100 text-green-800">Synced</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'syncing':
        return <Badge variant="outline" className="text-blue-600">Syncing</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const quickbooksIntegration = syncStatus?.integrations.find(i => i.provider === 'quickbooks');
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
              {getStatusIcon(quickbooksIntegration.syncStatus)}
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-slate-900 mb-2">Integration Status</h3>
            <div className="space-y-2">
              {syncStatus?.integrations.map((integration) => (
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
                    {getStatusBadge(integration.syncStatus)}
                    {integration.provider === 'quickbooks' && integration.isActive && (
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
                    )}
                  </div>
                </div>
              ))}
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