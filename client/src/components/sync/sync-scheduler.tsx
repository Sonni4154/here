import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Clock, Calendar, TrendingUp, Settings, Play, Pause, RefreshCw, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SyncScheduleConfig {
  provider: string;
  enabled: boolean;
  interval: number;
  businessHoursOnly: boolean;
  retryAttempts: number;
  lastRun?: string;
  nextRun?: string;
  priority: 'low' | 'medium' | 'high';
}

interface SyncRecommendation {
  provider: string;
  recommendedInterval: number;
  reason: string;
  confidence: number;
  suggestedBusinessHours: boolean;
  estimatedDuration: number;
}

interface SyncStatus {
  isRunning: boolean;
  activeIntervals: number;
  nextScheduledSync?: string;
  schedules: SyncScheduleConfig[];
}

export default function SyncScheduler() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showRecommendations, setShowRecommendations] = useState(false);

  const { data: syncStatus, isLoading } = useQuery<SyncStatus>({
    queryKey: ["/api/sync/status"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const { data: recommendations } = useQuery<SyncRecommendation[]>({
    queryKey: ["/api/sync/recommendations"],
    enabled: showRecommendations,
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async ({ provider, config }: { provider: string; config: Partial<SyncScheduleConfig> }) => {
      return await apiRequest(`/api/sync/schedule/${provider}`, {
        method: 'POST',
        body: JSON.stringify(config),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sync/status"] });
      toast({
        title: "Schedule Updated",
        description: "Sync schedule has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update schedule",
        variant: "destructive",
      });
    },
  });

  const startAllMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/sync/start-all', { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sync/status"] });
      toast({
        title: "Syncs Started",
        description: "All scheduled syncs have been started.",
      });
    },
  });

  const stopAllMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/sync/stop-all', { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sync/status"] });
      toast({
        title: "Syncs Stopped",
        description: "All scheduled syncs have been stopped.",
      });
    },
  });

  const handleScheduleToggle = (provider: string, enabled: boolean) => {
    updateScheduleMutation.mutate({ provider, config: { enabled } });
  };

  const handleIntervalChange = (provider: string, interval: number) => {
    updateScheduleMutation.mutate({ provider, config: { interval } });
  };

  const handleBusinessHoursToggle = (provider: string, businessHoursOnly: boolean) => {
    updateScheduleMutation.mutate({ provider, config: { businessHoursOnly } });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Sync Scheduler</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span className="ml-2">Loading sync configuration...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Automated Sync Scheduler</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={syncStatus?.isRunning ? "default" : "secondary"}>
                {syncStatus?.isRunning ? "Running" : "Stopped"}
              </Badge>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => startAllMutation.mutate()}
                  disabled={startAllMutation.isPending || syncStatus?.isRunning}
                >
                  <Play className="w-4 h-4 mr-1" />
                  Start All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => stopAllMutation.mutate()}
                  disabled={stopAllMutation.isPending || !syncStatus?.isRunning}
                >
                  <Pause className="w-4 h-4 mr-1" />
                  Stop All
                </Button>
              </div>
            </div>
          </CardTitle>
          <CardDescription>
            Manage automated sync schedules with intelligent recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{syncStatus?.activeIntervals || 0}</div>
              <div className="text-sm text-slate-600">Active Schedules</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {syncStatus?.nextScheduledSync 
                  ? new Date(syncStatus.nextScheduledSync).toLocaleTimeString()
                  : "None"
                }
              </div>
              <div className="text-sm text-slate-600">Next Sync</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {syncStatus?.schedules?.length || 0}
              </div>
              <div className="text-sm text-slate-600">Total Providers</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Schedule Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {syncStatus?.schedules?.map((schedule) => (
              <div key={schedule.provider} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <h3 className="font-semibold capitalize">{schedule.provider}</h3>
                    <Badge className={getPriorityColor(schedule.priority)}>
                      {schedule.priority} priority
                    </Badge>
                  </div>
                  <Switch
                    checked={schedule.enabled}
                    onCheckedChange={(enabled) => handleScheduleToggle(schedule.provider, enabled)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`interval-${schedule.provider}`}>Sync Interval</Label>
                    <Select
                      value={schedule.interval.toString()}
                      onValueChange={(value) => handleIntervalChange(schedule.provider, parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                        <SelectItem value="240">4 hours</SelectItem>
                        <SelectItem value="480">8 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`business-${schedule.provider}`}
                      checked={schedule.businessHoursOnly}
                      onCheckedChange={(businessHoursOnly) => 
                        handleBusinessHoursToggle(schedule.provider, businessHoursOnly)
                      }
                    />
                    <Label htmlFor={`business-${schedule.provider}`}>Business hours only</Label>
                  </div>
                </div>

                {schedule.lastRun && (
                  <div className="mt-3 text-sm text-slate-600">
                    Last run: {new Date(schedule.lastRun).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Smart Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Smart Recommendations</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRecommendations(!showRecommendations)}
            >
              {showRecommendations ? "Hide" : "Show"} Recommendations
            </Button>
          </CardTitle>
          <CardDescription>
            AI-powered suggestions for optimal sync scheduling
          </CardDescription>
        </CardHeader>
        {showRecommendations && (
          <CardContent>
            <div className="space-y-4">
              {recommendations?.map((rec) => (
                <div key={rec.provider} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold capitalize">{rec.provider}</h4>
                        <Badge variant="outline">
                          {rec.recommendedInterval} min interval
                        </Badge>
                        <span className={`text-sm font-medium ${getConfidenceColor(rec.confidence)}`}>
                          {Math.round(rec.confidence * 100)}% confidence
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{rec.reason}</p>
                      <div className="flex items-center space-x-4 text-xs text-slate-500">
                        <span>Est. duration: {rec.estimatedDuration} min</span>
                        <span>Business hours: {rec.suggestedBusinessHours ? "Yes" : "No"}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateScheduleMutation.mutate({
                        provider: rec.provider,
                        config: {
                          interval: rec.recommendedInterval,
                          businessHoursOnly: rec.suggestedBusinessHours,
                          enabled: true
                        }
                      })}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              ))}
              
              {(!recommendations || recommendations.length === 0) && (
                <div className="text-center py-8 text-slate-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                  <p>No recommendations available at this time</p>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}