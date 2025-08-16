import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/layout/layout";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import TimeTracking from "@/pages/time-tracking";
import MarinJobForm from "@/pages/marin-job-form";
import Materials from "@/pages/materials";
import Clock from "@/pages/clock";
import Invoices from "@/pages/invoices";
import Customers from "@/pages/customers";
import CustomerSearch from "@/pages/customer-search";
import EmployeeSchedule from "@/pages/employee-schedule";
import Products from "@/pages/products";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import Workflows from "@/pages/workflows";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <Layout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/time-tracking" component={TimeTracking} />
            <Route path="/marin-job-form" component={MarinJobForm} />
            <Route path="/materials" component={Materials} />
            <Route path="/clock" component={Clock} />
            <Route path="/invoices" component={Invoices} />
            <Route path="/customers" component={Customers} />
            <Route path="/customer-search" component={CustomerSearch} />
            <Route path="/employee-schedule" component={EmployeeSchedule} />
            <Route path="/products" component={Products} />
            <Route path="/reports" component={Reports} />
            <Route path="/settings" component={Settings} />
            <Route path="/workflows" component={Workflows} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
