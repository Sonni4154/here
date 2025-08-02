import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, MapPin, Calendar, Users, Timer } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function ClockPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.warn("Location access denied:", error);
        }
      );
    }
  }, []);

  // Queries
  const { data: clockStatus } = useQuery({
    queryKey: ["/api/clock/status"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
  });

  const { data: clockEntries = [] } = useQuery({
    queryKey: ["/api/clock-entries"],
  });

  // Mutations
  const clockInMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/clock/in', {
        method: 'POST',
        body: {
          customerId: selectedCustomer || undefined,
          location,
          notes: notes || undefined,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clock/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clock-entries"] });
      setSelectedCustomer("");
      setNotes("");
      toast({
        title: "Clocked In Successfully",
        description: "Your work session has started and been added to the company calendar.",
      });
    },
    onError: (error) => {
      toast({
        title: "Clock In Failed",
        description: error.message || "Failed to clock in. Please try again.",
        variant: "destructive",
      });
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      const activeEntry = clockStatus?.clockEntry;
      if (!activeEntry) throw new Error("No active clock entry found");
      
      return await apiRequest('/api/clock/out', {
        method: 'POST',
        body: {
          clockEntryId: activeEntry.id,
          notes: notes || undefined,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clock/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clock-entries"] });
      setNotes("");
      toast({
        title: "Clocked Out Successfully",
        description: "Your work session has ended and the calendar has been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Clock Out Failed",
        description: error.message || "Failed to clock out. Please try again.",
        variant: "destructive",
      });
    },
  });

  const isClockedIn = clockStatus?.isClockedIn;
  const activeEntry = clockStatus?.clockEntry;

  // Calculate elapsed time for active session
  const getElapsedTime = () => {
    if (!activeEntry?.clockIn) return "00:00:00";
    
    const startTime = new Date(activeEntry.clockIn);
    const elapsed = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);
    
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get customer name
  const getCustomerName = (customerId: string) => {
    const customer = customers.find((c: any) => c.id === customerId);
    return customer?.name || "General Work";
  };

  const formatTime = (date: string | Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Current Time & Status Header */}
      <div className="text-center space-y-2">
        <div className="text-4xl font-mono font-bold">
          {currentTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          })}
        </div>
        <div className="text-lg text-muted-foreground">
          {currentTime.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </div>

      {/* Clock Status Card */}
      <Card className="mx-auto max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Timer className="h-6 w-6" />
            Time Clock
          </CardTitle>
          <CardDescription>
            {isClockedIn
              ? "You are currently clocked in. Clock out when you finish work."
              : "Click the button below to start tracking your work time."
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Active Session Display */}
          {isClockedIn && activeEntry && (
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Active Session</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  In Progress
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Started At</Label>
                  <div className="font-mono">{formatTime(activeEntry.clockIn)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Elapsed Time</Label>
                  <div className="font-mono text-lg font-bold text-green-600 dark:text-green-400">
                    {getElapsedTime()}
                  </div>
                </div>
              </div>

              {activeEntry.customerId && (
                <div>
                  <Label className="text-muted-foreground">Customer</Label>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {getCustomerName(activeEntry.customerId)}
                  </div>
                </div>
              )}

              {location && (
                <div>
                  <Label className="text-muted-foreground">Location</Label>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4" />
                    {location.address || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Clock In/Out Controls */}
          <div className="space-y-4">
            {!isClockedIn ? (
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="lg" className="w-full h-16 text-lg">
                    <Clock className="mr-2 h-6 w-6" />
                    Clock In
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Clock In</DialogTitle>
                    <DialogDescription>
                      Start tracking your work time. This will create a calendar event.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="customer">Customer (Optional)</Label>
                      <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a customer or leave blank for general work" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">General Work</SelectItem>
                          {customers.map((customer: any) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="notes">Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Add any notes about this work session..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                      />
                    </div>

                    {location && (
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Location will be recorded automatically
                      </div>
                    )}

                    <Button 
                      onClick={() => clockInMutation.mutate()} 
                      disabled={clockInMutation.isPending}
                      className="w-full"
                    >
                      {clockInMutation.isPending ? "Clocking In..." : "Start Work Session"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="clockOutNotes">Clock Out Notes (Optional)</Label>
                  <Textarea
                    id="clockOutNotes"
                    placeholder="Add any final notes about this work session..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
                
                <Button 
                  onClick={() => clockOutMutation.mutate()} 
                  disabled={clockOutMutation.isPending}
                  variant="destructive" 
                  size="lg" 
                  className="w-full h-16 text-lg"
                >
                  <Clock className="mr-2 h-6 w-6" />
                  {clockOutMutation.isPending ? "Clocking Out..." : "Clock Out"}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Clock Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Clock Entries
          </CardTitle>
          <CardDescription>
            Your recent work sessions and time tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clockEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No clock entries yet. Clock in to start tracking your time.
            </div>
          ) : (
            <div className="space-y-3">
              {clockEntries.slice(0, 10).map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={entry.status === 'active' ? 'default' : 'secondary'}>
                        {entry.status === 'active' ? 'In Progress' : 'Completed'}
                      </Badge>
                      {entry.customerId && (
                        <span className="text-sm text-muted-foreground">
                          {getCustomerName(entry.customerId)}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(entry.clockIn)} • Started at {formatTime(entry.clockIn)}
                      {entry.clockOut && (
                        <> • Ended at {formatTime(entry.clockOut)}</>
                      )}
                    </div>
                    {entry.notes && (
                      <div className="text-sm">{entry.notes}</div>
                    )}
                  </div>
                  <div className="text-right">
                    {entry.totalHours ? (
                      <div className="font-mono font-bold">
                        {parseFloat(entry.totalHours).toFixed(2)}h
                      </div>
                    ) : entry.status === 'active' ? (
                      <div className="font-mono text-green-600 dark:text-green-400">
                        {getElapsedTime()}
                      </div>
                    ) : (
                      <div className="text-muted-foreground">-</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}