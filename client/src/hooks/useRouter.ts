import { useLocation, useRoute, useRouter as useWouterRouter } from "wouter";
import { useAuth } from "./useAuth";

/**
 * Enhanced router hook with authentication-aware navigation
 */
export function useRouter() {
  const [location, setLocation] = useLocation();
  const router = useWouterRouter();
  const { isAuthenticated } = useAuth();

  /**
   * Navigate to a route with authentication checks
   */
  const navigate = (to: string, replace: boolean = false) => {
    if (replace) {
      router.replace(to);
    } else {
      setLocation(to);
    }
  };

  /**
   * Navigate with authentication requirement
   */
  const navigateProtected = (to: string, replace: boolean = false) => {
    if (!isAuthenticated) {
      navigate('/login', true);
      return;
    }
    navigate(to, replace);
  };

  /**
   * Go back in history
   */
  const goBack = () => {
    window.history.back();
  };

  /**
   * Go forward in history
   */
  const goForward = () => {
    window.history.forward();
  };

  /**
   * Check if current route matches path
   */
  const isActive = (path: string): boolean => {
    return location === path || location.startsWith(path + '/');
  };

  /**
   * Get current route information
   */
  const getCurrentRoute = () => {
    return {
      path: location,
      isAuthenticated,
      canGoBack: window.history.length > 1
    };
  };

  return {
    location,
    navigate,
    navigateProtected,
    goBack,
    goForward,
    isActive,
    getCurrentRoute,
    router
  };
}

/**
 * Route definitions for the application
 */
export const routes = {
  // Public routes
  login: '/login',
  
  // Dashboard routes
  home: '/',
  dashboard: '/dashboard',
  
  // Employee features
  timeTracking: '/time-tracking',
  clock: '/clock',
  employeeSchedule: '/employee-schedule',
  employeeDashboard: '/employee-dashboard',
  
  // Business operations
  marinJobForm: '/marin-job-form',
  materials: '/materials',
  customers: '/customers',
  customerSearch: '/customer-search',
  products: '/products',
  invoices: '/invoices',
  
  // Management
  employees: '/employees',
  reports: '/reports',
  workflows: '/workflows',
  
  // Settings & integrations
  settings: '/settings',
  integrations: '/integrations'
} as const;

/**
 * Route metadata for navigation and permissions
 */
export const routeMetadata = {
  [routes.home]: {
    title: 'Dashboard',
    requiresAuth: true,
    roles: ['admin', 'manager', 'employee']
  },
  [routes.dashboard]: {
    title: 'Dashboard', 
    requiresAuth: true,
    roles: ['admin', 'manager', 'employee']
  },
  [routes.timeTracking]: {
    title: 'Time Tracking',
    requiresAuth: true,
    roles: ['admin', 'manager', 'employee']
  },
  [routes.clock]: {
    title: 'Clock In/Out',
    requiresAuth: true,
    roles: ['admin', 'manager', 'employee']
  },
  [routes.marinJobForm]: {
    title: 'Job Form',
    requiresAuth: true,
    roles: ['admin', 'manager', 'employee']
  },
  [routes.materials]: {
    title: 'Materials',
    requiresAuth: true,
    roles: ['admin', 'manager', 'employee']
  },
  [routes.customers]: {
    title: 'Customers',
    requiresAuth: true,
    roles: ['admin', 'manager']
  },
  [routes.customerSearch]: {
    title: 'Customer Search',
    requiresAuth: true,
    roles: ['admin', 'manager', 'employee']
  },
  [routes.products]: {
    title: 'Products & Services',
    requiresAuth: true,
    roles: ['admin', 'manager']
  },
  [routes.invoices]: {
    title: 'Invoices',
    requiresAuth: true,
    roles: ['admin', 'manager']
  },
  [routes.employees]: {
    title: 'Employees',
    requiresAuth: true,
    roles: ['admin', 'manager']
  },
  [routes.employeeSchedule]: {
    title: 'Schedule',
    requiresAuth: true,
    roles: ['admin', 'manager']
  },
  [routes.employeeDashboard]: {
    title: 'Employee Dashboard',
    requiresAuth: true,
    roles: ['admin', 'manager', 'employee']
  },
  [routes.reports]: {
    title: 'Reports',
    requiresAuth: true,
    roles: ['admin', 'manager']
  },
  [routes.workflows]: {
    title: 'Workflows',
    requiresAuth: true,
    roles: ['admin']
  },
  [routes.settings]: {
    title: 'Settings',
    requiresAuth: true,
    roles: ['admin', 'manager']
  },
  [routes.integrations]: {
    title: 'Integrations',
    requiresAuth: true,
    roles: ['admin', 'manager']
  }
} as const;

/**
 * Get the title for the current route
 */
export function useRouteTitle(): string {
  const [location] = useLocation();
  const metadata = routeMetadata[location as keyof typeof routeMetadata];
  return metadata?.title || 'Marin Pest Control';
}