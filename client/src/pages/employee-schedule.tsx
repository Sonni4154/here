import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, CalendarDays, Clock, MapPin, User, Plus, Edit, Trash2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { EmployeeSchedule, TaskAssignment, User as UserType } from "@shared/schema";

interface ScheduleFormData {
  employeeId: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  customerId?: string;
  projectName?: string;
}

interface TaskFormData {
  assignedTo: string;
  customerId?: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string;
  estimatedHours: number;
  scheduleId?: string;
}

export default function EmployeeSchedule() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateSchedule, setShowCreateSchedule] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(new Date());

  // Fetch schedules for the selected week
  const { data: schedules = [], isLoading: schedulesLoading } = useQuery<EmployeeSchedule[]>({
    queryKey: ["/api/schedules", selectedWeek.toISOString().split('T')[0]],
  });

  // Fetch task assignments
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<TaskAssignment[]>({
    queryKey: ["/api/tasks"],
  });

  // Fetch employees (for admin/manager view)
  const { data: employees = [] } = useQuery<UserType[]>({
    queryKey: ["/api/employees"],
    enabled: user?.role === 'admin' || user?.role === 'manager',
  });

  // Fetch customers for assignment
  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
  });

  // Create schedule mutation
  const createScheduleMutation = useMutation({
    mutationFn: async (data: ScheduleFormData) => {
      return await apiRequest('/api/schedules', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          startTime: new Date(data.startTime).toISOString(),
          endTime: new Date(data.endTime).toISOString(),
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      setShowCreateSchedule(false);
      toast({
        title: "Schedule Created",
        description: "Schedule has been created and synced to Google Calendar.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create schedule",
        variant: "destructive",
      });
    },
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      return await apiRequest('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setShowCreateTask(false);
      toast({
        title: "Task Assigned",
        description: "Task has been assigned successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to assign task",
        variant: "destructive",
      });
    },
  });

  // Sync with Google Calendar
  const syncCalendarMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/sync/google-calendar', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      toast({
        title: "Sync Complete",
        description: "Google Calendar has been synchronized successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Failed to sync with Google Calendar",
        variant: "destructive",
      });
    },
  });

  const handleCreateSchedule = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createScheduleMutation.mutate({
      employeeId: formData.get('employeeId') as string || user?.id || '',
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      startTime: formData.get('startTime') as string,
      endTime: formData.get('endTime') as string,
      location: formData.get('location') as string,
      customerId: formData.get('customerId') as string || undefined,
      projectName: formData.get('projectName') as string || undefined,
    });
  };

  const handleCreateTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createTaskMutation.mutate({
      assignedTo: formData.get('assignedTo') as string,
      customerId: formData.get('customerId') as string || undefined,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      priority: formData.get('priority') as 'low' | 'medium' | 'high' | 'urgent',
      dueDate: formData.get('dueDate') as string,
      estimatedHours: parseFloat(formData.get('estimatedHours') as string) || 0,
      scheduleId: formData.get('scheduleId') as string || undefined,
    });
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">Urgent</Badge>;
      case 'high':
        return <Badge variant="default" className="bg-orange-100 text-orange-800">High</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'in_progress':
        return <Badge variant="default" className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />In Progress</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />Scheduled</Badge>;
    }
  };

  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Employee Schedule</h1>
          <p className="text-slate-600">Manage schedules and task assignments with Google Calendar sync</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => syncCalendarMutation.mutate()}
            disabled={syncCalendarMutation.isPending}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Sync Calendar
          </Button>
          {isAdminOrManager && (
            <>
              <Dialog open={showCreateTask} onOpenChange={setShowCreateTask}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Assign Task
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Assign New Task</DialogTitle>
                    <DialogDescription>Create a task assignment for an employee</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateTask} className="space-y-4">
                    <div>
                      <Label htmlFor="assignedTo">Assign To</Label>
                      <Select name="assignedTo" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((employee) => (
                            <SelectItem key={employee.id} value={employee.id}>
                              {employee.firstName} {employee.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="title">Task Title</Label>
                      <Input name="title" required placeholder="Enter task title" />
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea name="description" placeholder="Task description..." rows={3} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="priority">Priority</Label>
                        <Select name="priority" defaultValue="medium">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="estimatedHours">Est. Hours</Label>
                        <Input name="estimatedHours" type="number" step="0.5" placeholder="0" />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="dueDate">Due Date</Label>
                      <Input name="dueDate" type="datetime-local" />
                    </div>

                    <div>
                      <Label htmlFor="customerId">Customer (Optional)</Label>
                      <Select name="customerId">
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map((customer: any) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button type="submit" className="w-full" disabled={createTaskMutation.isPending}>
                      Assign Task
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={showCreateSchedule} onOpenChange={setShowCreateSchedule}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Schedule
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create Schedule</DialogTitle>
                    <DialogDescription>Add a new schedule entry for an employee</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateSchedule} className="space-y-4">
                    <div>
                      <Label htmlFor="employeeId">Employee</Label>
                      <Select name="employeeId" defaultValue={user?.id}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((employee) => (
                            <SelectItem key={employee.id} value={employee.id}>
                              {employee.firstName} {employee.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input name="title" required placeholder="Meeting, Service Call, etc." />
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea name="description" placeholder="Schedule description..." rows={2} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="startTime">Start Time</Label>
                        <Input name="startTime" type="datetime-local" required />
                      </div>

                      <div>
                        <Label htmlFor="endTime">End Time</Label>
                        <Input name="endTime" type="datetime-local" required />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input name="location" placeholder="Address or meeting location" />
                    </div>

                    <div>
                      <Label htmlFor="customerId">Customer (Optional)</Label>
                      <Select name="customerId">
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map((customer: any) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="projectName">Project Name</Label>
                      <Input name="projectName" placeholder="Optional project name" />
                    </div>

                    <Button type="submit" className="w-full" disabled={createScheduleMutation.isPending}>
                      Create Schedule
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Schedules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CalendarDays className="w-5 h-5 mr-2" />
              Schedule
            </CardTitle>
            <CardDescription>Upcoming appointments and events</CardDescription>
          </CardHeader>
          <CardContent>
            {schedulesLoading ? (
              <div className="text-center py-4">Loading schedules...</div>
            ) : schedules.length > 0 ? (
              <div className="space-y-3">
                {schedules.map((schedule) => (
                  <div key={schedule.id} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-slate-900">{schedule.title}</h3>
                      {getStatusBadge(schedule.status || 'scheduled')}
                    </div>
                    
                    <div className="text-sm text-slate-600 space-y-1">
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(schedule.startTime).toLocaleString()} - {new Date(schedule.endTime).toLocaleString()}
                      </div>
                      
                      {schedule.location && (
                        <div className="flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {schedule.location}
                        </div>
                      )}
                      
                      {schedule.description && (
                        <p className="mt-2">{schedule.description}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center space-x-2">
                        {schedule.googleEventId && (
                          <Badge variant="outline" className="text-xs">
                            <Calendar className="w-3 h-3 mr-1" />
                            Synced
                          </Badge>
                        )}
                      </div>
                      
                      {isAdminOrManager && (
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm">
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <CalendarDays className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No schedules found</p>
                <p className="text-sm">Create your first schedule above</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="w-5 h-5 mr-2" />
              Task Assignments
            </CardTitle>
            <CardDescription>Assigned tasks and their status</CardDescription>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="text-center py-4">Loading tasks...</div>
            ) : tasks.length > 0 ? (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div key={task.id} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-slate-900">{task.title}</h3>
                      <div className="flex space-x-2">
                        {getPriorityBadge(task.priority || 'medium')}
                        {getStatusBadge(task.status || 'assigned')}
                      </div>
                    </div>
                    
                    {task.description && (
                      <p className="text-sm text-slate-600 mb-2">{task.description}</p>
                    )}
                    
                    <div className="text-xs text-slate-500 space-y-1">
                      {task.dueDate && (
                        <div>Due: {new Date(task.dueDate).toLocaleString()}</div>
                      )}
                      
                      {task.estimatedHours && (
                        <div>Estimated: {task.estimatedHours} hours</div>
                      )}
                      
                      {task.actualHours && (
                        <div>Actual: {task.actualHours} hours</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <User className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No tasks assigned</p>
                <p className="text-sm">Tasks will appear here when assigned</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}