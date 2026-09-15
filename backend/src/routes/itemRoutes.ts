// Item Routes
// Defines all HTTP routes for item operations

import { Router } from 'express';
import * as itemController from '../controllers/itemController';
import { requireRole } from '../middleware/auth';

const router = Router();

// Smart search - must be before /:id to avoid route conflict
router.get('/search', itemController.searchItems);

// Categories - must be before /:id to avoid route conflict
router.get('/categories', itemController.listCategories);

// CRUD routes
router.get('/', itemController.listItems);
router.post('/', requireRole('STORE_INCHARGE'), itemController.createItem);

// Ledger - must be before /:id to avoid route conflict
router.get('/:id/ledger', itemController.getItemLedger);

// Single item routes
router.get('/:id', itemController.getItemById);
router.put('/:id', requireRole('STORE_INCHARGE'), itemController.updateItem);
router.delete('/:id', requireRole('ADMIN'), itemController.softDeleteItem);

export default router;
