import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function Integrations() {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Integrations</h1>
        <p className="text-muted-foreground mt-1">Connect with QuickBooks, Google Calendar, and other business tools</p>
      </div>
      
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
            <Settings className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Integration Management</CardTitle>
          <CardDescription>
            This page will contain detailed integration management functionality including
            QuickBooks synchronization, Google Calendar scheduling, JotForm connections, and API management.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          Coming soon - Full integration dashboard with QuickBooks sync, Google Calendar, and third-party API management.
        </CardContent>
      </Card>
    </div>
  );
}
