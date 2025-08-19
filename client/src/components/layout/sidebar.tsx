import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { 
  BarChart3, 
  Clock, 
  Users, 
  Search, 
  FileText, 
  Settings,
  Timer,
  Package,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Team Dashboard", href: "/team-dashboard", icon: Users },
  { name: "Time Tracking", href: "/time-tracking", icon: Clock },
  { name: "Clock In/Out", href: "/clock", icon: Timer },
  { name: "Punchclock Logs", href: "/punch-clock-logs", icon: Settings },
  { name: "Products", href: "/products", icon: Package },
  { name: "Customers", href: "/customers", icon: Search },
  { name: "Invoice Search", href: "/invoices", icon: FileText },
  { name: "Sync Scheduler", href: "/sync-scheduler", icon: Calendar },
  { name: "Reports", href: "/reports", icon: BarChart3 },
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
          <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-semibold text-slate-900">TimeSync Pro</span>
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
                  ? "bg-slate-800 text-white"
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
            <AvatarImage src={(user as any)?.profileImageUrl} alt={(user as any)?.firstName || "User"} />
            <AvatarFallback>
              {(user as any)?.firstName?.[0] || (user as any)?.email?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {(user as any)?.firstName && (user as any)?.lastName 
                ? `${(user as any).firstName} ${(user as any).lastName}`
                : (user as any)?.email || "User"
              }
            </p>
            {(user as any)?.email && (
              <p className="text-xs text-slate-500 truncate">{(user as any).email}</p>
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
