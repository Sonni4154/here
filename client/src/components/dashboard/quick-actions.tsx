import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, UserPlus } from "lucide-react";
import CreateInvoiceModal from "@/components/modals/create-invoice-modal";
import UnifiedSyncStatus from "@/components/sync/unified-sync-status";

export default function QuickActions() {
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);

  const actions = [
    {
      title: "Create Invoice",
      description: "Generate new invoice",
      icon: FileText,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      onClick: () => setShowCreateInvoiceModal(true),
    },
    {
      title: "Add Customer",
      description: "Create new customer",
      icon: UserPlus,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      onClick: () => window.location.href = "/customers",
    },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {actions.map((action, index) => (
              <Button
                key={index}
                variant="ghost"
                className="w-full justify-start h-auto p-3"
                onClick={action.onClick}
              >
                <div className="flex items-center space-x-3 w-full">
                  <div className={`w-10 h-10 ${action.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <action.icon className={`w-5 h-5 ${action.iconColor}`} />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-slate-900">{action.title}</div>
                    <div className="text-sm text-slate-500">{action.description}</div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
          
          {/* QuickBooks Sync Status */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">QuickBooks Sync</span>
            </div>
            <UnifiedSyncStatus variant="button" showLabel={true} size="sm" />
          </div>
        </CardContent>
      </Card>

      <CreateInvoiceModal 
        open={showCreateInvoiceModal}
        onOpenChange={setShowCreateInvoiceModal}
      />
    </>
  );
}