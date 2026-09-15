// Transaction Routes
// Defines all HTTP routes for transaction operations

import { Router } from 'express';
import * as transactionController from '../controllers/transactionController';
import { requireRole } from '../middleware/auth';

const router = Router();

// Stock In (requires stock operation permission)
router.post('/in', requireRole('ASSISTANT'), transactionController.createStockIn);

// Stock Out (requires stock operation permission)
router.post('/out', requireRole('ASSISTANT'), transactionController.createStockOut);

// Return (requires stock operation permission)
router.post('/return', requireRole('ASSISTANT'), transactionController.createReturn);

// Suppliers
router.get('/suppliers', transactionController.listSuppliers);
router.post('/suppliers', requireRole('ASSISTANT'), transactionController.createSupplier);

// Persons
router.get('/persons', transactionController.listPersons);
router.post('/persons', requireRole('ASSISTANT'), transactionController.createPerson);

// Departments
router.get('/departments', transactionController.listDepartments);
router.post('/departments', requireRole('ASSISTANT'), transactionController.createDepartment);

// Machines
router.get('/machines', transactionController.listMachines);
router.post('/machines', requireRole('ASSISTANT'), transactionController.createMachine);

// Reverse transaction (requires ADMIN or STORE_INCHARGE role)
router.post('/:id/reverse', requireRole('STORE_INCHARGE'), transactionController.reverseTransaction);

// List and get transactions
router.get('/', transactionController.listTransactions);
router.get('/:id', transactionController.getTransactionById);

export default router;
