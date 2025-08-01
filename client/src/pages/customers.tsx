import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Plus, Search, FileText, DollarSign, Calendar, Phone, Mail, MapPin, Building, Edit, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// Customer form schema
const customerSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  companyName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  notes: z.string().optional()
});

type CustomerFormData = z.infer<typeof customerSchema>;

export default function Customers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {}
  });

  // Queries
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["/api/customers"]
  });

  const { data: allInvoices = [], isLoading: isLoadingInvoices } = useQuery({
    queryKey: ["/api/invoices"]
  });

  const { data: allTimeEntries = [], isLoading: isLoadingTimeEntries } = useQuery({
    queryKey: ["/api/time-entries"]
  });

  // Mutations
  const createCustomer = useMutation({
    mutationFn: (data: CustomerFormData) => apiRequest("/api/customers", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({ title: "Customer created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create customer", description: error.message, variant: "destructive" });
    }
  });

  const deleteCustomer = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/customers/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Customer deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete customer", description: error.message, variant: "destructive" });
    }
  });

  // Filter customers based on search
  const filteredCustomers = (customers as any[]).filter((customer: any) => {
    const searchText = searchQuery.toLowerCase();
    return customer.name.toLowerCase().includes(searchText) ||
           (customer.companyName || "").toLowerCase().includes(searchText) ||
           (customer.email || "").toLowerCase().includes(searchText) ||
           (customer.phone || "").toLowerCase().includes(searchText);
  });

  const openCustomerDetail = (customer: any) => {
    setSelectedCustomer(customer);
    setIsDetailDialogOpen(true);
  };

  const getCustomerInvoices = (customerId: string) => {
    return (allInvoices as any[]).filter((inv: any) => inv.customerId === customerId);
  };

  const getCustomerTimeEntries = (customerId: string) => {
    return (allTimeEntries as any[]).filter((entry: any) => entry.customerId === customerId);
  };

  const calculateCustomerStats = (customer: any) => {
    const customerInvoices = getCustomerInvoices(customer.id);
    const customerTimeEntries = getCustomerTimeEntries(customer.id);
    
    const totalInvoiced = customerInvoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.totalAmount || 0), 0);
    const totalHours = customerTimeEntries.reduce((sum: number, entry: any) => sum + parseFloat(entry.hours || 0), 0);
    
    return { 
      totalInvoiced, 
      totalHours, 
      invoiceCount: customerInvoices.length, 
      timeEntryCount: customerTimeEntries.length 
    };
  };

  const onSubmit = (data: CustomerFormData) => {
    createCustomer.mutate(data);
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Customers</h1>
        <p className="text-muted-foreground mt-1">Manage customer information and service history</p>
      </div>

      {/* Search and Actions */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search customers by name, company, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>Add Customer</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Customer</DialogTitle>
                  <DialogDescription>
                    Create a new customer record
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Customer Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Company name (optional)" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="email@example.com" type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input placeholder="(555) 123-4567" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Street address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="City" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State</FormLabel>
                            <FormControl>
                              <Input placeholder="CA" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="zipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ZIP Code</FormLabel>
                            <FormControl>
                              <Input placeholder="12345" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Additional notes about the customer" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createCustomer.isPending}>
                        Create Customer
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Customer List */}
      {isLoading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading customers...</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {searchQuery ? "No customers found" : "No customers yet"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery 
                ? `No customers match "${searchQuery}"`
                : "Add your first customer to get started"
              }
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Customer
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredCustomers.map((customer: any) => {
            const stats = calculateCustomerStats(customer);
            return (
              <Card key={customer.id} className="transition-shadow hover:shadow-md cursor-pointer" onClick={() => openCustomerDetail(customer)}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-foreground">{customer.name}</h3>
                        {customer.companyName && (
                          <Badge variant="outline" className="text-xs">
                            <Building className="w-3 h-3 mr-1" />
                            {customer.companyName}
                          </Badge>
                        )}
                        {customer.quickbooksId && (
                          <Badge variant="default" className="text-xs">
                            QB Synced
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                        {customer.email && (
                          <div className="flex items-center text-muted-foreground">
                            <Mail className="w-4 h-4 mr-2" />
                            <span className="truncate">{customer.email}</span>
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center text-muted-foreground">
                            <Phone className="w-4 h-4 mr-2" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                        {customer.address && (
                          <div className="flex items-center text-muted-foreground">
                            <MapPin className="w-4 h-4 mr-2" />
                            <span className="truncate">{customer.address}</span>
                          </div>
                        )}
                        <div className="flex items-center text-muted-foreground">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span>Added {format(new Date(customer.createdAt), 'MMM dd, yyyy')}</span>
                        </div>
                      </div>

                      {/* Customer Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center">
                          <FileText className="w-4 h-4 mr-2 text-blue-600" />
                          <span className="font-medium">{stats.invoiceCount} invoices</span>
                        </div>
                        <div className="flex items-center">
                          <DollarSign className="w-4 h-4 mr-2 text-green-600" />
                          <span className="font-medium">${stats.totalInvoiced.toFixed(2)} total</span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-purple-600" />
                          <span className="font-medium">{stats.timeEntryCount} time entries</span>
                        </div>
                        <div className="flex items-center">
                          <span className="font-medium">{stats.totalHours.toFixed(1)} hours logged</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          deleteCustomer.mutate(customer.id);
                        }}
                        disabled={deleteCustomer.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Customer Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>{selectedCustomer?.name}</span>
              {selectedCustomer?.companyName && (
                <Badge variant="outline">{selectedCustomer.companyName}</Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Complete customer information and service history
            </DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
            <Tabs defaultValue="overview" className="mt-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="invoices">Invoices ({getCustomerInvoices(selectedCustomer.id).length})</TabsTrigger>
                <TabsTrigger value="time-entries">Time Entries ({getCustomerTimeEntries(selectedCustomer.id).length})</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedCustomer.email && (
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 mr-3 text-muted-foreground" />
                          <span>{selectedCustomer.email}</span>
                        </div>
                      )}
                      {selectedCustomer.phone && (
                        <div className="flex items-center">
                          <Phone className="w-4 h-4 mr-3 text-muted-foreground" />
                          <span>{selectedCustomer.phone}</span>
                        </div>
                      )}
                      {selectedCustomer.address && (
                        <div className="flex items-start">
                          <MapPin className="w-4 h-4 mr-3 text-muted-foreground mt-0.5" />
                          <div>
                            <div>{selectedCustomer.address}</div>
                            {(selectedCustomer.city || selectedCustomer.state || selectedCustomer.zipCode) && (
                              <div className="text-muted-foreground">
                                {[selectedCustomer.city, selectedCustomer.state, selectedCustomer.zipCode]
                                  .filter(Boolean).join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Account Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-foreground">
                            {getCustomerInvoices(selectedCustomer.id).length}
                          </div>
                          <div className="text-sm text-muted-foreground">Total Invoices</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-foreground">
                            ${getCustomerInvoices(selectedCustomer.id)
                              .reduce((sum: number, inv: any) => sum + parseFloat(inv.totalAmount || 0), 0)
                              .toFixed(2)}
                          </div>
                          <div className="text-sm text-muted-foreground">Total Invoiced</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-foreground">
                            {getCustomerTimeEntries(selectedCustomer.id).length}
                          </div>
                          <div className="text-sm text-muted-foreground">Time Entries</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-foreground">
                            {getCustomerTimeEntries(selectedCustomer.id)
                              .reduce((sum: number, entry: any) => sum + parseFloat(entry.hours || 0), 0)
                              .toFixed(1)}h
                          </div>
                          <div className="text-sm text-muted-foreground">Hours Logged</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="invoices" className="space-y-4">
                {isLoadingInvoices ? (
                  <p className="text-center text-muted-foreground">Loading invoices...</p>
                ) : getCustomerInvoices(selectedCustomer.id).length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No invoices yet</h3>
                      <p className="text-muted-foreground">This customer hasn't been invoiced yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {getCustomerInvoices(selectedCustomer.id).map((invoice: any) => (
                      <Card key={invoice.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{invoice.invoiceNumber}</h4>
                              <p className="text-sm text-muted-foreground">
                                Issued: {format(new Date(invoice.issueDate), 'MMM dd, yyyy')}
                              </p>
                              {invoice.description && (
                                <p className="text-sm text-muted-foreground mt-1">{invoice.description}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <Badge variant={invoice.status === 'paid' ? 'default' : 'outline'}>
                                {invoice.status}
                              </Badge>
                              <p className="text-lg font-semibold mt-1">${parseFloat(invoice.totalAmount || 0).toFixed(2)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="time-entries" className="space-y-4">
                {isLoadingTimeEntries ? (
                  <p className="text-center text-muted-foreground">Loading time entries...</p>
                ) : getCustomerTimeEntries(selectedCustomer.id).length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No time entries yet</h3>
                      <p className="text-muted-foreground">No work has been tracked for this customer</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {getCustomerTimeEntries(selectedCustomer.id).map((entry: any) => (
                      <Card key={entry.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{entry.description || 'Time Entry'}</h4>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(entry.date), 'MMM dd, yyyy')}
                              </p>
                              {entry.technician && (
                                <p className="text-sm text-muted-foreground">Technician: {entry.technician}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{parseFloat(entry.hours || 0).toFixed(1)} hours</p>
                              {entry.hourlyRate && (
                                <p className="text-sm text-muted-foreground">${entry.hourlyRate}/hr</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="notes" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Customer Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedCustomer.notes ? (
                      <p className="text-muted-foreground whitespace-pre-wrap">{selectedCustomer.notes}</p>
                    ) : (
                      <p className="text-muted-foreground italic">No notes available</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}