// Auth Controller
// Handles HTTP requests and responses for authentication

import { Request, Response } from 'express';
import * as authService from '../services/authService';
import prisma from '../lib/prisma';

// ============================================================
// POST /api/auth/login - Login and return JWT
// ============================================================
export async function login(req: Request, res: Response) {
  try {
    const { username, password } = req.body;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username is required' });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required' });
    }

    const result = await authService.login(username, password);

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    if (message.includes('Invalid') || message.includes('disabled')) {
      return res.status(401).json({ error: message });
    }
    res.status(500).json({ error: 'Login failed' });
  }
}

// ============================================================
// GET /api/auth/me - Get current user info
// ============================================================
export async function getMe(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        full_name: true,
        role: true,
        is_active: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user info' });
  }
}

// Import prisma for getMe
// (moved to top of file)
