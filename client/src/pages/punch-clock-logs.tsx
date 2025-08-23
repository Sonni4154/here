import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Settings, TrendingUp } from "lucide-react";
import EnhancedTimeDisplay from "@/components/time-tracking/enhanced-time-display";

export default function PunchClockLogsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center space-x-3">
          <Clock className="w-8 h-8 text-purple-600" />
          <span>Punchclock Logs</span>
        </h1>
        <p className="text-slate-600 mt-2">
          Administrative view of all employee time entries with adjustment controls
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">
              +12% from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4</div>
            <p className="text-xs text-muted-foreground">
              All technicians checked in
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Adjustments</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">2</div>
            <p className="text-xs text-muted-foreground">
              Require admin review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">128.5</div>
            <p className="text-xs text-muted-foreground">
              This week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="default" className="bg-green-100 text-green-800">
          Normal Operations
        </Badge>
        <Badge variant="outline" className="border-yellow-200 text-yellow-800">
          2 Pending Reviews
        </Badge>
        <Badge variant="outline" className="border-blue-200 text-blue-800">
          Email Notifications Active
        </Badge>
      </div>

      {/* Enhanced Time Display with Admin Controls */}
      <EnhancedTimeDisplay isAdmin={true} />

      {/* Payroll Integration Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Payroll Summary</CardTitle>
          <CardDescription>
            Hours summary for current pay period (Week ending Sunday)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4 font-semibold text-sm border-b pb-2">
              <div>Employee</div>
              <div className="text-center">Regular Hours</div>
              <div className="text-center">Overtime Hours</div>
              <div className="text-right">Total Pay</div>
            </div>
            
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>Spencer Reiser</div>
              <div className="text-center">40.0</div>
              <div className="text-center text-red-600 font-medium">3.5</div>
              <div className="text-right font-medium">$1,087.50</div>
            </div>
            
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>Boden Haines</div>
              <div className="text-center">38.5</div>
              <div className="text-center">0.0</div>
              <div className="text-right font-medium">$924.00</div>
            </div>
            
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>Jorge Sisneros</div>
              <div className="text-center">35.0</div>
              <div className="text-center">0.0</div>
              <div className="text-right font-medium">$840.00</div>
            </div>
            
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>Tristan Ford</div>
              <div className="text-center">32.0</div>
              <div className="text-center">0.0</div>
              <div className="text-right font-medium">$768.00</div>
            </div>
            
            <div className="grid grid-cols-4 gap-4 text-sm font-bold border-t pt-2">
              <div>Totals</div>
              <div className="text-center">145.5</div>
              <div className="text-center text-red-600">3.5</div>
              <div className="text-right">$3,619.50</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}