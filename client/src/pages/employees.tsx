import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Phone, MapPin, Calendar, DollarSign, FileText, Plus, Edit, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { Link } from "wouter";

export default function Employees() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNote, setNewNote] = useState({ content: "", category: "general" });

  // Queries
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["/api/employees"]
  });

  const { data: employeeStats } = useQuery({
    queryKey: ["/api/employees/stats", selectedEmployee?.id],
    enabled: !!selectedEmployee?.id
  });

  const { data: employeeNotes = [] } = useQuery({
    queryKey: ["/api/employees", selectedEmployee?.id, "notes"],
    enabled: !!selectedEmployee?.id
  });

  // Mutations
  const addEmployeeNote = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/employees/${selectedEmployee?.id}/notes`, { method: "POST", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees", selectedEmployee?.id, "notes"] });
      setNewNote({ content: "", category: "general" });
      setShowAddNote(false);
      toast({ title: "Note added successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to add note", description: error.message, variant: "destructive" });
    }
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const handleAddNote = () => {
    if (!newNote.content.trim()) return;
    addEmployeeNote.mutate(newNote);
  };

  const getEmployeeHours = (period: 'week' | 'month' | 'year') => {
    if (!employeeStats) return 0;
    return employeeStats[`${period}Hours`] || 0;
  };

  const getEmployeeEarnings = (period: 'week' | 'month' | 'year') => {
    if (!employeeStats) return 0;
    const hours = getEmployeeHours(period);
    const rate = selectedEmployee?.payRate || 0;
    return hours * rate;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Employee Directory</h1>
          <p className="text-muted-foreground">Manage employee information and performance</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Employee
        </Button>
      </div>

      {/* Employee Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employees.map((employee: any) => (
          <Card key={employee.id} className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">
                    {employee.firstName} {employee.lastName}
                  </CardTitle>
                  <CardDescription className="flex items-center space-x-2">
                    <Badge variant={employee.isActive ? "default" : "secondary"}>
                      {employee.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <span className="capitalize">{employee.role}</span>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {employee.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{employee.phone}</span>
                  </div>
                )}
                {employee.hireDate && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>Hired {format(new Date(employee.hireDate), 'MMM yyyy')}</span>
                  </div>
                )}
                {employee.payRate && (
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span>${employee.payRate}/hour</span>
                  </div>
                )}
                {employee.disciplines && employee.disciplines.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {employee.disciplines.slice(0, 3).map((discipline: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {discipline}
                      </Badge>
                    ))}
                    {employee.disciplines.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{employee.disciplines.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <div className="mt-4 flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedEmployee(employee)}
                  className="flex-1"
                >
                  <User className="w-4 h-4 mr-2" />
                  View Details
                </Button>
                <Link href={`/employee-schedule?employee=${employee.id}`}>
                  <Button variant="outline" size="sm">
                    <Clock className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Employee Detail Modal */}
      <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-3">
              <User className="w-6 h-6" />
              <span>{selectedEmployee?.firstName} {selectedEmployee?.lastName}</span>
              <Badge variant={selectedEmployee?.isActive ? "default" : "secondary"}>
                {selectedEmployee?.isActive ? "Active" : "Inactive"}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Employee details and performance tracking
            </DialogDescription>
          </DialogHeader>

          {selectedEmployee && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="hours">Hours & Pay</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Email</Label>
                    <p className="text-sm font-medium">{selectedEmployee.email}</p>
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <p className="text-sm font-medium">{selectedEmployee.phone || "Not provided"}</p>
                  </div>
                  <div>
                    <Label>Address</Label>
                    <p className="text-sm font-medium">{selectedEmployee.address || "Not provided"}</p>
                  </div>
                  <div>
                    <Label>Hire Date</Label>
                    <p className="text-sm font-medium">
                      {selectedEmployee.hireDate ? format(new Date(selectedEmployee.hireDate), 'PPP') : "Not provided"}
                    </p>
                  </div>
                  <div>
                    <Label>Pay Rate</Label>
                    <p className="text-sm font-medium">
                      {selectedEmployee.payRate ? `$${selectedEmployee.payRate}/hour` : "Not set"}
                    </p>
                  </div>
                  <div>
                    <Label>Role</Label>
                    <p className="text-sm font-medium capitalize">{selectedEmployee.role}</p>
                  </div>
                </div>
                
                {selectedEmployee.disciplines && selectedEmployee.disciplines.length > 0 && (
                  <div>
                    <Label>Disciplines</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedEmployee.disciplines.map((discipline: string, index: number) => (
                        <Badge key={index} variant="outline">
                          {discipline}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="hours" className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">This Week</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{getEmployeeHours('week').toFixed(1)}h</div>
                      <div className="text-sm text-muted-foreground">
                        ${getEmployeeEarnings('week').toFixed(2)} earned
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">This Month</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{getEmployeeHours('month').toFixed(1)}h</div>
                      <div className="text-sm text-muted-foreground">
                        ${getEmployeeEarnings('month').toFixed(2)} earned
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Year to Date</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{getEmployeeHours('year').toFixed(1)}h</div>
                      <div className="text-sm text-muted-foreground">
                        ${getEmployeeEarnings('year').toFixed(2)} earned
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="notes" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Employee Notes</h3>
                  <Button onClick={() => setShowAddNote(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Note
                  </Button>
                </div>

                {showAddNote && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Add New Note</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label>Category</Label>
                        <Select
                          value={newNote.category}
                          onValueChange={(value) => setNewNote(prev => ({ ...prev, category: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="performance">Performance</SelectItem>
                            <SelectItem value="disciplinary">Disciplinary</SelectItem>
                            <SelectItem value="training">Training</SelectItem>
                            <SelectItem value="recognition">Recognition</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Note</Label>
                        <Textarea
                          value={newNote.content}
                          onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                          placeholder="Enter note details..."
                          rows={3}
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button onClick={handleAddNote} disabled={addEmployeeNote.isPending}>
                          {addEmployeeNote.isPending ? "Adding..." : "Add Note"}
                        </Button>
                        <Button variant="outline" onClick={() => setShowAddNote(false)}>
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-3">
                  {employeeNotes.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No notes recorded</p>
                  ) : (
                    employeeNotes.map((note: any) => (
                      <Card key={note.id}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="capitalize">
                              {note.category}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(note.createdAt), 'PPp')}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm">{note.content}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            By: {note.createdByName || "Unknown"}
                          </p>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="performance" className="space-y-4">
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Performance Metrics</h3>
                  <p className="text-muted-foreground mb-4">
                    Performance tracking features coming soon
                  </p>
                  <Badge variant="outline">Feature in Development</Badge>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}