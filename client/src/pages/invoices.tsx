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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Plus, Search, DollarSign, Calendar, User, Package, Edit, Trash2, Send } from "lucide-react";
import { CustomerAutocompleteInput } from "@/components/ui/customer-autocomplete";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// Invoice form schema
const invoiceSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  description: z.string().optional(),
  status: z.enum(["draft", "sent", "paid", "overdue"]).default("draft"),
  items: z.array(z.object({
    description: z.string().min(1, "Item description is required"),
    quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
    unitPrice: z.coerce.number().min(0, "Unit price must be positive"),
    total: z.coerce.number()
  })).min(1, "At least one item is required"),
  subtotal: z.coerce.number(),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  taxAmount: z.coerce.number(),
  totalAmount: z.coerce.number()
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

export default function Invoices() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"all" | "by-customer" | "by-product">("all");

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      status: "draft",
      taxRate: 0,
      items: [{ description: "", quantity: 1, unitPrice: 0, total: 0 }]
    }
  });

  // Queries
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["/api/invoices"]
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"]
  });

  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"]
  });

  // Mutations
  const createInvoice = useMutation({
    mutationFn: (data: InvoiceFormData) => apiRequest("/api/invoices", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({ title: "Invoice created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create invoice", description: error.message, variant: "destructive" });
    }
  });

  const deleteInvoice = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/invoices/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete invoice", description: error.message, variant: "destructive" });
    }
  });

  // Filter invoices
  const filteredInvoices = (invoices as any[]).filter((invoice: any) => {
    const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (invoice.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    const matchesCustomer = selectedCustomer === "all" || invoice.customerId === selectedCustomer;
    
    return matchesSearch && matchesStatus && matchesCustomer;
  });

  // Group by customer for customer view
  const invoicesByCustomer = (customers as any[]).map((customer: any) => ({
    customer,
    invoices: filteredInvoices.filter((inv: any) => inv.customerId === customer.id)
  })).filter(group => group.invoices.length > 0);

  // Group by product for product view
  const invoicesByProduct = () => {
    const productMap = new Map();
    filteredInvoices.forEach((invoice: any) => {
      if (invoice.items) {
        invoice.items.forEach((item: any) => {
          if (!productMap.has(item.description)) {
            productMap.set(item.description, []);
          }
          productMap.get(item.description).push({ ...invoice, item });
        });
      }
    });
    return Array.from(productMap.entries()).map(([product, invoices]) => ({
      product,
      invoices
    }));
  };

  const getCustomerName = (customerId: string) => {
    const customer = (customers as any[]).find((c: any) => c.id === customerId);
    return customer ? customer.name : 'Unknown Customer';
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: "outline",
      sent: "secondary",
      paid: "default",
      overdue: "destructive"
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || "outline"}>{status}</Badge>;
  };

  const calculateTotals = () => {
    const items = form.watch("items") || [];
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const taxRate = form.watch("taxRate") || 0;
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = subtotal + taxAmount;

    form.setValue("subtotal", subtotal);
    form.setValue("taxAmount", taxAmount);
    form.setValue("totalAmount", totalAmount);

    return { subtotal, taxAmount, totalAmount };
  };

  const addItem = () => {
    const currentItems = form.getValues("items");
    form.setValue("items", [...currentItems, { description: "", quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    const currentItems = form.getValues("items");
    if (currentItems.length > 1) {
      form.setValue("items", currentItems.filter((_, i) => i !== index));
    }
  };

  const onSubmit = (data: InvoiceFormData) => {
    createInvoice.mutate(data);
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Invoices</h1>
        <p className="text-muted-foreground mt-1">Create and manage customer invoices with multi-dimensional viewing</p>
      </div>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)} className="mb-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Invoices</TabsTrigger>
          <TabsTrigger value="by-customer">By Customer</TabsTrigger>
          <TabsTrigger value="by-product">By Product/Service</TabsTrigger>
        </TabsList>

        {/* Filters and Actions */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search invoices by number or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {(customers as any[]).map((customer: any) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center space-x-2">
                    <Plus className="w-4 h-4" />
                    <span>Create Invoice</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Invoice</DialogTitle>
                    <DialogDescription>
                      Generate a new invoice for a customer
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="customerId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Customer</FormLabel>
                              <FormControl>
                                <CustomerAutocompleteInput
                                  value={field.value}
                                  onChange={field.onChange}
                                  placeholder="Select customer..."
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="invoiceNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Invoice Number</FormLabel>
                              <FormControl>
                                <Input placeholder="INV-001" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="issueDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Issue Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="dueDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Due Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
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
                              <Textarea placeholder="Invoice description" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Invoice Items */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium">Invoice Items</h3>
                          <Button type="button" variant="outline" onClick={addItem}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Item
                          </Button>
                        </div>
                        
                        {form.watch("items")?.map((_, index) => (
                          <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded-lg">
                            <div className="md:col-span-2">
                              <FormField
                                control={form.control}
                                name={`items.${index}.description`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Item description" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Quantity</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      min="1" 
                                      {...field}
                                      onChange={(e) => {
                                        field.onChange(e);
                                        calculateTotals();
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name={`items.${index}.unitPrice`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Unit Price</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      step="0.01" 
                                      min="0"
                                      {...field}
                                      onChange={(e) => {
                                        field.onChange(e);
                                        calculateTotals();
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <div className="flex items-end">
                              {index > 0 && (
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => removeItem(index)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Totals */}
                      <div className="border-t pt-4">
                        <div className="flex justify-end">
                          <div className="w-64 space-y-2">
                            <div className="flex justify-between">
                              <span>Subtotal:</span>
                              <span>${calculateTotals().subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span>Tax:</span>
                              <div className="flex items-center space-x-2">
                                <FormField
                                  control={form.control}
                                  name="taxRate"
                                  render={({ field }) => (
                                    <Input 
                                      type="number" 
                                      step="0.01" 
                                      min="0" 
                                      max="100"
                                      className="w-20"
                                      {...field}
                                      onChange={(e) => {
                                        field.onChange(e);
                                        calculateTotals();
                                      }}
                                    />
                                  )}
                                />
                                <span>% = ${calculateTotals().taxAmount.toFixed(2)}</span>
                              </div>
                            </div>
                            <div className="flex justify-between font-semibold text-lg border-t pt-2">
                              <span>Total:</span>
                              <span>${calculateTotals().totalAmount.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createInvoice.isPending}>
                          Create Invoice
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Display */}
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading invoices...</p>
          </div>
        ) : (
          <>
            <TabsContent value="all">
              {filteredInvoices.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      {searchQuery || statusFilter !== "all" || selectedCustomer !== "all" ? "No matching invoices" : "No invoices yet"}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {searchQuery || statusFilter !== "all" || selectedCustomer !== "all"
                        ? "No invoices match your current filters"
                        : "Create your first invoice to get started"
                      }
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {filteredInvoices.map((invoice: any) => (
                    <Card key={invoice.id} className="transition-shadow hover:shadow-md">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-foreground">{invoice.invoiceNumber}</h3>
                              {getStatusBadge(invoice.status)}
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                              <div className="flex items-center text-muted-foreground">
                                <User className="w-4 h-4 mr-2" />
                                <span>{getCustomerName(invoice.customerId)}</span>
                              </div>
                              <div className="flex items-center text-muted-foreground">
                                <Calendar className="w-4 h-4 mr-2" />
                                <span>Issued: {format(new Date(invoice.issueDate), 'MMM dd, yyyy')}</span>
                              </div>
                              <div className="flex items-center text-muted-foreground">
                                <Calendar className="w-4 h-4 mr-2" />
                                <span>Due: {format(new Date(invoice.dueDate), 'MMM dd, yyyy')}</span>
                              </div>
                              <div className="flex items-center text-muted-foreground">
                                <DollarSign className="w-4 h-4 mr-2" />
                                <span className="font-medium text-foreground">${parseFloat(invoice.totalAmount || 0).toFixed(2)}</span>
                              </div>
                            </div>

                            {invoice.description && (
                              <p className="text-muted-foreground text-sm">{invoice.description}</p>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button variant="outline" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Send className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => deleteInvoice.mutate(invoice.id)}
                              disabled={deleteInvoice.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="by-customer">
              {invoicesByCustomer.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No customer invoices</h3>
                    <p className="text-muted-foreground">No invoices found for the selected filters</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {invoicesByCustomer.map(({ customer, invoices }) => (
                    <Card key={customer.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>{customer.name}</span>
                          <div className="flex space-x-2">
                            <Badge variant="outline">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</Badge>
                            <Badge variant="secondary">
                              ${invoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.totalAmount || 0), 0).toFixed(2)} total
                            </Badge>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {invoices.map((invoice: any) => (
                            <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <p className="font-medium">{invoice.invoiceNumber}</p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(invoice.issueDate), 'MMM dd, yyyy')} • Due: {format(new Date(invoice.dueDate), 'MMM dd, yyyy')}
                                </p>
                                {invoice.description && (
                                  <p className="text-sm text-muted-foreground mt-1">{invoice.description}</p>
                                )}
                              </div>
                              <div className="text-right">
                                {getStatusBadge(invoice.status)}
                                <p className="font-semibold mt-1">${parseFloat(invoice.totalAmount || 0).toFixed(2)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="by-product">
              {invoicesByProduct().length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No product invoices</h3>
                    <p className="text-muted-foreground">No invoices found with products/services</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {invoicesByProduct().map(({ product, invoices }) => (
                    <Card key={product}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>{product}</span>
                          <div className="flex space-x-2">
                            <Badge variant="outline">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</Badge>
                            <Badge variant="secondary">
                              ${invoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.item.total || 0), 0).toFixed(2)} total
                            </Badge>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {invoices.map((invoice: any) => (
                            <div key={`${invoice.id}-${invoice.item.description}`} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <p className="font-medium">{invoice.invoiceNumber}</p>
                                <p className="text-sm text-muted-foreground">
                                  {getCustomerName(invoice.customerId)} • {format(new Date(invoice.issueDate), 'MMM dd, yyyy')}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Qty: {invoice.item.quantity} @ ${parseFloat(invoice.item.unitPrice || 0).toFixed(2)}
                                </p>
                              </div>
                              <div className="text-right">
                                {getStatusBadge(invoice.status)}
                                <p className="font-semibold mt-1">${parseFloat(invoice.item.total || 0).toFixed(2)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}