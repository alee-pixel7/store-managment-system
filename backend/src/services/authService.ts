// Auth Service Layer
// Handles authentication, JWT generation, and role checks

import prisma from '../lib/prisma';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'store-management-secret-key-2026';
const JWT_EXPIRES_IN = '12h';

// ============================================================
// ROLE CONSTANTS
// ============================================================
export const ROLES = {
  ADMIN: 'ADMIN',
  STORE_INCHARGE: 'STORE_INCHARGE',
  ASSISTANT: 'ASSISTANT',
  VIEWER: 'VIEWER',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// Role hierarchy for permission checks
export const ROLE_HIERARCHY: Record<Role, number> = {
  ADMIN: 4,
  STORE_INCHARGE: 3,
  ASSISTANT: 2,
  VIEWER: 1,
};

// ============================================================
// LOGIN
// ============================================================
export async function login(username: string, password: string) {
  // Find user
  const user = await prisma.users.findUnique({
    where: { username: username.trim().toUpperCase() },
  });

  if (!user) {
    throw new Error('Invalid username or password');
  }

  if (!user.is_active) {
    throw new Error('Account is disabled');
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    throw new Error('Invalid username or password');
  }

  // Generate JWT
  const token = jwt.sign(
    {
      userId: user.id,
      username: user.username,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
    },
  };
}

// ============================================================
// VERIFY TOKEN
// ============================================================
export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as {
    userId: number;
    username: string;
    role: Role;
  };
}

// ============================================================
// ROLE CHECK HELPERS
// ============================================================
export function hasPermission(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function canReverse(role: Role): boolean {
  return role === ROLES.ADMIN || role === ROLES.STORE_INCHARGE;
}

export function canDeleteItem(role: Role): boolean {
  return role === ROLES.ADMIN;
}

export function canManageUsers(role: Role): boolean {
  return role === ROLES.ADMIN;
}

export function canDoStockOperations(role: Role): boolean {
  return role !== ROLES.VIEWER;
}

export function canViewReports(role: Role): boolean {
  return true; // All roles can view reports
}
