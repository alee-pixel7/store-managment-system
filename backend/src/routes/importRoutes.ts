// Import Routes
// Defines all HTTP routes for Excel import operations

import { Router } from 'express';
import multer from 'multer';
import * as importController from '../controllers/importController';
import { requireRole } from '../middleware/auth';

const router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls') || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed'));
    }
  },
});

// Parse Excel file and return headers (requires STOCK_IN_CHARGE or higher)
router.post('/parse', requireRole('ASSISTANT'), upload.single('file'), importController.parseFile);

// Validate data with column mapping
router.post('/validate-items', requireRole('ASSISTANT'), importController.validateItems);
router.post('/validate-stock', requireRole('ASSISTANT'), importController.validateStock);

// Import data
router.post('/items', requireRole('STORE_INCHARGE'), importController.importItems);
router.post('/stock', requireRole('STORE_INCHARGE'), importController.importStock);
router.post('/daily-report', requireRole('STORE_INCHARGE'), importController.importDailyReport);

// Download error list
router.post('/errors', requireRole('ASSISTANT'), importController.downloadErrors);

export default router;
