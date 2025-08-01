import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import StatsGrid from "@/components/dashboard/stats-grid";
import RecentInvoices from "@/components/dashboard/recent-invoices";
import QuickActions from "@/components/dashboard/quick-actions";
import IntegrationStatus from "@/components/dashboard/integration-status";
import RecentActivity from "@/components/dashboard/recent-activity";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Dashboard"
          description="Overview of your business operations"
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          <StatsGrid />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
            <div className="lg:col-span-2">
              <RecentInvoices />
            </div>
            
            <div className="space-y-6">
              <QuickActions />
              <IntegrationStatus />
              <RecentActivity />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
