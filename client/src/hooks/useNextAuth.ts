import { useQuery } from "@tanstack/react-query";

interface NextAuthSession {
  user: {
    id: string;
    name?: string;
    email?: string;
    image?: string;
  };
  expires: string;
  accessToken?: string;
}

export function useNextAuth() {
  const { data: session, isLoading, error } = useQuery<NextAuthSession | null>({
    queryKey: ["/api/auth/session"],
    retry: false,
  });

  return {
    session,
    user: session?.user || null,
    isLoading,
    isAuthenticated: !!session,
    error,
  };
}