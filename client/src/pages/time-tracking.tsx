import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, Play, Square, Plus, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertTimeEntrySchema, type InsertTimeEntry } from "@shared/schema";
import { formatDistance } from "date-fns";

export default function TimeTracking() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [activeTimer, setActiveTimer] = useState<{ startTime: Date, description: string } | null>(null);

  const form = useForm<InsertTimeEntry>({
    resolver: zodResolver(insertTimeEntrySchema),
    defaultValues: {
      description: "",
      projectName: "",
      status: "draft",
      hourlyRate: "25.00",
    },
  });

  const { data: timeEntries = [], isLoading } = useQuery({
    queryKey: ["/api/time-entries"],
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
  });

  const createTimeEntry = useMutation({
    mutationFn: (data: InsertTimeEntry) => apiRequest("/api/time-entries", { method: "POST", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({ title: "Time entry created successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to create time entry", description: error.message, variant: "destructive" });
    },
  });

  const submitTimeEntry = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/time-entries/${id}/submit`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      toast({ title: "Time entry submitted for approval" });
    },
    onError: (error) => {
      toast({ title: "Failed to submit time entry", description: error.message, variant: "destructive" });
    },
  });

  const startTimer = () => {
    const description = prompt("Enter task description:");
    if (description) {
      setActiveTimer({ startTime: new Date(), description });
      toast({ title: "Timer started", description: `Working on: ${description}` });
    }
  };

  const stopTimer = () => {
    if (activeTimer) {
      const endTime = new Date();
      const hours = ((endTime.getTime() - activeTimer.startTime.getTime()) / (1000 * 60 * 60)).toFixed(2);
      
      form.setValue("description", activeTimer.description);
      form.setValue("startTime", activeTimer.startTime.toISOString());
      form.setValue("endTime", endTime.toISOString());
      form.setValue("hours", hours);
      
      setActiveTimer(null);
      setIsAddDialogOpen(true);
      toast({ title: "Timer stopped", description: `Logged ${hours} hours` });
    }
  };

  const onSubmit = (data: InsertTimeEntry) => {
    createTimeEntry.mutate(data);
  };

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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Time Tracking</h1>
          <p className="text-slate-600 mt-1">Log your hours and track project time</p>
        </div>
        <div className="flex space-x-3">
          {activeTimer ? (
            <Button onClick={stopTimer} variant="destructive" className="flex items-center space-x-2">
              <Square className="w-4 h-4" />
              <span>Stop Timer</span>
              <span className="font-mono">
                {formatDistance(activeTimer.startTime, new Date(), { includeSeconds: true })}
              </span>
            </Button>
          ) : (
            <Button onClick={startTimer} className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700">
              <Play className="w-4 h-4" />
              <span>Start Timer</span>
            </Button>
          )}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Add Entry</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Time Entry</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="customerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select customer" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {customers.map((customer: any) => (
                                <SelectItem key={customer.id} value={customer.id}>
                                  {customer.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="projectName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project</FormLabel>
                          <FormControl>
                            <Input placeholder="Project name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Describe the work performed..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Time</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="hours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hours</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.25" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="hourlyRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hourly Rate</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="25.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createTimeEntry.isPending}>
                      Save Entry
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {activeTimer && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Timer Running</span>
                <span className="text-sm text-slate-600">{activeTimer.description}</span>
              </div>
              <div className="font-mono text-lg">
                {formatDistance(activeTimer.startTime, new Date(), { includeSeconds: true })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Recent Time Entries</span>
          </CardTitle>
          <CardDescription>
            Your logged hours and time entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading time entries...</div>
          ) : timeEntries.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No time entries yet. Start tracking your time!
            </div>
          ) : (
            <div className="space-y-4">
              {timeEntries.map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-medium">{entry.description}</h3>
                      {getStatusBadge(entry.status)}
                    </div>
                    <div className="text-sm text-slate-600 space-y-1">
                      {entry.projectName && <p>Project: {entry.projectName}</p>}
                      {entry.customerId && <p>Customer: {entry.customer?.name}</p>}
                      <p>Hours: {entry.hours} @ ${entry.hourlyRate}/hr</p>
                      <p>Total: ${(parseFloat(entry.hours) * parseFloat(entry.hourlyRate)).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {entry.status === "draft" && (
                      <Button
                        size="sm"
                        onClick={() => submitTimeEntry.mutate(entry.id)}
                        disabled={submitTimeEntry.isPending}
                      >
                        Submit
                      </Button>
                    )}
                    {entry.status === "submitted" && <AlertCircle className="w-5 h-5 text-yellow-500" />}
                    {entry.status === "approved" && <CheckCircle className="w-5 h-5 text-green-500" />}
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