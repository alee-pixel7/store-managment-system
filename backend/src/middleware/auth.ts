// Auth Middleware
// Protects routes with JWT verification and role-based access

import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/authService';

// ============================================================
// AUTH MIDDLEWARE - Verifies JWT token
// ============================================================
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = authService.verifyToken(token);
    (req as any).userId = decoded.userId;
    (req as any).username = decoded.username;
    (req as any).userRole = decoded.role;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ============================================================
// ROLE MIDDLEWARE - Checks minimum required role
// ============================================================
export function requireRole(minRole: authService.Role) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = (req as any).userRole as authService.Role;

    if (!userRole) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!authService.hasPermission(userRole, minRole)) {
      res.status(403).json({
        error: `Insufficient permissions. Required: ${minRole} or higher`,
      });
      return;
    }

    next();
  };
}

// ============================================================
// SPECIFIC ROLE CHECKS
// ============================================================
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const userRole = (req as any).userRole as authService.Role;

  if (userRole !== authService.ROLES.ADMIN) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
}

export function requireCanReverse(req: Request, res: Response, next: NextFunction): void {
  const userRole = (req as any).userRole as authService.Role;

  if (!authService.canReverse(userRole)) {
    res.status(403).json({ error: 'Only ADMIN and STORE_INCHARGE can reverse transactions' });
    return;
  }

  next();
}

export function requireCanDeleteItem(req: Request, res: Response, next: NextFunction): void {
  const userRole = (req as any).userRole as authService.Role;

  if (!authService.canDeleteItem(userRole)) {
    res.status(403).json({ error: 'Only ADMIN can deactivate items' });
    return;
  }

  next();
}

export function requireCanDoStockOps(req: Request, res: Response, next: NextFunction): void {
  const userRole = (req as any).userRole as authService.Role;

  if (!authService.canDoStockOperations(userRole)) {
    res.status(403).json({ error: 'Viewers cannot perform stock operations' });
    return;
  }

  next();
}
