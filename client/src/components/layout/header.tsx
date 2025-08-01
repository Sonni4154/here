import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Plus, CheckCircle, Clock } from "lucide-react";
import CreateInvoiceModal from "@/components/modals/create-invoice-modal";

interface HeaderProps {
  title: string;
  description?: string;
}

export default function Header({ title, description }: HeaderProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: integrations } = useQuery({
    queryKey: ['/api/integrations'],
  });

  const quickbooksIntegration = integrations?.find((i: any) => i.provider === 'quickbooks');
  const isQuickBooksConnected = quickbooksIntegration?.isActive;

  return (
    <>
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
            {description && (
              <p className="text-slate-600">{description}</p>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {/* QuickBooks Sync Status */}
            {isQuickBooksConnected ? (
              <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                QuickBooks Connected
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">
                <Clock className="w-3 h-3 mr-1" />
                QuickBooks Disconnected
              </Badge>
            )}
            
            {/* Notifications */}
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
            </Button>

            {/* Create Button */}
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-primary hover:bg-blue-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </div>
        </div>
      </header>

      <CreateInvoiceModal 
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />
    </>
  );
}
