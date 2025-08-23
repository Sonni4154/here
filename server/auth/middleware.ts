import { Request, Response, NextFunction } from 'express';
import { getServerSession } from 'next-auth';
import { authConfig } from './nextauth-config';

// Authentication middleware for Express routes
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await getServerSession(authConfig);
    
    if (!session || !session.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please sign in to access this resource'
      });
    }
    
    // Add user to request object
    (req as any).user = session.user;
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
}

// Admin-only middleware
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await getServerSession(authConfig);
    
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if ((session.user as any).role !== 'admin') {
      return res.status(403).json({ 
        error: 'Admin access required',
        message: 'This action requires administrator privileges'
      });
    }
    
    (req as any).user = session.user;
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ error: 'Authorization error' });
  }
}

// Optional authentication middleware
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await getServerSession(authConfig);
    
    if (session && session.user) {
      (req as any).user = session.user;
    }
    
    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next(); // Continue even if auth fails
  }
}