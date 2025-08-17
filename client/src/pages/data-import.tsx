import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Upload, 
  Database, 
  Users, 
  ShoppingCart, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Play,
  Pause
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ImportResult {
  imported: number;
  errors: string[];
}

interface SyncStatus {
  isRunning: boolean;
  activeIntervals: number;
  nextDataImportSync: string;
  nextQuickBooksSync: string;
}

export default function DataImport() {
  const queryClient = useQueryClient();
  const [lastImportResult, setLastImportResult] = useState<{
    products?: ImportResult;
    customers?: ImportResult;
  } | null>(null);

  // Get current sync status
  const { data: syncStatus } = useQuery<SyncStatus>({
    queryKey: ['/api/sync/status'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Import all data mutation
  const importAllMutation = useMutation({
    mutationFn: () => apiRequest('/api/import-all-data', { method: 'POST' }),
    onSuccess: (data) => {
      setLastImportResult(data);
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    },
  });

  // Import products mutation
  const importProductsMutation = useMutation({
    mutationFn: () => apiRequest('/api/import-products', { method: 'POST' }),
    onSuccess: (data) => {
      setLastImportResult({ products: data });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    },
  });

  // Import customers mutation
  const importCustomersMutation = useMutation({
    mutationFn: () => apiRequest('/api/import-customers', { method: 'POST' }),
    onSuccess: (data) => {
      setLastImportResult({ customers: data });
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
    },
  });

  // Manual sync trigger mutation
  const triggerSyncMutation = useMutation({
    mutationFn: (type: 'data' | 'quickbooks') => 
      apiRequest(`/api/sync/trigger-${type}`, { method: 'POST' }),
  });

  const isImporting = importAllMutation.isPending || 
                     importProductsMutation.isPending || 
                     importCustomersMutation.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Data Import & Sync</h1>
        <p className="text-muted-foreground">
          Import products, customers, and manage automated synchronization
        </p>
      </div>

      {/* Sync Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Automated Sync Status</span>
          </CardTitle>
          <CardDescription>
            Scheduled synchronization with CSV data and QuickBooks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Sync Scheduler</p>
              <p className="text-sm text-muted-foreground">
                {syncStatus?.isRunning ? 'Active' : 'Inactive'} • {syncStatus?.activeIntervals || 0} intervals running
              </p>
            </div>
            <Badge variant={syncStatus?.isRunning ? "default" : "secondary"}>
              {syncStatus?.isRunning ? (
                <><Play className="w-3 h-3 mr-1" /> Running</>
              ) : (
                <><Pause className="w-3 h-3 mr-1" /> Stopped</>
              )}
            </Badge>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center">
                <Database className="w-4 h-4 mr-2" />
                Data Import Sync
              </h4>
              <p className="text-sm text-muted-foreground">
                {syncStatus?.nextDataImportSync}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => triggerSyncMutation.mutate('data')}
                disabled={triggerSyncMutation.isPending}
              >
                {triggerSyncMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Trigger Now
              </Button>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium flex items-center">
                <RefreshCw className="w-4 h-4 mr-2" />
                QuickBooks Sync
              </h4>
              <p className="text-sm text-muted-foreground">
                {syncStatus?.nextQuickBooksSync}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => triggerSyncMutation.mutate('quickbooks')}
                disabled={triggerSyncMutation.isPending}
              >
                {triggerSyncMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Trigger Now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manual Import Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ShoppingCart className="w-5 h-5" />
              <span>Products & Services</span>
            </CardTitle>
            <CardDescription>
              Import product catalog from CSV file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => importProductsMutation.mutate()}
              disabled={isImporting}
              className="w-full"
            >
              {importProductsMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Import Products
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Customer Database</span>
            </CardTitle>
            <CardDescription>
              Import customer list from CSV file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => importCustomersMutation.mutate()}
              disabled={isImporting}
              className="w-full"
            >
              {importCustomersMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Import Customers
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="w-5 h-5" />
              <span>Import All Data</span>
            </CardTitle>
            <CardDescription>
              Import both products and customers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => importAllMutation.mutate()}
              disabled={isImporting}
              className="w-full"
              variant="default"
            >
              {importAllMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Import All
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Import Results */}
      {lastImportResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span>Import Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {lastImportResult.products && (
              <div>
                <h4 className="font-medium">Products</h4>
                <p className="text-sm text-muted-foreground">
                  {lastImportResult.products.imported} items imported
                </p>
                {lastImportResult.products.errors.length > 0 && (
                  <Alert className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {lastImportResult.products.errors.length} errors occurred during import
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {lastImportResult.customers && (
              <div>
                <h4 className="font-medium">Customers</h4>
                <p className="text-sm text-muted-foreground">
                  {lastImportResult.customers.imported} items imported
                </p>
                {lastImportResult.customers.errors.length > 0 && (
                  <Alert className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {lastImportResult.customers.errors.length} errors occurred during import
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}