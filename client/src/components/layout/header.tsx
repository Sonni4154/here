import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, Plus, CheckCircle, Clock, AlertCircle, Calendar } from "lucide-react";
import CreateInvoiceModal from "@/components/modals/create-invoice-modal";
import SyncButton from "@/components/sync/sync-button";

interface HeaderProps {
  title: string;
  description?: string;
}

export default function Header({ title, description }: HeaderProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const { data: integrations } = useQuery({
    queryKey: ['/api/integrations'],
  });

  const { data: syncStatus } = useQuery({
    queryKey: ['/api/sync/status'],
    refetchInterval: 10000,
  });

  const quickbooksIntegration = Array.isArray(integrations) ? integrations.find((i: any) => i.provider === 'quickbooks') : undefined;
  const isQuickBooksConnected = quickbooksIntegration?.connected;
  
  // Mock notifications for now
  const notifications = [
    { id: 1, title: "QuickBooks Sync Complete", description: "Synchronized 150 customers and 89 products", time: "2 minutes ago", type: "success" },
    { id: 2, title: "Calendar Update", description: "Team schedules updated for this week", time: "15 minutes ago", type: "info" },
    { id: 3, title: "Low Material Stock", description: "Bait stations running low - consider restocking", time: "1 hour ago", type: "warning" },
  ];

  const unreadCount = notifications.filter(n => n.type === 'warning' || n.type === 'success').length;

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
              <Badge variant="secondary" className="bg-green-900 text-green-100 border-green-700">
                <CheckCircle className="w-3 h-3 mr-1" />
                QuickBooks Connected
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-amber-900 text-amber-100 border-amber-700">
                <Clock className="w-3 h-3 mr-1" />
                QuickBooks Disconnected
              </Badge>
            )}

            <SyncButton />
            
            {/* Notifications */}
            <Popover open={showNotifications} onOpenChange={setShowNotifications}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="p-4 border-b">
                  <h4 className="font-semibold">Notifications</h4>
                  <p className="text-sm text-slate-600">{unreadCount} unread notifications</p>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="p-3 border-b hover:bg-slate-50 cursor-pointer">
                      <div className="flex items-start space-x-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          notification.type === 'success' ? 'bg-green-500' :
                          notification.type === 'warning' ? 'bg-amber-500' :
                          'bg-blue-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900">{notification.title}</p>
                          <p className="text-sm text-slate-600">{notification.description}</p>
                          <p className="text-xs text-slate-400 mt-1">{notification.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t">
                  <Button variant="ghost" size="sm" className="w-full">
                    View All Notifications
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

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
