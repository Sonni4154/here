import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CheckCircle, XCircle, RefreshCw, Clock, AlertTriangle, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UnifiedSyncStatusProps {
  variant?: 'badge' | 'button' | 'inline';
  showLabel?: boolean;
  size?: 'sm' | 'lg';
}

export default function UnifiedSyncStatus({ 
  variant = 'badge', 
  showLabel = true, 
  size = 'sm' 
}: UnifiedSyncStatusProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch integration status
  const { data: integrations, isLoading } = useQuery({
    queryKey: ['/api/integrations'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch sync status
  const { data: syncStatus } = useQuery({
    queryKey: ['/api/sync/status'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const quickbooksIntegration = Array.isArray(integrations) 
    ? integrations.find((i: any) => i.provider === 'quickbooks') 
    : null;

  // Manual sync mutation
  const syncMutation = useMutation({
    mutationFn: () => fetch('/api/integrations/quickbooks/sync', { method: 'POST' })
      .then(res => res.json()),
    onSuccess: () => {
      toast({
        title: 'Sync Started',
        description: 'QuickBooks sync has been initiated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sync/status'] });
    },
    onError: () => {
      toast({
        title: 'Sync Failed',
        description: 'Unable to start QuickBooks sync. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Connect to QuickBooks mutation
  const connectMutation = useMutation({
    mutationFn: () => {
      window.location.href = '/quickbooks/connect';
      return Promise.resolve();
    },
  });

  const isConnected = quickbooksIntegration?.connected || false;
  const isSyncing = syncStatus?.isRunning === true || syncMutation.isPending;
  const lastSyncAt = quickbooksIntegration?.lastSyncAt;

  const getStatusInfo = () => {
    if (isLoading) {
      return {
        status: 'loading',
        icon: RefreshCw,
        color: 'text-gray-500',
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-300',
        label: 'Loading...'
      };
    }

    if (!isConnected) {
      return {
        status: 'disconnected',
        icon: XCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        label: 'Not Connected'
      };
    }

    if (isSyncing) {
      return {
        status: 'syncing',
        icon: RefreshCw,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        label: 'Syncing...'
      };
    }

    return {
      status: 'connected',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      label: 'Connected'
    };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  const formatLastSync = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  // Badge variant
  if (variant === 'badge') {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div 
            className={`inline-flex items-center cursor-pointer px-2 py-1 rounded-md border ${statusInfo.bgColor} ${statusInfo.borderColor} ${statusInfo.color} hover:opacity-80 transition-all text-xs font-medium`}
          >
            <StatusIcon className={`w-3 h-3 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
            {showLabel && `QuickBooks ${statusInfo.label}`}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <QuickBooksDetails
            isConnected={isConnected}
            isSyncing={isSyncing}
            lastSyncAt={lastSyncAt}
            onSync={() => syncMutation.mutate()}
            onConnect={() => connectMutation.mutate()}
            isLoading={syncMutation.isPending || connectMutation.isPending}
          />
        </PopoverContent>
      </Popover>
    );
  }

  // Button variant
  if (variant === 'button') {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size={size}
            className="relative"
            disabled={isLoading}
          >
            <StatusIcon className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''} ${statusInfo.color}`} />
            {showLabel && statusInfo.label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <QuickBooksDetails
            isConnected={isConnected}
            isSyncing={isSyncing}
            lastSyncAt={lastSyncAt}
            onSync={() => syncMutation.mutate()}
            onConnect={() => connectMutation.mutate()}
            isLoading={syncMutation.isPending || connectMutation.isPending}
          />
        </PopoverContent>
      </Popover>
    );
  }

  // Inline variant
  return (
    <div className="flex items-center space-x-2">
      <StatusIcon className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''} ${statusInfo.color}`} />
      {showLabel && (
        <span className={`text-sm font-medium ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      )}
      {lastSyncAt && (
        <span className="text-xs text-gray-500">
          • Last sync: {formatLastSync(lastSyncAt)}
        </span>
      )}
    </div>
  );
}

// Detailed popover content component
function QuickBooksDetails({
  isConnected,
  isSyncing,
  lastSyncAt,
  onSync,
  onConnect,
  isLoading,
}: {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncAt?: string;
  onSync: () => void;
  onConnect: () => void;
  isLoading: boolean;
}) {
  const formatLastSync = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">QuickBooks Online</h4>
        <div className="flex items-center space-x-1">
          {isConnected ? (
            <CheckCircle className="w-4 h-4 text-green-600" />
          ) : (
            <XCircle className="w-4 h-4 text-red-600" />
          )}
          <span className={`text-sm font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {isConnected ? (
        <>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={isSyncing ? 'text-blue-600' : 'text-green-600'}>
                {isSyncing ? 'Syncing...' : 'Ready'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Last Sync:</span>
              <span className="text-gray-900">{formatLastSync(lastSyncAt)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              onClick={onSync}
              disabled={isSyncing || isLoading}
              size="sm"
              className="w-full"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Manual Sync
                </>
              )}
            </Button>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Connect your QuickBooks Online account to sync customers, products, and invoices.
          </p>
          <Button
            onClick={onConnect}
            disabled={isLoading}
            size="sm"
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Connect QuickBooks
          </Button>
        </div>
      )}
    </div>
  );
}