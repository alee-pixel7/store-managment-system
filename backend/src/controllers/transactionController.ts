// Transaction Controller
// Handles HTTP requests and responses for transaction operations

import { Request, Response } from 'express';
import * as transactionService from '../services/transactionService';
import { validateStockInInput, validateStockOutInput, validateReturnInput } from '../validations/transactionValidation';

// ============================================================
// POST /api/transactions/in - Create Stock In transaction
// ============================================================
export async function createStockIn(req: Request, res: Response) {
  try {
    const data = validateStockInInput(req.body);
    const userId = (req as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const transaction = await transactionService.createStockIn(data, userId);
    res.status(201).json(transaction);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(400).json({ error: message });
  }
}

// ============================================================
// GET /api/transactions/:id - Get transaction by ID
// ============================================================
export async function getTransactionById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid transaction ID' });
    }

    const transaction = await transactionService.getTransactionById(id);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
}

// ============================================================
// GET /api/transactions - List transactions with pagination
// ============================================================
export async function listTransactions(req: Request, res: Response) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '20', 10)));
    const txn_type = req.query.txn_type as string | undefined;
    const from_date = req.query.from_date as string | undefined;
    const to_date = req.query.to_date as string | undefined;

    const result = await transactionService.listTransactions({
      page,
      limit,
      txn_type,
      from_date,
      to_date,
    });

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
}

// ============================================================
// GET /api/transactions/suppliers - List suppliers for dropdown
// ============================================================
export async function listSuppliers(_req: Request, res: Response) {
  try {
    const suppliers = await transactionService.listSuppliers();
    res.json(suppliers);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
}

// ============================================================
// POST /api/transactions/suppliers - Create new supplier
// ============================================================
export async function createSupplier(req: Request, res: Response) {
  try {
    const { name, phone, address, notes } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Supplier name is required' });
    }

    const supplier = await transactionService.createSupplier({
      name,
      phone,
      address,
      notes,
    });

    res.status(201).json(supplier);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
}

// ============================================================
// POST /api/transactions/out - Create Stock Out transaction
// ============================================================
export async function createStockOut(req: Request, res: Response) {
  try {
    const data = validateStockOutInput(req.body);
    const userId = (req as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const result = await transactionService.createStockOut(data, userId);
    res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(400).json({ error: message });
  }
}

// ============================================================
// GET /api/transactions/persons - List persons for dropdown
// ============================================================
export async function listPersons(_req: Request, res: Response) {
  try {
    const persons = await transactionService.listPersons();
    res.json(persons);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
}

// ============================================================
// POST /api/transactions/persons - Create new person
// ============================================================
export async function createPerson(req: Request, res: Response) {
  try {
    const { name, department_id, phone } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Person name is required' });
    }

    const person = await transactionService.createPerson({
      name,
      department_id,
      phone,
    });

    res.status(201).json(person);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
}

// ============================================================
// GET /api/transactions/departments - List departments for dropdown
// ============================================================
export async function listDepartments(_req: Request, res: Response) {
  try {
    const departments = await transactionService.listDepartments();
    res.json(departments);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
}

// ============================================================
// POST /api/transactions/departments - Create new department
// ============================================================
export async function createDepartment(req: Request, res: Response) {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Department name is required' });
    }

    const department = await transactionService.createDepartment({ name });
    res.status(201).json(department);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
}

// ============================================================
// GET /api/transactions/machines - List machines for dropdown
// ============================================================
export async function listMachines(req: Request, res: Response) {
  try {
    const department_id = req.query.department_id
      ? parseInt(req.query.department_id as string, 10)
      : undefined;

    const machines = await transactionService.listMachines(department_id);
    res.json(machines);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
}

// ============================================================
// POST /api/transactions/machines - Create new machine
// ============================================================
export async function createMachine(req: Request, res: Response) {
  try {
    const { name, code, department_id } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Machine name is required' });
    }

    const machine = await transactionService.createMachine({
      name,
      code,
      department_id,
    });

    res.status(201).json(machine);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
}

// ============================================================
// POST /api/transactions/return - Create Return transaction
// ============================================================
export async function createReturn(req: Request, res: Response) {
  try {
    const data = validateReturnInput(req.body);
    const userId = (req as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const transaction = await transactionService.createReturn(data, userId);
    res.status(201).json(transaction);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(400).json({ error: message });
  }
}

// ============================================================
// POST /api/transactions/:id/reverse - Reverse a transaction
// ============================================================
export async function reverseTransaction(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid transaction ID' });
    }

    const { reason } = req.body;

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({ error: 'Reason is required for reversal' });
    }

    // Get user ID from request (set by auth middleware)
    const userId = (req as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const reversal = await transactionService.reverseTransaction(id, reason.trim(), userId);

    res.status(201).json(reversal);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message.includes('not found')) {
      return res.status(404).json({ error: message });
    }
    if (message.includes('already reversed')) {
      return res.status(400).json({ error: message });
    }
    res.status(500).json({ error: message });
  }
}

// ============================================================
// POST /api/transactions/by-no/reverse - Reverse by txn_no
// ============================================================
export async function reverseByTxnNo(req: Request, res: Response) {
  try {
    const { txn_no, reason, force } = req.body;

    if (!txn_no || typeof txn_no !== 'string') {
      return res.status(400).json({ error: 'Transaction number is required' });
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({ error: 'Reason is required for reversal' });
    }

    const userId = (req as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const reversal = await transactionService.reverseByTxnNo(txn_no.trim(), reason.trim(), userId, force === true);

    res.status(201).json(reversal);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message.includes('not found')) {
      return res.status(404).json({ error: message });
    }
    if (message.includes('already reversed')) {
      return res.status(400).json({ error: message });
    }
    if (message.includes('negative stock')) {
      return res.status(400).json({ error: message });
    }
    res.status(500).json({ error: message });
  }
}
