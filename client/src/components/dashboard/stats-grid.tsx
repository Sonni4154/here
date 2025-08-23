import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Users, FileText, FolderSync, TrendingUp, Clock, CheckCircle } from "lucide-react";

export default function StatsGrid() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatLastSync = (date: string | null) => {
    if (!date) return 'Never';
    const syncDate = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - syncDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hr ago`;
    return syncDate.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-12 w-12 rounded-lg" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Revenue",
      value: formatCurrency(stats?.totalRevenue || 0),
      change: "+12.5% from last month",
      icon: DollarSign,
      iconBg: "bg-blue-50",
      iconColor: "text-primary",
      changeColor: "text-green-600",
    },
    {
      title: "Active Customers",
      value: stats?.activeCustomers?.toString() || "0",
      change: "+8.2% from last month",
      icon: Users,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
      changeColor: "text-green-600",
    },
    {
      title: "Pending Invoices",
      value: stats?.pendingInvoices?.toString() || "0",
      change: "Needs attention",
      icon: FileText,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      changeColor: "text-amber-600",
    },
    {
      title: "Last FolderSync",
      value: formatLastSync(stats?.lastSyncAt),
      change: "All systems operational",
      icon: FolderSync,
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
      changeColor: "text-green-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => (
        <Card key={index} className="border border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">{stat.title}</p>
                <p className="text-2xl font-semibold text-slate-900 mt-1">{stat.value}</p>
                <p className={`text-sm mt-1 flex items-center ${stat.changeColor}`}>
                  {stat.changeColor === "text-green-600" && <TrendingUp className="w-3 h-3 mr-1" />}
                  {stat.changeColor === "text-amber-600" && <Clock className="w-3 h-3 mr-1" />}
                  {stat.title === "Last FolderSync" && <CheckCircle className="w-3 h-3 mr-1" />}
                  <span>{stat.change}</span>
                </p>
              </div>
              <div className={`w-12 h-12 ${stat.iconBg} rounded-lg flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
