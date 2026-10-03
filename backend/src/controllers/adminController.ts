// Admin Controller
// Handles dangerous administrative operations (factory reset)

import { Request, Response } from 'express';
import * as adminService from '../services/adminService';

// ============================================================
// POST /api/admin/factory-reset - Wipe all data (new-customer handoff)
// ============================================================
export async function factoryReset(req: Request, res: Response) {
  try {
    const { confirm } = req.body;

    if (confirm !== 'RESET') {
      return res.status(400).json({ error: 'Type RESET to confirm factory reset' });
    }

    const result = await adminService.factoryReset();

    res.json({
      message: 'All data cleared. Login again with STORE ADMIN / S123T',
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
}
