import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Package, FileText } from "lucide-react";
import { SiGoogle, SiQuickbooks } from "react-icons/si";

export default function IntegrationStatus() {
  const { data: integrations, isLoading } = useQuery({
    queryKey: ['/api/integrations'],
  });

  const getIntegrationIcon = (provider: string) => {
    switch (provider) {
      case 'quickbooks':
        return <SiQuickbooks className="w-4 h-4 text-blue-600" />;
      case 'jotform':
        return <FileText className="w-4 h-4 text-orange-600" />;
      case 'google':
        return <SiGoogle className="w-4 h-4 text-green-600" />;
      default:
        return <Package className="w-4 h-4 text-gray-600" />;
    }
  };

  const getIntegrationBg = (provider: string) => {
    switch (provider) {
      case 'quickbooks':
        return 'bg-blue-100';
      case 'jotform':
        return 'bg-orange-100';
      case 'google':
        return 'bg-green-100';
      default:
        return 'bg-gray-100';
    }
  };

  const formatLastSync = (date: string | null) => {
    if (!date) return 'Never synced';
    const syncDate = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - syncDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Last sync: Just now';
    if (diffMins < 60) return `Last sync: ${diffMins} min ago`;
    if (diffMins < 1440) return `Last sync: ${Math.floor(diffMins / 60)} hr ago`;
    return `Last sync: ${syncDate.toLocaleDateString()}`;
  };

  const getProviderDisplayName = (provider: string) => {
    switch (provider) {
      case 'quickbooks':
        return 'QuickBooks';
      case 'jotform':
        return 'JotForm';
      case 'google':
        return 'Google Workspace';
      default:
        return provider;
    }
  };

  const getProviderDescription = (provider: string, isActive: boolean, lastSyncAt: string | null) => {
    if (!isActive) return 'Not connected';
    
    switch (provider) {
      case 'quickbooks':
        return formatLastSync(lastSyncAt);
      case 'jotform':
        return '2 new submissions';
      case 'google':
        return 'Active connection';
      default:
        return 'Connected';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Integration Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Skeleton className="w-8 h-8 rounded-lg" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="w-3 h-3 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Create a default set of integrations to show
  const defaultIntegrations = [
    { provider: 'quickbooks', isActive: false, lastSyncAt: null },
    { provider: 'jotform', isActive: false, lastSyncAt: null },
    { provider: 'google', isActive: false, lastSyncAt: null },
  ];

  // Merge with actual integrations
  const displayIntegrations = defaultIntegrations.map(defaultInt => {
    const actualInt = integrations?.find((i: any) => i.provider === defaultInt.provider);
    return actualInt || defaultInt;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Integration Status</CardTitle>
          <Link href="/integrations" className="text-primary hover:text-blue-600 text-sm font-medium">
            Manage
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayIntegrations.map((integration: any, index: number) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 ${getIntegrationBg(integration.provider)} rounded-lg flex items-center justify-center`}>
                  {getIntegrationIcon(integration.provider)}
                </div>
                <div>
                  <div className="font-medium text-slate-900">
                    {getProviderDisplayName(integration.provider)}
                  </div>
                  <div className="text-sm text-slate-500">
                    {getProviderDescription(integration.provider, integration.isActive, integration.lastSyncAt)}
                  </div>
                </div>
              </div>
              <div className={`w-3 h-3 rounded-full ${integration.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
