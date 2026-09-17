// Item Controller
// Handles HTTP requests and responses for item operations

import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import * as itemService from '../services/itemService';
import {
  validateCreateItem,
  validateUpdateItem,
  validatePagination,
} from '../validations/itemValidation';

// ============================================================
// GET /api/items - List items with pagination and filters
// ============================================================
export async function listItems(req: Request, res: Response) {
  try {
    const { page, limit, offset } = validatePagination(req.query);

    const search = req.query.search as string | undefined;
    const categoryIdRaw = req.query.category_id
      ? parseInt(req.query.category_id as string, 10)
      : undefined;
    const category_id = (categoryIdRaw !== undefined && !isNaN(categoryIdRaw) && categoryIdRaw >= 1)
      ? categoryIdRaw
      : undefined;
    const low_stock = req.query.low_stock === 'true';
    const out_of_stock = req.query.out_of_stock === 'true';
    const is_active = req.query.is_active !== undefined
      ? req.query.is_active === 'true'
      : undefined;

    const result = await itemService.listItems({
      page,
      limit,
      offset,
      search,
      category_id,
      low_stock,
      out_of_stock,
      is_active,
    });

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(400).json({ error: message });
  }
}

// ============================================================
// GET /api/items/search?q= - Smart search
// ============================================================
export async function searchItems(req: Request, res: Response) {
  try {
    const query = req.query.q as string;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Search query (q) is required' });
    }

    const results = await itemService.smartSearch(query);
    res.json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
}

// ============================================================
// GET /api/items/:id - Get single item with aliases and transactions
// ============================================================
export async function getItemById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    const item = await itemService.getItemById(id);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(item);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
}

// ============================================================
// POST /api/items - Create new item with aliases
// ============================================================
export async function createItem(req: Request, res: Response) {
  try {
    const data = validateCreateItem(req.body);
    const item = await itemService.createItem(data);
    res.status(201).json(item);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    // Check for unique constraint violation
    if (message.includes('Unique constraint')) {
      return res.status(409).json({ error: 'Item with this code already exists' });
    }
    res.status(400).json({ error: message });
  }
}

// ============================================================
// PUT /api/items/:id - Update item (aliases replaced as set)
// ============================================================
export async function updateItem(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    const data = validateUpdateItem(req.body);
    const item = await itemService.updateItem(id, data);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(item);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message.includes('Unique constraint')) {
      return res.status(409).json({ error: 'Item with this code already exists' });
    }
    res.status(400).json({ error: message });
  }
}

// ============================================================
// DELETE /api/items/:id - Soft delete (is_active = false)
// ============================================================
export async function softDeleteItem(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    const item = await itemService.softDeleteItem(id);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ message: 'Item deactivated successfully', item });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
}

// ============================================================
// GET /api/items/:id/ledger - Get item ledger with running balance
// ============================================================
export async function getItemLedger(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const type = req.query.type as string | undefined;

    const result = await itemService.getItemLedger(id, { from, to, type });

    if (!result) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
}

// ============================================================
// GET /api/items/categories - List all categories with item counts
// ============================================================
export async function listCategories(req: Request, res: Response) {
  try {
    const categories = await prisma.categories.findMany({
      include: { _count: { select: { items: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
}

// ============================================================
// POST /api/items/categories - Create new category
// ============================================================
export async function createCategory(req: Request, res: Response) {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    if (name.trim().length > 100) {
      return res.status(400).json({ error: 'Category name must be 100 characters or less' });
    }

    const existing = await prisma.categories.findFirst({ where: { name: name.trim() } });
    if (existing) {
      return res.status(409).json({ error: 'Category with this name already exists' });
    }

    const category = await prisma.categories.create({
      data: { name: name.trim() },
    });
    res.status(201).json({ ...category, _count: { items: 0 } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
}

// ============================================================
// PUT /api/items/categories/:id - Rename category
// ============================================================
export async function updateCategory(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    if (name.trim().length > 100) {
      return res.status(400).json({ error: 'Category name must be 100 characters or less' });
    }

    const existing = await prisma.categories.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const duplicate = await prisma.categories.findFirst({ where: { name: name.trim(), id: { not: id } } });
    if (duplicate) {
      return res.status(409).json({ error: 'Category with this name already exists' });
    }

    const category = await prisma.categories.update({
      where: { id },
      data: { name: name.trim() },
    });
    res.json(category);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
}

// ============================================================
// DELETE /api/items/categories/:id - Delete category
// ============================================================
export async function deleteCategory(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    const existing = await prisma.categories.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const itemCount = await prisma.items.count({ where: { category_id: id } });
    if (itemCount > 0) {
      // Clear category from all items in this category
      await prisma.items.updateMany({ where: { category_id: id }, data: { category_id: null } });
    }

    await prisma.categories.delete({ where: { id } });
    res.json({ message: 'Category deleted successfully', reassigned: itemCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
}
