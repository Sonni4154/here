import { useQuery } from '@tanstack/react-query';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'employee';
  avatar?: string;
}

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const response = await fetch('/api/auth/user');
      if (!response.ok) {
        if (response.status === 401) {
          return null; // User not authenticated
        }
        throw new Error('Failed to fetch user');
      }
      return response.json();
    },
    retry: false
  });

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    isAdmin: user?.role === 'admin'
  };
}