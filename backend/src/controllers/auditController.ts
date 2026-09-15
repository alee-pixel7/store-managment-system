// Audit Controller
// Handles HTTP requests for stock audit operations

import { Request, Response } from 'express';
import * as auditService from '../services/auditService';

// ============================================================
// POST /api/audits - Start new audit
// ============================================================
export async function startAudit(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { notes } = req.body;

    const audit = await auditService.startAudit(userId, notes);
    res.status(201).json(audit);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start audit';
    res.status(400).json({ error: message });
  }
}

// ============================================================
// GET /api/audits - List all audits
// ============================================================
export async function listAudits(req: Request, res: Response) {
  try {
    const audits = await auditService.listAudits();
    res.json({ audits });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list audits';
    res.status(500).json({ error: message });
  }
}

// ============================================================
// GET /api/audits/:id - Get audit detail
// ============================================================
export async function getAudit(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const audit = await auditService.getAuditDetail(parseInt(id));
    res.json(audit);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get audit';
    res.status(404).json({ error: message });
  }
}

// ============================================================
// POST /api/audits/:id/count - Count an item
// ============================================================
export async function countItem(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { itemId, countedQty, countedBy } = req.body;

    if (itemId === undefined || countedQty === undefined || !countedBy) {
      return res.status(400).json({ error: 'itemId, countedQty, and countedBy are required' });
    }

    await auditService.countItem(parseInt(id), itemId, countedQty, countedBy);
    res.json({ message: 'Item counted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to count item';
    res.status(400).json({ error: message });
  }
}

// ============================================================
// GET /api/audits/:id/search?q=query - Search items in audit
// ============================================================
export async function searchItems(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const items = await auditService.searchAuditItems(parseInt(id), q);
    res.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to search items';
    res.status(500).json({ error: message });
  }
}

// ============================================================
// GET /api/audits/:id/variance - Get variance report
// ============================================================
export async function getVarianceReport(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const report = await auditService.getVarianceReport(parseInt(id));
    res.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get variance report';
    res.status(400).json({ error: message });
  }
}

// ============================================================
// POST /api/audits/:id/finalise - Finalise audit
// ============================================================
export async function finaliseAudit(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;

    await auditService.finaliseAudit(parseInt(id), userId);
    res.json({ message: 'Audit finalised successfully. ADJUST transactions created.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to finalise audit';
    res.status(400).json({ error: message });
  }
}
