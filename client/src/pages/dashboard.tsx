import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Clock, Package, Users, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  const { data: timeEntries = [] } = useQuery({
    queryKey: ["/api/time-entries"],
  });

  const { data: materialEntries = [] } = useQuery({
    queryKey: ["/api/material-entries"],
  });

  const { data: activityLogs = [] } = useQuery({
    queryKey: ["/api/activity"],
  });

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const recentTimeEntries = timeEntries.slice(0, 5);
  const recentMaterialEntries = materialEntries.slice(0, 5);
  const recentActivity = activityLogs.slice(0, 8);

  // Calculate quick stats
  const draftTimeEntries = timeEntries.filter((entry: any) => entry.status === 'draft').length;
  const submittedTimeEntries = timeEntries.filter((entry: any) => entry.status === 'submitted').length;
  const draftMaterialEntries = materialEntries.filter((entry: any) => entry.status === 'draft').length;
  const submittedMaterialEntries = materialEntries.filter((entry: any) => entry.status === 'submitted').length;

  const totalHoursThisWeek = timeEntries
    .filter((entry: any) => {
      const entryDate = new Date(entry.createdAt);
      const now = new Date();
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
      return entryDate >= weekStart;
    })
    .reduce((sum: number, entry: any) => sum + parseFloat(entry.hours || '0'), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "submitted":
        return <Badge variant="outline">Submitted</Badge>;
      case "approved":
        return <Badge variant="default">Approved</Badge>;
      case "invoiced":
        return <Badge variant="secondary">Invoiced</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Marin Pest Control Dashboard</h1>
        <p className="text-muted-foreground mt-1">Track your time, materials, and submissions</p>
      </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Hours This Week</p>
                      <p className="text-2xl font-bold text-foreground">{totalHoursThisWeek.toFixed(1)}</p>
                    </div>
                    <Clock className="w-8 h-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Draft Time Entries</p>
                      <p className="text-2xl font-bold text-foreground">{draftTimeEntries}</p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Submitted Entries</p>
                      <p className="text-2xl font-bold text-foreground">{submittedTimeEntries + submittedMaterialEntries}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Material Entries</p>
                      <p className="text-2xl font-bold text-foreground">{materialEntries.length}</p>
                    </div>
                    <Package className="w-8 h-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Link href="/time-tracking">
                <Button className="w-full flex items-center space-x-2 bg-primary hover:bg-primary/90">
                  <Clock className="w-4 h-4" />
                  <span>Clock In/Out</span>
                </Button>
              </Link>
              <Link href="/materials">
                <Button className="w-full flex items-center space-x-2" variant="outline">
                  <Package className="w-4 h-4" />
                  <span>Enter Hours and Materials</span>
                </Button>
              </Link>
              <Link href="/customers">
                <Button className="w-full flex items-center space-x-2" variant="outline">
                  <Users className="w-4 h-4" />
                  <span>View Customers</span>
                </Button>
              </Link>
              <Link href="/invoices">
                <Button className="w-full flex items-center space-x-2" variant="outline">
                  <FileText className="w-4 h-4" />
                  <span>Search Invoices</span>
                </Button>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Recent Time Entries */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Clock className="w-5 h-5" />
                      <span>Recent Time Entries</span>
                    </CardTitle>
                    <CardDescription>Your latest time tracking entries</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recentTimeEntries.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">No time entries yet</p>
                    ) : (
                      <div className="space-y-3">
                        {recentTimeEntries.map((entry: any) => (
                          <div key={entry.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{entry.description}</p>
                              <p className="text-xs text-muted-foreground">{entry.hours}h • {entry.projectName}</p>
                            </div>
                            {getStatusBadge(entry.status)}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Recent Material Entries */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Package className="w-5 h-5" />
                      <span>Recent Materials</span>
                    </CardTitle>
                    <CardDescription>Your latest material entries</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recentMaterialEntries.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">No material entries yet</p>
                    ) : (
                      <div className="space-y-3">
                        {recentMaterialEntries.map((entry: any) => (
                          <div key={entry.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{entry.itemName}</p>
                              <p className="text-xs text-muted-foreground">${entry.totalCost} • {entry.quantity} units</p>
                            </div>
                            {getStatusBadge(entry.status)}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Your latest actions and updates</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recentActivity.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">No recent activity</p>
                    ) : (
                      <div className="space-y-3">
                        {recentActivity.map((log: any) => (
                          <div key={log.id} className="flex items-start space-x-3">
                            <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground">{log.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(log.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
      </div>
    </div>
  );
}
