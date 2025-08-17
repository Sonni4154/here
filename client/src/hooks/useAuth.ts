import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    throwOnError: false, // Don't throw errors, handle them gracefully
  });

  // Check if error is 401 (unauthenticated) - this is expected for logged out users
  const isUnauthenticatedError = error && (error as any).status === 401;

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !isUnauthenticatedError,
    error: isUnauthenticatedError ? null : error, // Don't treat 401 as an error
  };
}
