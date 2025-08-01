import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileUpload } from "@/components/ui/file-upload";
import { Camera, FileText, DollarSign, Clock, MapPin, User, Wrench } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const marinJobFormSchema = z.object({
  // Customer Information
  customerFirstName: z.string().min(1, "First name is required"),
  customerLastName: z.string().min(1, "Last name is required"),
  customerEmail: z.string().email().optional().or(z.literal("")),
  
  // Jobsite Information
  jobsiteStreet: z.string().min(1, "Street address is required"),
  jobsiteCity: z.string().min(1, "City is required"),
  jobsiteState: z.string().default("CA"),
  jobsiteZip: z.string().optional().or(z.literal("")),
  
  // Technician Information
  technicianName: z.string().min(1, "Technician name is required"),
  otherTechnicians: z.string().optional().or(z.literal("")),
  
  // Service Information
  billableHours: z.string().min(1, "Billable hours required"),
  combinedBillableHours: z.string().optional().or(z.literal("")),
  serviceDescription: z.string().min(1, "Service description required"),
  
  // Materials and Items
  materialsUsed: z.string().optional().or(z.literal("")),
  itemsToBill: z.array(z.object({
    item: z.string(),
    quantity: z.string(),
    notes: z.string().optional()
  })).default([]),
  
  // Payment and Status
  paymentInfo: z.string().min(1, "Payment info required"),
  jobProgress: z.string().min(1, "Job progress required"),
  trapsInfo: z.string().optional().or(z.literal("")),
  
  // Notes
  notesForOffice: z.string().optional().or(z.literal("")),
});

type MarinJobFormData = z.infer<typeof marinJobFormSchema>;

// Marin Pest Control Services
const SERVICES = [
  "Insect Spraying Service",
  "Yellow Jacket/Wasp/Hornet Removal", 
  "Primary Non-repellent Treatment",
  "Subterranean Rodentia Treatment",
  "Follow Up Visit",
  "Exclusion",
  "Remediation",
  "Trapping Service",
  "Bed Bug Service",
  "Termite Treatment",
  "Carpenter Ant Treatment",
  "Cockroach Service"
];

const MATERIALS = [
  "Misc. Hardware",
  "Hardware Cloth", 
  "Silicone",
  "Expanding Foam",
  "Disinfectant",
  "Rat Trap (Victor)",
  "Rat Trap (Kat Sense)",
  "Bait Station",
  "Concrete",
  "Mortar"
];

export default function MarinJobForm() {
  const [beforePhotos, setBeforePhotos] = useState<File[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<File[]>([]);
  const [materialPhotos, setMaterialPhotos] = useState<File[]>([]);
  const [billableItems, setBillableItems] = useState([{ item: "", quantity: "", notes: "" }]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<MarinJobFormData>({
    resolver: zodResolver(marinJobFormSchema),
    defaultValues: {
      jobsiteState: "CA",
      technicianName: "",
      itemsToBill: [{ item: "", quantity: "", notes: "" }]
    },
  });

  const submitJobMutation = useMutation({
    mutationFn: async (data: MarinJobFormData) => {
      return apiRequest("/api/job-entries", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      toast({
        title: "Success",
        description: "Job entry submitted successfully",
      });
      form.reset();
      setBeforePhotos([]);
      setAfterPhotos([]);
      setMaterialPhotos([]);
      setBillableItems([{ item: "", quantity: "", notes: "" }]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit job entry",
        variant: "destructive",
      });
    },
  });

  const addBillableItem = () => {
    setBillableItems([...billableItems, { item: "", quantity: "", notes: "" }]);
  };

  const removeBillableItem = (index: number) => {
    setBillableItems(billableItems.filter((_, i) => i !== index));
  };

  const updateBillableItem = (index: number, field: string, value: string) => {
    const updated = billableItems.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    );
    setBillableItems(updated);
    form.setValue("itemsToBill", updated);
  };

  const onSubmit = async (data: MarinJobFormData) => {
    const jobData = {
      ...data,
      itemsToBill: billableItems.filter(item => item.item.trim() !== "")
    };
    
    await submitJobMutation.mutateAsync(jobData);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Marin Pest Control</h1>
        <p className="text-gray-400">Hours & Materials Submission Form</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="customer" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-gray-800">
              <TabsTrigger value="customer" className="data-[state=active]:bg-purple-600">
                <User className="w-4 h-4 mr-2" />
                Customer
              </TabsTrigger>
              <TabsTrigger value="service" className="data-[state=active]:bg-purple-600">
                <Wrench className="w-4 h-4 mr-2" />
                Service
              </TabsTrigger>
              <TabsTrigger value="materials" className="data-[state=active]:bg-purple-600">
                <FileText className="w-4 h-4 mr-2" />
                Materials
              </TabsTrigger>
              <TabsTrigger value="photos" className="data-[state=active]:bg-purple-600">
                <Camera className="w-4 h-4 mr-2" />
                Photos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="customer" className="space-y-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Customer & Jobsite Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="customerFirstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-200">Customer First Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="John" className="bg-gray-700 border-gray-600 text-white" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customerLastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-200">Customer Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Doe" className="bg-gray-700 border-gray-600 text-white" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="customerEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-200">Customer Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="john.doe@email.com" className="bg-gray-700 border-gray-600 text-white" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-white flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      Jobsite Address
                    </h3>
                    
                    <FormField
                      control={form.control}
                      name="jobsiteStreet"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-200">Street Address</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="123 Main Street" className="bg-gray-700 border-gray-600 text-white" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="jobsiteCity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-200">City</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="San Rafael" className="bg-gray-700 border-gray-600 text-white" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="jobsiteState"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-200">State</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="CA" className="bg-gray-700 border-gray-600 text-white" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="jobsiteZip"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-200">ZIP Code</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="94901" className="bg-gray-700 border-gray-600 text-white" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="service" className="space-y-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Service Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="technicianName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-200">Technician Name</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                                <SelectValue placeholder="Select technician" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Spencer Reiser">Spencer Reiser</SelectItem>
                              <SelectItem value="Boden Haines">Boden Haines</SelectItem>
                              <SelectItem value="Jorge Sisneros">Jorge Sisneros</SelectItem>
                              <SelectItem value="Tristan Ford">Tristan Ford</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="otherTechnicians"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-200">Other Techs on Jobsite</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Jorge Sisneros, Tristan Ford" className="bg-gray-700 border-gray-600 text-white" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="billableHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-200">Your Billable Hours</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.5" placeholder="1.5" className="bg-gray-700 border-gray-600 text-white" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="combinedBillableHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-200">Combined Billable Hours</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.5" placeholder="3.0" className="bg-gray-700 border-gray-600 text-white" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="serviceDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-200">Service Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Describe the service performed..." className="bg-gray-700 border-gray-600 text-white" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="paymentInfo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-200">Payment Info</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                                <SelectValue placeholder="Select payment status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="needs-invoice">Needs Invoice</SelectItem>
                              <SelectItem value="payment-taken-check">Payment Taken - Check</SelectItem>
                              <SelectItem value="payment-taken-cash">Payment Taken - Cash</SelectItem>
                              <SelectItem value="payment-taken-venmo">Payment Taken - Venmo</SelectItem>
                              <SelectItem value="no-payment-required">No Payment Required</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="jobProgress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-200">Job Progress</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                                <SelectValue placeholder="Select job status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="finished">Finished</SelectItem>
                              <SelectItem value="in-progress">In Progress</SelectItem>
                              <SelectItem value="follow-up-needed">Follow-up Needed</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notesForOffice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-200">Notes for Office</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Additional notes, follow-up requirements, customer feedback..." className="bg-gray-700 border-gray-600 text-white" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="materials" className="space-y-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Materials & Items to Bill
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {billableItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-700 rounded-lg">
                      <Select 
                        onValueChange={(value) => updateBillableItem(index, "item", value)}
                        defaultValue={item.item}
                      >
                        <SelectTrigger className="bg-gray-600 border-gray-500 text-white">
                          <SelectValue placeholder="Select service/material" />
                        </SelectTrigger>
                        <SelectContent>
                          <optgroup label="Services">
                            {SERVICES.map(service => (
                              <SelectItem key={service} value={service}>{service}</SelectItem>
                            ))}
                          </optgroup>
                          <optgroup label="Materials">
                            {MATERIALS.map(material => (
                              <SelectItem key={material} value={material}>{material}</SelectItem>
                            ))}
                          </optgroup>
                        </SelectContent>
                      </Select>
                      
                      <Input
                        placeholder="Quantity"
                        value={item.quantity}
                        onChange={(e) => updateBillableItem(index, "quantity", e.target.value)}
                        className="bg-gray-600 border-gray-500 text-white"
                      />
                      
                      <Input
                        placeholder="Notes"
                        value={item.notes}
                        onChange={(e) => updateBillableItem(index, "notes", e.target.value)}
                        className="bg-gray-600 border-gray-500 text-white"
                      />
                      
                      <Button 
                        type="button" 
                        variant="destructive" 
                        onClick={() => removeBillableItem(index)}
                        disabled={billableItems.length === 1}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  
                  <Button type="button" onClick={addBillableItem} variant="outline">
                    Add Item
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="photos" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Before Photos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FileUpload
                      files={beforePhotos}
                      onFilesChange={setBeforePhotos}
                      accept="image/*"
                      maxFiles={10}
                      maxSize={10 * 1024 * 1024}
                    />
                  </CardContent>
                </Card>

                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">After Photos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FileUpload
                      files={afterPhotos}
                      onFilesChange={setAfterPhotos}
                      accept="image/*"
                      maxFiles={10}
                      maxSize={10 * 1024 * 1024}
                    />
                  </CardContent>
                </Card>

                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Material/Receipt Photos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FileUpload
                      files={materialPhotos}
                      onFilesChange={setMaterialPhotos}
                      accept="image/*"
                      maxFiles={10}
                      maxSize={10 * 1024 * 1024}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={() => form.reset()}>
              Reset Form
            </Button>
            <Button 
              type="submit" 
              className="bg-purple-600 hover:bg-purple-700"
              disabled={submitJobMutation.isPending}
            >
              {submitJobMutation.isPending ? "Submitting..." : "Submit Job Entry"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}