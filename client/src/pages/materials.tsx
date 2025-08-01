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
import { Package, Plus, CheckCircle, AlertCircle, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertMaterialEntrySchema, type InsertMaterialEntry } from "@shared/schema";
import { CustomerAutocomplete } from "@/components/ui/customer-autocomplete";
import { format } from "date-fns";

export default function Materials() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const form = useForm<InsertMaterialEntry>({
    resolver: zodResolver(insertMaterialEntrySchema),
    defaultValues: {
      itemName: "",
      description: "",
      quantity: "1",
      unitCost: "0.00",
      totalCost: "0.00",
      status: "draft",
    },
  });

  const { data: materialEntries = [], isLoading } = useQuery({
    queryKey: ["/api/material-entries"],
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
  });

  const createMaterialEntry = useMutation({
    mutationFn: (data: InsertMaterialEntry) => apiRequest("/api/material-entries", { method: "POST", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/material-entries"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({ title: "Material entry created successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to create material entry", description: error.message, variant: "destructive" });
    },
  });

  const submitMaterialEntry = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/material-entries/${id}/submit`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/material-entries"] });
      toast({ title: "Material entry submitted for approval" });
    },
    onError: (error) => {
      toast({ title: "Failed to submit material entry", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: InsertMaterialEntry) => {
    // Calculate total cost
    const quantity = parseFloat(data.quantity || "0");
    const unitCost = parseFloat(data.unitCost || "0");
    const totalCost = (quantity * unitCost).toFixed(2);
    
    createMaterialEntry.mutate({
      ...data,
      totalCost,
    });
  };

  const handleQuantityOrUnitCostChange = () => {
    const quantity = parseFloat(form.getValues("quantity") || "0");
    const unitCost = parseFloat(form.getValues("unitCost") || "0");
    const totalCost = (quantity * unitCost).toFixed(2);
    form.setValue("totalCost", totalCost);
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
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Materials & Expenses</h1>
        <p className="text-muted-foreground mt-1">Track materials, supplies, and project expenses</p>
      </div>
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Material Entries</h2>
            <p className="text-muted-foreground">Manage material costs and expense tracking</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Add Material</span>
              </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Material Entry</DialogTitle>
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
                        <FormControl>
                          <CustomerAutocomplete
                            value={field.value}
                            onValueChange={(customerId, customer) => {
                              field.onChange(customerId);
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
                  name="itemName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Material or item name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Detailed description of the material..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="1" 
                            {...field} 
                            onChange={(e) => {
                              field.onChange(e);
                              handleQuantityOrUnitCostChange();
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="unitCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Cost</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00" 
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              handleQuantityOrUnitCostChange();
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="totalCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Cost</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} readOnly />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="supplier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier</FormLabel>
                        <FormControl>
                          <Input placeholder="Supplier/vendor name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="receiptNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Receipt/Invoice #</FormLabel>
                        <FormControl>
                          <Input placeholder="Receipt number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="purchaseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMaterialEntry.isPending}>
                    Save Entry
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>

        <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="w-5 h-5" />
            <span>Material Entries</span>
          </CardTitle>
          <CardDescription>
            Your logged materials and expenses
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading material entries...</div>
          ) : materialEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No material entries yet. Start tracking your materials and expenses!
            </div>
          ) : (
            <div className="space-y-4">
              {materialEntries.map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-medium text-foreground">{entry.itemName}</h3>
                      {getStatusBadge(entry.status)}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {entry.description && <p>{entry.description}</p>}
                      {entry.projectName && <p>Project: {entry.projectName}</p>}
                      {entry.customerId && <p>Customer: {entry.customer?.name}</p>}
                      <p>Quantity: {entry.quantity} @ ${entry.unitCost} each</p>
                      <p className="font-medium">Total: ${entry.totalCost}</p>
                      {entry.supplier && <p>Supplier: {entry.supplier}</p>}
                      {entry.receiptNumber && (
                        <p className="flex items-center space-x-1">
                          <Receipt className="w-3 h-3" />
                          <span>Receipt: {entry.receiptNumber}</span>
                        </p>
                      )}
                      {entry.purchaseDate && (
                        <p>Purchase Date: {format(new Date(entry.purchaseDate), "MMM dd, yyyy")}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {entry.status === "draft" && (
                      <Button
                        size="sm"
                        onClick={() => submitMaterialEntry.mutate(entry.id)}
                        disabled={submitMaterialEntry.isPending}
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
    </div>
  );
}