import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import TimeTracking from "@/pages/time-tracking";
import Materials from "@/pages/materials";
import Invoices from "@/pages/invoices";
import Customers from "@/pages/customers";
import CustomerSearch from "@/pages/customer-search";
import Products from "@/pages/products";
import Reports from "@/pages/reports";
import Integrations from "@/pages/integrations";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/time" component={TimeTracking} />
          <Route path="/materials" component={Materials} />
          <Route path="/invoices" component={Invoices} />
          <Route path="/customers" component={Customers} />
          <Route path="/customer-search" component={CustomerSearch} />
          <Route path="/products" component={Products} />
          <Route path="/reports" component={Reports} />
          <Route path="/integrations" component={Integrations} />
        </>
      )}
      <Route component={NotFound} />
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
