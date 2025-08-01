import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";

export default function Products() {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Products & Services</h1>
        <p className="text-muted-foreground mt-1">Manage your pest control services and products catalog</p>
      </div>
      
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
            <ShoppingCart className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Product & Service Management</CardTitle>
          <CardDescription>
            This page will contain detailed product and service management functionality including
            pest control services, materials inventory, pricing, and service packages.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          Coming soon - Complete service catalog with pricing management, inventory tracking, and service configurations.
        </CardContent>
      </Card>
    </div>
  );
}
