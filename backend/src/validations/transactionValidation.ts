// Transaction Validation Schemas
// Validates all input for transaction operations

export interface CreateStockInInput {
  txn_date?: string;
  supplier_id?: number;
  invoice_no?: string;
  remarks?: string;
  items: Array<{
    item_id: number;
    quantity: number;
    rate?: number;
    line_remarks?: string;
  }>;
}

export interface CreateStockOutInput {
  txn_date?: string;
  department_id?: number;
  machine_id?: number;
  person_id?: number;
  purpose?: string;
  remarks?: string;
  items: Array<{
    item_id: number;
    quantity: number;
    line_remarks?: string;
  }>;
}

export function validateStockInInput(data: unknown): CreateStockInInput {
  const errors: string[] = [];
  const input = data as Record<string, unknown>;

  if (!input || typeof input !== 'object') {
    throw new Error('Request body is required');
  }

  // items: required, non-empty array
  if (!input.items || !Array.isArray(input.items) || input.items.length === 0) {
    errors.push('items is required and must be a non-empty array');
  } else {
    // Validate each item
    for (let i = 0; i < input.items.length; i++) {
      const item = input.items[i] as Record<string, unknown>;

      if (!item.item_id || typeof item.item_id !== 'number') {
        errors.push(`items[${i}].item_id is required and must be a number`);
      }

      if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
        errors.push(`items[${i}].quantity is required and must be a positive number`);
      }

      if (item.rate !== undefined && item.rate !== null) {
        if (typeof item.rate !== 'number' || item.rate < 0) {
          errors.push(`items[${i}].rate must be a non-negative number`);
        }
      }
    }
  }

  // supplier_id: optional, positive integer
  if (input.supplier_id !== undefined && input.supplier_id !== null) {
    if (typeof input.supplier_id !== 'number' || input.supplier_id < 1) {
      errors.push('supplier_id must be a positive integer');
    }
  }

  // invoice_no: optional, string, max 100 chars
  if (input.invoice_no !== undefined && input.invoice_no !== null && typeof input.invoice_no === 'string') {
    if (input.invoice_no.trim().length > 100) {
      errors.push('invoice_no must be 100 characters or less');
    }
  }

  // remarks: optional, string, max 500 chars
  if (input.remarks !== undefined && input.remarks !== null && typeof input.remarks === 'string') {
    if (input.remarks.trim().length > 500) {
      errors.push('remarks must be 500 characters or less');
    }
  }

  // txn_date: optional, valid date string
  if (input.txn_date !== undefined && input.txn_date !== null && typeof input.txn_date === 'string') {
    const date = new Date(input.txn_date);
    if (isNaN(date.getTime())) {
      errors.push('txn_date must be a valid date');
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  return {
    txn_date: input.txn_date ? String(input.txn_date) : undefined,
    supplier_id: input.supplier_id ? Number(input.supplier_id) : undefined,
    invoice_no: input.invoice_no ? String(input.invoice_no).trim() : undefined,
    remarks: input.remarks ? String(input.remarks).trim() : undefined,
    items: (input.items as Array<Record<string, unknown>>).map((item) => ({
      item_id: Number(item.item_id),
      quantity: Number(item.quantity),
      rate: item.rate ? Number(item.rate) : undefined,
      line_remarks: item.line_remarks ? String(item.line_remarks).trim() : undefined,
    })),
  };
}

// ============================================================
// RETURN TRANSACTION
// ============================================================
export interface CreateReturnInput {
  txn_date?: string;
  supplier_id?: number;
  remarks?: string;
  items: Array<{
    item_id: number;
    quantity: number;
    line_remarks?: string;
  }>;
}

export function validateReturnInput(data: unknown): CreateReturnInput {
  const errors: string[] = [];
  const input = data as Record<string, unknown>;

  if (!input || typeof input !== 'object') {
    throw new Error('Request body is required');
  }

  if (!input.items || !Array.isArray(input.items) || input.items.length === 0) {
    errors.push('items is required and must be a non-empty array');
  } else {
    for (let i = 0; i < input.items.length; i++) {
      const item = input.items[i] as Record<string, unknown>;

      if (!item.item_id || typeof item.item_id !== 'number') {
        errors.push(`items[${i}].item_id is required and must be a number`);
      }

      if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
        errors.push(`items[${i}].quantity is required and must be a positive number`);
      }
    }
  }

  if (input.supplier_id !== undefined && input.supplier_id !== null) {
    if (typeof input.supplier_id !== 'number' || input.supplier_id < 1) {
      errors.push('supplier_id must be a positive integer');
    }
  }

  if (input.remarks !== undefined && input.remarks !== null && typeof input.remarks === 'string') {
    if (input.remarks.trim().length > 500) {
      errors.push('remarks must be 500 characters or less');
    }
  }

  if (input.txn_date !== undefined && input.txn_date !== null && typeof input.txn_date === 'string') {
    const date = new Date(input.txn_date);
    if (isNaN(date.getTime())) {
      errors.push('txn_date must be a valid date');
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  return {
    txn_date: input.txn_date ? String(input.txn_date) : undefined,
    supplier_id: input.supplier_id ? Number(input.supplier_id) : undefined,
    remarks: input.remarks ? String(input.remarks).trim() : undefined,
    items: (input.items as Array<Record<string, unknown>>).map((item) => ({
      item_id: Number(item.item_id),
      quantity: Number(item.quantity),
      line_remarks: item.line_remarks ? String(item.line_remarks).trim() : undefined,
    })),
  };
}

export function validateStockOutInput(data: unknown): CreateStockOutInput {
  const errors: string[] = [];
  const input = data as Record<string, unknown>;

  if (!input || typeof input !== 'object') {
    throw new Error('Request body is required');
  }

  // items: required, non-empty array
  if (!input.items || !Array.isArray(input.items) || input.items.length === 0) {
    errors.push('items is required and must be a non-empty array');
  } else {
    for (let i = 0; i < input.items.length; i++) {
      const item = input.items[i] as Record<string, unknown>;

      if (!item.item_id || typeof item.item_id !== 'number') {
        errors.push(`items[${i}].item_id is required and must be a number`);
      }

      if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
        errors.push(`items[${i}].quantity is required and must be a positive number`);
      }
    }
  }

  // department_id: optional
  if (input.department_id !== undefined && input.department_id !== null) {
    if (typeof input.department_id !== 'number' || input.department_id < 1) {
      errors.push('department_id must be a positive integer');
    }
  }

  // machine_id: optional
  if (input.machine_id !== undefined && input.machine_id !== null) {
    if (typeof input.machine_id !== 'number' || input.machine_id < 1) {
      errors.push('machine_id must be a positive integer');
    }
  }

  // person_id: optional
  if (input.person_id !== undefined && input.person_id !== null) {
    if (typeof input.person_id !== 'number' || input.person_id < 1) {
      errors.push('person_id must be a positive integer');
    }
  }

  // purpose: optional, string, max 200 chars
  if (input.purpose !== undefined && input.purpose !== null && typeof input.purpose === 'string') {
    if (input.purpose.trim().length > 200) {
      errors.push('purpose must be 200 characters or less');
    }
  }

  // remarks: optional, string, max 500 chars
  if (input.remarks !== undefined && input.remarks !== null && typeof input.remarks === 'string') {
    if (input.remarks.trim().length > 500) {
      errors.push('remarks must be 500 characters or less');
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  return {
    txn_date: input.txn_date ? String(input.txn_date) : undefined,
    department_id: input.department_id ? Number(input.department_id) : undefined,
    machine_id: input.machine_id ? Number(input.machine_id) : undefined,
    person_id: input.person_id ? Number(input.person_id) : undefined,
    purpose: input.purpose ? String(input.purpose).trim() : undefined,
    remarks: input.remarks ? String(input.remarks).trim() : undefined,
    items: (input.items as Array<Record<string, unknown>>).map((item) => ({
      item_id: Number(item.item_id),
      quantity: Number(item.quantity),
      line_remarks: item.line_remarks ? String(item.line_remarks).trim() : undefined,
    })),
  };
}
