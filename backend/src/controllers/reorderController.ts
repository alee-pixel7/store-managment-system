// Reorder Controller
// Handles HTTP requests for reorder point calculations

import { Request, Response } from 'express';
import * as reorderService from '../services/reorderService';

// ============================================================
// GET /api/reorder/suggestions
// ============================================================
export async function getSuggestions(req: Request, res: Response) {
  try {
    const data = await reorderService.getReorderSuggestions();
    res.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get reorder suggestions';
    res.status(500).json({ error: message });
  }
}

// ============================================================
// POST /api/reorder/accept/:itemId
// ============================================================
export async function acceptSuggestion(req: Request, res: Response) {
  try {
    const itemId = parseInt(req.params.itemId);
    if (isNaN(itemId)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }
    const result = await reorderService.acceptSuggestion(itemId);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to accept suggestion';
    res.status(500).json({ error: message });
  }
}

// ============================================================
// POST /api/reorder/accept-bulk
// ============================================================
export async function acceptBulkSuggestions(req: Request, res: Response) {
  try {
    const { itemIds } = req.body;
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ error: 'itemIds array is required' });
    }
    const result = await reorderService.acceptBulkSuggestions(itemIds);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to accept bulk suggestions';
    res.status(500).json({ error: message });
  }
}
