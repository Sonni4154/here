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
  // Simplified mock authentication for development
  const mockUser = {
    id: 'dev_user_123',
    firstName: 'Spencer',
    lastName: 'Reiser',
    email: 'spencer@marinpestcontrol.com',
    role: 'admin' as const,
    avatar: null
  };

  return {
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
    error: null,
    isAdmin: true
  };
}