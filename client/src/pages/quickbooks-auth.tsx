import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle2, XCircle, AlertCircle, ExternalLink } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function QuickBooksAuth() {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch QuickBooks integration status
  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ["/api/integrations"],
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  const quickbooksIntegration = integrations.find((int: any) => int.provider === "quickbooks");
  const isConnected = quickbooksIntegration?.isActive;
  const lastSyncAt = quickbooksIntegration?.lastSyncAt;
  const expiresAt = quickbooksIntegration?.expiresAt;

  // Check token expiration
  const isTokenExpired = expiresAt ? new Date(expiresAt) < new Date() : true;
  const willExpireSoon = expiresAt ? 
    (new Date(expiresAt).getTime() - Date.now()) < (24 * 60 * 60 * 1000) : // Less than 24 hours
    false;

  // Initiate QuickBooks authorization
  const initiateAuth = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/quickbooks/auth", "GET");
    },
    onSuccess: (data: any) => {
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Authorization Failed",
        description: error.message || "Failed to initiate QuickBooks authorization",
        variant: "destructive"
      });
    }
  });

  // Refresh QuickBooks tokens
  const refreshTokens = useMutation({
    mutationFn: async () => {
      setIsRefreshing(true);
      return apiRequest("/api/quickbooks/refresh", "POST");
    },
    onSuccess: () => {
      setIsRefreshing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
      toast({
        title: "Tokens Refreshed",
        description: "QuickBooks tokens have been successfully refreshed",
      });
    },
    onError: (error: any) => {
      setIsRefreshing(false);
      toast({
        title: "Refresh Failed",
        description: error.message || "Failed to refresh QuickBooks tokens. Please reauthorize.",
        variant: "destructive"
      });
    }
  });

  // Disconnect QuickBooks
  const disconnect = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/quickbooks/disconnect", "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
      toast({
        title: "Disconnected",
        description: "QuickBooks has been disconnected",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Disconnect Failed",
        description: error.message || "Failed to disconnect QuickBooks",
        variant: "destructive"
      });
    }
  });

  // Test QuickBooks connection
  const testConnection = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/quickbooks/test", "GET");
    },
    onSuccess: (data: any) => {
      toast({
        title: "Connection Successful",
        description: `Connected to ${data.companyName || "QuickBooks"}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Connection Test Failed",
        description: error.message || "Failed to connect to QuickBooks",
        variant: "destructive"
      });
    }
  });

  const getStatusColor = () => {
    if (!isConnected || isTokenExpired) return "destructive";
    if (willExpireSoon) return "warning";
    return "success";
  };

  const getStatusIcon = () => {
    if (!isConnected || isTokenExpired) return <XCircle className="w-5 h-5" />;
    if (willExpireSoon) return <AlertCircle className="w-5 h-5" />;
    return <CheckCircle2 className="w-5 h-5" />;
  };

  const getStatusText = () => {
    if (!isConnected) return "Not Connected";
    if (isTokenExpired) return "Token Expired";
    if (willExpireSoon) return "Token Expiring Soon";
    return "Connected";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">QuickBooks Integration</h1>
        <p className="text-muted-foreground mt-2">
          Manage your QuickBooks Online connection and authentication
        </p>
      </div>

      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Connection Status</span>
            <Badge variant={getStatusColor() as any} className="flex items-center gap-2">
              {getStatusIcon()}
              {getStatusText()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConnected ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Company ID</p>
                  <p className="text-sm">{quickbooksIntegration?.realmId || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Last Sync</p>
                  <p className="text-sm">
                    {lastSyncAt ? format(new Date(lastSyncAt), "PPp") : "Never"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Token Expires</p>
                  <p className="text-sm">
                    {expiresAt ? format(new Date(expiresAt), "PPp") : "Unknown"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Environment</p>
                  <p className="text-sm">{process.env.QBO_ENV || "Production"}</p>
                </div>
              </div>

              {(isTokenExpired || willExpireSoon) && (
                <Alert variant={isTokenExpired ? "destructive" : "warning"}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>
                    {isTokenExpired ? "Token Expired" : "Token Expiring Soon"}
                  </AlertTitle>
                  <AlertDescription>
                    {isTokenExpired 
                      ? "Your QuickBooks tokens have expired. Please refresh or reauthorize."
                      : "Your QuickBooks tokens will expire soon. Please refresh to maintain connection."}
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Not Connected</AlertTitle>
              <AlertDescription>
                Connect to QuickBooks to enable automatic synchronization of customers, products, and invoices.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>
            Manage your QuickBooks connection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConnected || isTokenExpired ? (
            <div className="space-y-4">
              <Button 
                onClick={() => initiateAuth.mutate()}
                disabled={initiateAuth.isPending}
                className="w-full"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {initiateAuth.isPending ? "Redirecting..." : "Connect to QuickBooks"}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                You will be redirected to QuickBooks to authorize the connection
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={() => refreshTokens.mutate()}
                disabled={isRefreshing || refreshTokens.isPending}
                variant={willExpireSoon ? "default" : "outline"}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                {isRefreshing ? "Refreshing..." : "Refresh Tokens"}
              </Button>
              
              <Button
                onClick={() => testConnection.mutate()}
                disabled={testConnection.isPending}
                variant="outline"
              >
                {testConnection.isPending ? "Testing..." : "Test Connection"}
              </Button>
              
              <Button
                onClick={() => {
                  if (confirm("Are you sure you want to disconnect from QuickBooks?")) {
                    disconnect.mutate();
                  }
                }}
                disabled={disconnect.isPending}
                variant="destructive"
              >
                {disconnect.isPending ? "Disconnecting..." : "Disconnect"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Token Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• QuickBooks tokens expire after 60 minutes of inactivity</p>
            <p>• Refresh tokens are valid for 100 days</p>
            <p>• Automatic refresh runs every hour when the system is active</p>
            <p>• Manual refresh is recommended if you see sync errors</p>
            <p>• Reauthorization is required if refresh tokens expire</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}