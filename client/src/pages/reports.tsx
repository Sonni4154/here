import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function Reports() {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
        <p className="text-muted-foreground mt-1">Comprehensive business insights and performance metrics</p>
      </div>
      
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
            <BarChart3 className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Reporting & Analytics</CardTitle>
          <CardDescription>
            This page will contain detailed reporting and analytics functionality including
            financial reports, performance metrics, time tracking analytics, and business insights.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          Coming soon - Advanced reporting dashboard with time tracking analytics, revenue insights, and performance metrics.
        </CardContent>
      </Card>
    </div>
  );
}
