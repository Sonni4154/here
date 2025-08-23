// Auth types for better type safety
export interface AuthUser {
  claims: {
    sub: string;
    email?: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
  };
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  isAuthenticated(): boolean;
}

export function getUserId(req: any): string | null {
  return req.user?.claims?.sub || null;
}

export function getUserEmail(req: any): string {
  return req.user?.claims?.email || 'unknown@example.com';
}

export function getUserFirstName(req: any): string {
  return req.user?.claims?.given_name || 'User';
}

export function getUserLastName(req: any): string {
  return req.user?.claims?.family_name || '';
}

export function getUserPicture(req: any): string | null {
  return req.user?.claims?.picture || null;
}