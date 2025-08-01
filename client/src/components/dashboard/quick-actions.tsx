import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { FileText, UserPlus, FolderSync } from "lucide-react";
import CreateInvoiceModal from "@/components/modals/create-invoice-modal";

export default function QuickActions() {
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const syncMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/sync/quickbooks');
    },
    onSuccess: () => {
      toast({
        title: "FolderSync Completed",
        description: "Successfully synced with QuickBooks",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activity'] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "FolderSync Failed",
        description: error.message || "Failed to sync with QuickBooks",
        variant: "destructive",
      });
    },
  });

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
    {
      title: "FolderSync Data",
      description: "Manual sync with QuickBooks",
      icon: FolderSync,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      onClick: () => syncMutation.mutate(),
      loading: syncMutation.isPending,
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
                disabled={action.loading}
              >
                <div className="flex items-center space-x-3 w-full">
                  <div className={`w-10 h-10 ${action.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <action.icon className={`w-5 h-5 ${action.iconColor} ${action.loading ? 'animate-spin' : ''}`} />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-slate-900">{action.title}</div>
                    <div className="text-sm text-slate-500">{action.description}</div>
                  </div>
                </div>
              </Button>
            ))}
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
