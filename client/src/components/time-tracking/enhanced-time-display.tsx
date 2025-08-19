import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, User, MapPin, Smartphone, Monitor, AlertTriangle, Flag, Edit, Trash2, Mail } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PunchEntry {
  id: string;
  userId: string;
  punchType: 'in' | 'out' | 'break_in' | 'break_out' | 'lunch_in' | 'lunch_out';
  punchTime: string;
  notes: string;
  nextDuty: string;
  requiresAdjustment: boolean;
  location: string;
  ipAddress: string;
  userAgent: string;
  dailyTotalHours: number;
  weeklyTotalHours: number;
  user: {
    firstName: string;
    lastName: string;
    role: string;
  };
  customer?: {
    name: string;
  };
}

interface EnhancedTimeDisplayProps {
  isAdmin?: boolean;
}

export default function EnhancedTimeDisplay({ isAdmin = false }: EnhancedTimeDisplayProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [adjustmentNote, setAdjustmentNote] = useState("");
  const [newPunchTime, setNewPunchTime] = useState("");

  const { data: punchEntries, isLoading } = useQuery<PunchEntry[]>({
    queryKey: ["/api/punch-clock/entries"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const requestAdjustmentMutation = useMutation({
    mutationFn: async ({ entryId, reason }: { entryId: string; reason: string }) => {
      return await apiRequest(`/api/punch-clock/request-adjustment`, {
        method: 'POST',
        body: JSON.stringify({ entryId, reason }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/punch-clock/entries"] });
      toast({
        title: "Adjustment Requested",
        description: "Email notification sent to marinpestcontrol@gmail.com",
      });
    },
  });

  const adjustPunchMutation = useMutation({
    mutationFn: async ({ entryId, newTime, reason }: { entryId: string; newTime: string; reason: string }) => {
      return await apiRequest(`/api/punch-clock/adjust`, {
        method: 'POST',
        body: JSON.stringify({ entryId, newTime, reason }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/punch-clock/entries"] });
      setSelectedEntries([]);
      setNewPunchTime("");
      setAdjustmentNote("");
      toast({
        title: "Punch Adjusted",
        description: "Time entry has been updated successfully.",
      });
    },
  });

  const flagPunchMutation = useMutation({
    mutationFn: async ({ entryId, flag }: { entryId: string; flag: 'suspicious' | 'do_not_pay' | 'overtime' }) => {
      return await apiRequest(`/api/punch-clock/flag`, {
        method: 'POST',
        body: JSON.stringify({ entryId, flag }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/punch-clock/entries"] });
      toast({
        title: "Entry Flagged",
        description: "Time entry has been flagged for review.",
      });
    },
  });

  const voidPunchMutation = useMutation({
    mutationFn: async (entryId: string) => {
      return await apiRequest(`/api/punch-clock/void/${entryId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/punch-clock/entries"] });
      toast({
        title: "Punch Voided",
        description: "Time entry has been removed.",
      });
    },
  });

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit'
    });
  };

  const getDeviceIcon = (userAgent: string) => {
    if (userAgent?.toLowerCase().includes('mobile')) {
      return <Smartphone className="w-4 h-4 text-blue-500" />;
    }
    return <Monitor className="w-4 h-4 text-gray-500" />;
  };

  const getPunchTypeColor = (type: string) => {
    switch (type) {
      case 'in': return 'bg-green-100 text-green-800';
      case 'out': return 'bg-red-100 text-red-800';
      case 'break_in': case 'break_out': return 'bg-yellow-100 text-yellow-800';
      case 'lunch_in': case 'lunch_out': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDailyHoursColor = (hours: number) => {
    if (hours > 8) return 'text-red-600 font-bold'; // Over 8 hours - red
    if (hours > 6) return 'text-yellow-600 font-semibold'; // Over 6 hours - yellow
    return 'text-gray-600';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Clock className="w-6 h-6 animate-spin mr-2" />
            <span>Loading punch clock entries...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Recent Time Entries</span>
            </div>
            {isAdmin && (
              <div className="flex items-center space-x-2">
                <Badge variant="outline">{punchEntries?.length || 0} entries</Badge>
                {selectedEntries.length > 0 && (
                  <Badge variant="secondary">{selectedEntries.length} selected</Badge>
                )}
              </div>
            )}
          </CardTitle>
          <CardDescription>
            Comprehensive time tracking with administrative controls and suspicious activity detection
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!punchEntries?.length ? (
            <div className="text-center py-8 text-gray-500">
              No time entries yet
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header Row */}
              <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500 border-b pb-2">
                {isAdmin && <div>Select</div>}
                <div className={isAdmin ? "col-span-2" : "col-span-2"}>Date</div>
                <div className={isAdmin ? "col-span-2" : "col-span-2"}>Time</div>
                <div className={isAdmin ? "col-span-1" : "col-span-2"}>Type</div>
                <div className={isAdmin ? "col-span-2" : "col-span-2"}>Technician</div>
                <div className={isAdmin ? "col-span-2" : "col-span-2"}>Next Duty</div>
                <div className={isAdmin ? "col-span-1" : "col-span-1"}>Hours</div>
                {isAdmin && <div>Adjust</div>}
                <div className={isAdmin ? "col-span-1" : "col-span-1"}>Actions</div>
              </div>

              {/* Entries */}
              {punchEntries.map((entry) => (
                <div
                  key={entry.id}
                  className={`grid grid-cols-12 gap-4 items-center p-3 rounded-lg border ${
                    entry.requiresAdjustment ? 'bg-yellow-50 border-yellow-200' : 'hover:bg-gray-50'
                  } ${entry.dailyTotalHours > 8 ? 'bg-red-50 border-red-200' : ''}`}
                >
                  {isAdmin && (
                    <div className="flex items-center">
                      <Checkbox
                        checked={selectedEntries.includes(entry.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedEntries([...selectedEntries, entry.id]);
                          } else {
                            setSelectedEntries(selectedEntries.filter(id => id !== entry.id));
                          }
                        }}
                      />
                    </div>
                  )}

                  <div className={isAdmin ? "col-span-2" : "col-span-2"}>
                    <span className="text-sm font-medium">{formatDate(entry.punchTime)}</span>
                  </div>

                  <div className={isAdmin ? "col-span-2" : "col-span-2"}>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{formatTime(entry.punchTime)}</span>
                      {getDeviceIcon(entry.userAgent)}
                    </div>
                  </div>

                  <div className={isAdmin ? "col-span-1" : "col-span-2"}>
                    <Badge className={getPunchTypeColor(entry.punchType)}>
                      {entry.punchType.toUpperCase()}
                    </Badge>
                  </div>

                  <div className={isAdmin ? "col-span-2" : "col-span-2"}>
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{entry.user.firstName} {entry.user.lastName}</span>
                    </div>
                  </div>

                  <div className={isAdmin ? "col-span-2" : "col-span-2"}>
                    <span className="text-sm text-gray-600">{entry.nextDuty || 'None assigned'}</span>
                  </div>

                  <div className={isAdmin ? "col-span-1" : "col-span-1"}>
                    <span className={`text-sm ${getDailyHoursColor(entry.dailyTotalHours)}`}>
                      {entry.dailyTotalHours?.toFixed(1) || '0.0'}h
                    </span>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center">
                      <Checkbox
                        checked={entry.requiresAdjustment}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            requestAdjustmentMutation.mutate({
                              entryId: entry.id,
                              reason: "Manual adjustment requested"
                            });
                          }
                        }}
                      />
                    </div>
                  )}

                  <div className={isAdmin ? "col-span-1" : "col-span-1"}>
                    <div className="flex items-center space-x-1">
                      {!isAdmin && entry.requiresAdjustment && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const reason = prompt("Reason for adjustment request:");
                            if (reason) {
                              requestAdjustmentMutation.mutate({ entryId: entry.id, reason });
                            }
                          }}
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
                      )}
                      {isAdmin && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const newTime = prompt("New punch time (YYYY-MM-DD HH:MM):");
                              const reason = prompt("Reason for adjustment:");
                              if (newTime && reason) {
                                adjustPunchMutation.mutate({ entryId: entry.id, newTime, reason });
                              }
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => flagPunchMutation.mutate({ entryId: entry.id, flag: 'suspicious' })}
                          >
                            <Flag className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (confirm("Are you sure you want to void this punch?")) {
                                voidPunchMutation.mutate(entry.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Notes row */}
                  {entry.notes && entry.notes !== "Notes for your punchclock..." && (
                    <div className="col-span-12 mt-2 text-sm text-gray-600 pl-4 border-l-2 border-gray-200">
                      <strong>Notes:</strong> {entry.notes}
                    </div>
                  )}

                  {/* Location row for admin */}
                  {isAdmin && entry.location && (
                    <div className="col-span-12 mt-1 text-xs text-gray-500 flex items-center space-x-1">
                      <MapPin className="w-3 h-3" />
                      <span>IP: {entry.ipAddress}</span>
                      <span>•</span>
                      <span>Location: {entry.location}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin bulk actions */}
      {isAdmin && selectedEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bulk Actions ({selectedEntries.length} selected)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-time">Adjust Time</Label>
                <Input
                  id="new-time"
                  type="datetime-local"
                  value={newPunchTime}
                  onChange={(e) => setNewPunchTime(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="adjustment-note">Reason</Label>
                <Textarea
                  id="adjustment-note"
                  placeholder="Reason for adjustment..."
                  value={adjustmentNote}
                  onChange={(e) => setAdjustmentNote(e.target.value)}
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={() => {
                  selectedEntries.forEach(entryId => {
                    adjustPunchMutation.mutate({ entryId, newTime: newPunchTime, reason: adjustmentNote });
                  });
                }}
                disabled={!newPunchTime || !adjustmentNote}
              >
                Apply Adjustments
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  selectedEntries.forEach(entryId => {
                    flagPunchMutation.mutate({ entryId, flag: 'suspicious' });
                  });
                }}
              >
                Flag as Suspicious
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (confirm(`Are you sure you want to void ${selectedEntries.length} punches?`)) {
                    selectedEntries.forEach(entryId => {
                      voidPunchMutation.mutate(entryId);
                    });
                  }
                }}
              >
                Void Selected
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}