import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CustomerAutocomplete } from "@/components/ui/customer-autocomplete";
import { FileText, Plus, DollarSign, Calendar, User, Trash2, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// Invoice form schema
const invoiceSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  customerName: z.string().optional(),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  description: z.string().optional(),
  status: z.enum(["draft", "sent", "paid", "overdue"]).default("draft"),
  items: z.array(z.object({
    description: z.string().min(1, "Description is required"),
    quantity: z.coerce.number().positive(),
    rate: z.coerce.number().positive(),
    amount: z.coerce.number().positive()
  })).min(1, "At least one item is required")
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

export default function Invoices() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState([
    { description: "", quantity: 1, rate: 0, amount: 0 }
  ]);

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      status: "draft",
      items: invoiceItems
    }
  });

  // Queries
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["/api/invoices"]
  });

  const { data: integrations = [] } = useQuery({
    queryKey: ["/api/integrations"]
  });

  // Mutations
  const createInvoice = useMutation({
    mutationFn: (data: InvoiceFormData) => apiRequest("/api/invoices", { method: "POST", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setIsCreateDialogOpen(false);
      form.reset();
      setInvoiceItems([{ description: "", quantity: 1, rate: 0, amount: 0 }]);
      toast({ title: "Invoice created successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to create invoice", description: error.message, variant: "destructive" });
    }
  });

  const syncQuickBooks = useMutation({
    mutationFn: () => apiRequest("/api/integrations/quickbooks/sync", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "QuickBooks sync completed" });
    },
    onError: (error) => {
      toast({ title: "Sync failed", description: error.message, variant: "destructive" });
    }
  });

  const addInvoiceItem = () => {
    const newItems = [...invoiceItems, { description: "", quantity: 1, rate: 0, amount: 0 }];
    setInvoiceItems(newItems);
    form.setValue("items", newItems);
  };

  const removeInvoiceItem = (index: number) => {
    const newItems = invoiceItems.filter((_, i) => i !== index);
    setInvoiceItems(newItems);
    form.setValue("items", newItems);
  };

  const updateInvoiceItem = (index: number, field: keyof typeof invoiceItems[0], value: any) => {
    const newItems = [...invoiceItems];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Calculate amount automatically
    if (field === 'quantity' || field === 'rate') {
      newItems[index].amount = newItems[index].quantity * newItems[index].rate;
    }
    
    setInvoiceItems(newItems);
    form.setValue("items", newItems);
  };

  const calculateTotal = () => {
    return invoiceItems.reduce((total, item) => total + item.amount, 0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "sent":
        return <Badge variant="outline">Sent</Badge>;
      case "paid":
        return <Badge variant="default">Paid</Badge>;
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const quickbooksIntegration = integrations.find((int: any) => int.provider === 'quickbooks');
  const isQuickBooksConnected = quickbooksIntegration?.isActive;

  const onSubmit = (data: InvoiceFormData) => {
    createInvoice.mutate({
      ...data,
      items: invoiceItems.filter(item => item.description.trim() !== "")
    });
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Invoices</h1>
        <p className="text-muted-foreground mt-1">Track and manage invoices with QuickBooks integration</p>
      </div>

      {/* QuickBooks Integration Status */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${isQuickBooksConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <div>
                <p className="font-medium">
                  QuickBooks Integration {isQuickBooksConnected ? 'Connected' : 'Not Connected'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isQuickBooksConnected 
                    ? 'Sync invoices and customer data with QuickBooks'
                    : 'Connect to QuickBooks to sync customer and invoice data'
                  }
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              {isQuickBooksConnected ? (
                <Button
                  onClick={() => syncQuickBooks.mutate()}
                  disabled={syncQuickBooks.isPending}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sync Now
                </Button>
              ) : (
                <Button
                  onClick={() => window.location.href = '/api/integrations/quickbooks/connect'}
                  size="sm"
                >
                  Connect QuickBooks
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Management */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Invoice Management</h2>
            <p className="text-muted-foreground">Create and track customer invoices</p>
          </div>
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
                  Create a detailed invoice with line items and customer information
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
                            <CustomerAutocomplete
                              value={field.value}
                              onValueChange={(customerId, customer) => {
                                field.onChange(customerId);
                                if (customer) {
                                  form.setValue("customerName", customer.name);
                                }
                              }}
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
                          <Textarea 
                            placeholder="Invoice description or notes"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Invoice Items */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Invoice Items</h3>
                      <Button type="button" onClick={addInvoiceItem} variant="outline" size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Item
                      </Button>
                    </div>

                    {invoiceItems.map((item, index) => (
                      <Card key={index} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                          <div className="md:col-span-2">
                            <label className="text-sm font-medium">Description</label>
                            <Input
                              placeholder="Service or product description"
                              value={item.description}
                              onChange={(e) => updateInvoiceItem(index, 'description', e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="text-sm font-medium">Quantity</label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) => updateInvoiceItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            />
                          </div>

                          <div>
                            <label className="text-sm font-medium">Rate</label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.rate}
                              onChange={(e) => updateInvoiceItem(index, 'rate', parseFloat(e.target.value) || 0)}
                            />
                          </div>

                          <div className="flex items-end space-x-2">
                            <div className="flex-1">
                              <label className="text-sm font-medium">Amount</label>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.amount.toFixed(2)}
                                readOnly
                                className="bg-muted"
                              />
                            </div>
                            {invoiceItems.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeInvoiceItem(index)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}

                    <div className="flex justify-end">
                      <div className="text-right">
                        <p className="text-lg font-semibold">
                          Total: ${calculateTotal().toFixed(2)}
                        </p>
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

        {/* Invoice List */}
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No invoices yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first invoice to start tracking payments
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Invoice
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {invoices.map((invoice: any) => (
              <Card key={invoice.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{invoice.invoiceNumber}</h3>
                      <p className="text-muted-foreground">{invoice.customerName}</p>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(invoice.status)}
                      <p className="text-lg font-semibold mt-1">${invoice.totalAmount}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Issued: {format(new Date(invoice.issueDate), 'MMM dd, yyyy')}</span>
                    <span>Due: {format(new Date(invoice.dueDate), 'MMM dd, yyyy')}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
