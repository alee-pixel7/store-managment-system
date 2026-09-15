// Reorder Routes
// Defines HTTP routes for reorder point management

import { Router } from 'express';
import * as reorderController from '../controllers/reorderController';
import { requireRole } from '../middleware/auth';

const router = Router();

// All routes require at least STORE_INCHARGE role
router.use(requireRole('STORE_INCHARGE'));

router.get('/suggestions', reorderController.getSuggestions);
router.post('/accept/:itemId', reorderController.acceptSuggestion);
router.post('/accept-bulk', reorderController.acceptBulkSuggestions);

export default router;
