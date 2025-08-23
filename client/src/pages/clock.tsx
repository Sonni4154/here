import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock as ClockIcon, Timer, DollarSign, Calendar, MapPin, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInMinutes } from "date-fns";

export default function Clock() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());

  // TODO: Get current user from auth context
  const currentUser = {
    id: "employee-123",
    firstName: "John",
    lastName: "Doe",
    payRate: 25.00
  };

  // Update time every second
  useState(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  });

  // Queries
  const { data: activeClockEntry } = useQuery({
    queryKey: ["/api/clock/active", currentUser.id]
  });

  const { data: weeklyEntries = [] } = useQuery({
    queryKey: ["/api/clock/entries", "week", currentUser.id]
  });

  const { data: monthlyEntries = [] } = useQuery({
    queryKey: ["/api/clock/entries", "month", currentUser.id]
  });

  // Mutations
  const clockIn = useMutation({
    mutationFn: (data: any) => apiRequest("/api/clock/in", { method: "POST", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clock/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clock/entries"] });
      toast({ title: "Clocked in successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Clock in failed", description: error.message, variant: "destructive" });
    }
  });

  const clockOut = useMutation({
    mutationFn: (data: any) => apiRequest("/api/clock/out", { method: "POST", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clock/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clock/entries"] });
      toast({ title: "Clocked out successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Clock out failed", description: error.message, variant: "destructive" });
    }
  });

  // Calculate stats
  const weeklyHours = weeklyEntries.reduce((sum: number, entry: any) => sum + (entry.hours || 0), 0);
  const monthlyHours = monthlyEntries.reduce((sum: number, entry: any) => sum + (entry.hours || 0), 0);
  const weeklyEarnings = weeklyHours * currentUser.payRate;
  const monthlyEarnings = monthlyHours * currentUser.payRate;

  const handleClockIn = () => {
    clockIn.mutate({
      userId: currentUser.id,
      location: "Office", // Could be made dynamic
      notes: ""
    });
  };

  const handleClockOut = () => {
    if (!activeClockEntry) return;
    
    clockOut.mutate({
      clockEntryId: activeClockEntry.id,
      notes: ""
    });
  };

  const getCurrentShiftDuration = () => {
    if (!activeClockEntry?.clockInTime) return 0;
    return differenceInMinutes(currentTime, new Date(activeClockEntry.clockInTime)) / 60;
  };

  const getCurrentShiftEarnings = () => {
    return getCurrentShiftDuration() * currentUser.payRate;
  };

  const isOnShift = !!activeClockEntry;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">Punch Clock</h1>
        <div className="text-2xl font-mono text-muted-foreground">
          {format(currentTime, 'PPP')}
        </div>
        <div className="text-4xl font-mono font-bold text-foreground">
          {format(currentTime, 'h:mm:ss a')}
        </div>
      </div>

      {/* Clock In/Out Section */}
      <Card className="text-center">
        <CardHeader>
          <CardTitle className="flex items-center justify-center space-x-2">
            <User className="w-5 h-5" />
            <span>{currentUser.firstName} {currentUser.lastName}</span>
          </CardTitle>
          <CardDescription>
            {isOnShift ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-600 font-medium">Currently on shift</span>
                </div>
                <div className="text-sm">
                  Started at {format(new Date(activeClockEntry.clockInTime), 'h:mm a')}
                </div>
              </div>
            ) : (
              "Ready to clock in"
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isOnShift && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{getCurrentShiftDuration().toFixed(1)}h</div>
                <div className="text-sm text-muted-foreground">Current Shift</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">${getCurrentShiftEarnings().toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Earnings So Far</div>
              </div>
            </div>
          )}
          
          <div className="flex justify-center space-x-4">
            {!isOnShift ? (
              <Button
                onClick={handleClockIn}
                disabled={clockIn.isPending}
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Timer className="w-5 h-5 mr-2" />
                {clockIn.isPending ? "Clocking In..." : "Clock In"}
              </Button>
            ) : (
              <Button
                onClick={handleClockOut}
                disabled={clockOut.isPending}
                size="lg"
                variant="destructive"
              >
                <ClockIcon className="w-5 h-5 mr-2" />
                {clockOut.isPending ? "Clocking Out..." : "Clock Out"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Weekly & Monthly Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>This Week</span>
            </CardTitle>
            <CardDescription>
              {format(startOfWeek(new Date()), 'MMM dd')} - {format(endOfWeek(new Date()), 'MMM dd')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Hours Worked</span>
                <span className="text-xl font-bold">{weeklyHours.toFixed(1)}h</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Pay Rate</span>
                <span className="font-medium">${currentUser.payRate}/hour</span>
              </div>
              <div className="flex justify-between items-center border-t pt-3">
                <span className="font-medium">Total Earnings</span>
                <span className="text-xl font-bold text-green-600">${weeklyEarnings.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5" />
              <span>This Month</span>
            </CardTitle>
            <CardDescription>
              {format(startOfMonth(new Date()), 'MMM dd')} - {format(endOfMonth(new Date()), 'MMM dd')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Hours Worked</span>
                <span className="text-xl font-bold">{monthlyHours.toFixed(1)}h</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Average Hours/Week</span>
                <span className="font-medium">{(monthlyHours / 4).toFixed(1)}h</span>
              </div>
              <div className="flex justify-between items-center border-t pt-3">
                <span className="font-medium">Total Earnings</span>
                <span className="text-xl font-bold text-green-600">${monthlyEarnings.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Clock Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Clock Entries</CardTitle>
          <CardDescription>Your recent punch in/out history</CardDescription>
        </CardHeader>
        <CardContent>
          {weeklyEntries.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No clock entries this week
            </p>
          ) : (
            <div className="space-y-3">
              {weeklyEntries.slice(0, 10).map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="text-center">
                      <div className="text-sm font-medium">
                        {format(new Date(entry.clockInTime), 'MMM dd')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(entry.clockInTime), 'EEE')}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <Timer className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium">
                          {format(new Date(entry.clockInTime), 'h:mm a')}
                        </span>
                        {entry.clockOutTime && (
                          <>
                            <span className="text-muted-foreground">→</span>
                            <ClockIcon className="w-4 h-4 text-red-500" />
                            <span className="text-sm font-medium">
                              {format(new Date(entry.clockOutTime), 'h:mm a')}
                            </span>
                          </>
                        )}
                      </div>
                      {entry.location && (
                        <div className="flex items-center space-x-1 mt-1">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{entry.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {entry.hours ? `${entry.hours.toFixed(1)}h` : "In Progress"}
                    </div>
                    {entry.hours && (
                      <div className="text-sm text-green-600">
                        ${(entry.hours * currentUser.payRate).toFixed(2)}
                      </div>
                    )}
                    <Badge 
                      variant={entry.clockOutTime ? "default" : "secondary"}
                      className="mt-1"
                    >
                      {entry.clockOutTime ? "Complete" : "Active"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Important Notice */}
      {isOnShift && getCurrentShiftDuration() > 8 && (
        <Alert>
          <ClockIcon className="h-4 w-4" />
          <AlertDescription>
            You've been on shift for over 8 hours. Consider taking a break and review overtime policies.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}