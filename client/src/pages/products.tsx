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
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Package, Plus, Search, DollarSign, RefreshCw, Edit, Trash2, ExternalLink } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Product form schema
const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  unitPrice: z.string().min(1, "Unit price is required"),
  type: z.enum(["product", "service"]).default("product"),
  category: z.string().optional(),
  qtyOnHand: z.coerce.number().optional(),
  active: z.boolean().default(true)
});

type ProductFormData = z.infer<typeof productSchema>;

export default function Products() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Handle QuickBooks OAuth callback status
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const qbSuccess = urlParams.get('qb_success');
    const qbError = urlParams.get('qb_error');
    
    if (qbSuccess === 'connected') {
      toast({
        title: "QuickBooks Connected",
        description: "Successfully connected to QuickBooks Online",
      });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Invalidate integrations query to refresh status
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
    } else if (qbError) {
      toast({
        title: "QuickBooks Connection Failed", 
        description: `Error: ${decodeURIComponent(qbError)}`,
        variant: "destructive"
      });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast, queryClient]);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      type: "product",
      active: true
    }
  });

  // Queries
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["/api/products"]
  });

  const { data: integrations = [] } = useQuery({
    queryKey: ["/api/integrations"]
  });

  // Mutations
  const createProduct = useMutation({
    mutationFn: (data: ProductFormData) => apiRequest("/api/products", { method: "POST", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({ title: "Product created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create product", description: error.message, variant: "destructive" });
    }
  });

  const syncQuickBooks = useMutation({
    mutationFn: () => apiRequest("/api/integrations/quickbooks/sync", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "QuickBooks sync completed" });
    },
    onError: (error: any) => {
      toast({ title: "Sync failed", description: error.message, variant: "destructive" });
    }
  });

  const deleteProduct = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/products/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete product", description: error.message, variant: "destructive" });
    }
  });

  const simulateQuickBooks = useMutation({
    mutationFn: () => apiRequest("/api/integrations/quickbooks/simulate-connection", { method: "POST" }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ 
        title: "QuickBooks Simulation Created", 
        description: data.note || "Development connection established with test data" 
      });
    },
    onError: (error: any) => {
      toast({ title: "Simulation failed", description: error.message, variant: "destructive" });
    }
  });

  // Filter products based on search and filters
  const filteredProducts = (products as any[]).filter((product: any) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (product.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || product.type === selectedType;
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    
    return matchesSearch && matchesType && matchesCategory;
  });

  // Get unique categories for filter
  const categories = Array.from(new Set((products as any[]).map((p: any) => p.category).filter(Boolean)));

  const quickbooksIntegration = (integrations as any[]).find((int: any) => int.provider === 'quickbooks');
  const isQuickBooksConnected = quickbooksIntegration?.isActive;

  const getTypeBadge = (type: string) => {
    return type === "service" 
      ? <Badge variant="outline">Service</Badge>
      : <Badge variant="secondary">Product</Badge>;
  };

  const onSubmit = (data: ProductFormData) => {
    createProduct.mutate(data);
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Products & Services</h1>
        <p className="text-muted-foreground mt-1">Manage your catalog with QuickBooks integration</p>
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
                    ? 'Sync products and services with QuickBooks'
                    : 'Connect to QuickBooks to sync product catalog'
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
                  Sync Items
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => {
                      console.log('Starting QuickBooks connection...');
                      window.location.href = '/quickbooks/connect';
                    }}
                    size="sm"
                  >
                    Connect QuickBooks
                  </Button>
                  <Button
                    onClick={() => simulateQuickBooks.mutate()}
                    disabled={simulateQuickBooks.isPending}
                    variant="outline"
                    size="sm"
                  >
                    {simulateQuickBooks.isPending ? "Creating..." : "Dev Test"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search products and services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="product">Products</SelectItem>
                <SelectItem value="service">Services</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category: any) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Product Management */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Catalog Management</h2>
            <p className="text-muted-foreground">
              {filteredProducts.length} items found
              {searchQuery && ` for "${searchQuery}"`}
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Product/Service</DialogTitle>
                <DialogDescription>
                  Create a new item in your catalog
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
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Product or service name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="product">Product</SelectItem>
                              <SelectItem value="service">Service</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="unitPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit Price</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Pest Control, Materials" {...field} />
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
                            placeholder="Detailed description of the product or service"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createProduct.isPending}>
                      Create Item
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Product List */}
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {searchQuery ? "No items found" : "No items yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery 
                  ? `No products or services match "${searchQuery}"`
                  : "Add your first product or service to get started"
                }
              </p>
              {!searchQuery && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredProducts.map((product: any) => (
              <Card key={product.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-foreground">{product.name}</h3>
                        {getTypeBadge(product.type)}
                        {product.category && (
                          <Badge variant="outline" className="text-xs">
                            {product.category}
                          </Badge>
                        )}
                        {product.quickbooksId && (
                          <Badge variant="default" className="text-xs">
                            <ExternalLink className="w-3 h-3 mr-1" />
                            QB Synced
                          </Badge>
                        )}
                      </div>
                      {product.description && (
                        <p className="text-muted-foreground mb-3">{product.description}</p>
                      )}
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <DollarSign className="w-4 h-4 mr-1" />
                          <span className="font-medium text-foreground">
                            ${parseFloat(product.unitPrice || 0).toFixed(2)}
                          </span>
                        </div>
                        {product.qtyOnHand !== null && (
                          <div>
                            <span>Qty: {product.qtyOnHand}</span>
                          </div>
                        )}
                        <div>
                          <span>ID: {product.id.slice(0, 8)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => deleteProduct.mutate(product.id)}
                        disabled={deleteProduct.isPending}
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

        {/* Quick Stats */}
        {filteredProducts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Catalog Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {filteredProducts.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Items</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {filteredProducts.filter((p: any) => p.type === 'service').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Services</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {filteredProducts.filter((p: any) => p.type === 'product').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Products</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {filteredProducts.filter((p: any) => p.quickbooksId).length}
                  </div>
                  <div className="text-sm text-muted-foreground">QB Synced</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}