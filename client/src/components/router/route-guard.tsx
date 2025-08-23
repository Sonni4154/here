import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter, routeMetadata, routes } from "@/hooks/useRouter";
import { RefreshCw, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface RouteGuardProps {
  children: ReactNode;
  requiresAuth?: boolean;
  allowedRoles?: string[];
  fallback?: ReactNode;
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function UnauthorizedAccess({ missingRole = false }: { missingRole?: boolean }) {
  const { navigate } = useRouter();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-xl">
            {missingRole ? "Access Denied" : "Authentication Required"}
          </CardTitle>
          <CardDescription>
            {missingRole 
              ? "You don't have permission to access this page."
              : "Please log in to continue."
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <Button 
            onClick={() => navigate(missingRole ? routes.home : routes.login)}
            className="w-full"
          >
            {missingRole ? "Go to Dashboard" : "Sign In"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RouteGuard({ 
  children, 
  requiresAuth = true, 
  allowedRoles = [], 
  fallback 
}: RouteGuardProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { location } = useRouter();

  // Get route metadata
  const metadata = routeMetadata[location as keyof typeof routeMetadata];
  const routeRequiresAuth = metadata?.requiresAuth ?? requiresAuth;
  const routeAllowedRoles = metadata?.roles ?? allowedRoles;

  // Show loading while authentication is being determined
  if (isLoading) {
    return fallback || <LoadingSpinner />;
  }

  // Check authentication requirement
  if (routeRequiresAuth && !isAuthenticated) {
    return <UnauthorizedAccess />;
  }

  // Check role-based access
  if (isAuthenticated && routeAllowedRoles.length > 0) {
    const userRole = user?.role || 'employee';
    const hasRequiredRole = routeAllowedRoles.includes(userRole);
    
    if (!hasRequiredRole) {
      return <UnauthorizedAccess missingRole={true} />;
    }
  }

  // All checks passed, render children
  return <>{children}</>;
}

/**
 * Higher-order component for protecting routes
 */
export function withRouteGuard<T extends object>(
  Component: React.ComponentType<T>,
  guardProps?: Omit<RouteGuardProps, 'children'>
) {
  return function GuardedComponent(props: T) {
    return (
      <RouteGuard {...guardProps}>
        <Component {...props} />
      </RouteGuard>
    );
  };
}