import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, Plus } from "lucide-react";
import CreateInvoiceModal from "@/components/modals/create-invoice-modal";
import UnifiedSyncStatus from "@/components/sync/unified-sync-status";

interface HeaderProps {
  title: string;
  description?: string;
}

export default function Header({ title, description }: HeaderProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Mock notifications for now
  const notifications = [
    { id: 1, title: "QuickBooks Sync Complete", description: "Synchronized 150 customers and 89 products", time: "2 minutes ago", type: "success" },
    { id: 2, title: "Calendar Update", description: "Team schedules updated for this week", time: "15 minutes ago", type: "info" },
    { id: 3, title: "Low Material Stock", description: "Bait stations running low - consider restocking", time: "1 hour ago", type: "warning" },
  ];

  const unreadCount = notifications.filter(n => n.type === 'warning' || n.type === 'success').length;

  return (
    <>
      {/* Header temporarily removed due to buggy QuickBooks sync button */}
      {/* 
      <header className="bg-black shadow-sm border-b border-gray-800">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">{title}</h1>
            {description && (
              <p className="text-gray-300">{description}</p>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <UnifiedSyncStatus variant="badge" showLabel={true} />
            
            <Popover open={showNotifications} onOpenChange={setShowNotifications}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="relative text-white hover:bg-gray-800">
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

            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </div>
        </div>
      </header>
      */}

      <CreateInvoiceModal 
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />
    </>
  );
}
