import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, TrendingDown, Users, Calendar, AlertTriangle, CheckCircle } from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";

export default function EmployeeDashboard() {
  // TODO: Get current user from auth context
  const currentUserId = "employee-123";

  const { data: weeklySummary, isLoading } = useQuery({
    queryKey: ["/api/weekly-summary", currentUserId]
  });

  const { data: trapChecks = [] } = useQuery({
    queryKey: ["/api/trap-checks/needed"]
  });

  const { data: clockEntries = [] } = useQuery({
    queryKey: ["/api/clock-entries", "current-week", currentUserId]
  });

  const currentWeek = {
    start: startOfWeek(new Date()),
    end: endOfWeek(new Date())
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const weeklyStats = {
    hoursWorked: clockEntries.reduce((sum: number, entry: any) => sum + (entry.hours || 0), 0),
    totalEarnings: clockEntries.reduce((sum: number, entry: any) => sum + (entry.totalPay || 0), 0),
    completedJobs: clockEntries.filter((entry: any) => entry.status === 'completed').length,
    positives: weeklySummary?.positives || 0,
    negatives: weeklySummary?.negatives || 0,
    complaints: weeklySummary?.complaints || 0,
    resprays: weeklySummary?.resprays || 0
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Weekly Summary</h1>
          <p className="text-muted-foreground">
            {format(currentWeek.start, 'MMM dd')} - {format(currentWeek.end, 'MMM dd, yyyy')}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours Worked</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weeklyStats.hoursWorked.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              This week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${weeklyStats.totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              This week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jobs Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weeklyStats.completedJobs}</div>
            <p className="text-xs text-muted-foreground">
              This week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trap Checks Needed</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trapChecks.length}</div>
            <p className="text-xs text-muted-foreground">
              This week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Performance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Performance</CardTitle>
            <CardDescription>Customer feedback and service quality</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span>Positive Feedback</span>
                </div>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  {weeklyStats.positives}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  <span>Negative Feedback</span>
                </div>
                <Badge variant="destructive">
                  {weeklyStats.negatives}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  <span>Complaints</span>
                </div>
                <Badge variant="outline">
                  {weeklyStats.complaints}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span>Re-sprays</span>
                </div>
                <Badge variant="secondary">
                  {weeklyStats.resprays}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Trap Checks</CardTitle>
            <CardDescription>Customers needing trap service this week</CardDescription>
          </CardHeader>
          <CardContent>
            {trapChecks.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No trap checks scheduled for this week
              </p>
            ) : (
              <div className="space-y-3">
                {trapChecks.slice(0, 5).map((trap: any) => (
                  <div key={trap.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{trap.customerName}</p>
                      <p className="text-sm text-muted-foreground">
                        Due: {format(new Date(trap.nextCheckDate), 'MMM dd')}
                      </p>
                    </div>
                    <Badge variant="outline">
                      Week {trap.currentWeek}
                    </Badge>
                  </div>
                ))}
                {trapChecks.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center">
                    +{trapChecks.length - 5} more customers
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Important Notices */}
      {(weeklyStats.complaints > 0 || weeklyStats.resprays > 2) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {weeklyStats.complaints > 0 && (
              <span>You have {weeklyStats.complaints} customer complaint(s) this week. </span>
            )}
            {weeklyStats.resprays > 2 && (
              <span>Higher than usual re-spray requests ({weeklyStats.resprays}). </span>
            )}
            Please review your service quality and contact management if needed.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}