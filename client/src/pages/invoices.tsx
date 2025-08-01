import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function Invoices() {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Invoices</h1>
        <p className="text-muted-foreground mt-1">Track and manage invoices with QuickBooks integration</p>
      </div>
      
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Invoice Management</CardTitle>
          <CardDescription>
            This page will contain detailed invoice management functionality including
            invoice creation, tracking, payment status, and QuickBooks synchronization.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          Coming soon - Full invoice system with automated billing, payment tracking, and accounting integration.
        </CardContent>
      </Card>
    </div>
  );
}
