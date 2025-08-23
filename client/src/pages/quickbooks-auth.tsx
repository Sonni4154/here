import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RefreshCw, CheckCircle2, XCircle, AlertCircle, ExternalLink, Copy, ChevronDown, Eye, EyeOff, Settings, Database } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function QuickBooksAuth() {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAdminFields, setShowAdminFields] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [showDatabaseTest, setShowDatabaseTest] = useState(false);

  // Fetch QuickBooks integration status
  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ["/api/integrations"],
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  // Fetch QuickBooks configuration for admin
  const { data: qbConfig } = useQuery({
    queryKey: ["/api/quickbooks/dev-status"],
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  // Fetch detailed QuickBooks status for admin
  const { data: qbStatus } = useQuery({
    queryKey: ["/api/integrations/quickbooks/status"],
    refetchInterval: 5000
  });

  // Database connection test
  const testDatabase = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/database/test", "GET");
    },
    onSuccess: (data: any) => {
      toast({
        title: "Database Connected",
        description: `Connected to ${data.database || "database"} successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Database Test Failed",
        description: error.message || "Failed to connect to database",
        variant: "destructive"
      });
    }
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

  // Copy to clipboard function
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  // Mask sensitive data
  const maskSecret = (value: string) => {
    if (!value) return "Not Set";
    return showSecrets ? value : `${value.substring(0, 8)}...${value.substring(value.length - 4)}`;
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
                  <p className="text-sm font-medium text-muted-foreground">Last Successful Connection</p>
                  <p className="text-sm">
                    {lastSyncAt ? format(new Date(lastSyncAt), "PPp") : "Never connected"}
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
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                onClick={() => initiateAuth.mutate()}
                disabled={initiateAuth.isPending}
                size="lg"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {initiateAuth.isPending ? "Redirecting..." : isConnected ? "Reauthorize QuickBooks" : "Connect to QuickBooks"}
              </Button>
              
              {isConnected && (
                <Button
                  onClick={() => refreshTokens.mutate()}
                  disabled={isRefreshing || refreshTokens.isPending}
                  variant={willExpireSoon || isTokenExpired ? "default" : "outline"}
                  size="lg"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                  {isRefreshing ? "Refreshing..." : "Refresh Tokens"}
                </Button>
              )}
            </div>
            
            {isConnected && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            
            <p className="text-sm text-muted-foreground text-center">
              {!isConnected 
                ? "You will be redirected to QuickBooks to authorize the connection"
                : "Use reauthorize for fresh tokens or refresh for existing ones"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Admin Debug Fields */}
      <Card>
        <CardHeader>
          <Collapsible open={showAdminFields} onOpenChange={setShowAdminFields}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  <span>Admin Configuration & Debug</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${showAdminFields ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">QuickBooks Environment Variables</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSecrets(!showSecrets)}
                >
                  {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showSecrets ? "Hide" : "Show"} Secrets
                </Button>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {/* Environment Configuration */}
                <div className="space-y-3">
                  <h5 className="text-sm font-medium text-muted-foreground">Configuration</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="qbo-env">Environment</Label>
                      <div className="flex gap-2">
                        <Input
                          id="qbo-env"
                          value={qbConfig?.environment || "Not Set"}
                          readOnly
                          className="font-mono text-xs"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(qbConfig?.environment || "", "Environment")}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="qbo-company-id">Company ID</Label>
                      <div className="flex gap-2">
                        <Input
                          id="qbo-company-id"
                          value={qbConfig?.companyId || "Not Set"}
                          readOnly
                          className="font-mono text-xs"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(qbConfig?.companyId || "", "Company ID")}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="qbo-base-url">Base URL</Label>
                      <div className="flex gap-2">
                        <Input
                          id="qbo-base-url"
                          value={qbConfig?.baseUrl || "Not Set"}
                          readOnly
                          className="font-mono text-xs"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(qbConfig?.baseUrl || "", "Base URL")}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="qbo-redirect">Redirect URI</Label>
                      <div className="flex gap-2">
                        <Input
                          id="qbo-redirect"
                          value={qbConfig?.redirectUri || "Not Set"}
                          readOnly
                          className="font-mono text-xs"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(qbConfig?.redirectUri || "", "Redirect URI")}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* OAuth Credentials */}
                <div className="space-y-3">
                  <h5 className="text-sm font-medium text-muted-foreground">OAuth Credentials</h5>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="qbo-client-id">Client ID</Label>
                      <div className="flex gap-2">
                        <Input
                          id="qbo-client-id"
                          value={maskSecret(qbConfig?.clientId || "")}
                          readOnly
                          className="font-mono text-xs"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(qbConfig?.clientId || "", "Client ID")}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="qbo-client-secret">Client Secret</Label>
                      <div className="flex gap-2">
                        <Input
                          id="qbo-client-secret"
                          value={qbConfig?.hasClientSecret ? (showSecrets ? "[REDACTED]" : "••••••••") : "Not Set"}
                          readOnly
                          className="font-mono text-xs"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard("[CLIENT_SECRET_REDACTED]", "Client Secret")}
                          disabled={!qbConfig?.hasClientSecret}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Current Tokens */}
                {isConnected && (
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-muted-foreground">Active Tokens</h5>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="access-token">Access Token</Label>
                        <div className="flex gap-2">
                          <Input
                            id="access-token"
                            value={showSecrets ? "[ACCESS_TOKEN_REDACTED]" : "••••••••"}
                            readOnly
                            className="font-mono text-xs"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard("[ACCESS_TOKEN_REDACTED]", "Access Token")}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="refresh-token">Refresh Token</Label>
                        <div className="flex gap-2">
                          <Input
                            id="refresh-token"
                            value={showSecrets ? "[REFRESH_TOKEN_REDACTED]" : "••••••••"}
                            readOnly
                            className="font-mono text-xs"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard("[REFRESH_TOKEN_REDACTED]", "Refresh Token")}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="realm-id">Realm ID (Company)</Label>
                        <div className="flex gap-2">
                          <Input
                            id="realm-id"
                            value={quickbooksIntegration?.realmId || "Not Set"}
                            readOnly
                            className="font-mono text-xs"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(quickbooksIntegration?.realmId || "", "Realm ID")}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Status Information */}
                <div className="space-y-3">
                  <h5 className="text-sm font-medium text-muted-foreground">Connection Status</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Has Access Token</Label>
                      <Badge variant={qbConfig?.hasAccessToken ? "default" : "secondary"}>
                        {qbConfig?.hasAccessToken ? "Yes" : "No"}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Has Refresh Token</Label>
                      <Badge variant={qbConfig?.hasRefreshToken ? "default" : "secondary"}>
                        {qbConfig?.hasRefreshToken ? "Yes" : "No"}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Last Status Check</Label>
                      <p className="text-xs text-muted-foreground font-mono">
                        {qbConfig?.timestamp ? format(new Date(qbConfig.timestamp), "PPp") : "Unknown"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardHeader>
      </Card>
      
      {/* Database Test Section */}
      <Card>
        <CardHeader>
          <Collapsible open={showDatabaseTest} onOpenChange={setShowDatabaseTest}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  <span>Test Database Connection</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${showDatabaseTest ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Database Connection Test</h4>
                  <Button
                    onClick={() => testDatabase.mutate()}
                    disabled={testDatabase.isPending}
                    variant="outline"
                  >
                    <Database className="w-4 h-4 mr-2" />
                    {testDatabase.isPending ? "Testing..." : "Test Connection"}
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="db-host">Database Host</Label>
                    <div className="flex gap-2">
                      <Input
                        id="db-host"
                        value={process.env.PGHOST || "Not Set"}
                        readOnly
                        className="font-mono text-xs"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(process.env.PGHOST || "", "Database Host")}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="db-name">Database Name</Label>
                    <div className="flex gap-2">
                      <Input
                        id="db-name"
                        value={process.env.PGDATABASE || "Not Set"}
                        readOnly
                        className="font-mono text-xs"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(process.env.PGDATABASE || "", "Database Name")}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="db-port">Database Port</Label>
                    <div className="flex gap-2">
                      <Input
                        id="db-port"
                        value={process.env.PGPORT || "Not Set"}
                        readOnly
                        className="font-mono text-xs"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(process.env.PGPORT || "", "Database Port")}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="db-user">Database User</Label>
                    <div className="flex gap-2">
                      <Input
                        id="db-user"
                        value={process.env.PGUSER || "Not Set"}
                        readOnly
                        className="font-mono text-xs"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(process.env.PGUSER || "", "Database User")}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="db-url">Database URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="db-url"
                      value={showSecrets ? (process.env.DATABASE_URL || "Not Set") : "•••••••••••••••••••••••••••••••••••••••"}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(process.env.DATABASE_URL || "", "Database URL")}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                
                <Alert>
                  <Database className="h-4 w-4" />
                  <AlertTitle>Database Test</AlertTitle>
                  <AlertDescription>
                    Click "Test Connection" to verify database connectivity and check connection pooling status.
                  </AlertDescription>
                </Alert>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardHeader>
      </Card>
      
      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Token Management Info</CardTitle>
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