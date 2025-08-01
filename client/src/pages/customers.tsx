import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function Customers() {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Customers</h1>
        <p className="text-muted-foreground mt-1">Manage your customer database and relationships</p>
      </div>
      
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Customer Management</CardTitle>
          <CardDescription>
            This page will contain detailed customer management functionality including
            contact information, service history, and account management.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          Coming soon - Full customer database integration with search, filtering, and detailed customer profiles.
        </CardContent>
      </Card>
    </div>
  );
}
