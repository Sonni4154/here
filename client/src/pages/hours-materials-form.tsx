import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, DollarSign, Calendar, MapPin, User, Wrench, FileText } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CustomerAutocompleteInput } from "@/components/ui/customer-autocomplete";

// Line Item Schema - matches QuickBooks structure
const lineItemSchema = z.object({
  dateEntered: z.string().min(1, "Date is required"),
  productService: z.string().min(1, "Product/Service is required"),
  description: z.string().min(1, "Description is required"),
  quantity: z.string()
    .min(1, "Quantity required")
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 1 && num % 0.25 === 0;
    }, "Quantity must be minimum 1.0 in increments of 0.25"),
  rate: z.string()
    .min(1, "Rate is required")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Rate must be a positive number"),
  rateChanged: z.boolean().default(false), // Flag for admin if rate was modified
});

// Main form schema matching QuickBooks Customer and Invoice structure
const hoursAndMaterialsSchema = z.object({
  // Customer Information (matches QuickBooks Customer fields)
  customerName: z.string().min(1, "Customer name is required"),
  customerStreetAddress: z.string().min(1, "Street address is required"),
  customerCity: z.string().min(1, "City is required"),
  customerState: z.string().default("CA"),
  customerZip: z.string().optional().or(z.literal("")),
  customerCountry: z.string().default("USA"),
  customerEmail: z.string().email("Valid email required").optional().or(z.literal("")),
  customerPhone: z.string().optional().or(z.literal("")),
  
  // Form metadata
  submittedBy: z.string().min(1, "Technician name is required"),
  submissionDate: z.string().min(1, "Submission date is required"),
  
  // Line Items - Hours and Materials
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
  
  // Notes
  notes: z.string().optional().or(z.literal("")),
});

type HoursAndMaterialsFormData = z.infer<typeof hoursAndMaterialsSchema>;

// Service types that map to QuickBooks Products
const SERVICE_PRODUCTS = [
  "Exclusion",
  "Insect Control Service", 
  "Rodent Control Service",
  "Wasp/Hornet Removal",
  "Bed Bug Service",
  "Termite Treatment",
  "Follow-up Visit",
  "Inspection Service",
  "Emergency Service Call"
];

// Material products that map to QuickBooks Non-Inventory items
const MATERIAL_PRODUCTS = [
  "Snap Traps",
  "Bait Stations", 
  "Exclusion Materials",
  "Hardware Cloth",
  "Silicone Sealant",
  "Steel Wool",
  "Copper Mesh",
  "Pest Control Spray",
  "Disinfectant",
  "Safety Equipment"
];

const ALL_PRODUCTS = [...SERVICE_PRODUCTS, ...MATERIAL_PRODUCTS];

export default function HoursAndMaterialsForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch customers for autocomplete
  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
  });

  // Fetch products from QuickBooks for rate lookup
  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"],
  });

  const form = useForm<HoursAndMaterialsFormData>({
    resolver: zodResolver(hoursAndMaterialsSchema),
    defaultValues: {
      customerState: "CA",
      customerCountry: "USA",
      submissionDate: new Date().toISOString().split('T')[0],
      lineItems: [
        {
          dateEntered: new Date().toISOString().split('T')[0],
          productService: "",
          description: "",
          quantity: "1.0",
          rate: "0.00",
          rateChanged: false
        }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems"
  });

  // Submit form mutation
  const submitFormMutation = useMutation({
    mutationFn: async (data: HoursAndMaterialsFormData) => {
      // Calculate totals
      const subtotal = data.lineItems.reduce((sum, item) => {
        return sum + (parseFloat(item.quantity) * parseFloat(item.rate));
      }, 0);

      // Create pending approval record
      const approvalData = {
        type: 'hours_materials',
        formType: 'Hours & Materials',
        submittedBy: data.submittedBy,
        submittedByEmail: '', // This would come from user session
        data: {
          ...data,
          subtotal: subtotal.toFixed(2),
          lineItemTotals: data.lineItems.map(item => ({
            ...item,
            total: (parseFloat(item.quantity) * parseFloat(item.rate)).toFixed(2)
          }))
        },
        totalAmount: subtotal.toFixed(2),
        customerName: data.customerName,
      };

      return await apiRequest('/api/pending-approvals', {
        method: 'POST',
        body: JSON.stringify(approvalData)
      });
    },
    onSuccess: () => {
      toast({
        title: "Hours & Materials Submitted",
        description: "Your form has been submitted for admin approval and will be converted to a QuickBooks invoice.",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/pending-approvals"] });
    },
    onError: (error) => {
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your form. Please try again.",
        variant: "destructive",
      });
      console.error("Form submission error:", error);
    }
  });

  // Auto-populate customer fields when customer name is selected
  const handleCustomerSelect = (customerName: string) => {
    const customer = customers.find(c => c.name === customerName);
    if (customer) {
      form.setValue('customerName', customer.name);
      form.setValue('customerEmail', customer.email || '');
      form.setValue('customerPhone', customer.phone || '');
      if (customer.address) {
        const addressParts = customer.address.split(', ');
        form.setValue('customerStreetAddress', addressParts[0] || '');
        form.setValue('customerCity', addressParts[1] || '');
        form.setValue('customerZip', addressParts[2]?.split(' ')[1] || '');
      }
    }
  };

  // Auto-populate product rate when product is selected
  const handleProductSelect = (index: number, productName: string) => {
    const product = products.find(p => p.name === productName);
    if (product) {
      form.setValue(`lineItems.${index}.productService`, product.name);
      form.setValue(`lineItems.${index}.description`, product.description || '');
      form.setValue(`lineItems.${index}.rate`, product.price?.toString() || '0.00');
      form.setValue(`lineItems.${index}.rateChanged`, false);
    }
  };

  // Calculate line item total
  const calculateLineTotal = (quantity: string, rate: string) => {
    const qty = parseFloat(quantity) || 0;
    const rt = parseFloat(rate) || 0;
    return (qty * rt).toFixed(2);
  };

  // Calculate form subtotal
  const calculateSubtotal = () => {
    return form.watch('lineItems').reduce((sum, item) => {
      return sum + (parseFloat(item.quantity || '0') * parseFloat(item.rate || '0'));
    }, 0).toFixed(2);
  };

  const onSubmit = (data: HoursAndMaterialsFormData) => {
    submitFormMutation.mutate(data);
  };

  const addLineItem = () => {
    append({
      dateEntered: new Date().toISOString().split('T')[0],
      productService: "",
      description: "",
      quantity: "1.0",
      rate: "0.00",
      rateChanged: false
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Hours & Materials Form
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            This form will be converted to a QuickBooks invoice after admin approval.
            All fields must match QuickBooks customer and product data.
          </p>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Customer Information Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Name *</FormLabel>
                        <FormControl>
                          <CustomerAutocompleteInput
                            value={field.value}
                            onSelect={handleCustomerSelect}
                            onChange={field.onChange}
                            customers={customers}
                            placeholder="Search or enter customer name..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customerEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="customer@email.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customerPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="(415) 555-0123" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customerStreetAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="123 Main Street" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customerCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Mill Valley" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name="customerState"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input {...field} readOnly className="bg-muted" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="customerZip"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Zip Code</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="94941" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Form Metadata */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Form Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="submittedBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Technician Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter your name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="submissionDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Submission Date *</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Line Items Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Wrench className="w-5 h-5" />
                    Hours & Materials Line Items
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Each line item represents hours worked or materials used. Quantities must be in increments of 0.25.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {fields.map((field, index) => (
                      <Card key={field.id} className="border-l-4 border-l-blue-500">
                        <CardHeader className="pb-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Line Item #{index + 1}</h4>
                            {fields.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => remove(index)}
                              >
                                <Minus className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                          <FormField
                            control={form.control}
                            name={`lineItems.${index}.dateEntered`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Date *</FormLabel>
                                <FormControl>
                                  <Input {...field} type="date" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`lineItems.${index}.productService`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Product/Service *</FormLabel>
                                <Select
                                  value={field.value}
                                  onValueChange={(value) => handleProductSelect(index, value)}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select..." />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <div className="p-2 text-xs font-medium text-muted-foreground">Services (Hours)</div>
                                    {SERVICE_PRODUCTS.map((service) => (
                                      <SelectItem key={service} value={service}>
                                        {service}
                                      </SelectItem>
                                    ))}
                                    <div className="p-2 text-xs font-medium text-muted-foreground border-t mt-2">Materials</div>
                                    {MATERIAL_PRODUCTS.map((material) => (
                                      <SelectItem key={material} value={material}>
                                        {material}
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
                            name={`lineItems.${index}.description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Detailed description..." />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`lineItems.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Quantity *</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field}
                                    type="number"
                                    step="0.25"
                                    min="1"
                                    placeholder="1.0"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`lineItems.${index}.rate`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Rate *</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <DollarSign className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                                    <Input 
                                      {...field}
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      className="pl-8"
                                      placeholder="0.00"
                                      onChange={(e) => {
                                        field.onChange(e);
                                        // Mark as changed if different from product default
                                        const product = products.find(p => 
                                          p.name === form.getValues(`lineItems.${index}.productService`)
                                        );
                                        if (product && e.target.value !== product.price?.toString()) {
                                          form.setValue(`lineItems.${index}.rateChanged`, true);
                                        }
                                      }}
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div>
                            <FormLabel>Line Total</FormLabel>
                            <div className="text-lg font-medium text-green-600 mt-2">
                              ${calculateLineTotal(
                                form.watch(`lineItems.${index}.quantity`),
                                form.watch(`lineItems.${index}.rate`)
                              )}
                            </div>
                            {form.watch(`lineItems.${index}.rateChanged`) && (
                              <Badge variant="secondary" className="text-xs mt-1">
                                Rate Modified
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={addLineItem}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Line Item
                    </Button>
                  </div>

                  {/* Subtotal Display */}
                  <Card className="mt-6 bg-muted/20">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-center text-lg font-medium">
                        <span>Subtotal:</span>
                        <span className="text-green-600">${calculateSubtotal()}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Tax, discounts, and deposits will be calculated during admin approval.
                      </p>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>

              {/* Notes Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Additional Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes for Office</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Any additional information, special instructions, or notes..."
                            className="min-h-[100px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Submit Button */}
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={submitFormMutation.isPending}
              >
                {submitFormMutation.isPending ? "Submitting..." : "Submit for Admin Approval"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}