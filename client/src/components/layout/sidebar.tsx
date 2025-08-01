import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { 
  BarChart3, 
  FileText, 
  Users, 
  Package, 
  BarChart, 
  Settings,
  FolderSync
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Invoices", href: "/invoices", icon: FileText },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Products & Services", href: "/products", icon: Package },
  { name: "Reports", href: "/reports", icon: BarChart },
  { name: "Integrations", href: "/integrations", icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div className="w-64 bg-white shadow-sm border-r border-slate-200 flex flex-col">
      {/* Logo Section */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <FolderSync className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-semibold text-slate-900">BusinessSync Pro</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                isActive
                  ? "bg-primary text-white"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center space-x-3 mb-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={user?.profileImageUrl} alt={user?.firstName || "User"} />
            <AvatarFallback>
              {user?.firstName?.[0] || user?.email?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {user?.firstName && user?.lastName 
                ? `${user.firstName} ${user.lastName}`
                : user?.email || "User"
              }
            </p>
            {user?.email && (
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            )}
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleLogout}
          className="w-full"
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
}
