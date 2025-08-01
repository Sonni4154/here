import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUpload } from "@/components/ui/file-upload";

import { Clock, Play, Square, Plus, Trash2, Calendar, Camera, Upload } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Clock entry form schema
const clockEntrySchema = z.object({
  clockInTime: z.string(),
});

// Time entry form schema
const timeEntrySchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().min(1, "Customer name is required"),
  projectName: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  billable: z.boolean().default(true),
});

// Line item schema
const lineItemSchema = z.object({
  type: z.enum(["product", "service"]),
  itemName: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  quantity: z.coerce.number().positive().optional(),
  hours: z.coerce.number().positive().optional(),
  rate: z.coerce.number().positive(),
  amount: z.coerce.number().positive(),
});

type TimeEntryFormData = z.infer<typeof timeEntrySchema>;
type LineItemFormData = z.infer<typeof lineItemSchema>;

export default function TimeTracking() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeClock, setActiveClock] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isClockDialogOpen, setIsClockDialogOpen] = useState(false);
  const [isTimeEntryDialogOpen, setIsTimeEntryDialogOpen] = useState(false);
  const [lineItems, setLineItems] = useState<LineItemFormData[]>([]);
  const [beforePhotos, setBeforePhotos] = useState<File[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<File[]>([]);
  const [materialPhotos, setMaterialPhotos] = useState<File[]>([]);

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Queries
  const { data: timeEntries = [] } = useQuery({
    queryKey: ["/api/time-entries"],
  });

  const { data: clockEntries = [] } = useQuery({
    queryKey: ["/api/clock-entries"],
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
  });

  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"],
  });

  // Check for active clock entry
  useEffect(() => {
    const activeEntry = clockEntries.find((entry: any) => entry.status === 'active');
    setActiveClock(activeEntry);
  }, [clockEntries]);

  // Clock In/Out mutations
  const clockInMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/clock-entries', {
        method: 'POST',
        body: {
          clockInTime: new Date().toISOString(),
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clock-entries"] });
      toast({
        title: "Clocked In",
        description: "Your time tracking has started.",
      });
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: async (clockId: string) => {
      return await apiRequest(`/api/clock-entries/${clockId}/clock-out`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clock-entries"] });
      toast({
        title: "Clocked Out",
        description: "Your time tracking has stopped.",
      });
    },
  });

  // Time entry mutation
  const timeEntryMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/time-entries', {
        method: 'POST',
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      setIsTimeEntryDialogOpen(false);
      timeEntryForm.reset();
      setLineItems([]);
      toast({
        title: "Time Entry Created",
        description: "Your time entry has been saved.",
      });
    },
  });

  // Forms
  const timeEntryForm = useForm<TimeEntryFormData>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      billable: true,
    },
  });

  // Calculate elapsed time for active clock
  const getElapsedTime = () => {
    if (!activeClock) return "00:00:00";
    const start = new Date(activeClock.clockInTime);
    const elapsed = currentTime.getTime() - start.getTime();
    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const addLineItem = () => {
    setLineItems([...lineItems, {
      type: "service",
      itemName: "",
      description: "",
      quantity: 1,
      hours: 0,
      rate: 0,
      amount: 0,
    }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof LineItemFormData, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // Calculate amount automatically
    if (field === 'quantity' || field === 'rate' || field === 'hours') {
      const item = updated[index];
      if (item.type === 'product' && item.quantity && item.rate) {
        updated[index].amount = item.quantity * item.rate;
      } else if (item.type === 'service' && item.hours && item.rate) {
        updated[index].amount = item.hours * item.rate;
      }
    }
    
    setLineItems(updated);
  };

  const onSubmitTimeEntry = (data: TimeEntryFormData) => {
    // Calculate hours from start and end time
    const start = new Date(`1970-01-01T${data.startTime}`);
    const end = new Date(`1970-01-01T${data.endTime}`);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    timeEntryMutation.mutate({
      ...data,
      hours: hours.toFixed(2),
      lineItems,
    });
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Time Tracking</h1>
        <p className="text-slate-600 mt-1">Clock in/out and manage your time entries</p>
      </div>

            {/* Clock In/Out Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="w-5 h-5" />
                    <span>Current Time</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-mono font-bold text-slate-900 mb-4">
                    {currentTime.toLocaleTimeString()}
                  </div>
                  <div className="text-sm text-slate-600">
                    {currentTime.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="w-5 h-5" />
                    <span>Time Clock</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {activeClock ? (
                    <div>
                      <div className="text-xl font-mono font-bold text-green-600 mb-2">
                        {getElapsedTime()}
                      </div>
                      <p className="text-sm text-slate-600 mb-4">
                        Clocked in at {new Date(activeClock.clockInTime).toLocaleTimeString()}
                      </p>
                      <Button 
                        onClick={() => clockOutMutation.mutate(activeClock.id)}
                        disabled={clockOutMutation.isPending}
                        className="w-full bg-red-600 hover:bg-red-700"
                      >
                        <Square className="w-4 h-4 mr-2" />
                        Clock Out
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <div className="text-xl font-mono font-bold text-slate-400 mb-2">
                        00:00:00
                      </div>
                      <p className="text-sm text-slate-600 mb-4">
                        Not currently clocked in
                      </p>
                      <Button 
                        onClick={() => clockInMutation.mutate()}
                        disabled={clockInMutation.isPending}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Clock In
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4 mb-8">
              <Dialog open={isTimeEntryDialogOpen} onOpenChange={setIsTimeEntryDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-slate-800 hover:bg-slate-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Enter Hours and Materials
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Enter Hours and Materials</DialogTitle>
                    <DialogDescription>
                      Create a detailed time entry with products and services
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...timeEntryForm}>
                    <form onSubmit={timeEntryForm.handleSubmit(onSubmitTimeEntry)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={timeEntryForm.control}
                          name="customerName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Customer</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Enter customer name"
                                  {...field}
                                  list="customers"
                                />
                              </FormControl>
                              <datalist id="customers">
                                {customers.map((customer: any) => (
                                  <option key={customer.id} value={customer.name} />
                                ))}
                              </datalist>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={timeEntryForm.control}
                          name="projectName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Project</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter project name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={timeEntryForm.control}
                          name="startTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Time</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={timeEntryForm.control}
                          name="endTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>End Time</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={timeEntryForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe the work performed"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={timeEntryForm.control}
                        name="billable"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Billable</FormLabel>
                              <p className="text-sm text-slate-500">
                                Check if this time should be billed to the customer
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />

                      {/* Products and Services Section */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium">Products & Services</h3>
                          <Button type="button" onClick={addLineItem} variant="outline" size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Item
                          </Button>
                        </div>

                        {lineItems.map((item, index) => (
                          <Card key={index} className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                              <div>
                                <label className="text-sm font-medium">Type</label>
                                <Select
                                  value={item.type}
                                  onValueChange={(value) => updateLineItem(index, 'type', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="product">Product</SelectItem>
                                    <SelectItem value="service">Service</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <label className="text-sm font-medium">Item</label>
                                <Input
                                  placeholder="Item name"
                                  value={item.itemName}
                                  onChange={(e) => updateLineItem(index, 'itemName', e.target.value)}
                                  list={`items-${index}`}
                                />
                                <datalist id={`items-${index}`}>
                                  {products
                                    .filter((product: any) => product.type === item.type)
                                    .map((product: any) => (
                                      <option key={product.id} value={product.name} />
                                    ))
                                  }
                                </datalist>
                              </div>

                              {item.type === 'product' ? (
                                <div>
                                  <label className="text-sm font-medium">Quantity</label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={item.quantity || ''}
                                    onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value))}
                                  />
                                </div>
                              ) : (
                                <div>
                                  <label className="text-sm font-medium">Hours</label>
                                  <Input
                                    type="number"
                                    step="0.25"
                                    value={item.hours || ''}
                                    onChange={(e) => updateLineItem(index, 'hours', parseFloat(e.target.value))}
                                  />
                                </div>
                              )}

                              <div>
                                <label className="text-sm font-medium">Rate</label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.rate || ''}
                                  onChange={(e) => updateLineItem(index, 'rate', parseFloat(e.target.value))}
                                />
                              </div>

                              <div>
                                <label className="text-sm font-medium">Amount</label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.amount || ''}
                                  readOnly
                                  className="bg-slate-50"
                                />
                              </div>

                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeLineItem(index)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setIsTimeEntryDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={timeEntryMutation.isPending}>
                          Save Time Entry
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Recent Time Entries */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Time Entries</CardTitle>
                <CardDescription>Your recent time tracking entries</CardDescription>
              </CardHeader>
              <CardContent>
                {timeEntries.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No time entries yet</p>
                ) : (
                  <div className="space-y-4">
                    {timeEntries.slice(0, 10).map((entry: any) => (
                      <div key={entry.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-medium text-slate-900">{entry.description}</h3>
                            {entry.billable && (
                              <Badge variant="default" className="text-xs">Billable</Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-600">
                            {entry.hours}h • {entry.projectName || 'No Project'} • {new Date(entry.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={
                          entry.status === 'draft' ? 'secondary' : 
                          entry.status === 'submitted' ? 'outline' : 'default'
                        }>
                          {entry.status}
                        </Badge>
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